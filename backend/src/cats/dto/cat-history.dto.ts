type CatHistoryActorDto = {
  id: string;
  displayName: string;
  email: string;
};

type CatHistoryPhotoDto = {
  id: string;
  createdAt: string;
  link: string | null;
  status: "ACTIVE" | "DELETED";
};

type CatHistoryDocumentDto = {
  id: string;
  link: string | null;
  fileName: string;
  status: "ACTIVE" | "DELETED";
};

export type CatHistoryEventDto = {
  id: string;
  catId: string | null;
  catName: string | null;
  eventType: string;
  occurredAt: string;
  actor: CatHistoryActorDto;
  oldValue: string | null;
  newValue: string | null;
  treatmentAdministrationDate: string | null;
  treatment: { id: string; shortName: string; isDeleted: boolean } | null;
  tag: { id: string; name: string; isDeleted: boolean } | null;
  weight: { id: string; measuredAt: string; weightKg: number; isDeleted: boolean } | null;
  task: { id: string; comment: string; dueDate: string; isDeleted: boolean } | null;
  medicalNote: { id: string; date: string; comment: string; isDeleted: boolean } | null;
  preventiveTreatment: { id: string; date: string; name: string; type: string; isDeleted: boolean } | null;
  note: { id: string; date: string; comment: string; isDeleted: boolean } | null;
  archivingReason: { id: string; name: string; isDeleted: boolean } | null;
  location: { id: string; name: string; isDeleted: boolean } | null;
  relatedUser: { id: string; displayName: string; isDeleted: boolean } | null;
  photo: CatHistoryPhotoDto | null;
  document: CatHistoryDocumentDto | null;
  flight?: {
    id: string;
    flightNumber: string;
    airport: string;
    date: string;
    isDeleted: boolean;
  } | null;
};

export type CatHistoryResponseDto = {
  data: CatHistoryEventDto[];
  total: number;
  skip: number;
  limit: number;
};
