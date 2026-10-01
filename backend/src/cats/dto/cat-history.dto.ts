export type CatHistoryActorDto = {
  id: string;
  displayName: string;
  email: string;
};

export type CatHistoryPhotoDto = {
  id: string;
  link: string | null;
  status: 'ACTIVE' | 'DELETED';
};

export type CatHistoryDocumentDto = {
  id: string;
  link: string | null;
  fileName: string;
  status: 'ACTIVE' | 'DELETED';
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
  location: { id: string; name: string; isDeleted: boolean } | null;
  relatedUser: { id: string; displayName: string; isDeleted: boolean } | null;
  photo: CatHistoryPhotoDto | null;
  document: CatHistoryDocumentDto | null;
  flight?: { id: string; flightNumber: string; airport: string; date: string; isDeleted: boolean } | null;
};

export type CatHistoryResponseDto = {
  data: CatHistoryEventDto[];
  total: number;
  skip: number;
  limit: number;
};
