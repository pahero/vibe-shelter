import { BadRequestException } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class ImportTrelloDto {
  @IsString()
  trelloUrl!: string;

  @IsOptional()
  @IsBoolean()
  transferAdopterByColumnName?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  tagName?: string | null;

  toCommand(): {
    trelloUrl: string;
    transferAdopterByColumnName: boolean;
    tagName: string | null;
  } {
    const trelloUrl = this.trelloUrl?.trim();
    if (
      !trelloUrl ||
      !/^https:\/\/trello\.com\/c\/[A-Za-z0-9]+(?:\/[^/?#]+)?$/.test(trelloUrl)
    ) {
      throw new BadRequestException("trelloUrl must be a Trello card URL");
    }
    const tagName = this.tagName?.trim() || null;
    if (tagName && tagName.length > 40)
      throw new BadRequestException("tagName must be at most 40 characters");
    return {
      trelloUrl,
      transferAdopterByColumnName: this.transferAdopterByColumnName === true,
      tagName,
    };
  }
}
