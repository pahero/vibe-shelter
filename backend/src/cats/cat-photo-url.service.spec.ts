import { S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { afterEach, describe, expect, it } from "vitest";
import { CatPhotoUrlService } from "./cat-photo-url.service";
import { randomUUID } from "node:crypto";

const clients: S3Client[] = [];

function createService(
  bucketName = `cat-assets-${randomUUID()}`,
): CatPhotoUrlService {
  const config = {
    get: (key: string) => (key === "s3.bucketName" ? bucketName : undefined),
  } as unknown as ConfigService;
  const client = new S3Client({
    endpoint: "http://localhost:3900",
    region: "garage",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
    },
  });
  clients.push(client);
  return new CatPhotoUrlService(config, client);
}

describe("CatPhotoUrlService GET URL caching", () => {
  afterEach(() => {
    for (const client of clients.splice(0)) client.destroy();
  });

  it("reuses photo GET URLs for the same bucket and object", async () => {
    const service = createService();

    const firstUrl = await service.getPrimaryPhotoUrl("cats/1/full.jpg");
    const secondUrl = await service.getPrimaryPhotoUrl("cats/1/full.jpg");

    expect(firstUrl).toContain("X-Amz-Signature=");
    expect(secondUrl).toBe(firstUrl);
    expect(new URL(firstUrl!).pathname).toContain("cats/1/full.jpg");
    expect(new URL(firstUrl!).searchParams.get("X-Amz-Expires")).toBe("3600");
  });

  it("caches document inline and download URLs separately by disposition and filename", async () => {
    const service = createService();

    const inlineFirst = await service.getDocumentUrl("cats/1/doc.pdf");
    const inlineSecond = await service.getDocumentUrl("cats/1/doc.pdf");
    const downloadFirst = await service.getDocumentDownloadUrl(
      "cats/1/doc.pdf",
      "medical record.pdf",
    );
    const downloadSecond = await service.getDocumentDownloadUrl(
      "cats/1/doc.pdf",
      "medical record.pdf",
    );
    const renamedDownload = await service.getDocumentDownloadUrl(
      "cats/1/doc.pdf",
      "other.pdf",
    );

    expect(inlineSecond).toBe(inlineFirst);
    expect(downloadSecond).toBe(downloadFirst);
    expect(renamedDownload).not.toBe(downloadFirst);
    expect(inlineFirst).not.toBe(downloadFirst);
    expect(downloadFirst).not.toBe(renamedDownload);
    expect(
      new URL(inlineFirst!).searchParams.get("response-content-disposition"),
    ).toBe("inline");
    expect(
      new URL(downloadFirst!).searchParams.get("response-content-disposition"),
    ).toBe('attachment; filename="medical-record.pdf"');
  });

  it("signs photo downloads as attachments", async () => {
    const service = createService();

    const imageUrl = await service.getPhotoDownloadUrl(
      "cats/1/full.jpg",
      "Misty's photo.png",
    );
    const videoUrl = await service.getPhotoDownloadUrl(
      "cats/1/video.mp4",
      "arrival video.mp4",
    );

    expect(
      new URL(imageUrl!).searchParams.get("response-content-disposition"),
    ).toBe('attachment; filename="Misty-s-photo.png"');
    expect(
      new URL(videoUrl!).searchParams.get("response-content-disposition"),
    ).toBe('attachment; filename="arrival-video.mp4"');
  });

  it("creates separate cached URLs for distinct bucket and object keys", async () => {
    const firstBucket = createService("first-bucket");
    const secondBucket = createService("second-bucket");

    await firstBucket.getPrimaryPhotoUrl("cats/1/photo.jpg");
    await firstBucket.getPrimaryPhotoUrl("cats/1/other.jpg");
    await secondBucket.getPrimaryPhotoUrl("cats/1/photo.jpg");

    const firstKeyUrl =
      await firstBucket.getPrimaryPhotoUrl("cats/1/photo.jpg");
    const otherBucketUrl =
      await secondBucket.getPrimaryPhotoUrl("cats/1/photo.jpg");
    expect(new URL(firstKeyUrl!).searchParams.get("X-Amz-Signature")).not.toBe(
      new URL(otherBucketUrl!).searchParams.get("X-Amz-Signature"),
    );
  });

  it("returns null without signing when the bucket is missing", async () => {
    const unconfigured = createService("");

    await expect(
      unconfigured.getDocumentUrl("cats/1/doc.pdf"),
    ).resolves.toBeNull();
    await expect(
      unconfigured.getDocumentDownloadUrl("cats/1/doc.pdf", "doc.pdf"),
    ).resolves.toBeNull();
  });
});
