import pg from "pg";
const globalDb = globalThis as unknown as { pool?: pg.Pool };
export const pool =
  globalDb.pool ??
  new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10000,
  });
if (process.env.NODE_ENV !== "production") globalDb.pool = pool;
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  values: unknown[] = [],
) {
  return (await pool.query<T>(sql, values)).rows;
}
