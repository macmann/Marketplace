import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { Pool } from "pg";
test("versioned migrations adopt original data, repeat safely, and reject changed checksums", async () => {
  const base = new Pool({ connectionString: process.env.DATABASE_URL });
  const schema = "migration_test_" + randomUUID().replace(/-/g, "");
  await base.query("CREATE SCHEMA " + schema);
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.set("options", "-c search_path=" + schema + ",public");
  const scoped = new Pool({ connectionString: url.toString() });
  const migrate = () =>
    new Promise<{ code: number | null; stderr: string }>((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--import", "tsx", "scripts/migrate.ts"],
        {
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: url.toString() },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let stderr = "";
      child.stdout.resume();
      child.stderr.on("data", (d) => {
        stderr += d;
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ code, stderr }));
    });
  try {
    await scoped.query(
      await readFile(
        new URL("../../scripts/migrations/000_initial.sql", import.meta.url),
        "utf8",
      ),
    );
    const {
      rows: [original],
    } = await scoped.query(
      "INSERT INTO users(email,password_hash,name) VALUES('original@example.test','original-hash','Original member') RETURNING id",
    );
    assert.equal((await migrate()).code, 0);
    const {
      rows: [upgraded],
    } = await scoped.query("SELECT * FROM users WHERE id=$1", [original.id]);
    assert.equal(upgraded.name, "Original member");
    assert.equal(upgraded.password_hash, "original-hash");
    assert.equal(upgraded.deleted_at, null);
    assert.equal(
      (await scoped.query("SELECT * FROM schema_migrations")).rowCount,
      (await readdir("scripts/migrations")).filter((n) => n.endsWith(".sql"))
        .length,
    );
    assert.equal((await migrate()).code, 0);
    assert.equal(
      (await scoped.query("SELECT * FROM schema_migrations")).rowCount,
      (await readdir("scripts/migrations")).filter((n) => n.endsWith(".sql"))
        .length,
    );
    await scoped.query(
      "UPDATE schema_migrations SET checksum='altered' WHERE name='001_account_lifecycle.sql'",
    );
    const rejected = await migrate();
    assert.notEqual(rejected.code, 0);
    assert.match(
      rejected.stderr,
      /Applied migration has changed: 001_account_lifecycle.sql/,
    );
    assert.equal(
      (await scoped.query("SELECT name FROM users WHERE id=$1", [original.id]))
        .rows[0].name,
      "Original member",
    );
  } finally {
    await scoped.end();
    await base.query("DROP SCHEMA " + schema + " CASCADE");
    await base.end();
  }
});
