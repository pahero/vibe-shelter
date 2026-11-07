import { CatPhotoCompressionService } from "../cat-photo-compression.service";
import { TrelloAttachment, TrelloClient } from "./trello-client";

export type PreparedTrelloAttachment =
  | { kind: "document"; name: string; bytes: Buffer }
  | {
      kind: "video";
      name: string;
      storedName: string;
      bytes: Buffer;
      contentType: "video/mp4" | "video/webm" | "video/quicktime";
    }
  | {
      kind: "photo";
      name: string;
      compressed: Awaited<
        ReturnType<typeof CatPhotoCompressionService.compress>
      >;
    };

const MAX_ATTACHMENT_COUNT = 100;
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 100 * 1024 * 1024;

export async function prepareTrelloAttachments(
  trello: TrelloClient,
  attachments: TrelloAttachment[],
): Promise<Array<PreparedTrelloAttachment | null>> {
  if (attachments.length > MAX_ATTACHMENT_COUNT) {
    throw new Error(
      `Trello card exceeds the ${MAX_ATTACHMENT_COUNT} attachment limit`,
    );
  }
  const results = Array.from({
    length: attachments.length,
  }) as Array<PreparedTrelloAttachment | null>;
  let nextIndex = 0;
  let retainedBytes = 0;
  await Promise.all(
    Array.from({ length: Math.min(5, attachments.length) }, async () => {
      while (nextIndex < attachments.length) {
        const index = nextIndex++;
        const result = await prepare(attachments[index], trello);
        if (result) {
          const size =
            result.kind === "photo"
              ? result.compressed.full.buffer.length +
                result.compressed.preview.buffer.length
              : result.bytes.length;
          retainedBytes += size;
          if (retainedBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
            retainedBytes -= size;
            results[index] = null;
            continue;
          }
        }
        results[index] = result;
      }
    }),
  );
  return results;
}

async function prepare(
  attachment: TrelloAttachment,
  trello: TrelloClient,
): Promise<PreparedTrelloAttachment | null> {
  if (!attachment.url) return null;
  try {
    const name =
      attachment.name ??
      new URL(attachment.url).pathname.split("/").pop() ??
      "attachment";
    const extension = name.split(".").pop()?.toLowerCase();
    const declaredType = attachment.mimeType?.toLowerCase() ?? "";
    const videoType: "video/mp4" | "video/webm" | "video/quicktime" | null =
      declaredType.startsWith("video/")
        ? declaredType === "video/mp4" ||
          declaredType === "video/webm" ||
          declaredType === "video/quicktime"
          ? (declaredType as "video/mp4" | "video/webm" | "video/quicktime")
          : null
        : extension === "mp4"
          ? "video/mp4"
          : extension === "webm"
            ? "video/webm"
            : extension === "mov"
              ? "video/quicktime"
              : null;
    if (declaredType.startsWith("video/") && !videoType) return null;

    const download = await trello.downloadAttachment(
      attachment.url,
      MAX_ATTACHMENT_BYTES,
    );
    const mimeType = videoType ?? (declaredType || download.contentType);
    if (mimeType === "application/pdf" || extension === "pdf") {
      return { kind: "document", name, bytes: download.bytes };
    }
    if (videoType) {
      const suffix =
        videoType === "video/mp4"
          ? "mp4"
          : videoType === "video/webm"
            ? "webm"
            : "mov";
      return {
        kind: "video",
        name,
        storedName: `${name.replace(/\.[^/.]+$/, "")}.${suffix}`,
        bytes: download.bytes,
        contentType: videoType,
      };
    }

    const extensionImageType =
      extension === "png"
        ? "image/png"
        : extension === "webp"
          ? "image/webp"
          : extension === "gif"
            ? "image/gif"
            : extension === "jpg" || extension === "jpeg"
              ? "image/jpeg"
              : null;
    const photoMimeType = mimeType.startsWith("image/")
      ? mimeType
      : download.contentType.startsWith("image/")
        ? download.contentType
        : extensionImageType;
    if (!photoMimeType) return null;
    const compressed = await CatPhotoCompressionService.compress({
      buffer: download.bytes,
      originalname: name,
      mimetype: photoMimeType,
    });
    return { kind: "photo", name, compressed };
  } catch (error) {
    console.error(
      `Trello attachment preparation failed (${attachment.name ?? "unnamed attachment"}): ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}
