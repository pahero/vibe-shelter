import { BadRequestException } from "@nestjs/common";
import { IsNumber, IsOptional, Max, Min } from "class-validator";

export class SetPrimaryCatPhotoDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  positionY?: number | null;

  toCommand(): { positionY: number | null | undefined } {
    if (
      this.positionY !== undefined &&
      this.positionY !== null &&
      (!Number.isFinite(this.positionY) || this.positionY < 0 || this.positionY > 100)
    ) {
      throw new BadRequestException("positionY must be between 0 and 100");
    }
    return { positionY: this.positionY };
  }
}
