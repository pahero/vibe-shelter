import sharp from 'sharp';
import type { PrimaryPhotoUpload } from './cats.service';

const MAX_PHOTO_DIMENSION = 1920;
const PREVIEW_PHOTO_DIMENSION = 640;

export type CompressedCatPhoto = Required<Pick<PrimaryPhotoUpload, 'buffer' | 'mimetype' | 'originalname'>>;
export type CompressedCatPhotoVariants = { full: CompressedCatPhoto; preview: CompressedCatPhoto };

export class CatPhotoCompressionService {
  static async compress(photo: PrimaryPhotoUpload): Promise<CompressedCatPhotoVariants> {
    if (!photo.buffer) throw new Error('Photo buffer is required for compression');

    try {
      const image = sharp(photo.buffer, { failOn: 'none' }).rotate();
      const [fullBuffer, previewBuffer] = await Promise.all([
        image.clone()
          .resize(MAX_PHOTO_DIMENSION, MAX_PHOTO_DIMENSION, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 82, mozjpeg: true })
          .toBuffer(),
        image.clone()
          .resize(PREVIEW_PHOTO_DIMENSION, PREVIEW_PHOTO_DIMENSION, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 72, mozjpeg: true })
          .toBuffer(),
      ]);
      const name = this.toJpegName(photo.originalname ?? 'photo');
      return {
        full: { buffer: fullBuffer, mimetype: 'image/jpeg', originalname: name },
        preview: { buffer: previewBuffer, mimetype: 'image/jpeg', originalname: name },
      };
    } catch {
      const original: CompressedCatPhoto = {
        buffer: photo.buffer,
        mimetype: photo.mimetype ?? 'application/octet-stream',
        originalname: photo.originalname ?? 'photo',
      };
      return { full: original, preview: { ...original } };
    }
  }

  private static toJpegName(originalName: string): string {
    const baseName = originalName.replace(/\.[^/.]+$/, '') || 'photo';
    return `${baseName}.jpg`;
  }
}
