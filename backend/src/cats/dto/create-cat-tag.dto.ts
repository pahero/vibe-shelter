import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCatTagDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
