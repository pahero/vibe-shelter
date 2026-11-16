import { CatFilters } from "../cats.types";
import { BadRequestException } from "@nestjs/common";
import { CatIntakeSource } from "@prisma/client";

export class ListCatsQueryDto {
  static toQuery(input: {
    locationId?: string;
    search?: string;
    tagId?: string;
    intakeSource?: string;
    archived?: string;
    skip?: string;
    limit?: string;
  }): CatFilters {
    const intakeSource = input.intakeSource?.trim() || undefined;
    if (
      intakeSource !== undefined &&
      !Object.values(CatIntakeSource).includes(intakeSource as CatIntakeSource)
    ) {
      throw new BadRequestException("Invalid intakeSource");
    }
    return {
      locationId: input.locationId?.trim() || undefined,
      search: input.search?.trim() || undefined,
      tagId: input.tagId?.trim() || undefined,
      intakeSource: intakeSource as CatIntakeSource | undefined,
      archived: input.archived === "true",
      skip: input.skip === undefined ? undefined : Number(input.skip),
      limit: input.limit === undefined ? undefined : Number(input.limit),
    };
  }
}
