INSERT INTO "CatAuditEvent" ("id", "catId", "archivationReasonId", "actorUserId", "eventType", "occurredAt", "oldValue", "newValue")
SELECT "id", NULL, "reasonId", "actorUserId", ('archivation_reason_' || "action")::"CatAuditEventType", "createdAt", "oldValue", "newValue"
FROM "CatArchivationReasonAuditEvent";

DROP TABLE "CatArchivationReasonAuditEvent";
