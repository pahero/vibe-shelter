import { CatPhotoUrlService } from "./cat-photo-url.service";
import {
  CatCard,
  CatDocument,
  CatPhoto,
  CatTag,
  CatWeight,
  CatWithLocation,
} from "./cats.types";

export function toCatTag(tag: {
  id: string;
  name: string;
  color: string;
}): CatTag {
  return { id: tag.id, name: tag.name, color: tag.color };
}

export async function toCatCard(
  cat: CatWithLocation,
  photoUrls: CatPhotoUrlService,
): Promise<CatCard> {
  return {
    id: cat.id,
    name: cat.name,
    nameNumber: cat.nameNumber,
    sex: cat.sex,
    color: cat.color,
    estimatedBirthDate: cat.estimatedBirthDate?.toISOString() ?? null,
    intakeDate: cat.intakeDate?.toISOString() ?? null,
    archivedAt: cat.archivedAt?.toISOString() ?? null,
    archivingReasonId: cat.archivingReasonId,
    archivingReasonName: cat.archivingReason?.name ?? null,
    sterilizationStatus: cat.sterilizationStatus,
    currentLocationId: cat.currentLocationId,
    currentLocationName: cat.currentLocation?.name ?? null,
    createdByUserId: cat.createdByUserId,
    isTest: cat.isTest,
    primaryPhotoUrl: await photoUrls.getPreviewPhotoUrl(cat.primaryPhotoKey),
    microchipNumber: cat.microchipNumber,
    passportNumber: cat.passportNumber,
    adopterName: cat.adopterName,
    adopterAddress: cat.adopterAddress,
    felvFivTestDone: cat.felvFivTestDone,
    rescueSource: cat.rescueSource,
    updatedAt: cat.updatedAt.toISOString(),
    tags: cat.tags.map((item) => toCatTag(item.tag)),
  };
}

export async function toCatPhoto(
  photo: {
    id: string;
    catId: string;
    key: string;
    previewKey: string | null;
    createdAt: Date;
  },
  primaryPhotoKey: string | null,
  photoUrls: CatPhotoUrlService,
): Promise<CatPhoto> {
  return {
    id: photo.id,
    catId: photo.catId,
    url: await photoUrls.getPhotoUrl(photo.previewKey ?? photo.key),
    fullUrl: await photoUrls.getPhotoUrl(photo.key),
    isPrimary: photo.key === primaryPhotoKey,
    createdAt: photo.createdAt.toISOString(),
  };
}

export async function toCatDocument(
  document: {
    id: string;
    catId: string;
    key: string;
    fileName: string;
    createdAt: Date;
  },
  photoUrls: CatPhotoUrlService,
): Promise<CatDocument> {
  return {
    id: document.id,
    catId: document.catId,
    fileName: document.fileName,
    url: await photoUrls.getDocumentUrl(document.key),
    downloadUrl: await photoUrls.getDocumentDownloadUrl(
      document.key,
      document.fileName,
    ),
    createdAt: document.createdAt.toISOString(),
  };
}

export function toCatWeight(weight: {
  id: string;
  catId: string;
  weightKg: number;
  measuredAt: Date;
  createdAt: Date;
}): CatWeight {
  return {
    id: weight.id,
    catId: weight.catId,
    weightKg: weight.weightKg,
    measuredAt: weight.measuredAt.toISOString(),
    createdAt: weight.createdAt.toISOString(),
  };
}
