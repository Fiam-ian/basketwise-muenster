// Select only the known pilot projections; never scan private account directories.
import { access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
const names = ['offer-view-v2.json', 'aaseemarkt-offer-view-v1.json', 'aaseemarkt-primary-offer-view-v1.json',
  'rewe-pickup-milk-candidates-v2.json', ...['eier', 'tomaten', 'nudeln', 'haferflocken', 'wasser'].map(query => `rewe-pickup-${query}-candidates-v1.json`),
  ...['milch', 'eier', 'tomaten', 'nudeln', 'haferflocken', 'wasser'].map(query => `aldi-native-${query}-candidates-v1.json`),
  'lidl-native-offer-candidates-v1.json'];
const available = [];
for (const name of names) {
  try { await access(new URL('local-data/' + name, root)); available.push(name); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
}
console.log(`Pilot: ${available.length} local reports selected. Captured snapshots, not live stock.`);
const child = spawn(process.execPath, [fileURLToPath(new URL('dev-server.mjs', root))], {
  cwd: fileURLToPath(root), stdio: 'inherit', env: { ...process.env, BASKETWISE_REPORTS: JSON.stringify(available) }
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
