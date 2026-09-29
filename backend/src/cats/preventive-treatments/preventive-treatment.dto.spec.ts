import { BadRequestException } from "@nestjs/common";
import { CreatePreventiveTreatmentDto, UpdatePreventiveTreatmentDto } from "./preventive-treatment.dto";

describe("preventive treatment DTOs", () => {
  it("normalizes a create request", () => {
    const dto = Object.assign(new CreatePreventiveTreatmentDto(), { date: "2026-09-27", name: "  Felocell  ", type: "FIRST_VACCINE" });
    expect(dto.toCommand()).toEqual({ date: new Date("2026-09-27T00:00:00.000Z"), name: "Felocell", type: "FIRST_VACCINE" });
  });
  it("rejects an empty medicine name", () => {
    const dto = Object.assign(new CreatePreventiveTreatmentDto(), { date: "2026-09-27", name: " " });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });
  it("defaults legacy create requests to OTHER and rejects an unknown type", () => {
    const dto = Object.assign(new CreatePreventiveTreatmentDto(), { date: "2026-09-27", name: "  Flea medicine  " });
    expect(dto.toCommand().type).toBe("OTHER");
    Object.assign(dto, { type: "UNKNOWN" });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });
  it("converts supplied update fields", () => {
    const dto = Object.assign(new UpdatePreventiveTreatmentDto(), { date: "2026-09-26", name: "  Advocate  " });
    expect(dto.toCommand()).toEqual({ date: new Date("2026-09-26T00:00:00.000Z"), name: "Advocate" });
  });
  it("normalizes an updated vaccine type", () => {
    const dto = Object.assign(new UpdatePreventiveTreatmentDto(), { type: "RABIES" });
    expect(dto.toCommand()).toEqual({ type: "RABIES" });
  });
});
