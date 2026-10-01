import { BadRequestException } from "@nestjs/common";
import { CreateCatTagDto, UpdateCatTagDto } from "./create-cat-tag.dto";
import { CreateCatWeightDto } from "./create-cat-weight.dto";

describe("cat DTO command conversion", () => {
  it("normalizes required and optional tag creation fields", () => {
    const dto = Object.assign(new CreateCatTagDto(), {
      name: "  Foster  ",
      color: " #8ECAFF ",
    });
    expect(dto.toCommand()).toEqual({ name: "Foster", color: "#8ecaff" });
  });

  it("requires a nonblank tag name during conversion", () => {
    const dto = Object.assign(new CreateCatTagDto(), { name: "  " });
    expect(() => dto.toCommand()).toThrow(BadRequestException);
  });

  it("preserves only provided tag update values", () => {
    const dto = Object.assign(new UpdateCatTagDto(), { color: " #FFD166 " });
    expect(dto.toCommand()).toEqual({ color: "#ffd166" });
  });

  it("converts weight measurements into dates", () => {
    const dto = Object.assign(new CreateCatWeightDto(), {
      weightKg: 4.2,
      measuredAt: "2026-07-30",
    });
    expect(dto.toCommand()).toEqual({
      weightKg: 4.2,
      measuredAt: new Date("2026-07-30"),
    });
  });

  it("rejects missing measurement dates", () => {
    const dto = Object.assign(new CreateCatWeightDto(), {
      weightKg: 4.2,
      measuredAt: "",
    });
    expect(() => dto.toCommand()).toThrow("measuredAt is required");
  });

  it("rejects invalid measurement dates", () => {
    const dto = Object.assign(new CreateCatWeightDto(), {
      weightKg: 4.2,
      measuredAt: "invalid",
    });
    expect(() => dto.toCommand()).toThrow("measuredAt must be a valid date");
  });
});
