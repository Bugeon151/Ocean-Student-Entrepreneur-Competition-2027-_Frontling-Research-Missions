import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { stableStringify } from '../../src/core/hash';

const rules = (id: string) => JSON.parse(readFileSync(`public/missions/${id}/validation/rules.json`, 'utf8')).tasks as { id: string; expected: number; min_decimals: number; method: { key: string; expected: string; type: string }[]; signatures: { code: string; value: number }[] }[];
const stage = (id: string, f: string) => JSON.parse(readFileSync(`public/missions/${id}/stages/${f}.json`, 'utf8'));

async function answerQuiz(page: Page, id: string) {
  const u = stage(id, 'understand');
  for (const q of [...u.quiz, u.data_check]) {
    const fs = page.locator(`#quiz-${q.id}`);
    const wrong = q.answer === 0 ? 1 : 0;
    await fs.locator('input').nth(wrong).check();
    await fs.getByRole('button', { name: 'Check' }).click();
    const fb = page.locator(`#quiz-${q.id} .fb`);
    await expect(fb).toContainText('✗');
    await expect(fb).not.toContainText(q.options[q.answer]); // feedback never reveals the answer text
    await page.locator(`#quiz-${q.id}`).locator('input').nth(q.answer).check();
    await page.locator(`#quiz-${q.id}`).getByRole('button', { name: 'Check' }).click();
    await expect(page.locator(`#quiz-${q.id} .fb`)).toContainText('Correct');
  }
}
async function fillTask(page: Page, t: ReturnType<typeof rules>[number], value: string, override: Record<string, string> = {}) {
  for (const f of t.method) {
    const v = override[f.key] ?? f.expected;
    const el = page.locator(`#${t.id}-${f.key}`);
    if (f.type === 'select') await el.selectOption(v); else await el.fill(v);
  }
  await page.locator(`#${t.id}-value`).fill(value);
}

test('GISTEMP mission: full four-stage flow, hints gating, persistence and evidence export', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const R = Object.fromEntries(rules('gistemp-2024').map((t) => [t.id, t]));
  await page.goto('/');
  await expect(page.locator('.card')).toHaveCount(2);
  await page.locator('.card', { hasText: 'NASA' }).getByRole('link', { name: 'Start mission' }).click();
  await expect(page.locator('.overview')).toContainText('partial, not full');
  await page.getByRole('link', { name: 'Go to workspace' }).click();
  await expect(page.locator('.stepper .locked')).toHaveCount(3);

  // Stage 1
  await answerQuiz(page, 'gistemp-2024');
  await page.getByRole('link', { name: 'Continue to next stage →' }).click();

  // Stage 2 — diagnosed error, hint gating, unlock, then valid
  const r1 = R['r1-annual-2024'];
  await fillTask(page, r1, r1.signatures.find((s) => s.code === 'FAHRENHEIT')!.value.toFixed(3));
  await page.locator('#task-r1-annual-2024').getByRole('button', { name: 'Check result' }).click();
  await expect(page.locator('#res-r1-annual-2024')).toContainText('OUT_OF_RANGE');
  await expect(page.locator('#hints-r1-annual-2024')).toContainText('Describe what you tried');
  await page.locator('#r1-annual-2024-note').fill('I averaged the 12 months of 2024 and converted to Fahrenheit.');
  await page.locator('#task-r1-annual-2024').getByRole('button', { name: 'Check result' }).click();
  await page.locator('#hints-r1-annual-2024').getByRole('button', { name: /Unlock hint/ }).click();
  await expect(page.locator('#hints-r1-annual-2024')).toContainText('different temperature unit');
  await expect(page.locator('body')).not.toContainText('DRAFT — not reviewed');
  // method mismatch is detected
  await fillTask(page, r1, r1.expected.toFixed(2), { months: 'December 2023–November 2024' });
  await page.locator('#task-r1-annual-2024').getByRole('button', { name: 'Check result' }).click();
  await expect(page.locator('#res-r1-annual-2024')).toContainText('METHOD_MISMATCH');
  await fillTask(page, r1, r1.expected.toFixed(2));
  await page.locator('#task-r1-annual-2024').getByRole('button', { name: 'Check result' }).click();
  await expect(page.locator('#res-r1-annual-2024')).toContainText('VALID');
  const r2 = R['r2-trend-1975-2024'];
  await fillTask(page, r2, r2.expected.toFixed(3));
  await page.locator('#task-r2-trend-1975-2024').getByRole('button', { name: 'Check result' }).click();
  await expect(page.locator('#res-r2-trend-1975-2024')).toContainText('VALID');

  // persistence across reload
  await page.reload();
  await expect(page.locator('.stepper')).toContainText('2 · Reproduce ✓');
  await page.getByRole('link', { name: 'Continue to next stage →' }).click();

  // Stage 3
  await page.getByRole('button', { name: 'Run analysis' }).click();
  await expect(page.locator('.center .result')).toContainText('OLS trend');
  await expect(page.locator('svg.chart .trend')).toHaveCount(1);
  const labels = ['Research question *', 'Hypothesis (what you expect and why)', 'Analysis method *', 'Actual result *', 'Interpretation (including results that surprised you) *', 'Limitations of the data and analysis *'];
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.locator('[role=alert]')).toContainText('Please complete');
  for (const l of labels) await page.getByLabel(l).fill(`My ${l.replace(' *', '').toLowerCase()} — written by the student.`);
  await page.getByRole('button', { name: 'Submit report' }).click();
  await expect(page.locator('.right')).toContainText('Submitted');
  await page.getByRole('link', { name: 'Continue to next stage →' }).click();

  // Stage 4 — no hints, first submission recorded
  await expect(page.locator('.hints')).toHaveCount(0);
  const p1 = R['p1-hadcrut-2024'], p2 = R['p2-hadcrut-trend'];
  await fillTask(page, p1, p1.expected.toFixed(2));
  await page.locator('#task-p1-hadcrut-2024').getByRole('button', { name: 'Submit result' }).click();
  await expect(page.locator('#res-p1-hadcrut-2024')).toContainText('VALID');
  await fillTask(page, p2, '0.150');
  await page.locator('#task-p2-hadcrut-trend').getByRole('button', { name: 'Submit result' }).click();
  await expect(page.locator('#res-p2-hadcrut-trend')).toContainText('No diagnosis is shown in Prove');
  await fillTask(page, p2, p2.expected.toFixed(3));
  await page.locator('#task-p2-hadcrut-trend').getByRole('button', { name: 'Submit result' }).click();
  await expect(page.locator('#task-p2-hadcrut-trend')).toContainText('Independent (first) submission recorded: 0.150 → OUT_OF_RANGE');
  await page.locator('.right textarea').first().fill('The trends agree closely; the absolute anomalies differ because the baselines differ.');
  await page.locator('.right textarea').first().blur();
  await page.getByRole('link', { name: 'View your Research Evidence →' }).click();

  // Evidence export
  const dl = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const e = JSON.parse(readFileSync((await (await dl).path())!, 'utf8'));
  const manifest = JSON.parse(readFileSync('public/missions/gistemp-2024/manifest.json', 'utf8'));
  expect(e.schema).toBe('frontling.evidence/1.0');
  expect(e.mission.content_hash).toBe(manifest.content_hash);
  expect(e.data.every((d: { verified_in_browser: boolean }) => d.verified_in_browser)).toBe(true);
  expect(Object.values(e.progress.completed).every(Boolean)).toBe(true);
  expect(e.stages.reproduce.tasks[0].hints_used).toEqual(['g-r1-f-1']);
  expect(e.stages.prove.tasks[1].independent_result.code).toBe('OUT_OF_RANGE');
  expect(e.stages.prove.tasks[1].valid).toBe(true);
  expect(e.stages.investigate.submission.question).toContain('student');
  const { integrity, ...body } = e;
  expect(createHash('sha256').update(stableStringify(body)).digest('hex')).toBe(integrity.evidence_sha256);
  const dl2 = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export HTML report' }).click();
  const html = readFileSync((await (await dl2).path())!, 'utf8');
  expect(html).toContain('Research Evidence Passport');
  expect(html).toContain(manifest.content_hash);
  expect(errors).toEqual([]);
});

