import { BadRequestException } from "@nestjs/common";
import { SetCatTrelloLinkDto } from "./set-cat-trello-link.dto";

describe("SetCatTrelloLinkDto", () => {
  it("accepts the specified Trello URL", () => {
    expect(
      Object.assign(new SetCatTrelloLinkDto(), {
        trelloUrl: "https://trello.com/c/wqNVNDIs",
      }).toCommand(),
    ).toEqual({ trelloUrl: "https://trello.com/c/wqNVNDIs" });
  });
  it("accepts null to clear the link", () => {
    expect(
      Object.assign(new SetCatTrelloLinkDto(), { trelloUrl: null }).toCommand(),
    ).toEqual({ trelloUrl: null });
  });
  it.each([
    undefined,
    "",
    "http://trello.com/c/wqNVNDIs",
    "https://trello.com/board/wqNVNDIs",
    "https://trello.com/c/foo/bar",
    "https://evil.com/c/wqNVNDIs",
    42,
  ])("rejects invalid URL %s", (trelloUrl) => {
    expect(() =>
      Object.assign(new SetCatTrelloLinkDto(), { trelloUrl }).toCommand(),
    ).toThrow(BadRequestException);
  });
});
