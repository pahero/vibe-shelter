import { Prisma } from "@prisma/client";

export type CatCard = {
  id: string;
  name: string;
  nameNumber: number;
  sex: string;
  color: string | null;
  estimatedBirthDate: string | null;
  intakeDate: string | null;
  sterilizationStatus: string;
  currentLocationId: string | null;
  currentLocationName: string | null;
  primaryPhotoUrl: string | null;
  microchipNumber: string | null;
  passportNumber: string | null;
  adopterName: string | null;
  adopterAddress: string | null;
  felvFivTestDone: boolean;
  rescueSource: string | null;
  createdByUserId: string | null;
  isTest: boolean;
  updatedAt: string;
  tags: CatTag[];
  archivedAt: string | null;
  archivingReasonId: string | null;
  archivingReasonName: string | null;
};

export type CatTag = { id: string; name: string; color: string };
export type CatFilters = {
  locationId?: string;
  search?: string;
  tagId?: string;
  skip?: number;
  limit?: number;
  archived?: boolean;
};
export type CatWeight = {
  id: string;
  catId: string;
  weightKg: number;
  measuredAt: string;
  createdAt: string;
};
export type CatPhoto = {
  id: string;
  catId: string;
  url: string | null;
  fullUrl: string | null;
  isPrimary: boolean;
  createdAt: string;
};
export type CatDocument = {
  id: string;
  catId: string;
  fileName: string;
  url: string | null;
  downloadUrl: string | null;
  createdAt: string;
};
export type PrimaryPhotoUpload = {
  originalname?: string;
  mimetype?: string;
  buffer?: Buffer;
};

export const CAT_CARD_INCLUDE = {
  currentLocation: { select: { name: true } },
  archivingReason: { select: { name: true } },
  tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
} satisfies Prisma.CatInclude;

export type CatWithLocation = Prisma.CatGetPayload<{
  include: typeof CAT_CARD_INCLUDE;
}>;
