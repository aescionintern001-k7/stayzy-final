import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

const basePoolConfig = {
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
  connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
  statement_timeout: 15000,
};

export const pool = new Pool(
  env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.DB_SSL || env.DATABASE_URL.includes("sslmode=require")
          ? { rejectUnauthorized: env.APP_ENV === "production" }
          : undefined,
        ...basePoolConfig,
      }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        ...basePoolConfig,
      }
);

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error.message);
});

export default pool;
