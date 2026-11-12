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
    expect(dto.toCommand()).toEqual({
      type: "CORE",
      date: new Date("2026-01-02"),
      nextDueDate: new Date("2027-01-02"),
      vaccineName: "Core vaccine",
    });
  });

  it("requires a vaccine name and rabies valid-from date while allowing due date to be omitted or cleared", () => {
    expect(
      Object.assign(new CreateVaccinationDto(), {
        type: "RABIES",
        date: "2026-01-02",
        validFrom: "2026-01-23",
        vaccineName: "Rabies vaccine",
      }).toCommand(),
    ).toEqual({
      type: "RABIES",
      date: new Date("2026-01-02"),
      validFrom: new Date("2026-01-23"),
      nextDueDate: undefined,
      vaccineName: "Rabies vaccine",
    });
    expect(
      Object.assign(new UpdateVaccinationDto(), {
        nextDueDate: "",
        vaccineName: "Updated name",
      }).toCommand(),
    ).toEqual({ nextDueDate: null, vaccineName: "Updated name" });
    expect(() =>
      Object.assign(new CreateVaccinationDto(), {
        type: "RABIES",
        date: "2026-01-02",
        vaccineName: "Rabies vaccine",
      }).toCommand(),
    ).toThrow(BadRequestException);
    expect(() =>
      Object.assign(new CreateVaccinationDto(), {
        type: "CORE",
        date: "2026-01-02",
        vaccineName: " ",
      }).toCommand(),
    ).toThrow(BadRequestException);
  });

  it("rejects invalid required or optional dates and types", () => {
    expect(() =>
      Object.assign(new CreateVaccinationDto(), {
        type: "BAD",
        date: "2026-01-01",
      }).toCommand(),
    ).toThrow(BadRequestException);
    expect(() =>
      Object.assign(new CreateVaccinationDto(), {
        type: "CORE",
        date: "not-date",
      }).toCommand(),
    ).toThrow(BadRequestException);
    expect(() =>
      Object.assign(new UpdateVaccinationDto(), {
        nextDueDate: "not-date",
      }).toCommand(),
    ).toThrow(BadRequestException);
    expect(() =>
      Object.assign(new UpdateVaccinationDto(), { type: "BAD" }).toCommand(),
    ).toThrow(BadRequestException);
  });
});
