import { BadRequestException } from "@nestjs/common";
import { CreateFlightDto, UpdateFlightDto } from "./flight.dto";

describe("Flight DTOs", () => {
  it("normalizes create fields and projects actor and partition", () => {
    const dto = Object.assign(new CreateFlightDto(), {
      date: "2026-10-15",
      airport: "  Larnaca  ",
      flightNumber: "  CY123  ",
      flightParent: "  Morgan Parent  ",
    });
    expect(dto.toCommand("user-1", true)).toMatchObject({
      date: new Date("2026-10-15T00:00:00.000Z"),
      airport: "Larnaca",
      flightNumber: "CY123",
      flightParent: "Morgan Parent",
      actorUserId: "user-1",
      isTest: true,
    });
  });

  it.each([
    ["airport", "  "],
    ["flightNumber", ""],
    ["flightParent", "  "],
  ])("rejects an empty create %s", (field, value) => {
    const dto = Object.assign(new CreateFlightDto(), {
      date: "2026-10-15",
      airport: "Larnaca",
      flightNumber: "CY123",
      flightParent: "Morgan Parent",
      [field]: value,
    });
    expect(() => dto.toCommand("user-1", false)).toThrow(BadRequestException);
  });

  it("rejects impossible and non-ISO dates", () => {
    const dto = Object.assign(new CreateFlightDto(), {
      date: "2026-02-30",
      airport: "Larnaca",
      flightNumber: "CY123",
      flightParent: "Morgan Parent",
    });
    expect(() => dto.toCommand("user-1", false)).toThrow(
      new BadRequestException("date must be a valid ISO date"),
    );
    Object.assign(dto, { date: "not-a-date" });
    expect(() => dto.toCommand("user-1", false)).toThrow(BadRequestException);
  });

  it("parses all populated update fields and leaves omitted fields undefined", () => {
    const dto = Object.assign(new UpdateFlightDto(), {
      date: "2026-11-02",
      airport: "  Paphos ",
      flightNumber: "  CY456 ",
      flightParent: "  Jamie Parent  ",
    });
    expect(dto.toCommand("flight-1", "user-2", false)).toMatchObject({
      flightId: "flight-1",
      date: new Date("2026-11-02T00:00:00.000Z"),
      airport: "Paphos",
      flightNumber: "CY456",
      flightParent: "Jamie Parent",
      actorUserId: "user-2",
      isTest: false,
    });
    const empty = new UpdateFlightDto().toCommand("flight-1", "user-2", false);
    expect(empty).toMatchObject({
      date: undefined,
      airport: undefined,
      flightNumber: undefined,
      flightParent: undefined,
    });
  });

  it("normalizes empty optional update values and rejects invalid update dates", () => {
    const dto = Object.assign(new UpdateFlightDto(), { airport: "  " });
    expect(() => dto.toCommand("flight-1", "user-2", false)).toThrow(
      new BadRequestException("airport is required"),
    );
    Object.assign(dto, { airport: undefined, date: "2026-02-30" });
    expect(() => dto.toCommand("flight-1", "user-2", false)).toThrow(
      BadRequestException,
    );
  });

  it.each([
    ["airport", "  "],
    ["flightNumber", "  "],
    ["flightParent", "  "],
  ])("rejects an empty optional update %s", (field, value) => {
    const dto = Object.assign(new UpdateFlightDto(), { [field]: value });
    expect(() => dto.toCommand("flight-1", "user-2", false)).toThrow(
      BadRequestException,
    );
  });
});
