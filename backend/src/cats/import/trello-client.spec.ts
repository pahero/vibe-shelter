import {
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TrelloClient } from "./trello-client";

describe("TrelloClient", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("loads a card, its labels, checklists and attachments from the specified card URL", async () => {
    const payload = {
      id: "0123456789abcdef01234567",
      name: "Momo",
      url: "https://trello.com/c/abc123/momo",
      shortUrl: "https://trello.com/c/abc123",
      desc: "",
      idLabels: [],
      labels: [{ id: "label-1", name: "male" }],
      checklists: [],
      attachments: [],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(payload)))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              name: "Documents",
              checkItems: [{ name: "Passport", state: "complete" }],
            },
          ]),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              name: "cat-photo.jpg",
              url: "https://trello-attachments.s3.amazonaws.com/cat-photo.jpg",
              mimeType: "image/jpeg",
              isUpload: true,
            },
          ]),
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      client().getCard("https://trello.com/c/abc123"),
    ).resolves.toMatchObject({
      ...payload,
      checklists: [
        {
          name: "Documents",
          checkItems: [{ name: "Passport", state: "complete" }],
        },
      ],
      attachments: [
        {
          name: "cat-photo.jpg",
          url: "https://trello-attachments.s3.amazonaws.com/cat-photo.jpg",
          mimeType: "image/jpeg",
          isUpload: true,
        },
      ],
    });
    const requestUrl = new URL(fetchMock.mock.calls[0][0] as URL);
    expect(requestUrl.pathname).toBe("/1/cards/abc123");
    expect(requestUrl.searchParams.get("fields")).toBe("all");
    expect(requestUrl.searchParams.get("checklists")).toBe("all");
    expect(requestUrl.searchParams.get("checklist_fields")).toBe("all");
    expect(requestUrl.searchParams.get("attachments")).toBe("true");
    const checklistUrl = new URL(fetchMock.mock.calls[1][0] as URL);
    expect(checklistUrl.pathname).toBe(
      "/1/cards/0123456789abcdef01234567/checklists",
    );
    expect(checklistUrl.searchParams.get("checkItems")).toBe("all");
    const attachmentsUrl = new URL(fetchMock.mock.calls[2][0] as URL);
    expect(attachmentsUrl.pathname).toBe(
      "/1/cards/0123456789abcdef01234567/attachments",
    );
  });

  it("rejects malformed card links before calling Trello", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      client().getCard("https://trello.com/board/abc123"),
    ).rejects.toThrow(BadRequestException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires API credentials", async () => {
    await expect(
      new TrelloClient(new ConfigService()).getCard(
        "https://trello.com/c/abc123",
      ),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it.each([404, 503])(
    "translates Trello response status %s to the expected service error",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response("", { status })),
      );
      const result = client().getCard("https://trello.com/c/abc123");
      await expect(result).rejects.toThrow(
        status === 404 ? BadRequestException : ServiceUnavailableException,
      );
    },
  );

  it("downloads HTTPS attachments and rejects non-HTTPS URLs", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("photo", {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      client().downloadAttachment("http://trello.com/file.jpg"),
    ).rejects.toThrow(BadRequestException);
    await expect(
      client().downloadAttachment("https://example.com/file.jpg"),
    ).rejects.toThrow(BadRequestException);
    await expect(
      client().downloadAttachment("https://trello.com/file.jpg"),
    ).resolves.toMatchObject({
      contentType: "image/jpeg",
      bytes: Buffer.from("photo"),
    });
  });

  it("reports failed attachment downloads", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 401 })),
    );
    await expect(
      client().downloadAttachment("https://trello.com/file.jpg"),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it("uses Trello OAuth authentication for private attachment downloads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("photo", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await client().downloadAttachment(
      "https://trello.com/1/cards/abc123/attachments/att123/download/photo.jpg",
    );

    expect(new URL(fetchMock.mock.calls[0][0] as URL).hostname).toBe(
      "api.trello.com",
    );
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: {
        Authorization: 'OAuth oauth_consumer_key="key", oauth_token="token"',
      },
    });
  });
});

function client(): TrelloClient {
  return new TrelloClient(
    new ConfigService({ TRELLO_API_KEY: "key", TRELLO_TOKEN: "token" }),
  );
}
