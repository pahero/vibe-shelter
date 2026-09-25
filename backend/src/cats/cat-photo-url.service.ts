import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class CatPhotoUrlService {
  bucketName: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly client: S3Client) {
    this.bucketName = this.configService.get<string>('s3.bucketName') ?? '';
  }

  async getPrimaryPhotoUrl(key: string | null): Promise<string | null> {
    if (!key) {
      return null;
    }
    if (!this.bucketName) {
      return null;
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
      { expiresIn: 3600 },
    );
  }

  async getPhotoUrl(key: string): Promise<string | null> {
    return this.getPrimaryPhotoUrl(key);
  }

  async getPreviewPhotoUrl(fullKey: string | null): Promise<string | null> {
    if (!fullKey) return null;
    return this.getPrimaryPhotoUrl(fullKey.endsWith('/full.jpg') ? fullKey.replace(/\/full\.jpg$/, '/preview.jpg') : fullKey);
  }

  async uploadPrimaryPhoto(input: {
    catId: string;
    originalName?: string;
    contentType?: string;
    body: Buffer;
  }): Promise<string> {
    if (!this.bucketName) {
      throw new Error('S3 bucket is not configured');
    }

    const key = this.buildPrimaryPhotoKey(input.catId, input.originalName);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return key;
  }

  async uploadPhotoVariants(input: {
    catId: string;
    originalName?: string;
    contentType?: string;
    fullBody: Buffer;
    previewBody: Buffer;
  }): Promise<{ key: string; previewKey: string }> {
    if (!this.bucketName) throw new Error('S3 bucket is not configured');

    const baseKey = this.buildPhotoBaseKey(input.catId, input.originalName);
    const key = `${baseKey}/full.jpg`;
    const previewKey = `${baseKey}/preview.jpg`;
    await Promise.all([
      this.client.send(new PutObjectCommand({ Bucket: this.bucketName, Key: key, Body: input.fullBody, ContentType: input.contentType })),
      this.client.send(new PutObjectCommand({ Bucket: this.bucketName, Key: previewKey, Body: input.previewBody, ContentType: input.contentType })),
    ]);
    return { key, previewKey };
  }

  async deletePhoto(key: string): Promise<void> {
    if (!this.bucketName) return;
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
  }

  async listPhotoObjects(prefix: string): Promise<Array<{ key: string; lastModified: Date | null }>> {
    const objects: Array<{ key: string; lastModified: Date | null }> = [];
    let continuationToken: string | undefined;
    do {
      const result = await this.client.send(new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }));
      for (const item of result.Contents ?? []) {
        if (item.Key) objects.push({ key: item.Key, lastModified: item.LastModified ?? null });
      }
      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  private buildPrimaryPhotoKey(catId: string, originalName?: string): string {
    const safeName = (originalName ?? 'photo')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 120);
    return `cats/${catId}/photos/${Date.now()}-${safeName}`;
  }

  private buildPhotoBaseKey(catId: string, originalName?: string): string {
    const safeName = (originalName ?? 'photo')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 120);
    return `cats/${catId}/photos/${Date.now()}-${randomUUID()}-${safeName}`;
  }
}
