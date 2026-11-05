import { BadRequestException } from "@nestjs/common";
import { validate } from "class-validator";
import { ImportTrelloDto } from "./import-trello.dto";

describe("ImportTrelloDto", () => {
  it("trims and returns a valid short Trello card URL", () => {
    const dto = Object.assign(new ImportTrelloDto(), {
      trelloUrl: " https://trello.com/c/abc123 ",
    });
    expect(dto.toCommand()).toBe("https://trello.com/c/abc123");
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
    expect(dto.toCommand()).toBe("https://trello.com/c/abc123/cat-name");
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
