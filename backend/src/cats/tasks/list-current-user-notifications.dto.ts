import { BadRequestException } from "@nestjs/common";
import { IsOptional, IsString } from "class-validator";

export class ListCurrentUserNotificationsDto {
  @IsString()
  @IsOptional()
  skip?: string;

  @IsString()
  @IsOptional()
  limit?: string;

  toQuery(
    userId: string,
    isTest: boolean,
  ): { userId: string; isTest: boolean; skip: number; limit: number } {
    const skip = this.parse(this.skip, 0, "skip");
    const limit = this.parse(this.limit, 50, "limit");
    if (limit < 1 || limit > 100) throw new BadRequestException("limit must be between 1 and 100");
    return { userId, isTest, skip, limit };
  }

  private parse(value: string | undefined, defaultValue: number, field: string): number {
    if (value === undefined) return defaultValue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0)
      throw new BadRequestException(`${field} must be a non-negative integer`);
    return parsed;
  }
}
