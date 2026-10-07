import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, stat, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { runHistoricalAudit, parseHistoricalArguments } from '../scripts/audit-historical.mjs';

const capture = '2026-10-07T12:00:00.000Z';
const emptyReport = {
  auditVersion: 1, generatedAt: capture, referenceDateBasis: 'Europe/Berlin',
  attribution: 'Open Prices / Open Food Facts', license: 'ODbL-1.0',
  queriedWindow: { sinceInclusive: '2026-09-24', referenceDate: '2026-10-07', upperDateFilterApplied: false },
  limits: { maxPages: 3, pageSize: 100, maximumRetainedRecords: 300 },
  query: { lat: 51.96236, lon: 7.62571, radiusKm: 3, observedSince: '2026-09-24' },
  requests: [{ url: 'https://prices.openfoodfacts.org/api/v1/prices?lat=51.96236&lon=7.62571&radius_km=3&currency=EUR&size=100&page=1&date__gte=2026-09-24', capturedAt: capture }],
  providerTotal: 0, truncated: false, observations: []
};

test('historical CLI rejects malformed arguments', () => {
  for (const args of [[], ['--draft'], ['--report', 'x', '--report', 'y'], ['--unknown', 'x'], ['--draft', '--report', 'x', '--basket', 'b', '--shopping-date', '2026-10-07', '--max-age-days', '-1', '--out', 'o']]) {
    assert.throws(() => parseHistoricalArguments(args));
  }
});

test('local draft and audit preserve inputs, enforce fingerprints and never overwrite output', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'historical-cli-'));
  const log = console.log, fetch = globalThis.fetch;
  const logs = []; let networkCalls = 0;
  console.log = value => logs.push(value);
  globalThis.fetch = () => { networkCalls++; throw new Error('Network forbidden'); };
  try {
    const input = join(directory, 'report.json'), basket = join(directory, 'basket.json');
    const draft = join(directory, 'review.json'), output = join(directory, 'nested', 'audit.json');
    const original = JSON.stringify(emptyReport);
    await writeFile(input, original);
    await writeFile(basket, JSON.stringify({ version: 'public-starter-v1', items: [{ id: 'pasta', category: 'pasta', quantity: 750, unit: 'g', basis: 'net', brand: null, requiredTags: [] }] }));
    const review = await runHistoricalAudit(['--draft', '--report', input, '--basket', basket, '--shopping-date', '2026-10-07', '--max-age-days', '13', '--out', draft]);
    assert.match(review.reportSha256, /^[a-f0-9]{64}$/);
    assert.equal(review.allowMembership, false);
    assert.deepEqual(review.recordReviews, []);
    assert.equal((await stat(draft)).mode & 0o777, 0o600);
    const result = await runHistoricalAudit(['--report', input, '--review', draft, '--out', output]);
    assert.equal(result.currentPriceEligible, false);
    assert.equal(result.rankingEnabled, false);
    assert.equal(result.mergedLineCount, 1);
    assert.equal(result.reportRecordCount, 0);
    assert.equal(await readFile(input, 'utf8'), original);
    assert.equal((await stat(output)).mode & 0o777, 0o600);
    const saved = await readFile(output, 'utf8');
    await assert.rejects(runHistoricalAudit(['--report', input, '--review', draft, '--out', output]), /exists/);
    assert.equal(await readFile(output, 'utf8'), saved);
    await writeFile(input, original + '\n');
    await assert.rejects(runHistoricalAudit(['--report', input, '--review', draft, '--out', join(directory, 'changed.json')]));
    assert.equal(networkCalls, 0);
    assert.equal(logs.join('').includes('providerRecordId'), false);
    assert.equal(logs.join('').includes('51.96236'), false);
  } finally {
    console.log = log; globalThis.fetch = fetch;
    await rm(directory, { recursive: true, force: true });
  }
});

test('CLI errors do not echo malformed private input', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'historical-error-'));
  try {
    const input = join(directory, 'private.json');
    await writeFile(input, '{PRIVATE_OWNER_AND_RECEIPT');
    const result = spawnSync(process.execPath, ['scripts/audit-historical.mjs', '--report', input, '--review', input, '--out', join(directory, 'out.json')], {
      cwd: new URL('..', import.meta.url), encoding: 'utf8'
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /No raw data was printed/);
    assert.equal(result.stderr.includes('PRIVATE_OWNER'), false);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
