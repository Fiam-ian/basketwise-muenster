# Current implementation and execution handoff

Reference date: 2026-10-07, Europe/Berlin. Read with prototype/AGENTS.md.

## Authorization and environment

Autonomous development and a public source release were authorized in the prior handoff. Development now runs successfully in WSL2 Ubuntu 24.04 at /home/chava/Projects/groceries-compare. Migration is unnecessary: the destination already exists. Do not rerun the migration over it.

Native Node 22.23.3 and npm are available in the ignored project-local .tools/node-v22.23.3-linux-x64/bin directory. The Node archive SHA-256 matched the downloaded official manifest. GitHub CLI 2.45.0 is locally extracted in .tools/gh/usr/bin. No system packages or global shell settings were changed.

From the workspace root:

```bash
export PATH="$PWD/.tools/node-v22.23.3-linux-x64/bin:$PWD/.tools/gh/usr/bin:$PATH"
cd prototype
npm test
npm run dev
```

## Completed in WSL

- Fixed three optimizer tests accidentally nested inside the demo/real separation test. All 96 authored tests now pass when executed directly, with no failures or cancellations. npm test passes all eight test files. Comparison logic and invariants were unchanged.
- Rebuilt preview.html from canonical modules.
- Inspected the actual retained 3 km audit: 22 distinct observations, one location ID (6627), one distinct proof, all dates 2026-09-26; no missing/conflicting identity counters. Allowlisted provider metadata labels it Lidl, Münster 48153, OSM way 125838042. Branch identity remains unverified.
- Compared both retained audits in memory: provider record ID sets and raw provider records are identical. Observation wrappers differ only in capturedAt. No receipts, owners, proof IDs/images or prices were written into public evidence.
- Real headless Chromium rendered desktop and 390-pixel mobile layouts; inspected screenshots and accessibility snapshots. Audit selection, clearing, malformed JSON, keyboard clear, duplicate-demand merging and unchanged fictional baskets passed. Import caused zero network requests and left no raw audit records in localStorage. Mobile layout had no horizontal overflow.
- Added a favicon after the initial browser reported a favicon 404. Updated server returns it successfully; final app check reports no console/page errors. Server rejects local-data requests with 404.
- Added scripts/publish-wsl.sh: authenticated checks by default; --publish copies allowlisted source assets into a retained temporary Git checkout before creating/pushing the public repository. The working checkout is preserved. Fixed publish.ps1 omission of index.html/styles.css; both publishers include the favicon.
- Publisher Bash syntax passed. Its real --check execution stopped at the missing GitHub authentication gate before publication.

Details: docs/wsl-verification.md. Browser artifacts are ignored under output/playwright at the workspace root. Temporary browser tooling/libraries are under /tmp and may disappear; project-local Node and gh persist.

## Remaining actions

WSL GitHub CLI is not authenticated. The user must authenticate locally as Fiam-ian; do not request or store a token in chat. With the PATH above, run gh auth login, then bash scripts/publish-wsl.sh --check and bash scripts/publish-wsl.sh --publish. Public release is already authorized. No repository creation, push or CI run has been completed. Intended repository: Fiam-ian/basketwise-muenster.

The source publisher is syntax-checked and its authentication stop is verified; its authenticated snapshot/commit/push path remains unexecuted. PowerShell publisher edits were not executed in WSL.

Additional branch-specific evidence and product/pack matching are needed before real basket ranking. One location, one proof and one observation date do not establish independent shopping trips, current prices or stock. Walking routing remains separate and unwired. Full screen-reader auditing, other browser engines and offline file-mode interaction remain unverified.

Preserve fictional comparisons, historical evidence separation, integer cents, whole packs, separate Pfand, equivalent-demand merging and incomplete-basket exclusions. Never commit local-data or tool/browser artifacts.
