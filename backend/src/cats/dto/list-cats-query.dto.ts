import { CatFilters } from "../cats.types";

export class ListCatsQueryDto {
  static toQuery(input: {
    locationId?: string;
    search?: string;
    tagId?: string;
    archived?: string;
    skip?: string;
    limit?: string;
  }): CatFilters {
    return {
      locationId: input.locationId?.trim() || undefined,
      search: input.search?.trim() || undefined,
      tagId: input.tagId?.trim() || undefined,
      archived: input.archived === "true",
      skip: input.skip === undefined ? undefined : Number(input.skip),
      limit: input.limit === undefined ? undefined : Number(input.limit),
    };
  }
}
