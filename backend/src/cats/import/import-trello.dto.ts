import { BadRequestException } from "@nestjs/common";
import { IsString } from "class-validator";

export class ImportTrelloDto {
  @IsString()
  trelloUrl!: string;

  toCommand(): string {
    const trelloUrl = this.trelloUrl?.trim();
    if (
      !trelloUrl ||
      !/^https:\/\/trello\.com\/c\/[A-Za-z0-9]+(?:\/[^/?#]+)?$/.test(trelloUrl)
    ) {
      throw new BadRequestException("trelloUrl must be a Trello card URL");
    }
    return trelloUrl;
  }
}
