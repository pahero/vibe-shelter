import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CatPhotoCompressionService } from "./cat-photo-compression.service";

describe("CatPhotoCompressionService", () => {
  it("converts HEIC photos to compressed JPEG variants", async () => {
    const input = await readFile(
      join(process.cwd(), "src", "test", "img", "preview.heic"),
    );

    const result = await CatPhotoCompressionService.compress({
      buffer: input,
      mimetype: "image/heic",
      originalname: "preview.heic",
    });

    expect(result.full.mimetype).toBe("image/jpeg");
    expect(result.full.originalname).toBe("preview.jpg");
    expect((await sharp(result.full.buffer).metadata()).format).toBe("jpeg");
    expect(result.preview.mimetype).toBe("image/jpeg");
    expect((await sharp(result.preview.buffer).metadata()).format).toBe("jpeg");
  });

  it("retains the original when neither decoder can read the image", async () => {
    const input = Buffer.from("not an image");
    const result = await CatPhotoCompressionService.compress({
      buffer: input,
      mimetype: "image/heic",
      originalname: "broken.heic",
    });

    expect(result.full.buffer).toEqual(input);
    expect(result.preview.buffer).toEqual(input);
    expect(result.full.mimetype).toBe("image/heic");
    expect(result.full.originalname).toBe("broken.heic");
  });

  it("resizes large photos and encodes them as JPEGs", async () => {
    const input = await sharp({
      create: {
        width: 3840,
        height: 2160,
        channels: 3,
        background: { r: 20, g: 80, b: 140 },
      },
    })
      .png()
      .toBuffer();

    const result = await CatPhotoCompressionService.compress({
      buffer: input,
      mimetype: "image/png",
      originalname: "shelter-cat.png",
    });
    const fullMetadata = await sharp(result.full.buffer).metadata();
    const previewMetadata = await sharp(result.preview.buffer).metadata();

    expect(result.full.mimetype).toBe("image/jpeg");
    expect(result.full.originalname).toBe("shelter-cat.jpg");
    expect(fullMetadata.format).toBe("jpeg");
    expect(fullMetadata.width).toBe(1920);
    expect(fullMetadata.height).toBe(1080);
    expect(previewMetadata.width).toBe(1200);
    expect(previewMetadata.height).toBe(675);
  });

  it("caps portrait preview width without shrinking it based on its height", async () => {
    const input = await sharp({
      create: {
        width: 3000,
        height: 4000,
        channels: 3,
        background: { r: 20, g: 80, b: 140 },
      },
    })
      .png()
      .toBuffer();

    const result = await CatPhotoCompressionService.compress({
      buffer: input,
      mimetype: "image/png",
      originalname: "phone-portrait.png",
    });
    const previewMetadata = await sharp(result.preview.buffer).metadata();

    expect(previewMetadata.width).toBe(1200);
    expect(previewMetadata.height).toBe(1600);
  });
});
