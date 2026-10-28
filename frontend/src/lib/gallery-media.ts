export type GalleryUploadFile = Pick<File, "type" | "name">;

export function isSupportedGalleryUpload(file: GalleryUploadFile): boolean {
  if (file.type.startsWith("image/")) return true;
  const name = file.name.toLowerCase();
  return (
    (file.type === "video/mp4" && name.endsWith(".mp4")) ||
    (file.type === "video/webm" && name.endsWith(".webm"))
  );
}
