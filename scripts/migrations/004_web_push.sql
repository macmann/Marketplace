CREATE TABLE push_subscriptions(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,endpoint text NOT NULL UNIQUE,p256dh text NOT NULL,auth text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX push_subscription_owner ON push_subscriptions(user_id);
CREATE TABLE push_deliveries(notification_id uuid NOT NULL REFERENCES notifications ON DELETE CASCADE,subscription_id uuid NOT NULL REFERENCES push_subscriptions ON DELETE CASCADE,attempts integer NOT NULL DEFAULT 0,next_attempt timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(notification_id,subscription_id));
CREATE FUNCTION enqueue_push() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO push_deliveries(notification_id,subscription_id) SELECT NEW.id,id FROM push_subscriptions WHERE user_id=NEW.user_id;
 RETURN NEW;
END $$;
CREATE TRIGGER notification_push AFTER INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION enqueue_push();
