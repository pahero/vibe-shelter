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
    archivingReasonId?: string;
    archivedYear?: string;
    ageGroup?: string;
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
    const archivedYear = input.archivedYear?.trim();
    if (archivedYear && !/^\d{4}$/.test(archivedYear)) {
      throw new BadRequestException("Invalid archivedYear");
    }
    const ageGroup = input.ageGroup?.trim() || undefined;
    if (
      ageGroup !== undefined &&
      ageGroup !== "KITTEN" &&
      ageGroup !== "ADULT"
    ) {
      throw new BadRequestException("Invalid ageGroup");
    }
    return {
      locationId: input.locationId?.trim() || undefined,
      search: input.search?.trim() || undefined,
      tagId: input.tagId?.trim() || undefined,
      intakeSource: intakeSource as CatIntakeSource | undefined,
      archived: input.archived === "true",
      archivingReasonId: input.archivingReasonId?.trim() || undefined,
      archivedYear: archivedYear ? Number(archivedYear) : undefined,
      ageGroup,
      skip: input.skip === undefined ? undefined : Number(input.skip),
      limit: input.limit === undefined ? undefined : Number(input.limit),
    };
  }
}
