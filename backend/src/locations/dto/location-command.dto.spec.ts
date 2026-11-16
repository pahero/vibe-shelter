import { CreateLocationDto } from "./create-location.dto";
import { UpdateLocationDto } from "./update-location.dto";

describe("location DTO command conversion", () => {
  it("trims create fields and preserves omitted optionals", () => {
    const dto = Object.assign(new CreateLocationDto(), {
      name: "  Shelter  ",
      ownerIds: [" user-1 ", " user-2 "],
      parentId: " parent-1 ",
    });
    expect(dto.toCommand()).toEqual({
      name: "Shelter",
      ownerIds: ["user-1", "user-2"],
      parentId: "parent-1",
    });
    expect(
      Object.assign(new CreateLocationDto(), { name: "Shelter" }).toCommand(),
    ).toEqual({ name: "Shelter" });
  });

  it("normalizes provided update values and preserves explicitly cleared nullable values", () => {
    const dto = Object.assign(new UpdateLocationDto(), {
      name: "  New  ",
      ownerIds: [],
      status: "INACTIVE",
      parentId: " ",
    });
    expect(dto.toCommand()).toEqual({
      name: "New",
      ownerIds: [],
      status: "INACTIVE",
      parentId: null,
    });
    expect(new UpdateLocationDto().toCommand()).toEqual({});
  });
});
