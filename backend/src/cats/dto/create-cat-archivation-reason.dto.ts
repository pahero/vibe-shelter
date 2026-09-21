import { IsString } from 'class-validator';

export class CreateCatArchivationReasonDto {
  @IsString()
  name!: string;
}

export class UpdateCatArchivationReasonDto {
  @IsString()
  name!: string;
}

export class ArchiveCatDto {
  @IsString()
  reasonId!: string;
}
