-- Keep the uploaded name so gallery downloads retain it.
ALTER TABLE "CatPhoto" ADD COLUMN "fileName" TEXT NOT NULL DEFAULT 'cat-photo.jpg';
