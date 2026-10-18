import { BadRequestException } from "@nestjs/common";
import { CreateParasiteTreatmentDto, UpdateParasiteTreatmentDto } from "./parasite-treatment.dto";

describe("Parasite treatment DTOs", () => {
  it("parses required and optional treatment fields", () => {
    const dto = Object.assign(new CreateParasiteTreatmentDto(), {
      type: "FLEAS_TICKS",
      date: "2026-01-02",
      nextDueDate: "2026-04-02",
      productName: "  Spot-on  ",
    });
    expect(dto.toCommand()).toEqual({ type: "FLEAS_TICKS", date: new Date("2026-01-02"), nextDueDate: new Date("2026-04-02"), productName: "Spot-on" });
  });

  it("allows an omitted or cleared due date and requires a nonblank product name", () => {
    expect(Object.assign(new CreateParasiteTreatmentDto(), { type: "OTHER", date: "2026-01-02", productName: "Product" }).toCommand()).toEqual({ type: "OTHER", date: new Date("2026-01-02"), nextDueDate: undefined, productName: "Product" });
    expect(Object.assign(new UpdateParasiteTreatmentDto(), { nextDueDate: "" }).toCommand()).toEqual({ nextDueDate: null });
    expect(() => Object.assign(new CreateParasiteTreatmentDto(), { type: "OTHER", date: "2026-01-02", productName: " " }).toCommand()).toThrow(BadRequestException);
    expect(() => Object.assign(new UpdateParasiteTreatmentDto(), { productName: " " }).toCommand()).toThrow(BadRequestException);
  });

  it("rejects invalid dates and types", () => {
    expect(() => Object.assign(new CreateParasiteTreatmentDto(), { type: "BAD", date: "2026-01-02", productName: "Product" }).toCommand()).toThrow(BadRequestException);
    expect(() => Object.assign(new CreateParasiteTreatmentDto(), { type: "OTHER", date: "not-date", productName: "Product" }).toCommand()).toThrow(BadRequestException);
    expect(() => Object.assign(new UpdateParasiteTreatmentDto(), { nextDueDate: "bad" }).toCommand()).toThrow(BadRequestException);
    expect(() => Object.assign(new UpdateParasiteTreatmentDto(), { type: "BAD" }).toCommand()).toThrow(BadRequestException);
  });
});
