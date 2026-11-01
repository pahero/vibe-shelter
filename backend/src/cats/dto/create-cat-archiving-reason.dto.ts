import { IsDateString, IsOptional, IsString } from "class-validator";

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

  @IsDateString({ strict: true })
  archivingDate!: string;

  toCommand(catId: string, actorUserId: string, currentUserIsTest: boolean) {
    return {
      catId,
      reasonId: this.reasonId,
      archivedAt: new Date(`${this.archivingDate}T00:00:00.000Z`),
      actorUserId,
      currentUserIsTest,
    };
  }
}

export class DeleteCatArchivingReasonDto {
  @IsOptional()
  @IsString()
  replacementReasonId?: string;
}
