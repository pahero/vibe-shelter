import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { CatPhotoUrlService } from './cat-photo-url.service';

export type CatPhotoCleanupResult = {
  scanned: number;
  deleted: number;
  skippedReferenced: number;
  skippedRecent: number;
};

@Injectable()
export class CatPhotoCleanupService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(CatPhotoCleanupService.name);
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private photoUrls: CatPhotoUrlService,
    private config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    const intervalMs = this.getNumber('S3_DANGLING_PHOTO_CLEANUP_INTERVAL_MS', 60 * 60 * 1000);
    this.interval = setInterval(() => {
      void this.cleanupDanglingPhotos().catch((error) => {
        this.logger.error('Failed to clean dangling S3 cat photos', error instanceof Error ? error.stack : String(error));
      });
    }, intervalMs);
    this.interval.unref?.();
  }

  onApplicationShutdown(): void {
    if (this.interval) clearInterval(this.interval);
  }

  async cleanupDanglingPhotos(): Promise<CatPhotoCleanupResult> {
    if (this.isRunning) return { scanned: 0, deleted: 0, skippedReferenced: 0, skippedRecent: 0 };
    this.isRunning = true;
    try {
      const graceMs = this.getNumber('S3_DANGLING_PHOTO_CLEANUP_GRACE_MS', 24 * 60 * 60 * 1000);
      const cutoff = Date.now() - graceMs;
      const [photoRows, catRows, objects] = await Promise.all([
        this.prisma.catPhoto.findMany({ select: { key: true } }),
        this.prisma.cat.findMany({ where: { primaryPhotoKey: { not: null } }, select: { primaryPhotoKey: true } }),
        this.photoUrls.listPhotoObjects(this.config.get<string>('S3_DANGLING_PHOTO_CLEANUP_PREFIX') ?? 'cats/'),
      ]);
      const referencedKeys = new Set<string>([
        ...photoRows.map(row => row.key),
        ...catRows.map(row => row.primaryPhotoKey).filter(x => x !== null),
      ]);

      const result: CatPhotoCleanupResult = { scanned: objects.length, deleted: 0, skippedReferenced: 0, skippedRecent: 0 };
      for (const object of objects) {
        if (referencedKeys.has(object.key)) {
          result.skippedReferenced += 1;
          continue;
        }
        if (!object.lastModified || object.lastModified.getTime() > cutoff) {
          result.skippedRecent += 1;
          continue;
        }
        await this.photoUrls.deletePhoto(object.key);
        result.deleted += 1;
      }
      return result;
    } finally {
      this.isRunning = false;
    }
  }

  private getNumber(name: string, fallback: number): number {
    const value = Number(this.config.get<string>(name) ?? process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
