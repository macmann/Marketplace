CREATE TABLE listing_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 seller_id uuid NOT NULL REFERENCES users ON DELETE CASCADE,
 payload jsonb NOT NULL DEFAULT '{}' CHECK(jsonb_typeof(payload)='object'),
 revision integer NOT NULL DEFAULT 1,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_drafts_owner ON listing_drafts(seller_id,updated_at DESC);
ALTER TABLE listings ADD COLUMN revision integer NOT NULL DEFAULT 1;
ALTER TABLE listing_images ALTER COLUMN listing_id DROP NOT NULL;
ALTER TABLE listing_images ADD COLUMN draft_id uuid REFERENCES listing_drafts ON DELETE CASCADE;
ALTER TABLE listing_images ADD CONSTRAINT image_parent CHECK ((listing_id IS NOT NULL)::integer+(draft_id IS NOT NULL)::integer=1);
CREATE INDEX listing_images_draft ON listing_images(draft_id);
CREATE UNIQUE INDEX listing_images_key ON listing_images(storage_key);
CREATE TABLE category_attributes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 category_id text NOT NULL REFERENCES categories,
 key text NOT NULL CHECK(key ~ '^[a-z][a-z0-9_]{0,49}$'),
 name_en text NOT NULL,
 name_my text NOT NULL,
 type text NOT NULL CHECK(type IN ('TEXT','NUMBER','BOOLEAN','ENUM','DATE')),
 choices jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(choices)='array'),
 required boolean NOT NULL DEFAULT false,
 enabled boolean NOT NULL DEFAULT true,
 position integer NOT NULL DEFAULT 0,
 UNIQUE(category_id,key)
);
CREATE TABLE listing_attribute_values (
 listing_id uuid NOT NULL REFERENCES listings ON DELETE CASCADE,
 attribute_id uuid NOT NULL REFERENCES category_attributes,
 value jsonb NOT NULL CHECK(jsonb_typeof(value) IN ('string','number','boolean')),
 PRIMARY KEY(listing_id,attribute_id)
);
