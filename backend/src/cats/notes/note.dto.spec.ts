import { BadRequestException } from "@nestjs/common";
import { CreateNoteDto, UpdateNoteDto } from "./note.dto";
describe("note DTOs", () => {
  it("normalizes a create request", () => {
    const dto = Object.assign(new CreateNoteDto(), {
      date: "2026-09-27",
      comment: "  Monitor appetite  ",
    });
    expect(dto.toCommand()).toEqual({
      date: new Date("2026-09-27T00:00:00.000Z"),
      comment: "Monitor appetite",
    });
  });
  it("rejects an empty comment", () => {
    const dto = Object.assign(new CreateNoteDto(), {
      date: "2026-09-27",
      comment: " ",
    });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });
  it("converts supplied update fields", () => {
    const dto = Object.assign(new UpdateNoteDto(), {
      date: "2026-09-26",
      comment: "  Resting  ",
    });
    expect(dto.toCommand()).toEqual({
      date: new Date("2026-09-26T00:00:00.000Z"),
      comment: "Resting",
    });
  });
});
