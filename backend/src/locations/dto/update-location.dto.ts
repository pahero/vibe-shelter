// src/locations/dto/update-location.dto.ts
export class UpdateLocationDto {
  name?: string;
  description?: string;
  ownerId?: string | null;
  status?: string; // "ACTIVE" | "INACTIVE" | "ARCHIVED"
}
