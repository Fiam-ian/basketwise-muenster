import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadLocalAppReports } from '../src/local-app-data.mjs';

const report = { offerViewVersion: 1, storeId: 'edeka-074601', mode: 'advertised_candidates',
  rankingEnabled: false, inventoryComplete: false, captureManifestSha256: 'a'.repeat(64), leafletSha256: 'b'.repeat(64),
  validFrom: '2026-10-05', validTo: '2026-10-10', retrievedAt: '2026-10-07T21:47:19.174Z',
  reviewMethod: 'Synthetic test fixture', candidates: [], privateOwner: 'DO_NOT_EXPOSE' };

test('local endpoint projection requires explicit bounded basenames and removes private fields', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basketwise-app-test-'));
  try {
    await mkdir(join(root, 'local-data'));
    await writeFile(join(root, 'local-data', 'report.json'), JSON.stringify(report));
    assert.deepEqual(await loadLocalAppReports(root), []);
    const [parsed] = await loadLocalAppReports(root, '["report.json"]');
    assert.equal(parsed.storeId, report.storeId);
    assert.equal(JSON.stringify(parsed).includes('DO_NOT_EXPOSE'), false);
    for (const names of ['{', '{}', '["../report.json"]', '["/tmp/report.json"]', '["sub/report.json"]', '["sub\\\\report.json"]', '["report.txt"]', '[null]', '["report.json","report.json"]', '["a.json","b.json","c.json","d.json"]']) {
      await assert.rejects(loadLocalAppReports(root, names));
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('symlink reports, linked data roots and oversized reports are excluded', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basketwise-app-test-'));
  try {
    await mkdir(join(root, 'local-data'));
    await writeFile(join(root, 'outside.json'), JSON.stringify(report));
    await symlink(join(root, 'outside.json'), join(root, 'local-data', 'linked.json'));
    await assert.rejects(loadLocalAppReports(root, '["linked.json"]'));
    await writeFile(join(root, 'local-data', 'large.json'), ' '.repeat(2 * 1024 * 1024 + 1));
    await assert.rejects(loadLocalAppReports(root, '["large.json"]'));
    await rm(join(root, 'local-data'), { recursive: true });
    await mkdir(join(root, 'elsewhere'));
    await symlink(join(root, 'elsewhere'), join(root, 'local-data'));
    await assert.rejects(loadLocalAppReports(root, '["outside.json"]'));
  } finally { await rm(root, { recursive: true, force: true }); }
});
