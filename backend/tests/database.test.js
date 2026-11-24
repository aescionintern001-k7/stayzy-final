import test from "node:test";
import assert from "node:assert/strict";
import pool from "../src/database/pool.js";

test("PostgreSQL connection works", async () => {
  const result = await pool.query("SELECT 1 AS connected");

  assert.equal(result.rows[0].connected, 1);
});

test("Stayzy development database is selected", async () => {
  const result = await pool.query("SELECT current_database() AS database");

  assert.equal(result.rows[0].database, "stayzy_dev");
});

test("Database pool can execute queries", async () => {
  const result = await pool.query("SELECT NOW() AS server_time");

  assert.ok(result.rows[0].server_time);
});

test.after(async () => {
  await pool.end();
});
