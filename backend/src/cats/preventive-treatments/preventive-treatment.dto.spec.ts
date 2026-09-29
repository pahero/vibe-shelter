import { BadRequestException } from "@nestjs/common";
import { CreatePreventiveTreatmentDto, UpdatePreventiveTreatmentDto } from "./preventive-treatment.dto";

describe("preventive treatment DTOs", () => {
  it("normalizes a create request", () => {
    const dto = Object.assign(new CreatePreventiveTreatmentDto(), { date: "2026-09-27", name: "  Felocell  " });
    expect(dto.toCommand()).toEqual({ date: new Date("2026-09-27T00:00:00.000Z"), name: "Felocell" });
  });
  it("rejects an empty medicine name", () => {
    const dto = Object.assign(new CreatePreventiveTreatmentDto(), { date: "2026-09-27", name: " " });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });
  it("converts supplied update fields", () => {
    const dto = Object.assign(new UpdatePreventiveTreatmentDto(), { date: "2026-09-26", name: "  Advocate  " });
    expect(dto.toCommand()).toEqual({ date: new Date("2026-09-26T00:00:00.000Z"), name: "Advocate" });
  });
});
