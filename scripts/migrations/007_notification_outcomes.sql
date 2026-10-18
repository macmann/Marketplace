ALTER TABLE notifications DROP CONSTRAINT notifications_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_kind_check CHECK(kind IN ('MESSAGE','LISTING','REPORT'));
ALTER TABLE notifications ADD COLUMN report_id uuid REFERENCES reports ON DELETE CASCADE;
ALTER TABLE notifications ADD COLUMN state text;
CREATE OR REPLACE FUNCTION notify_listing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('ACTIVE','PENDING_REVIEW','RESERVED','REMOVED','REJECTED','EXPIRED','SOLD') THEN
 INSERT INTO notifications(user_id,kind,listing_id,state) VALUES(NEW.seller_id,'LISTING',NEW.id,NEW.status);
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION notify_report() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status='OPEN' AND NEW.status IN ('RESOLVED','DISMISSED') THEN
 INSERT INTO notifications(user_id,kind,report_id,state) SELECT NEW.reporter_id,'REPORT',NEW.id,NEW.status FROM users WHERE id=NEW.reporter_id AND NOT suspended AND deleted_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER report_notification AFTER UPDATE OF status ON reports FOR EACH ROW EXECUTE FUNCTION notify_report();
