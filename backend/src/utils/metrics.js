const LATENCY_WINDOW_SIZE = 256;
const SLOW_REQUEST_THRESHOLD_MS = 1000;

const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  slowRequests: 0,
  statusBuckets: {
    "2xx": 0,
    "3xx": 0,
    "4xx": 0,
    "5xx": 0,
  },
  durations: [],
  shuttingDown: false,
};

export const setShuttingDown = (flag) => {
  state.shuttingDown = Boolean(flag);
};

export const isShuttingDown = () => state.shuttingDown;

export const recordRequestMetric = ({ statusCode, durationMs }) => {
  state.totalRequests++;
  if (statusCode >= 500) {
    state.totalErrors++;
    state.statusBuckets["5xx"]++;
  } else if (statusCode >= 400) {
    state.statusBuckets["4xx"]++;
  } else if (statusCode >= 300) {
    state.statusBuckets["3xx"]++;
  } else {
    state.statusBuckets["2xx"]++;
  }

  if (durationMs >= SLOW_REQUEST_THRESHOLD_MS) {
    state.slowRequests++;
  }

  state.durations.push(Number(durationMs.toFixed(2)));
  if (state.durations.length > LATENCY_WINDOW_SIZE) {
    state.durations.shift();
  }
};

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Number(sorted[idx].toFixed(2));
};

export const getMetricsSnapshot = (pool = null) => {
  const sorted = [...state.durations].sort((a, b) => a - b);
  const avgMs = sorted.length
    ? Number((sorted.reduce((sum, v) => sum + v, 0) / sorted.length).toFixed(2))
    : 0;
  const uptimeSec = Math.max(1, (Date.now() - state.startedAt) / 1000);

  return {
    uptimeSeconds: Math.round(uptimeSec),
    shuttingDown: state.shuttingDown,
    totalRequests: state.totalRequests,
    requestsPerSecond: Number((state.totalRequests / uptimeSec).toFixed(2)),
    totalErrors: state.totalErrors,
    errorRatePct: state.totalRequests
      ? Number(((state.totalErrors / state.totalRequests) * 100).toFixed(2))
      : 0,
    slowRequests: state.slowRequests,
    statusBuckets: { ...state.statusBuckets },
    latencyMs: {
      sampleSize: sorted.length,
      avg: avgMs,
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      p99: percentile(sorted, 99),
    },
    dbPool: pool
      ? {
          total: pool.totalCount ?? 0,
          idle: pool.idleCount ?? 0,
          waiting: pool.waitingCount ?? 0,
        }
      : null,
  };
};

export const resetMetrics = () => {
  state.startedAt = Date.now();
  state.totalRequests = 0;
  state.totalErrors = 0;
  state.slowRequests = 0;
  state.statusBuckets = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0 };
  state.durations = [];
};
