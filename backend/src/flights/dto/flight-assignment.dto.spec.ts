import { BadRequestException } from "@nestjs/common";
import {
  AssignCatToFlightDto,
  UpdateFlightCatAssignmentDto,
} from "./flight-assignment.dto";

describe("Flight assignment DTOs", () => {
  it("trims and projects cat assignment values", () => {
    const dto = Object.assign(new AssignCatToFlightDto(), {
      catId: "  cat-1  ",
    });
    expect(dto.toCommand("flight-1", "user-1", true)).toEqual({
      flightId: "flight-1",
      catId: "cat-1",
      actorUserId: "user-1",
      isTest: true,
    });
  });

  it("rejects an empty cat ID", () => {
    const dto = Object.assign(new AssignCatToFlightDto(), { catId: "  " });
    expect(() => dto.toCommand("flight-1", "user-1", false)).toThrow(
      new BadRequestException("catId is required"),
    );
  });

  it("preserves both optional status values and actor projection", () => {
    const dto = Object.assign(new UpdateFlightCatAssignmentDto(), {
      f2fDone: true,
      tracesDone: false,
    });
    expect(dto.toCommand("assignment-1", "user-1", true)).toEqual({
      assignmentId: "assignment-1",
      f2fDone: true,
      tracesDone: false,
      actorUserId: "user-1",
      isTest: true,
    });
  });

  it("allows omitted status fields", () => {
    const dto = new UpdateFlightCatAssignmentDto();
    expect(dto.toCommand("assignment-1", "user-1", false)).toMatchObject({
      f2fDone: undefined,
      tracesDone: undefined,
    });
  });
});
