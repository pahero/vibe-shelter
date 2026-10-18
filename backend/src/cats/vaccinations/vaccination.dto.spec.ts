import { BadRequestException } from "@nestjs/common";
import { CreateVaccinationDto, UpdateVaccinationDto } from "./vaccination.dto";

describe("Vaccination DTOs", () => {
  it("parses required and optional vaccination fields", () => {
    const dto = Object.assign(new CreateVaccinationDto(), {
      type: "CORE",
      date: "2026-01-02",
      nextDueDate: "2027-01-02",
      vaccineName: "  Core vaccine  ",
    });
    expect(dto.toCommand()).toEqual({ type: "CORE", date: new Date("2026-01-02"), nextDueDate: new Date("2027-01-02"), vaccineName: "Core vaccine" });
  });

  it("allows optional due date and name to be omitted or cleared", () => {
    expect(Object.assign(new CreateVaccinationDto(), { type: "RABIES", date: "2026-01-02" }).toCommand()).toEqual({ type: "RABIES", date: new Date("2026-01-02"), nextDueDate: undefined, vaccineName: undefined });
    expect(Object.assign(new UpdateVaccinationDto(), { nextDueDate: "", vaccineName: " " }).toCommand()).toEqual({ nextDueDate: null, vaccineName: null });
  });

  it("rejects invalid required or optional dates and types", () => {
    expect(() => Object.assign(new CreateVaccinationDto(), { type: "BAD", date: "2026-01-01" }).toCommand()).toThrow(BadRequestException);
    expect(() => Object.assign(new CreateVaccinationDto(), { type: "CORE", date: "not-date" }).toCommand()).toThrow(BadRequestException);
    expect(() => Object.assign(new UpdateVaccinationDto(), { nextDueDate: "not-date" }).toCommand()).toThrow(BadRequestException);
    expect(() => Object.assign(new UpdateVaccinationDto(), { type: "BAD" }).toCommand()).toThrow(BadRequestException);
  });
});
