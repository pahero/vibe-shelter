// src/locations/dto/create-location.dto.ts
export class CreateLocationDto {
  name!: string;
  description?: string;
  type!: string; // "SHELTER" | "CLINIC" | "FOSTER"
  ownerId?: string;
}
