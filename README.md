# Frontling Research Missions

**The Research Lab Without the Lab.** Students reproduce part of a real published result from real public data, investigate their own question, and prove they can apply the method to data they have never seen — in the browser, with no account and no live AI writing their answers.

Built for the Blue Ocean Student Entrepreneur Competition 2027 · Team PJ · [PRD v2.2](docs/PRD.md) · [Benchmark report](docs/BENCHMARK.md) · [Strategy canvas](docs/strategy-canvas.svg) · [Pitch draft](docs/PITCH.md)

## Missions

| Mission | Paper | Reproduces | Prove (transfer) |
|---|---|---|---|
| `gistemp-2024` | Lenssen et al. 2019 (GISTEMP v4) | NASA's 2024 anomaly, 1.28 °C (reference 1.2817), and the 1975–2024 trend | Same methods on HadCRUT5 |
| `keeling-co2` | Keeling et al. 1976, Tellus | 1959→1971 rise: paper 3.4%, today's NOAA record 3.27% — the gap is part of the lesson | Build annual means from monthly data |

## How it works

```
content/missions/<id>  +  data-src/ (pinned public data)
   └─ npm run packs  → public/missions/<id>  (reference values, error signatures, SHA-256, test cases)
   └─ npm run check  → release gate (licence, hashes, hint answer-leak scan, signature separation, all cases)
   └─ vite build     → static site (app shell 15.7 KB gzip, 0 runtime deps, 0 LLM calls per student)
```

- **Validator** (`src/core/validator.ts`): deterministic; returns `VALID | OUT_OF_RANGE | FORMAT_ERROR | METHOD_MISMATCH | INCOMPLETE` plus a diagnosis such as `FAHRENHEIT`, `FENCEPOST`, `PUBLISHED_VALUE`.
- **Hints** (`src/core/hints.ts`): pre-written, approved only, unlocked one level at a time after a failed check and a written attempt, routed by diagnosis; disabled in Prove.
- **Evidence Passport** (`src/core/evidence.ts`): JSON / HTML / print-to-PDF with data hashes, every attempt, hints used, independent first submissions and an evidence SHA-256.

## In-app pages

- `#/` mission library · `#/m/<id>/…` the four stages and Evidence
- `#/why` — Strategy Canvas, ERRC grid and noncustomer tiers, rendered from `public/strategy.json` (also `npm run canvas` → `docs/strategy-canvas.svg`)
- `#/device-check` — measures any laptop against the PRD performance targets and exports JSON (for real low-spec hardware evidence)

## Authoring a new mission (FR-011)

```bash
npm run author -- discover "sea level rise tide gauge"        # OpenAlex: open-access papers with DOIs
npm run author -- scaffold sea-level-2025 10.xxxx/yyyy         # DRAFT skeleton (never published while DRAFT)
ANTHROPIC_API_KEY=... npm run author -- draft sea-level-2025 "scope"   # AI draft, always status "draft"
npm run author -- approve sea-level-2025 "Reviewer Name" --all-hints   # named human approval
npm run build                                                  # release gate decides if it ships
```
A new mission also needs a dataset builder entry in `scripts/build-packs.ts` (pinned source data → clean CSVs).

## Run

```bash
npm ci
npm run dev        # local development
npm run verify     # build + release gate + unit/benchmarks + E2E + performance report
```

E2E and the benchmark use Chrome (`CHROME_PATH`, default `/usr/bin/google-chrome`).

## Verification (Benchmarks A–E)

| | What | Where |
|---|---|---|
| A | Independent implementation recomputes all reference values from raw mirrors | `tests/unit/benchmark-a.test.ts` |
| B | 8 PRD error categories + boundaries (123 cases) | `tests/unit/benchmark-b.test.ts` |
| C | Unapproved hints never shipped (0 exposures), routing, gating | `tests/unit/benchmark-c.test.ts` |
| D | Deterministic builds, re-runnable references, re-verifiable passports | `tests/unit/benchmark-d.test.ts` |
| E | Load, validation, save, memory, transfer size, hosting limits | `scripts/bench.ts` → `docs/BENCHMARK.md` |

## Honest limits

Results are self-reported and stored on the student's device. Hashes detect changes; they do not prove identity or that no outside help was used. Reference values and hints ship to the browser and can be read with developer tools. Missions are `INTERNAL_REVIEWED`; no domain-expert review is claimed. No learning-outcome, purchase-intent or user-count claims are made.

## Licences

Code: MIT ([LICENSE](LICENSE)). Mission text: CC BY 4.0 ([LICENSE-CONTENT](LICENSE-CONTENT)). Data keep their original licences (CC-BY-4.0, ODC-PDDL-1.0), recorded per mission in `licenses.json`.
