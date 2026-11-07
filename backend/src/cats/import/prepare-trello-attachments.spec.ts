import { ConfigService } from "@nestjs/config";
import { TrelloAttachment, TrelloClient } from "./trello-client";
import { prepareTrelloAttachments } from "./prepare-trello-attachments";

describe("prepareTrelloAttachments", () => {
  afterEach(() => vi.restoreAllMocks());

  it("downloads no more than five Trello attachments concurrently", async () => {
    let active = 0;
    let peak = 0;
    const trello = new AttachmentTrelloClient(async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return {
        bytes: Buffer.from("%PDF-1.4 test"),
        contentType: "application/pdf",
      };
    });
    const attachments = Array.from({ length: 8 }, (_, index) => ({
      name: `file-${index}.pdf`,
      url: `https://trello.com/attachments/${index}.pdf`,
      mimeType: "application/pdf",
    }));

    const prepared = await prepareTrelloAttachments(trello, attachments);

    expect(peak).toBe(5);
    expect(prepared).toHaveLength(8);
    expect(
      prepared.every((attachment) => attachment?.kind === "document"),
    ).toBe(true);
  });

  it("skips attachments without URLs and unsupported or unavailable files", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const trello = new AttachmentTrelloClient(async () => {
      throw new Error("Download failed");
    });
    const attachments: TrelloAttachment[] = [
      { name: "missing.pdf", mimeType: "application/pdf" },
      {
        name: "unsupported.mkv",
        url: "https://trello.com/attachments/unsupported.mkv",
        mimeType: "video/x-matroska",
      },
      {
        name: "unavailable.pdf",
        url: "https://trello.com/attachments/unavailable.pdf",
        mimeType: "application/pdf",
      },
    ];

    await expect(
      prepareTrelloAttachments(trello, attachments),
    ).resolves.toEqual([null, null, null]);
    expect(errorSpy).toHaveBeenCalledOnce();
  });
});

class AttachmentTrelloClient extends TrelloClient {
  constructor(
    private readonly download: () => Promise<{
      bytes: Buffer;
      contentType: string;
    }>,
  ) {
    super(new ConfigService());
  }

  override async downloadAttachment() {
    return this.download();
  }
}
