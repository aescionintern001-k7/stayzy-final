import app from "./app.js";
import { env } from "./config/env.js";

const server = app.listen(env.PORT, () => {
  console.log(`
========================================
       STAYZY API SERVER
========================================
  Environment : ${env.NODE_ENV}
  Port       : ${env.PORT}
  API        : http://localhost:${env.PORT}${env.API_PREFIX}
  Health     : http://localhost:${env.PORT}/health
========================================
  `);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
  server.close(() => process.exit(1));
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  server.close(() => process.exit(1));
});
