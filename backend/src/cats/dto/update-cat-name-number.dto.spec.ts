import { BadRequestException } from "@nestjs/common";
import { UpdateCatNameNumberDto } from "./update-cat-name-number.dto";

describe("UpdateCatNameNumberDto", () => {
  it("converts a valid positive integer", () => {
    const dto = new UpdateCatNameNumberDto();
    dto.nameNumber = 3;
    expect(dto.toCommand()).toEqual({ nameNumber: 3 });
  });

  it.each([0, -1, 1.5, Number.NaN])(
    "rejects invalid number %s",
    (nameNumber) => {
      const dto = new UpdateCatNameNumberDto();
      dto.nameNumber = nameNumber;
      expect(() => dto.toCommand()).toThrow(BadRequestException);
    },
  );
});
