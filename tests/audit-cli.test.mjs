import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('coverage audit CLI validates before fetching and preserves output files', async t => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'groceries-audit-test-'));
  const originalFetch = globalThis.fetch;
  const originalLog = console.log;
  const requests = [];
  globalThis.fetch = async url => {
    requests.push(String(url));
    return { ok: true, status: 200, json: async () => ({ items: [], page: 1, pages: 0, size: 100, total: 0 }) };
  };
  console.log = () => {};
  try {
    let runAudit;
    await t.test('importing the CLI does not execute its entrypoint', async () => {
      ({ runAudit } = await import('../scripts/audit-coverage.mjs'));
      assert.equal(requests.length, 0);
    });

    await t.test('missing output and invalid arguments make zero fetch calls', async () => {
      await assert.rejects(runAudit([]), /--out is mandatory/);
      await assert.rejects(runAudit(['--out', join(temporaryDirectory, 'invalid.json'), '--since', '2026-02-30']), /--since/);
      await assert.rejects(runAudit(['--out', join(temporaryDirectory, 'invalid.json'), '--radius-km', '31']), /radius/);
      assert.equal(requests.length, 0);
    });

    await t.test('existing output is preserved without fetching', async () => {
      const outputPath = join(temporaryDirectory, 'existing.json');
      await writeFile(outputPath, 'original audit\n', { flag: 'wx' });
      await assert.rejects(runAudit(['--out', outputPath]), /already exists/);
      assert.equal(await readFile(outputPath, 'utf8'), 'original audit\n');
      assert.equal(requests.length, 0);
    });

    await t.test('a file in place of the parent directory fails before fetching', async () => {
      const blockedParent = join(temporaryDirectory, 'parent-is-file');
      await writeFile(blockedParent, 'preserve me', { flag: 'wx' });
      await assert.rejects(runAudit(['--out', join(blockedParent, 'audit.json')]));
      assert.equal(await readFile(blockedParent, 'utf8'), 'preserve me');
      assert.equal(requests.length, 0);
    });

    await t.test('new nested output retains provenance and refuses a second run', async () => {
      const outputPath = join(temporaryDirectory, 'new', 'nested', 'audit.json');
      const report = await runAudit(['--out', outputPath]);
      assert.equal(requests.length, 1);
      assert.equal(new URL(requests[0]).hostname, 'prices.openfoodfacts.org');
      assert.equal(new URL(requests[0]).searchParams.get('size'), '100');
      assert.equal(report.referenceDateBasis, 'Europe/Berlin');
      const expectedSince = new Date(Date.parse(`${report.queriedWindow.referenceDate}T00:00:00Z`) - 13 * 86400000).toISOString().slice(0, 10);
      assert.equal(report.queriedWindow.sinceInclusive, expectedSince);
      assert.equal(report.limits.maximumRetainedRecords, 300);
      assert.equal(report.summary.observationCount, 0);
      assert.equal(report.providerTotal, 0);
      assert.equal(report.truncated, false);
      assert.equal(report.license, 'ODbL-1.0');
      assert.equal(report.attribution, 'Open Prices / Open Food Facts');
      assert.equal(report.requests.length, 1);
      assert.match(report.summary.meaning, /neither current-price validity/);
      const saved = await readFile(outputPath, 'utf8');
      assert.deepEqual(JSON.parse(saved), report);
      await assert.rejects(runAudit(['--out', outputPath]), /already exists/);
      assert.equal(requests.length, 1);
      assert.equal(await readFile(outputPath, 'utf8'), saved);
    });
  } finally {
    globalThis.fetch = originalFetch;
    console.log = originalLog;
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});
