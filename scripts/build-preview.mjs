import { readFileSync, writeFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const withoutImports = (source) => source.replace(/^import .*;\s*$/gm, '');
const withoutExports = (source) => source.replace(/^export\s+(?=(?:const|let|var|function|class)\b)/gm, '').replace(/^export\s+default\s+.*;\s*$/gm, '');
const index = read('../index.html');
const demo = withoutExports(read('../src/demo-data.mjs'));
const engine = withoutExports(read('../src/optimizer.mjs'));
const coverage = withoutExports(read('../src/coverage.mjs'));
const auditView = withoutExports(withoutImports(read('../src/audit-view.mjs')));
const app = withoutImports(read('../src/app.mjs'));
const bundle = [
  '(() => {',
  'const demo = (() => {', demo, 'return { stores, offers, catalog, defaultOrigin };', '})();',
  'const engine = (() => {', engine, 'return { planBasket };', '})();',
  'const coverage = (() => {', coverage, 'return { summarizeCoverage };', '})();',
  'const auditView = (() => {', 'const { summarizeCoverage } = coverage;', auditView, 'return { parseAuditReport };', '})();',
  '(() => {', 'const { stores, offers, catalog, defaultOrigin } = demo;', 'const { planBasket } = engine;', 'const { parseAuditReport } = auditView;', app, '})();',
  '})();',
].join('\n').replace(/<\/script/gi, '<\\/script');
const moduleTag = '<script type="module" src="./src/app.mjs"></script>';
if (!index.includes(moduleTag)) throw new Error('Canonical index module tag changed; update the preview builder.');
const preview = index
  .replace(moduleTag, () => `<script>\n${bundle}\n</script>`)
  .replace('DEMO PROTOTYPE', 'OFFLINE DEMO')
  .replace('Open-source prototype · Münster, NRW', 'Offline preview snapshot · Münster, NRW');
writeFileSync(new URL('../preview.html', import.meta.url), preview);
console.log('Built prototype/preview.html. Keep the adjacent styles.css when opening this offline snapshot.');
