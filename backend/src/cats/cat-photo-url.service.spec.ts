import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CatPhotoUrlService } from "./cat-photo-url.service";

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const mockedGetSignedUrl = vi.mocked(getSignedUrl);

function createService(bucketName = "cat-assets"): CatPhotoUrlService {
  const config = {
    get: vi.fn((key: string) => (key === "s3.bucketName" ? bucketName : undefined)),
  } as unknown as ConfigService;
  return new CatPhotoUrlService(config, {} as S3Client);
}

describe("CatPhotoUrlService GET URL caching", () => {
  beforeEach(() => {
    mockedGetSignedUrl.mockReset();
  });

  it("reuses photo GET URLs for the same bucket and object", async () => {
    mockedGetSignedUrl.mockResolvedValue("https://garage/photo?signature=1");
    const service = createService();

    const firstUrl = await service.getPrimaryPhotoUrl("cats/1/full.jpg");
    const secondUrl = await service.getPrimaryPhotoUrl("cats/1/full.jpg");

    expect(firstUrl).toBe("https://garage/photo?signature=1");
    expect(secondUrl).toBe(firstUrl);
    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(1);
    const command = mockedGetSignedUrl.mock.calls[0]?.[1];
    expect(command).toBeInstanceOf(GetObjectCommand);
    expect(command?.input).toMatchObject({
      Bucket: "cat-assets",
      Key: "cats/1/full.jpg",
      ResponseCacheControl: "private, max-age=3600",
    });
    expect(mockedGetSignedUrl.mock.calls[0]?.[2]).toEqual({ expiresIn: 3600 });
  });

  it("caches document inline and download URLs separately by disposition and filename", async () => {
    mockedGetSignedUrl
      .mockResolvedValueOnce("https://garage/document-inline?signature=1")
      .mockResolvedValueOnce("https://garage/document-download?signature=2")
      .mockResolvedValueOnce("https://garage/document-renamed?signature=3");
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
    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(3);
    expect(mockedGetSignedUrl.mock.calls.map((call) => call[1].input)).toEqual([
      expect.objectContaining({
        Key: "cats/1/doc.pdf",
        ResponseContentDisposition: "inline",
        ResponseContentType: "application/pdf",
        ResponseCacheControl: "private, max-age=3600",
      }),
      expect.objectContaining({
        Key: "cats/1/doc.pdf",
        ResponseContentDisposition: 'attachment; filename="medical-record.pdf"',
        ResponseContentType: "application/pdf",
        ResponseCacheControl: "private, max-age=3600",
      }),
      expect.objectContaining({
        Key: "cats/1/doc.pdf",
        ResponseContentDisposition: 'attachment; filename="other.pdf"',
        ResponseCacheControl: "private, max-age=3600",
      }),
    ]);
  });

  it("creates separate cached URLs for distinct bucket and object keys", async () => {
    mockedGetSignedUrl
      .mockResolvedValueOnce("https://garage/first")
      .mockResolvedValueOnce("https://garage/other-key")
      .mockResolvedValueOnce("https://garage/other-bucket");

    const firstBucket = createService("first-bucket");
    const secondBucket = createService("second-bucket");

    await firstBucket.getPrimaryPhotoUrl("cats/1/photo.jpg");
    await firstBucket.getPrimaryPhotoUrl("cats/1/other.jpg");
    await secondBucket.getPrimaryPhotoUrl("cats/1/photo.jpg");

    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(3);
  });

  it("returns null without signing when the object key or bucket is missing", async () => {
    const configured = createService();
    const unconfigured = createService("");

    await expect(configured.getPrimaryPhotoUrl(null)).resolves.toBeNull();
    await expect(unconfigured.getDocumentUrl("cats/1/doc.pdf")).resolves.toBeNull();
    await expect(
      unconfigured.getDocumentDownloadUrl("cats/1/doc.pdf", "doc.pdf"),
    ).resolves.toBeNull();
    expect(mockedGetSignedUrl).not.toHaveBeenCalled();
  });
});
