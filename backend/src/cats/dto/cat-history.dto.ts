export type CatHistoryEventDto = {
  id: string;
  occurredAt: string;
  eventType: string;
  oldValue: string | null;
  newValue: string | null;
  actorId: string;
  actorFullName: string;
};

export type CatEventDto = CatHistoryEventDto & {
  catId: string;
  catName: string;
  catNameNumber: number;
};

export type CatFileEventDto = CatEventDto & {
  fileId: string;
  fileUrl: string | null;
};

export type CatWeightEventDto = CatEventDto & {
  weightId: string;
  measuredAt: string;
};

export type CatTagEventDto = CatEventDto & {
  tagId: string;
  tagName: string;
};

export type CatTaskEventDto = CatEventDto & {
  taskId: string;
  taskComment: string;
  taskDueDate: string;
};

export type CatTreatmentEventDto = CatEventDto & {
  treatmentId: string;
  treatmentShortName: string;
};

export type CatMedicalNoteEventDto = CatEventDto & {
  medicalNoteId: string;
  medicalNoteDate: string;
};

export type CatVaccinationEventDto = CatEventDto & {
  vaccinationId: string;
  vaccinationDate: string;
  vaccineName: string;
};

export type CatParasiteTreatmentEventDto = CatEventDto & {
  parasiteTreatmentId: string;
  parasiteTreatmentDate: string;
  productName: string;
};

export type ArchivingReasonEventDto = CatHistoryEventDto & {
  archivingReasonId: string;
  archivingReasonName: string;
};

export type TagAuditEventDto = CatHistoryEventDto & {
  tagId: string;
  tagName: string;
};

export type LocationAuditEventDto = CatHistoryEventDto & {
  locationId: string;
  locationName: string;
};

export type FlightAuditEventDto = CatHistoryEventDto & {
  flightId: string;
  flightNumber: string | null;
  airport: string;
  flightDate: string;
};

export type FlightCatAuditEventDto = FlightAuditEventDto & {
  catId: string;
  catName: string;
  catNameNumber: number;
};

export type FlightPhotoAuditEventDto = FlightAuditEventDto & {
  flightPhotoId: string;
  flightPhotoUrl: string | null;
};

export type CatHistoryResponseDto = {
  data: (
    | CatEventDto
    | CatFileEventDto
    | CatWeightEventDto
    | CatTagEventDto
    | CatTaskEventDto
    | CatTreatmentEventDto
    | CatMedicalNoteEventDto
    | CatVaccinationEventDto
    | CatParasiteTreatmentEventDto
    | ArchivingReasonEventDto
    | TagAuditEventDto
    | LocationAuditEventDto
    | FlightAuditEventDto
    | FlightCatAuditEventDto
    | FlightPhotoAuditEventDto
  )[];
  total: number;
  skip: number;
  limit: number;
};