test('stages are locked until the previous stage is complete', async ({ page }) => {
  await page.goto('/#/m/keeling-co2/prove');
  await expect(page).toHaveURL(/keeling-co2\/understand/);
});

test('mobile layout shows one pane with tab switching', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/m/keeling-co2/understand');
  await expect(page.locator('.tabs')).toBeVisible();
  await expect(page.locator('.pane.left')).toBeHidden();
  await page.getByRole('tab', { name: 'Guide' }).click();
  await expect(page.locator('.pane.left')).toBeVisible();
  await expect(page.locator('.pane.center')).toBeHidden();
});

test('keyboard only: reach and start a mission', async ({ page }) => {
  await page.goto('/');
  await page.locator('.card').first().waitFor();
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); if ((await page.evaluate(() => document.activeElement?.textContent)) === 'Start mission') break; }
  await page.keyboard.press('Enter');
  await expect(page.locator('.overview')).toBeVisible();
});

test('invalid mission id shows a recoverable error', async ({ page }) => {
  await page.goto('/#/m/..%2Fsecret/overview');
  await expect(page.locator('[role=alert]')).toContainText('Something went wrong');
});

test('Keeling mission: entering the paper\'s number is diagnosed and routed to its own hint branch', async ({ page }) => {
  const R = Object.fromEntries(rules('keeling-co2').map((t) => [t.id, t]));
  await page.goto('/#/m/keeling-co2/understand');
  await answerQuiz(page, 'keeling-co2');
  await page.getByRole('link', { name: 'Continue to next stage →' }).click();
  const r1 = R['r1-pct-1959-1971'];
  await fillTask(page, r1, '3.40');
  await page.locator('#r1-pct-1959-1971-note').fill('I used the percentage reported in the 1976 abstract.');
  await page.locator('#task-r1-pct-1959-1971').getByRole('button', { name: 'Check result' }).click();
  await expect(page.locator('#res-r1-pct-1959-1971')).toContainText('OUT_OF_RANGE');
  await page.locator('#hints-r1-pct-1959-1971').getByRole('button', { name: /Unlock hint/ }).click();
  await expect(page.locator('#hints-r1-pct-1959-1971')).toContainText("You entered the paper's number");
  await fillTask(page, r1, r1.expected.toFixed(2));
  await page.locator('#task-r1-pct-1959-1971').getByRole('button', { name: 'Check result' }).click();
  await expect(page.locator('#res-r1-pct-1959-1971')).toContainText('VALID');
});
