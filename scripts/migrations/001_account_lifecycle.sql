ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN deleted_at timestamptz;
ALTER TABLE sessions ADD COLUMN authenticated_at timestamptz;
CREATE TABLE auth_challenges (
 token_hash text PRIMARY KEY,
 purpose text NOT NULL CHECK(purpose IN ('LOGIN','VERIFY','RECOVER')),
 user_id uuid REFERENCES users ON DELETE CASCADE,
 phone text,
 display_name text,
 verification_sid text,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
 consumed_at timestamptz,
 CHECK(purpose='LOGIN' OR display_name IS NULL)
);
CREATE INDEX auth_challenges_expiry ON auth_challenges(expires_at);
CREATE INDEX auth_challenges_user ON auth_challenges(user_id);
CREATE TABLE image_deletions (
 storage_key text PRIMARY KEY,
 attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now()
);
