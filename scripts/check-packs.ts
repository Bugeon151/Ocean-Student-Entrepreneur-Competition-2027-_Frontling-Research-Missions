import { checkPack, loadPacks } from './packcheck-lib';
let bad = 0;
for (const p of loadPacks()) {
  const errs = checkPack(p);
  console.log(`${errs.length ? 'FAIL' : 'PASS'} ${p.id} (${p.cases.length} cases, ${p.hints.filter((h) => h.status === 'approved').length} approved hints)`);
  errs.forEach((x) => console.log('  - ' + x));
  bad += errs.length;
}
if (bad) process.exit(1);
