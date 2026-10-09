import test from 'node:test';
import assert from 'node:assert/strict';
import { bindReports, draftNativePriceReview, auditNativePriceReview } from '../src/native-price-review.mjs';
const hash = 'a'.repeat(64);
const fixture = () => JSON.stringify({ schemaVersion: 1, mode: 'android_pickup_candidates', package: 'de.rewe.app.mobile', priceChannel: 'pickup', validFrom: null, validTo: null, stockVerified: false, catalogueComplete: false, branchApplicabilityVerified: false, branchDisplay: 'Abholen | Metzer Str. 62-64, 48151 Münster / Geist', branchContextSha256: hash, query: 'synthetic', generatedAt: '2026-10-09T12:00:00Z', products: [{ productName: 'Synthetic exact selection', packDisplay: 'Unreviewed pack', priceCents: 123, comparisonEligible: false, inventoryVerified: false, depositCents: null, priceConflicted: false, evidence: [{ sha256: hash, retrievedAt: '2026-10-08T12:00:00Z' }] }] });
const request = { requestId: 'milk', requestedQuantity: 2000, unit: 'ml' };
function draft(bytes = fixture(), requests = [request]) { return draftNativePriceReview([bytes], requests, [{ ...request, reportSha256: bindReports([bytes])[0].sha256, productIndex: 0 }]); }
test('exact byte binding rejects whitespace changes', () => {
 const bytes = fixture(), review = draft(bytes);
 assert.throws(() => auditNativePriceReview([bytes + '\n'], review), /hash-bound/);
});
test('audit preserves unknown pack, deposit, dates and service fees even with manual flags', () => {
 const bytes = fixture(), review = draft(bytes);
 for (const key of Object.keys(review.selections[0].reviewAssertions)) review.selections[0].reviewAssertions[key] = true;
 const result = auditNativePriceReview([bytes], review);
 assert.equal(result.completeBasket, false); assert.equal(result.totalsComputed, false);
 assert.equal(result.lines[0].gaps.length, 6); assert.equal(result.lines[0].assertionsIndependentlyVerified, false);
 assert.equal(review.selections[0].depositCents, null);
});
test('omitted explicit demand cannot count as complete coverage', () => {
 const bytes = fixture(), review = draft(bytes, [request, { requestId: 'eggs', requestedQuantity: 12, unit: 'count' }]);
 const result = auditNativePriceReview([bytes], review);
 assert.deepEqual(result.omittedRequests, ['eggs']); assert.equal(result.requiredRequestCount, 2); assert.equal(result.completeBasket, false);
});
test('commercial selection, channel and demand mismatches fail closed', () => {
 const bytes = fixture();
 for (const [key, value] of [['productName', 'Other'], ['packDisplay', '1 L'], ['priceCents', 99], ['priceChannel', 'shelf'], ['reviewedPackQuantity', 1000], ['reviewedPackUnit', 'ml'], ['depositCents', 0]]) {
  const review = draft(bytes); review.selections[0][key] = value;
  assert.throws(() => auditNativePriceReview([bytes], review), /changed/);
 }
 const review = draft(bytes); review.priceChannel = 'historical'; assert.throws(() => auditNativePriceReview([bytes], review), /channel/);
 assert.throws(() => draftNativePriceReview([bytes], [request], [{ ...request, requestedQuantity: 1, productIndex: 0, reportSha256: bindReports([bytes])[0].sha256 }]), /differs/);
});
test('no inferred requests and conflicting amounts remain excluded', () => {
 assert.throws(() => draftNativePriceReview([fixture()], [], []), /explicit/);
 const raw = JSON.parse(fixture()); raw.products[0].priceConflicted = true;
 const bytes = JSON.stringify(raw), result = auditNativePriceReview([bytes], draft(bytes));
 assert.ok(result.lines[0].gaps.includes('conflicting_amounts'));
});

import { mkdtemp, mkdir, cp, writeFile, symlink, stat, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
async function cliFixture(t) {
 const root = await mkdtemp(join(tmpdir(), 'native-price-review-'));
 t.after(() => rm(root, { recursive: true, force: true }));
 await mkdir(join(root, 'scripts')); await mkdir(join(root, 'src'));
 const project = fileURLToPath(new URL('../', import.meta.url));
 await cp(join(project, 'scripts/audit-native-price-review.mjs'), join(root, 'scripts/audit-native-price-review.mjs'));
 for (const name of ['native-price-review.mjs', 'native-app-data.mjs', 'offer-view.mjs', 'retailer-source.mjs']) await cp(join(project, 'src', name), join(root, 'src', name));
 const run = args => spawnSync(process.execPath, [join(root, 'scripts/audit-native-price-review.mjs'), ...args], { encoding: 'utf8' });
 const args = ['--report', 'source.json', '--requests', JSON.stringify([request]), '--selection', JSON.stringify([{ ...request, reportOrdinal: 0, productIndex: 0 }]), '--draft-output', 'draft.json'];
 return { root, run, args };
}
test('CLI rejects linked local-data root before reading or writing private files', async t => {
 const { root, run, args } = await cliFixture(t);
 const target = join(root, 'outside'); await mkdir(target); await writeFile(join(target, 'source.json'), fixture());
 await symlink(target, join(root, 'local-data'));
 const result = run(args); assert.equal(result.status, 1); assert.match(result.stderr, /Linked local-data root/);
 await assert.rejects(stat(join(target, 'draft.json')), { code: 'ENOENT' });
});
test('CLI rejects source aliases within local-data and external symlinks', async t => {
 const { root, run, args } = await cliFixture(t); const local = join(root, 'local-data'); await mkdir(local);
 await writeFile(join(local, 'real.json'), fixture()); await symlink(join(local, 'real.json'), join(local, 'source.json'));
 assert.match(run(args).stderr, /Linked source/);
 await rm(join(local, 'source.json')); await writeFile(join(root, 'outside.json'), fixture()); await symlink(join(root, 'outside.json'), join(local, 'source.json'));
 assert.match(run(args).stderr, /Linked source/);
});
test('CLI creates exclusive private files and refuses replacement or linked output', async t => {
 const { root, run, args } = await cliFixture(t); const local = join(root, 'local-data'); await mkdir(local); await writeFile(join(local, 'source.json'), fixture());
 assert.equal(run(args).status, 0); assert.equal((await stat(join(local, 'draft.json'))).mode & 0o777, 0o600);
 const before = await readFile(join(local, 'draft.json')); assert.equal(run(args).status, 1); assert.deepEqual(await readFile(join(local, 'draft.json')), before);
 await rm(join(local, 'draft.json')); await writeFile(join(root, 'outside.json'), 'preserve'); await symlink(join(root, 'outside.json'), join(local, 'draft.json'));
 assert.equal(run(args).status, 1); assert.equal(await readFile(join(root, 'outside.json'), 'utf8'), 'preserve');
});
test('CLI bounds report count before attempting report reads', async t => {
 const { run } = await cliFixture(t);
 const result = run(Array.from({ length: 7 }, () => ['--report', 'nonexistent.json']).flat());
 assert.equal(result.status, 1); assert.match(result.stderr, /one to six/); assert.doesNotMatch(result.stderr, /ENOENT/);
});
