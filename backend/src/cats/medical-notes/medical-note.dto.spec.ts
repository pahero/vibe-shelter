import { BadRequestException } from "@nestjs/common";
import { CreateMedicalNoteDto, UpdateMedicalNoteDto } from "./medical-note.dto";

describe("medical note DTOs", () => {
  it("normalizes a complete create request", () => {
    const dto = Object.assign(new CreateMedicalNoteDto(), {
      date: "2026-09-27",
      comment: "  Appetite improved  ",
    });
    expect(dto.toCommand()).toEqual({
      date: new Date("2026-09-27T00:00:00.000Z"),
      comment: "Appetite improved",
    });
  });
  it("rejects an empty comment", () => {
    const dto = Object.assign(new CreateMedicalNoteDto(), {
      date: "2026-09-27",
      comment: " ",
    });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });
  it("preserves supplied update fields", () => {
    const dto = Object.assign(new UpdateMedicalNoteDto(), {
      date: "2026-09-26",
      comment: "  Resting  ",
    });
    expect(dto.toCommand()).toEqual({
      date: new Date("2026-09-26T00:00:00.000Z"),
      comment: "Resting",
    });
  });
});
