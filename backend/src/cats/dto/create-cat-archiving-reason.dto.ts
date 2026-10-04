import { IsOptional, IsString } from "class-validator";

export class CreateCatArchivingReasonDto {
  @IsString()
  name!: string;
}

export class UpdateCatArchivingReasonDto {
  @IsString()
  name!: string;
}

export class ArchiveCatDto {
  @IsString()
  reasonId!: string;
}

export class DeleteCatArchivingReasonDto {
  @IsOptional()
  @IsString()
  replacementReasonId?: string;
}
