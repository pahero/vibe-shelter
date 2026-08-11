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

export type CatHistoryEventDto = {
  id: string;
  catId: string;
  eventType: string;
  occurredAt: string;
  actor: CatHistoryActorDto;
  oldValue: string | null;
  newValue: string | null;
  photo: CatHistoryPhotoDto | null;
};

export type CatHistoryResponseDto = {
  data: CatHistoryEventDto[];
  total: number;
  skip: number;
  limit: number;
};
