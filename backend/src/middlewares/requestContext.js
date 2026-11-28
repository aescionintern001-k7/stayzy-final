import crypto from "node:crypto";
import { logEvent } from "../utils/logger.js";
import { recordRequestMetric } from "../utils/metrics.js";

const VALID_REQUEST_ID_REGEX = /^[A-Za-z0-9._-]{8,64}$/;

export const resolveRequestId = (headerValue) => {
  if (typeof headerValue === "string") {
    const trimmed = headerValue.trim();
    if (VALID_REQUEST_ID_REGEX.test(trimmed)) {
      return trimmed;
    }
  }
  return crypto.randomUUID();
};

/**
 * Attach a validated/generated request ID to req.id & X-Request-Id header,
 * record bounded request metrics, and emit structured completion logs without bodies/secrets.
 */
export const requestContextMiddleware = (req, res, next) => {
  const requestId = resolveRequestId(req.headers["x-request-id"]);
  req.id = requestId;
  res.setHeader("X-Request-Id", requestId);

  const startNs = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startNs) / 1e6;
    recordRequestMetric({ statusCode: res.statusCode, durationMs });

    const isSlow = durationMs >= 1000;
    const level =
      res.statusCode >= 500 ? "error" : res.statusCode === 429 || isSlow ? "warn" : "info";

    // Keep /health liveness quiet unless slow or failing
    if (req.path === "/health" && res.statusCode < 400 && !isSlow) {
      return;
    }

    const routeTemplate = req.route?.path
      ? `${req.baseUrl || ""}${req.route.path}`
      : req.baseUrl || req.path || "/";

    logEvent(level, "http_request", {
      requestId,
      method: req.method,
      route: routeTemplate,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      slow: isSlow || undefined,
    });
  });

  next();
};
