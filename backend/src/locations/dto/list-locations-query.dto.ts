export type ListLocationsQuery = {
  ownerId?: string;
  status?: string;
  skip: number;
  limit: number;
};

export class ListLocationsQueryDto {
  toQuery(input: { ownerId?: string; status?: string; skip?: string; limit?: string }): ListLocationsQuery {
    return {
      ownerId: input.ownerId,
      status: input.status,
      skip: input.skip ? Number.parseInt(input.skip, 10) : 0,
      limit: input.limit ? Number.parseInt(input.limit, 10) : 50,
    };
  }
}
