import { performance } from "node:perf_hooks";

const webOrigin = process.env.LOAD_WEB_ORIGIN ?? "http://127.0.0.1:3000";
const apiOrigin = process.env.LOAD_API_ORIGIN ?? "http://127.0.0.1:4000";
const virtualUsers = Number(process.env.LOAD_VUS ?? 220);
const webPaths = ["/", "/home", "/listings", "/following", "/chats"];

const samples = { web: [], api: [] };
const failures = [];

async function timed(kind, url) {
  const start = performance.now();
  try {
    const response = await fetch(url, { redirect: "manual" });
    await response.arrayBuffer();
    samples[kind].push(performance.now() - start);
    if (response.status >= 500) failures.push({ url, status: response.status });
  } catch (error) {
    samples[kind].push(performance.now() - start);
    failures.push({ url, error: error instanceof Error ? error.message : String(error) });
  }
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))] ?? 0;
}

function summary(values) {
  return {
    requests: values.length,
    p50Ms: Math.round(percentile(values, 0.5)),
    p95Ms: Math.round(percentile(values, 0.95)),
    p99Ms: Math.round(percentile(values, 0.99)),
    maxMs: Math.round(Math.max(0, ...values)),
  };
}

// Warm caches and connections before the measured concurrent run.
await timed("web", `${webOrigin}/`);
await timed("api", `${apiOrigin}/api/listings`);
samples.web.length = 0;
samples.api.length = 0;
failures.length = 0;

const started = performance.now();
await Promise.all(Array.from({ length: virtualUsers }, async (_, index) => {
  await Promise.all([
    timed("web", `${webOrigin}${webPaths[index % webPaths.length]}`),
    timed("api", `${apiOrigin}/api/listings`),
  ]);
}));
const durationMs = performance.now() - started;
const total = samples.web.length + samples.api.length;
const report = {
  virtualUsers,
  durationMs: Math.round(durationMs),
  requestsPerSecond: Math.round((total / durationMs) * 1000),
  errorRate: Number((failures.length / total).toFixed(4)),
  web: summary(samples.web),
  api: summary(samples.api),
  failures: failures.slice(0, 10),
};

console.log(JSON.stringify(report, null, 2));
if (report.errorRate > 0.01) process.exitCode = 1;
