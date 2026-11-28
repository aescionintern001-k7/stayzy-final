import { logEvent } from "../utils/logger.js";

export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    requestId: req.id || undefined,
  });
};

export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";

  if (err.type === "entity.parse.failed" || err instanceof SyntaxError) {
    statusCode = 400;
    message = "Invalid JSON request body";
  } else if (err.code === "22P02") {
    statusCode = 400;
    message = "Invalid identifier format";
  }

  const isZod = err.name === "ZodError";
  if (isZod) {
    statusCode = 400;
  }

  const category = statusCode >= 500 ? "programming" : "operational";
  logEvent(statusCode >= 500 ? "error" : "warn", "http_error", {
    requestId: req.id || null,
    method: req.method,
    route: req.baseUrl || req.path || "/",
    status: statusCode,
    errorCode: err.code || (isZod ? "VALIDATION_ERROR" : undefined),
    category,
    message: err.message,
    stack: statusCode >= 500 ? err.stack : undefined,
  });

  const response = {
    success: false,
    message:
      process.env.NODE_ENV === "production" && statusCode >= 500
        ? "Internal server error"
        : isZod
          ? "Validation failed"
          : message,
    requestId: req.id || undefined,
  };

  if (isZod) {
    response.errors = err.issues;
  }

  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
