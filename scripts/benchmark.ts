// Explicit local/staging smoke test; not a production load or SLA benchmark.
const base = new URL(process.argv[2] ?? "http://localhost:3100");
const timings: number[] = [];
let failures = 0;
for (let batch = 0; batch < 10; batch++)
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      const start = performance.now();
      try {
        const r = await fetch(new URL("/?q=chair", base), {
          signal: AbortSignal.timeout(10000),
        });
        await r.arrayBuffer();
        if (!r.ok) failures++;
      } catch {
        failures++;
      }
      timings.push(performance.now() - start);
    }),
  );
timings.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    requests: timings.length,
    concurrency: 4,
    failures,
    p50_ms: Math.round(timings[Math.floor(timings.length * 0.5)]),
    p95_ms: Math.round(timings[Math.floor(timings.length * 0.95)]),
    scope: "HTTP smoke on current dataset; not a production capacity claim",
  }),
);
process.exitCode = failures ? 1 : 0;

export {};
