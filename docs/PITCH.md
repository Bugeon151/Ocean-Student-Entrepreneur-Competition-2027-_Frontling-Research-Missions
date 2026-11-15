# 5-Minute Pitch — Draft v1 (English)

> Before recording: open the **official Blue Ocean pitch template** (sent with registration / on blueoceancompetition.org) and re-order the sections below to match it exactly. This draft follows the PRD §22.4 order and covers every tool the scoring page names (ERRC Grid, Strategy Canvas, Three Tiers of Noncustomers, Buyer Utility). Target length 4:40–4:55 (hard limits 3:00–5:00).
>
> Every number below is reproducible from the repository (`npm run verify`). Replace any line marked **[INTERVIEW]** only with real interview results; delete it if you have none.

| Time | Section | On screen | Words |
|---|---|---|---|
| 0:00–0:35 | Hook: unequal access | Face to camera → title card | ~85 |
| 0:35–1:05 | Red ocean | Strategy Canvas (competitors only) | ~75 |
| 1:05–2:10 | Live demo | App screen recording (GISTEMP mission) | ~150 |
| 2:10–3:05 | Blue ocean tools | ERRC grid → full canvas → noncustomer tiers | ~135 |
| 3:05–4:05 | Proof & economics | Benchmark report → cost numbers | ~145 |
| 4:05–4:45 | Go-to-market | Phase A→B→C slide | ~90 |
| 4:45–5:00 | Vision | Face to camera | ~40 |

---

### 0:00–0:35 · Hook
"Imagine two students who are equally curious about climate change. One has a professor as a mentor and a lab to work in. The other has a laptop and a school with no research teacher. Economists at Harvard found that children from the top 1% of income are about ten times more likely to become inventors than children from below-median families — and much of that gap comes from *exposure*, not ability. I'm [Name] from Team PJ, and we built Frontling Research Missions: the research lab without the lab."

### 0:35–1:05 · The red ocean
"Today a student who wants real research has two choices. Mentored programs pair you one-to-one with a PhD — excellent, but they start at thousands of dollars. Or free project libraries and AI chatbots — cheap, but nobody checks whether your result is right, and a 2025 study in PNAS found that students using AI without guardrails did worse when the AI was taken away. Expensive and verified, or free and unverified. Nobody offers free *and* verified."

### 1:05–2:10 · Demo (screen recording)
"Here's how it works. I pick a mission built on a real paper: NASA's GISTEMP record. NASA reported that 2024 was 1.28 °C warmer than the 1951–1980 average. My job is to reproduce that from NASA's own monthly data.

[Understand] First I learn what an anomaly is. Wrong answers get a nudge, never the answer.

[Reproduce] I compute the 2024 average in a spreadsheet — and I make a classic mistake: I convert to Fahrenheit. Frontling doesn't just say 'wrong'. It recognizes *which* mistake I made, and once I write down what I tried, it unlocks a reviewed hint for exactly that error. I fix it: 1.28. Valid — I just reproduced NASA's headline number.

[Prove] Then the hints switch off and I get a dataset I've never seen — the UK's HadCRUT5 record. Same method, new data. That's how we check the skill transferred.

[Evidence] Everything I did — every attempt, every hint, the data fingerprints — exports as a Research Evidence Passport."

### 2:10–3:05 · Blue ocean tools
"Here's our ERRC grid. We **eliminate** the mandatory one-to-one mentor, selection, and live AI answers. We **reduce** content cost per student and teacher workload. We **raise** the use of real papers and reproducibility. And we **create** three things nobody bundles together: a reusable Research Mission Pack, a validator that diagnoses errors, and a transfer test on new data.

On the strategy canvas you can see our value curve break away: zero on live mentoring, but top marks on verification, transfer assessment and low cost per student.

That opens three tiers of noncustomers: students already struggling with chatbots, students and schools priced out of mentored programs, and — the biggest — schools that have never run a data-research class because they have no research-trained teacher. In the U.S. alone there are 15.6 million public high-school students."

### 3:05–4:05 · Proof and economics
"We didn't want to claim things we hadn't tested. So every claim has an automated test you can re-run: an independent implementation recomputes every reference value; 123 error cases are checked; and zero unapproved hints have ever shipped — 164 automated tests in total.

The cost structure is the blue ocean. A mentor's hour is spent once, on one student. A mission is reviewed once and reused by every student after that. Students make zero AI calls — about 41 kilobytes per mission — so free static hosting covers about 2.4 million mission starts a month. Our cost is creating and reviewing missions, not serving students. At a five-dollar mission pack, a 250-dollar mission pays for itself after 56 sales — that's a hypothesis we're testing, not a result.

**[INTERVIEW]** In interviews with [N] students and [M] teachers, [X] said … ."

### 4:05–4:45 · Go-to-market
"We start free for individual students, in English, with no sign-up — the fastest way to reach Tier 1. Next, mission packs for science clubs and STEM teachers. Then school licences, once schools tell us with real orders that they want them. Every new mission follows the same pipeline: find an open paper and open data, draft, compute the reference, human review, publish."

### 4:45–5:00 · Vision
"The next great scientist may not have a laboratory. They may not have a mentor. But they may have a laptop. We're not replacing the thinking — we're removing the barriers to starting. Frontling: real science, real evidence, no answers handed to you."

---

## Claim checklist (read before recording)

| Claim in script | Source | OK to say? |
|---|---|---|
| Top 1% ≈ 10× more likely to become inventors | Bell et al. 2019 (NBER w24062) | ✅ |
| AI without guardrails → worse unassisted performance | Bastani et al. 2025, PNAS | ✅ |
| NASA 2024 = 1.28 °C vs 1951–1980 | NASA Earth Indicators | ✅ |
| Mentored programs "start at thousands" | Polygence: from $2,895; Lumiere: $2,600–$8,400 reported | ✅ |
| 15.6 million U.S. public high-school students | NCES, fall 2023 | ✅ |
| 164 automated tests, 0 unapproved hints, ~41 KB, ~2.4 M starts/month | docs/BENCHMARK.md (re-run before recording) | ✅ — update if numbers change |
| $250 mission / $5 / 56 sales | PRD §16.3 assumption | ✅ only as "hypothesis" |
| Learning gains, purchase intent, user counts | — | ❌ never |
| "Expert-reviewed" | Missions are INTERNAL_REVIEWED | ❌ say "reviewed", not "expert-reviewed", until a domain review is recorded |

## Shot list
1. Library → GISTEMP card (2 s) · 2. Understand: wrong answer nudge (5 s) · 3. Reproduce: enter 2.31 → OUT_OF_RANGE → write attempt → unlock FAHRENHEIT hint (12 s) · 4. Enter 1.28 → VALID with NASA reference link (5 s) · 5. Prove: hints disabled banner, HadCRUT5 (6 s) · 6. Evidence: export JSON (4 s) · 7. `#/why` page: ERRC + canvas (B-roll for 2:10–3:05) · 8. docs/BENCHMARK.md table (B-roll for 3:05).
