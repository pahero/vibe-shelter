import { BadRequestException } from "@nestjs/common";
import { IsBoolean, IsOptional, IsString } from "class-validator";
import { AssignCatToFlightCommand } from "../commands/assign-cat-to-flight.command";
import { UpdateFlightCatAssignmentCommand } from "../commands/update-flight-cat-assignment.command";

export class AssignCatToFlightDto {
  @IsString()
  catId!: string;

  toCommand(
    flightId: string,
    actorUserId: string,
    isTest: boolean,
  ): AssignCatToFlightCommand {
    const catId = this.catId?.trim();
    if (!catId) throw new BadRequestException("catId is required");
    return new AssignCatToFlightCommand(flightId, catId, actorUserId, isTest);
  }
}

export class UpdateFlightCatAssignmentDto {
  @IsBoolean()
  @IsOptional()
  f2fDone?: boolean;

  @IsBoolean()
  @IsOptional()
  tracesDone?: boolean;

  toCommand(
    assignmentId: string,
    actorUserId: string,
    isTest: boolean,
  ): UpdateFlightCatAssignmentCommand {
    return new UpdateFlightCatAssignmentCommand(
      assignmentId,
      this.f2fDone,
      this.tracesDone,
      actorUserId,
      isTest,
    );
  }
}
