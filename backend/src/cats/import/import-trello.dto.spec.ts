import { BadRequestException } from "@nestjs/common";
import { validate } from "class-validator";
import { ImportTrelloDto } from "./import-trello.dto";

describe("ImportTrelloDto", () => {
  it("trims and returns a valid short Trello card URL", () => {
    const dto = Object.assign(new ImportTrelloDto(), {
      trelloUrl: " https://trello.com/c/abc123 ",
    });
    expect(dto.toCommand()).toEqual({
      trelloUrl: "https://trello.com/c/abc123",
      transferAdopterByColumnName: false,
      tagName: null,
    });
  });

  it("is accepted by the global whitelist validation pipe", async () => {
    const dto = Object.assign(new ImportTrelloDto(), {
      trelloUrl: "https://trello.com/c/abc123",
    });
    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toEqual([]);
  });

  it("accepts a card URL with the card slug", () => {
    const dto = Object.assign(new ImportTrelloDto(), {
      trelloUrl: "https://trello.com/c/abc123/cat-name",
    });
    expect(dto.toCommand()).toEqual({
      trelloUrl: "https://trello.com/c/abc123/cat-name",
      transferAdopterByColumnName: false,
      tagName: null,
    });
  });

  it("keeps adopter-by-column transfer disabled by default and accepts true", () => {
    const dto = Object.assign(new ImportTrelloDto(), {
      trelloUrl: "https://trello.com/c/abc123",
      transferAdopterByColumnName: true,
    });
    expect(dto.toCommand()).toEqual({
      trelloUrl: "https://trello.com/c/abc123",
      transferAdopterByColumnName: true,
      tagName: null,
    });
  });

  it("trims an optional tag name and treats blank as omitted", () => {
    expect(
      Object.assign(new ImportTrelloDto(), {
        trelloUrl: "https://trello.com/c/abc123",
        tagName: "  Imported from board  ",
      }).toCommand(),
    ).toEqual({
      trelloUrl: "https://trello.com/c/abc123",
      transferAdopterByColumnName: false,
      tagName: "Imported from board",
    });
    expect(
      Object.assign(new ImportTrelloDto(), {
        trelloUrl: "https://trello.com/c/abc123",
        tagName: "   ",
      }).toCommand().tagName,
    ).toBeNull();
  });

  it("rejects a tag name longer than 40 characters", async () => {
    const dto = Object.assign(new ImportTrelloDto(), {
      trelloUrl: "https://trello.com/c/abc123",
      tagName: "a".repeat(41),
    });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
    await expect(
      validate(dto, { whitelist: true, forbidNonWhitelisted: true }),
    ).resolves.toHaveLength(1);
  });

  it.each([
    "",
    "https://trello.com/board/abc123",
    "http://trello.com/c/abc123",
    "https://trello.com/c/abc/invalid/extra",
    "https://evil.example/c/abc123",
  ])("rejects invalid Trello link %s", (trelloUrl) => {
    const dto = Object.assign(new ImportTrelloDto(), { trelloUrl });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });
});
