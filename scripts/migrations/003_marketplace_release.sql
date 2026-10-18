ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK(role IN ('USER','SUPPORT','MODERATOR','ADMIN'));
ALTER TABLE listings ADD COLUMN moderation_reasons jsonb NOT NULL DEFAULT '[]';
ALTER TABLE audit_logs ADD COLUMN detail text NOT NULL DEFAULT '';
ALTER TABLE reports ALTER COLUMN listing_id DROP NOT NULL;
ALTER TABLE reports ADD COLUMN reported_user_id uuid REFERENCES users;
ALTER TABLE reports ADD COLUMN message_id uuid REFERENCES messages;
ALTER TABLE reports ADD COLUMN resolved_by uuid REFERENCES users;
ALTER TABLE reports ADD COLUMN resolved_at timestamptz;
ALTER TABLE reports ADD COLUMN resolution text NOT NULL DEFAULT '';
ALTER TABLE reports ADD CONSTRAINT report_target CHECK(num_nonnulls(listing_id,reported_user_id,message_id)=1);
WITH duplicates AS (SELECT id,row_number() OVER(PARTITION BY reporter_id,listing_id ORDER BY created_at,id) n FROM reports WHERE status='OPEN')
UPDATE reports SET status='DISMISSED',resolution='Duplicate report consolidated during migration',resolved_at=now() WHERE id IN (SELECT id FROM duplicates WHERE n>1);
CREATE UNIQUE INDEX reports_open_listing ON reports(reporter_id,listing_id) WHERE status='OPEN' AND listing_id IS NOT NULL;
CREATE UNIQUE INDEX reports_open_user ON reports(reporter_id,reported_user_id) WHERE status='OPEN' AND reported_user_id IS NOT NULL;
CREATE UNIQUE INDEX reports_open_message ON reports(reporter_id,message_id) WHERE status='OPEN' AND message_id IS NOT NULL;
CREATE TABLE moderation_rules(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),phrase text NOT NULL UNIQUE CHECK(length(phrase) BETWEEN 2 AND 100),enabled boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE marketplace_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id),review_all boolean NOT NULL DEFAULT false);
INSERT INTO marketplace_settings DEFAULT VALUES;
CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,kind text NOT NULL CHECK(kind IN ('MESSAGE','LISTING')),conversation_id uuid REFERENCES conversations ON DELETE CASCADE,listing_id uuid REFERENCES listings ON DELETE CASCADE,created_at timestamptz NOT NULL DEFAULT now(),read_at timestamptz);
CREATE INDEX notifications_inbox ON notifications(user_id,created_at DESC);
CREATE INDEX messages_unread ON messages(conversation_id,sender_id) WHERE read_at IS NULL;
CREATE FUNCTION notify_message() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO notifications(user_id,kind,conversation_id)
 SELECT CASE WHEN c.buyer_id=NEW.sender_id THEN c.seller_id ELSE c.buyer_id END,'MESSAGE',c.id FROM conversations c WHERE c.id=NEW.conversation_id;
 RETURN NEW;
END $$;
CREATE TRIGGER message_notification AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_message();
CREATE FUNCTION notify_listing() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('ACTIVE','PENDING_REVIEW','REMOVED','REJECTED','EXPIRED','SOLD') THEN
 INSERT INTO notifications(user_id,kind,listing_id) VALUES(NEW.seller_id,'LISTING',NEW.id);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER listing_notification AFTER UPDATE OF status ON listings FOR EACH ROW EXECUTE FUNCTION notify_listing();
CREATE TABLE service_heartbeats(name text PRIMARY KEY,last_seen timestamptz NOT NULL DEFAULT now());
CREATE TABLE daily_metrics(day date NOT NULL DEFAULT current_date,event text NOT NULL CHECK(event IN ('SEARCH','VIEW','CONTACT')),count bigint NOT NULL DEFAULT 1,PRIMARY KEY(day,event));
CREATE INDEX listings_normalized_title ON listings USING gin ((lower(normalize(title,NFC))) gin_trgm_ops);
CREATE INDEX listing_attribute_filter ON listing_attribute_values(attribute_id);
