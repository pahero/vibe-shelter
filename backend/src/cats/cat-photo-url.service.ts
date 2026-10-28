import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

@Injectable()
export class CatPhotoUrlService {
  private static readonly signedUrlTtlSeconds = 3600;
  private static readonly signedUrlRefreshBufferMs = 60_000;
  private static readonly signedUrlCache = new Map<
    string,
    { url: string; refreshAt: number }
  >();
  bucketName: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly client: S3Client,
  ) {
    this.bucketName = this.configService.get<string>("s3.bucketName") ?? "";
  }

  async getPrimaryPhotoUrl(key: string | null): Promise<string | null> {
    if (!key) {
      return null;
    }
    if (!this.bucketName) {
      return null;
    }

    return this.getCachedGetUrl(key, "inline", undefined);
  }

  async getPhotoUrl(key: string): Promise<string | null> {
    return this.getPrimaryPhotoUrl(key);
  }

  async getDocumentUrl(key: string): Promise<string | null> {
    if (!this.bucketName) return null;
    return this.getCachedGetUrl(key, "inline", this.documentContentType(key));
  }

  async getDocumentDownloadUrl(
    key: string,
    fileName: string,
  ): Promise<string | null> {
    if (!this.bucketName) return null;
    return this.getCachedGetUrl(
      key,
      `attachment; filename="${this.safeFileName(fileName)}"`,
      this.documentContentType(fileName),
    );
  }

  private async getCachedGetUrl(
    key: string,
    disposition: string,
    contentType: string | undefined,
  ): Promise<string> {
    const cacheKey = JSON.stringify([
      this.bucketName,
      key,
      disposition,
      contentType,
    ]);
    const now = Date.now();
    const cached = CatPhotoUrlService.signedUrlCache.get(cacheKey);
    if (cached && cached.refreshAt > now) return cached.url;

    const responseCacheControl = `private, max-age=${CatPhotoUrlService.signedUrlTtlSeconds}`;
    const url = await getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ResponseContentDisposition: disposition,
        ...(contentType ? { ResponseContentType: contentType } : {}),
        ResponseCacheControl: responseCacheControl,
      }),
      { expiresIn: CatPhotoUrlService.signedUrlTtlSeconds },
    );
    CatPhotoUrlService.signedUrlCache.set(cacheKey, {
      url,
      refreshAt:
        now +
        CatPhotoUrlService.signedUrlTtlSeconds * 1000 -
        CatPhotoUrlService.signedUrlRefreshBufferMs,
    });
    return url;
  }

  async getPreviewPhotoUrl(fullKey: string | null): Promise<string | null> {
    if (!fullKey) return null;
    return this.getPrimaryPhotoUrl(
      fullKey.endsWith("/full.jpg")
        ? fullKey.replace(/\/full\.jpg$/, "/preview.jpg")
        : fullKey,
    );
  }

  async uploadPrimaryPhoto(input: {
    catId: string;
    originalName?: string;
    contentType?: string;
    body: Buffer;
  }): Promise<string> {
    if (!this.bucketName) {
      throw new Error("S3 bucket is not configured");
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
    if (!this.bucketName) throw new Error("S3 bucket is not configured");

    const baseKey = this.buildPhotoBaseKey(input.catId, input.originalName);
    const key = `${baseKey}/full.jpg`;
    const previewKey = `${baseKey}/preview.jpg`;
    await Promise.all([
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: input.fullBody,
          ContentType: input.contentType,
        }),
      ),
      this.client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: previewKey,
          Body: input.previewBody,
          ContentType: input.contentType,
        }),
      ),
    ]);
    return { key, previewKey };
  }

  async deletePhoto(key: string): Promise<void> {
    if (!this.bucketName) return;
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }),
    );
  }

  async uploadDocument(input: {
    catId: string;
    originalName?: string;
    contentType?: string;
    body: Buffer;
  }): Promise<string> {
    if (!this.bucketName) throw new Error("S3 bucket is not configured");

    const key = this.buildDocumentKey(input.catId, input.originalName);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: input.body,
        ContentType: input.contentType ?? "application/pdf",
        ContentDisposition: `attachment; filename="${this.safeFileName(input.originalName)}"`,
      }),
    );
    return key;
  }

  async deleteDocument(key: string): Promise<void> {
    await this.deletePhoto(key);
  }

  async listPhotoObjects(
    prefix: string,
  ): Promise<Array<{ key: string; lastModified: Date | null }>> {
    const objects: Array<{ key: string; lastModified: Date | null }> = [];
    let continuationToken: string | undefined;
    do {
      const result = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );
      for (const item of result.Contents ?? []) {
        if (item.Key)
          objects.push({
            key: item.Key,
            lastModified: item.LastModified ?? null,
          });
      }
      continuationToken = result.NextContinuationToken;
    } while (continuationToken);

    return objects;
  }

  private buildPrimaryPhotoKey(catId: string, originalName?: string): string {
    const safeName = (originalName ?? "photo")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
    return `cats/${catId}/photos/${Date.now()}-${safeName}`;
  }

  private buildPhotoBaseKey(catId: string, originalName?: string): string {
    const safeName = (originalName ?? "photo")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
    return `cats/${catId}/photos/${Date.now()}-${randomUUID()}-${safeName}`;
  }

  private buildDocumentKey(catId: string, originalName?: string): string {
    return `cats/${catId}/documents/${Date.now()}-${randomUUID()}-${this.safeFileName(originalName)}`;
  }

  private safeFileName(originalName?: string): string {
    const safeName = (originalName ?? "document.pdf")
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120);
    return safeName;
  }

  async uploadVideo(input: {
    catId: string;
    originalName: string;
    contentType: "video/mp4" | "video/webm" | "video/quicktime";
    body: Buffer;
  }): Promise<string> {
    if (!this.bucketName) throw new Error("S3 bucket is not configured");
    const safeName = this.safeFileName(input.originalName);
    const key = `cats/${input.catId}/photos/${Date.now()}-${randomUUID()}-${safeName}`;
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

  private documentContentType(name: string): string {
    const lowerName = name.toLowerCase();
    if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg"))
      return "image/jpeg";
    if (lowerName.endsWith(".png")) return "image/png";
    return "application/pdf";
  }
}
