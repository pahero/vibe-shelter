import sharp from 'sharp';
import { CatPhotoCompressionService } from './cat-photo-compression.service';

describe('CatPhotoCompressionService', () => {
  it('resizes large photos and encodes them as JPEGs', async () => {
    const input = await sharp({
      create: { width: 3840, height: 2160, channels: 3, background: { r: 20, g: 80, b: 140 } },
    }).png().toBuffer();

    const result = await CatPhotoCompressionService.compress({ buffer: input, mimetype: 'image/png', originalname: 'shelter-cat.png' });
    const fullMetadata = await sharp(result.full.buffer).metadata();
    const previewMetadata = await sharp(result.preview.buffer).metadata();

    expect(result.full.mimetype).toBe('image/jpeg');
    expect(result.full.originalname).toBe('shelter-cat.jpg');
    expect(fullMetadata.format).toBe('jpeg');
    expect(fullMetadata.width).toBe(1920);
    expect(fullMetadata.height).toBe(1080);
    expect(previewMetadata.width).toBe(640);
    expect(previewMetadata.height).toBe(360);
  });
});
