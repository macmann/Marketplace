ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
CREATE TABLE email_challenges (
 token_hash text PRIMARY KEY,
 code_hash text NOT NULL,
 purpose text NOT NULL CHECK(purpose IN ('VERIFY','RECOVER')),
 user_id uuid REFERENCES users ON DELETE CASCADE,
 email text,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes',
 consumed_at timestamptz
);
CREATE INDEX email_challenges_expiry ON email_challenges(expires_at);
CREATE INDEX email_challenges_user ON email_challenges(user_id);
