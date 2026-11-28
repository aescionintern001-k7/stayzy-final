import app from "./app.js";
import { env } from "./config/env.js";
import pool from "./database/pool.js";
import { logEvent } from "./utils/logger.js";
import { setShuttingDown } from "./utils/metrics.js";

const server = app.listen(env.PORT, () => {
  logEvent("info", "server_started", {
    port: env.PORT,
    apiPrefix: env.API_PREFIX,
  });
});

let shutdownInProgress = false;

export const gracefulShutdown = async (signal, exitCode = 0) => {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  setShuttingDown(true);
  logEvent("warn", "server_shutdown_initiated", { signal });

  const forceTimer = setTimeout(() => {
    logEvent("error", "server_shutdown_forced_timeout", { signal });
    process.exit(exitCode || 1);
  }, 10000);
  forceTimer.unref();

  server.close(async () => {
    try {
      await pool.end();
      logEvent("info", "server_shutdown_complete", { signal });
    } catch (err) {
      logEvent("error", "server_pool_close_error", { message: err?.message });
    } finally {
      clearTimeout(forceTimer);
      process.exit(exitCode);
    }
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM", 0));
process.on("SIGINT", () => gracefulShutdown("SIGINT", 0));

process.on("unhandledRejection", (reason) => {
  logEvent("error", "unhandled_rejection", {
    message: reason instanceof Error ? reason.message : String(reason),
  });
  gracefulShutdown("unhandledRejection", 1);
});

process.on("uncaughtException", (error) => {
  logEvent("error", "uncaught_exception", {
    message: error?.message,
    stack: error?.stack,
  });
  gracefulShutdown("uncaughtException", 1);
});
