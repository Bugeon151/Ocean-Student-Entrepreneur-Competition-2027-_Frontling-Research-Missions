# Benchmark Report (auto-generated)

Generated 2026-11-15T12:58:19.253Z by `npm run bench` on 2 vCPU / 7.8 GB (Intel(R) Xeon(R) Processor @ 2.10GHz), Node v22.23.4, Chrome.
Raw data: [benchmark.json](benchmark.json). Re-run any time: `npm run build && npm run bench`.

## A–D · Correctness benchmarks (Vitest)

| Suite | Passed / Total |
|---|---|
| benchmark-a.test.ts | 11 / 11 |
| benchmark-b.test.ts | 123 / 123 |
| benchmark-c.test.ts | 6 / 6 |
| benchmark-d.test.ts | 3 / 3 |
| core.test.ts | 8 / 8 |

## E · Performance vs PRD §12.1 targets

| Metric | Measured | Target | Status |
|---|---:|---:|---|
| App initial load (local server, 4× CPU slowdown) | 374 ms | ≤ 5000 ms | PASS |
| GISTEMP data ready incl. SHA-256 verify (4× CPU slowdown) | 290 ms | ≤ 10000 ms | PASS |
| Single validation (Node p99) | 0.00425 ms | ≤ 500 ms | PASS |
| Progress save (4× CPU slowdown) | 0.032 ms | ≤ 1000 ms | PASS |
| Stage switch (4× CPU slowdown) | 162 ms | ≤ 1000 ms | PASS |

Note: load times are measured against a local preview server, so they exclude real-world network latency. The 4× CPU slowdown approximates a low-end laptop; it is an emulation, not a measurement on real low-spec hardware.

| Browser metric | Normal CPU | 4× CPU slowdown |
|---|---:|---:|
| app_initial_load_ms | 145 | 374 |
| gistemp_data_ready_ms | 114 | 290 |
| stage_switch_ms | 74 | 162 |
| save_ms | 0.032 | 0.032 |
| js_heap_mb | 3.078 | 3.06 |

## E · Size & distribution cost

| Item | Raw | Gzip |
|---|---:|---:|
| App shell (HTML+JS+CSS) | 41.5 KB | 15.7 KB |
| Mission pack `gistemp-2024` | 77.5 KB | 25.1 KB |
| Mission pack `keeling-co2` | 33.5 KB | 12.5 KB |

- LLM/API calls per student: **0** (all content is pre-built static data).
- Transfer per student per mission (gzip, worst case): **40.8 KB**.
- GitHub Pages soft bandwidth limit (100 GB/month) ≈ **2,394,463 mission starts per month** at $0 hosting.
- Cloudflare Pages lists unlimited static bandwidth on its free plan, so marginal hosting cost per student can be treated as ≈ $0 there; support, content production and review remain real costs.

Unit economics formula (PRD §16.3): C = AI drafting + human review + reference validation + maintenance. Record actual hours in [COST_LOG.md](COST_LOG.md).
