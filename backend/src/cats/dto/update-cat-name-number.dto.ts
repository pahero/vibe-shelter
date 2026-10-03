import { BadRequestException } from "@nestjs/common";
import { IsInt, Min } from "class-validator";

export class UpdateCatNameNumberDto {
  @IsInt()
  @Min(1)
  nameNumber!: number;

  toCommand(): { nameNumber: number } {
    if (!Number.isInteger(this.nameNumber) || this.nameNumber < 1)
      throw new BadRequestException("nameNumber must be a positive integer");
    return { nameNumber: this.nameNumber };
  }
}
