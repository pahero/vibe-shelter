UPDATE "AuditEvent"
SET "eventType" = 'intake_details_changed'
WHERE "eventType" = 'rescue_source_changed';
