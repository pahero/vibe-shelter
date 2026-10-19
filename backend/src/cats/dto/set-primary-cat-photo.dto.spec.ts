import { BadRequestException } from "@nestjs/common";
import { SetPrimaryCatPhotoDto } from "./set-primary-cat-photo.dto";

describe("SetPrimaryCatPhotoDto", () => {
  it.each([0, 50, 100, null, undefined])("converts valid positionY %s", (positionY) => {
    const dto = Object.assign(new SetPrimaryCatPhotoDto(), { positionY });
    expect(dto.toCommand()).toEqual({ positionY });
  });

  it.each([-1, 101, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects invalid positionY %s",
    (positionY) => {
      const dto = Object.assign(new SetPrimaryCatPhotoDto(), { positionY });
      expect(() => dto.toCommand()).toThrow(BadRequestException);
    },
  );
});
