const SENSITIVE_KEY_PATTERN =
  /(password|pass|token|authorization|cookie|secret|otp|keyless|credit|card|cvv|signature|email|phone)/i;

/**
 * Recursively redact sensitive keys from structured log payloads.
 */
export const redactSensitive = (value, depth = 0) => {
  if (value === null || value === undefined || depth > 4) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactSensitive(item, depth + 1));
  }
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      out[key] = "[REDACTED]";
    } else if (typeof val === "object" && val !== null) {
      out[key] = redactSensitive(val, depth + 1);
    } else {
      out[key] = val;
    }
  }
  return out;
};

/**
 * Emit structured operational logs (single-line JSON in production/LOG_FORMAT=json,
 * concise human-readable structured output in development).
 */
export const logEvent = (level, event, fields = {}, { writer } = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: "stayzy-api",
    env: process.env.NODE_ENV || "development",
    event,
    ...redactSensitive(fields),
  };

  if (writer) {
    writer(entry);
    return entry;
  }

  const useJson =
    process.env.NODE_ENV === "production" || process.env.LOG_FORMAT === "json";
  const line = useJson
    ? JSON.stringify(entry)
    : `[${entry.timestamp}] ${level.toUpperCase()} ${event} ${JSON.stringify(redactSensitive(fields))}`;

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
  return entry;
};
