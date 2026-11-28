import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import jwt from "jsonwebtoken";

import app from "../src/app.js";
import pool from "../src/database/pool.js";
import { env } from "../src/config/env.js";

const makeToken = (id = "11111111-1111-4111-8111-111111111111", role = "guest") =>
  jwt.sign(
    { sub: id, email: "phase58@example.com", role, full_name: "Phase58 Guest" },
    env.JWT_SECRET,
    { expiresIn: "15m" }
  );

const withTestServer = async (fn) => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const addr = server.address();
  const baseUrl = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

test("Phase 5.8 Favorites Sync API: enforces auth and supports GET/POST/DELETE /users/me/favorites", async () => {
  const origQuery = pool.query.bind(pool);
  const favorites = new Map();
  const userId = "11111111-1111-4111-8111-111111111111";
  const roomTypeId = "22222222-2222-4222-8222-222222222222";

  pool.query = async (sql, params = []) => {
    const q = String(sql);
    if (q.includes("FROM users") && q.includes("WHERE id")) {
      return {
        rows: [{ id: userId, email: "phase58@example.com", role: "guest", account_status: "active", full_name: "Phase58 Guest" }],
        rowCount: 1,
      };
    }
    if (q.includes("FROM room_types") && q.includes("WHERE id")) {
      return { rows: [{ id: roomTypeId, name: "Studio Suite", property_id: "33333333-3333-4333-8333-333333333333" }], rowCount: 1 };
    }
    if (q.includes("INSERT INTO user_favorites")) {
      favorites.set(roomTypeId, {
        room_type_id: roomTypeId,
        room_name: "Studio Suite",
        property_name: "Stayzy Indiranagar",
        city: "Bengaluru",
        created_at: new Date().toISOString(),
      });
      return { rows: [favorites.get(roomTypeId)], rowCount: 1 };
    }
    if (q.includes("DELETE FROM user_favorites")) {
      const existed = favorites.delete(roomTypeId);
      return { rows: existed ? [{ room_type_id: roomTypeId }] : [], rowCount: existed ? 1 : 0 };
    }
    if (q.includes("FROM user_favorites")) {
      return { rows: Array.from(favorites.values()), rowCount: favorites.size };
    }
    return { rows: [], rowCount: 0 };
  };

  try {
    await withTestServer(async (baseUrl) => {
      const unauth = await fetch(`${baseUrl}/api/v1/users/me/favorites`);
      assert.equal(unauth.status, 401);

      const token = makeToken(userId, "guest");
      const addRes = await fetch(`${baseUrl}/api/v1/users/me/favorites`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ room_type_id: roomTypeId }),
      });
      assert.ok(addRes.status === 200 || addRes.status === 201);

      const listRes = await fetch(`${baseUrl}/api/v1/users/me/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(listRes.status, 200);
      const listJson = await listRes.json();
      assert.equal(listJson.data.favorites.length, 1);
      assert.equal(listJson.data.favorites[0].room_type_id, roomTypeId);

      const delRes = await fetch(`${baseUrl}/api/v1/users/me/favorites/${roomTypeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      assert.equal(delRes.status, 200);

      const afterDel = await fetch(`${baseUrl}/api/v1/users/me/favorites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const afterJson = await afterDel.json();
      assert.equal(afterJson.data.favorites.length, 0);
    });
  } finally {
    pool.query = origQuery;
  }
});
