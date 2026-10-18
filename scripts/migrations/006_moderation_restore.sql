ALTER TABLE listings ADD COLUMN removed_from text;
ALTER TABLE listings ADD CONSTRAINT removed_from_status CHECK(removed_from IS NULL OR removed_from IN ('DRAFT','PENDING_REVIEW','ACTIVE','RESERVED','SOLD','EXPIRED','REJECTED','ARCHIVED'));
