import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CatPhotoUrlService {
  private readonly client: S3Client;
  private readonly bucketName?: string;

  constructor(configService: ConfigService) {
    this.bucketName = configService.get<string>('s3.bucketName') ?? process.env.S3_BUCKET;
    this.client = new S3Client({
      endpoint: configService.get<string>('s3.endpoint') ?? process.env.AWS_ENDPOINT_URL_S3,
      region: process.env.AWS_REGION ?? 'us-east-1',
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
    });
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

  private buildPrimaryPhotoKey(catId: string, originalName?: string): string {
    const safeName = (originalName ?? 'photo')
      .replace(/[^a-zA-Z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 120);
    return `cats/${catId}/primary/${Date.now()}-${safeName}`;
  }
}
