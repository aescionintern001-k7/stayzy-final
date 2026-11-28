import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";
import pool from "../src/database/pool.js";
import {
  getPublicContentService,
  clearPublicContentCache,
} from "../src/modules/cms/cms.service.js";

test("CMS Cache: in-flight deduplication, cache hit, clear/expiry, and secret sanitization", async () => {
  clearPublicContentCache();
  let queryCalls = 0;
  const origQuery = pool.query.bind(pool);
  try {
    pool.query = async (sql) => {
      queryCalls++;
      await new Promise((r) => setTimeout(r, 15));
      if (sql.includes("site_content")) {
        return { rows: [{ key: "hero_title", value: { text: "Stayzy" } }] };
      }
      return {
        rows: [
          {
            key: "public_cfg",
            value: { supportEmail: "help@stayzy.in", razorpay_secret: "should_strip" },
          },
        ],
      };
    };

    // Concurrent identical requests -> deduplicated to 2 queries (1 site_content + 1 system_settings)
    const [r1, r2] = await Promise.all([
      getPublicContentService(),
      getPublicContentService(),
    ]);
    assert.equal(queryCalls, 2);
    assert.equal(r1.content.hero_title.text, "Stayzy");
    assert.equal(r1.settings.public_cfg.supportEmail, "help@stayzy.in");
    assert.equal(r1.settings.public_cfg.razorpay_secret, undefined);

    // Subsequent call hits cache -> 0 additional queries
    const r3 = await getPublicContentService();
    assert.equal(queryCalls, 2);
    assert.deepEqual(r3, r2);

    // After invalidation, refreshes cleanly
    clearPublicContentCache();
    await getPublicContentService();
    assert.equal(queryCalls, 4);
  } finally {
    pool.query = origQuery;
    clearPublicContentCache();
  }
});

test("Rate Limiting & DB Resilience: /health exempt, Retry-After on 429, and DB failure/recovery", async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const origQuery = pool.query.bind(pool);
  try {
    // 1. /health returns 200 without consuming API rate-limit bucket
    const healthRes = await fetch(`${baseUrl}/health`);
    assert.equal(healthRes.status, 200);

    // 2. /rooms uses searchRateLimiter (separate from globalRateLimiter)
    pool.query = async () => ({ rows: [] });
    const roomsRes = await fetch(`${baseUrl}/api/v1/rooms?limit=5`);
    assert.equal(roomsRes.status, 200);

    // 3. Auth rate limiter triggers 429 with Retry-After after 30 dev requests (use malformed body so DB isn't even queried)
    let got429 = false;
    let retryAfter = null;
    for (let i = 0; i < 35; i++) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.status === 429) {
        got429 = true;
        retryAfter = res.headers.get("retry-after");
        break;
      }
    }
    assert.equal(got429, true);
    assert.ok(Number(retryAfter) > 0);

    // /health still returns 200 even after authRateLimiter triggered 429
    const healthAfter = await fetch(`${baseUrl}/health`);
    assert.equal(healthAfter.status, 200);

    // 4. PostgreSQL unavailable -> /health/db returns 503 safely, then recovers when DB is back
    pool.query = async () => {
      throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" });
    };
    const dbDown = await fetch(`${baseUrl}/health/db`);
    assert.equal(dbDown.status, 503);

    pool.query = async () => ({ rows: [{ connected: 1 }] });
    const dbUp = await fetch(`${baseUrl}/health/db`);
    assert.equal(dbUp.status, 200);
  } finally {
    pool.query = origQuery;
    server.close();
  }
});
