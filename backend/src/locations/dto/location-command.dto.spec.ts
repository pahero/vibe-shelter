import { CreateLocationDto } from "./create-location.dto";
import { UpdateLocationDto } from "./update-location.dto";

describe("location DTO command conversion", () => {
  it("trims create fields and preserves omitted optionals", () => {
    const dto = Object.assign(new CreateLocationDto(), {
      name: "  Shelter  ",
      description: "  Main  ",
      ownerIds: [" user-1 ", " user-2 "],
    });
    expect(dto.toCommand()).toEqual({
      name: "Shelter",
      description: "Main",
      ownerIds: ["user-1", "user-2"],
    });
    expect(
      Object.assign(new CreateLocationDto(), { name: "Shelter" }).toCommand(),
    ).toEqual({ name: "Shelter" });
  });

  it("normalizes provided update values and preserves explicitly cleared nullable values", () => {
    const dto = Object.assign(new UpdateLocationDto(), {
      name: "  New  ",
      description: "  ",
      ownerIds: [],
      status: "INACTIVE",
    });
    expect(dto.toCommand()).toEqual({
      name: "New",
      description: null,
      ownerIds: [],
      status: "INACTIVE",
    });
    expect(new UpdateLocationDto().toCommand()).toEqual({});
  });
});
