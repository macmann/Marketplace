CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text UNIQUE NOT NULL, password_hash text NOT NULL,
 name text NOT NULL, phone text UNIQUE, phone_verified boolean NOT NULL DEFAULT false,
 role text NOT NULL DEFAULT 'USER' CHECK(role IN ('USER','ADMIN')), suspended boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users ON DELETE CASCADE, expires_at timestamptz NOT NULL);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
CREATE TABLE IF NOT EXISTS categories (id text PRIMARY KEY, name_en text NOT NULL, name_my text NOT NULL, parent_id text REFERENCES categories, position integer NOT NULL DEFAULT 0, enabled boolean NOT NULL DEFAULT true);
CREATE TABLE IF NOT EXISTS locations (id text PRIMARY KEY, name_en text NOT NULL, name_my text NOT NULL, parent_id text REFERENCES locations, kind text NOT NULL CHECK(kind IN ('COUNTRY','REGION','CITY','TOWNSHIP')));
CREATE TABLE IF NOT EXISTS listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), seller_id uuid NOT NULL REFERENCES users,
 category_id text NOT NULL REFERENCES categories, location_id text NOT NULL REFERENCES locations,
 title text NOT NULL CHECK(length(title) BETWEEN 3 AND 120), description text NOT NULL,
 listing_type text NOT NULL CHECK(listing_type IN ('SALE','FREE')),
 price bigint NOT NULL CHECK(price>=0 AND price<=999999999999), currency text NOT NULL DEFAULT 'MMK',
 condition text NOT NULL CHECK(condition IN ('NEW','LIKE_NEW','GOOD','FAIR','POOR','NOT_SPECIFIED')),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('DRAFT','PENDING_REVIEW','ACTIVE','RESERVED','SOLD','EXPIRED','REMOVED','REJECTED','ARCHIVED')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '60 days',
 CHECK(listing_type <> 'FREE' OR price=0)
);
CREATE INDEX IF NOT EXISTS listings_search ON listings USING gin ((lower(title || ' ' || description)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS listings_feed ON listings(status,created_at DESC);
CREATE INDEX IF NOT EXISTS listings_seller ON listings(seller_id);
CREATE TABLE IF NOT EXISTS listing_images (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES listings ON DELETE CASCADE, storage_key text NOT NULL, position integer NOT NULL);
CREATE TABLE IF NOT EXISTS favorites (user_id uuid REFERENCES users ON DELETE CASCADE, listing_id uuid REFERENCES listings ON DELETE CASCADE, PRIMARY KEY(user_id,listing_id));
CREATE TABLE IF NOT EXISTS conversations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), listing_id uuid NOT NULL REFERENCES listings, buyer_id uuid NOT NULL REFERENCES users, seller_id uuid NOT NULL REFERENCES users, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(listing_id,buyer_id), CHECK(buyer_id<>seller_id));
CREATE TABLE IF NOT EXISTS messages (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id uuid NOT NULL REFERENCES conversations ON DELETE CASCADE, sender_id uuid NOT NULL REFERENCES users, body text NOT NULL CHECK(length(body) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now(), read_at timestamptz);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id,created_at);
CREATE TABLE IF NOT EXISTS blocks (user_id uuid REFERENCES users ON DELETE CASCADE, blocked_id uuid REFERENCES users ON DELETE CASCADE, PRIMARY KEY(user_id,blocked_id), CHECK(user_id<>blocked_id));
CREATE TABLE IF NOT EXISTS reports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reporter_id uuid NOT NULL REFERENCES users, listing_id uuid NOT NULL REFERENCES listings, reason text NOT NULL, detail text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED','DISMISSED')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES users, action text NOT NULL, entity_id text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS rate_limits (key text PRIMARY KEY, hits integer NOT NULL, reset_at timestamptz NOT NULL);
