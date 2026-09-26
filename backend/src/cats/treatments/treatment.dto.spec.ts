import { BadRequestException } from "@nestjs/common";
import { CreateTreatmentDto, UpdateTreatmentDto } from "./treatment.dto";

describe("treatment DTOs", () => {
  it("normalizes a complete create request", () => {
    const dto = Object.assign(new CreateTreatmentDto(), { shortName: "  Antibiotic  ", instructions: "  Give with food  ", startDate: "2026-09-01", endDate: "2026-09-03", dosesPerDay: 2 });
    expect(dto.toCommand()).toEqual({ shortName: "Antibiotic", instructions: "Give with food", startDate: new Date("2026-09-01T00:00:00.000Z"), endDate: new Date("2026-09-03T00:00:00.000Z"), dosesPerDay: 2 });
  });

  it("rejects a date range that ends before it starts", () => {
    const dto = Object.assign(new CreateTreatmentDto(), { shortName: "Antibiotic", instructions: "Give", startDate: "2026-09-03", endDate: "2026-09-01", dosesPerDay: 1 });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });

  it("preserves an explicit null end date for updates", () => {
    const dto = Object.assign(new UpdateTreatmentDto(), { endDate: null });
    expect(dto.toCommand()).toEqual({ endDate: null });
  });

  it("accepts omitted instructions as null", () => {
    const dto = Object.assign(new CreateTreatmentDto(), { shortName: "Antibiotic", startDate: "2026-09-01", dosesPerDay: 1 });
    expect(dto.toCommand()).toMatchObject({ instructions: null });
  });
});
