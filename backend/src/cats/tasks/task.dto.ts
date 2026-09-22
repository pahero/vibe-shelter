import { BadRequestException } from "@nestjs/common";
import { ArrayMinSize, IsArray, IsDateString, IsOptional, IsString } from "class-validator";

export type TaskPayload = { comment: string; dueDate: Date; receiverIds: string[] };

export class TaskDto {
  @IsString()
  comment!: string;

  @IsDateString()
  dueDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  receiverIds!: string[];

  toPayload(): TaskPayload {
    const comment = this.comment?.trim();
    if (!comment) throw new BadRequestException("Task comment is required");
    const dueDate = new Date(this.dueDate);
    if (Number.isNaN(dueDate.getTime()))
      throw new BadRequestException("dueDate must be a valid date");
    const receiverIds = [...new Set(this.receiverIds.map((id) => id.trim()).filter(Boolean))];
    if (receiverIds.length === 0)
      throw new BadRequestException("At least one notification receiver is required");
    return { comment, dueDate, receiverIds };
  }
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  comment?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsOptional()
  receiverIds?: string[];

  toPayload(): Partial<TaskPayload> {
    const result: Partial<TaskPayload> = {};
    if (this.comment !== undefined) {
      const comment = this.comment.trim();
      if (!comment) throw new BadRequestException("Task comment is required");
      result.comment = comment;
    }
    if (this.dueDate !== undefined) {
      const dueDate = new Date(this.dueDate);
      if (Number.isNaN(dueDate.getTime()))
        throw new BadRequestException("dueDate must be a valid date");
      result.dueDate = dueDate;
    }
    if (this.receiverIds !== undefined) {
      const receiverIds = [...new Set(this.receiverIds.map((id) => id.trim()).filter(Boolean))];
      if (receiverIds.length === 0)
        throw new BadRequestException("At least one notification receiver is required");
      result.receiverIds = receiverIds;
    }
    return result;
  }
}
