import { Pool } from "pg";
// Explicit test-database fixture policy; never point this suite at production.
export default async function setup() {
  const db = new Pool({ connectionString: process.env.DATABASE_URL });
  const {
    rows: [original],
  } = await db.query(
    "SELECT moderation_mode,review_all FROM marketplace_settings WHERE id=true",
  );
  await db.query(
    "UPDATE marketplace_settings SET moderation_mode='LOCAL',review_all=false WHERE id=true",
  );
  await db.end();
  return async () => {
    const db = new Pool({ connectionString: process.env.DATABASE_URL });
    await db.query(
      "UPDATE marketplace_settings SET moderation_mode=$1,review_all=$2 WHERE id=true",
      [original.moderation_mode, original.review_all],
    );
    await db.end();
  };
}
