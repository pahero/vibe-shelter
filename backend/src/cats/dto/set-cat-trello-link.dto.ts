import { BadRequestException } from "@nestjs/common";
import { Allow } from "class-validator";

export class SetCatTrelloLinkDto {
  @Allow()
  trelloUrl!: string | null;

  toCommand(): { trelloUrl: string | null } {
    if (this.trelloUrl === null) return { trelloUrl: null };
    if (
      typeof this.trelloUrl !== "string" ||
      !/^https:\/\/trello\.com\/c\/[A-Za-z0-9]+$/.test(this.trelloUrl)
    ) {
      throw new BadRequestException(
        "trelloUrl must be a Trello card URL in the format https://trello.com/c/<id>",
      );
    }
    return { trelloUrl: this.trelloUrl };
  }
}
