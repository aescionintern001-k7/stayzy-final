import pool from "../../database/pool.js";

const SECRET_KEY_PATTERN = /(secret|password|token|private|webhook|api[_-]?key)/i;

export const sanitizePublicSettings = (obj) => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SECRET_KEY_PATTERN.test(k)) continue;
    clean[k] = typeof v === "object" && v !== null ? sanitizePublicSettings(v) : v;
  }
  return clean;
};

const CMS_CACHE_TTL_MS = 60 * 1000;
let cachedPublicContent = null;
let cachedPublicContentExpiresAt = 0;
let cmsInFlight = null;

export const clearPublicContentCache = () => {
  cachedPublicContent = null;
  cachedPublicContentExpiresAt = 0;
};

export const getPublicContentService = async () => {
  const now = Date.now();
  if (cachedPublicContent && now < cachedPublicContentExpiresAt) {
    return cachedPublicContent;
  }
  if (cmsInFlight) {
    return cmsInFlight;
  }

  cmsInFlight = (async () => {
    try {
      const [contentRes, settingsRes] = await Promise.all([
        pool.query("SELECT key, value, updated_at FROM site_content ORDER BY key ASC"),
        pool.query(
          "SELECT key, value, updated_at FROM system_settings WHERE is_public = TRUE ORDER BY key ASC"
        ),
      ]);

      const content = {};
      for (const row of contentRes.rows) {
        content[row.key] = row.value;
      }

      const settings = {};
      for (const row of settingsRes.rows) {
        settings[row.key] = sanitizePublicSettings(row.value);
      }

      const result = { content, settings };
      cachedPublicContent = result;
      cachedPublicContentExpiresAt = Date.now() + CMS_CACHE_TTL_MS;
      return result;
    } finally {
      cmsInFlight = null;
    }
  })();

  return cmsInFlight;
};
