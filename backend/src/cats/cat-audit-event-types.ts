export const CAT_AUDIT_EVENT_TYPES = {
  name: 'name_changed',
  sex: 'sex_changed',
  color: 'color_changed',
  estimatedBirthDate: 'estimated_birth_date_changed',
  intakeDate: 'intake_date_changed',
  rescueSource: 'rescue_source_changed',
  microchipNumber: 'microchip_number_changed',
  passportNumber: 'passport_number_changed',
  sterilizationStatus: 'sterilization_status_changed',
  status: 'status_changed',
  currentLocationId: 'current_location_changed',
  photoCreated: 'photo_created',
  photoDeleted: 'photo_deleted',
} as const;

export type CatAuditEventType = (typeof CAT_AUDIT_EVENT_TYPES)[keyof typeof CAT_AUDIT_EVENT_TYPES];

export const CAT_AUDIT_EDITABLE_FIELDS = [
  'name',
  'sex',
  'color',
  'estimatedBirthDate',
  'intakeDate',
  'rescueSource',
  'microchipNumber',
  'passportNumber',
  'sterilizationStatus',
  'status',
  'currentLocationId',
] as const;

export type CatAuditEditableField = (typeof CAT_AUDIT_EDITABLE_FIELDS)[number];

export const CAT_AUDIT_FIELD_EVENT_TYPES: Record<CatAuditEditableField, CatAuditEventType> = {
  name: CAT_AUDIT_EVENT_TYPES.name,
  sex: CAT_AUDIT_EVENT_TYPES.sex,
  color: CAT_AUDIT_EVENT_TYPES.color,
  estimatedBirthDate: CAT_AUDIT_EVENT_TYPES.estimatedBirthDate,
  intakeDate: CAT_AUDIT_EVENT_TYPES.intakeDate,
  rescueSource: CAT_AUDIT_EVENT_TYPES.rescueSource,
  microchipNumber: CAT_AUDIT_EVENT_TYPES.microchipNumber,
  passportNumber: CAT_AUDIT_EVENT_TYPES.passportNumber,
  sterilizationStatus: CAT_AUDIT_EVENT_TYPES.sterilizationStatus,
  status: CAT_AUDIT_EVENT_TYPES.status,
  currentLocationId: CAT_AUDIT_EVENT_TYPES.currentLocationId,
};
