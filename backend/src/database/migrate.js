import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pool from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, "migrations");

export async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log("=== Stayzy Database Migration Runner ===");

    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const { rows: appliedRows } = await client.query(
      "SELECT name FROM schema_migrations ORDER BY name ASC"
    );
    const appliedSet = new Set(appliedRows.map((r) => r.name));

    // 3. Read migration files
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    console.log(`Found ${files.length} migration files in ${migrationsDir}`);

    let newlyApplied = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        continue;
      }

      console.log(`Executing migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf-8");

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[PASS] Applied: ${file}`);
        newlyApplied++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`[FAIL] Migration ${file} failed:`, err.message);
        throw err;
      }
    }

    if (newlyApplied === 0) {
      console.log("Database schema is already up to date. No pending migrations.");
    } else {
      console.log(`Successfully applied ${newlyApplied} new migration(s).`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// Run directly if called from CLI
if (process.argv[1] && process.argv[1].endsWith("migrate.js")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration error:", err);
      process.exit(1);
    });
}
