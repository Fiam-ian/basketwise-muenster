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

- Fixed three optimizer tests accidentally nested inside the demo/real separation test. The initial WSL verification passed 96 authored tests with no failures or cancellations. The later historical eligibility slice brings the current suite to 124 passing tests across ten files. Comparison logic and invariants were unchanged.
- Rebuilt preview.html from canonical modules.
- Inspected the actual retained 3 km audit: 22 distinct observations, one location ID (6627), one distinct proof, all dates 2026-09-26; no missing/conflicting identity counters. Allowlisted provider metadata labels it Lidl, Münster 48153, OSM way 125838042. Automatic inspector metadata alone did not authenticate the branch; the subsequent manual address mapping is documented below.
- Compared both retained audits in memory: provider record ID sets and raw provider records are identical. Observation wrappers differ only in capturedAt. No receipts, owners, proof IDs/images or prices were written into public evidence.
- Real headless Chromium rendered desktop and 390-pixel mobile layouts; inspected screenshots and accessibility snapshots. Audit selection, clearing, malformed JSON, keyboard clear, duplicate-demand merging and unchanged fictional baskets passed. Import caused zero network requests and left no raw audit records in localStorage. Mobile layout had no horizontal overflow.
- Added a favicon after the initial browser reported a favicon 404. Updated server returns it successfully; final app check reports no console/page errors. Server rejects local-data requests with 404.
- Added scripts/publish-wsl.sh: authenticated checks by default; --publish copies allowlisted source assets into a retained temporary Git checkout before creating/pushing the public repository. The working checkout is preserved. Fixed publish.ps1 omission of index.html/styles.css; both publishers include the favicon.
- Publisher Bash syntax and authenticated --check passed. The --publish path created and pushed the public source repository successfully.

- Added the separate local historical product/pack eligibility engine, hash-pinned review draft/audit CLI, six-line public starter request and aggregate date/age/exclusion reports. It computes no totals and enables no rankings.
- The actual 22-record audit with all record reviews false produces zero eligible lines out of six at the reviewed branch. Unreviewed candidates are not product absence. Draft and results remain ignored in local-data/historical-review-v1.json and local-data/historical-eligibility-v2.json; older output was preserved.
- Product and data council reviews identified and resolved strict record/discount/source identity gates and eligible-date disclosure. The final native WSL suite passes 124 tests with zero failures/cancellations. The CLI subprocess error-capture test required native execution outside the sandbox; the app source and prior browser behavior are unchanged.

Details: docs/wsl-verification.md. Browser artifacts are ignored under output/playwright at the workspace root. Temporary browser tooling/libraries are under /tmp and may disappear; project-local Node and gh persist.

## Remaining actions

The private structured brainstorm handoff was copied byte-identically from the Windows source into ignored local-data/brainstorm-transcript.md and reconciled with the newer WSL work. Product, data/provenance and architecture council roles reviewed it. It is a summary, not a verbatim transcript. Lasting guidance is in AGENTS.md, docs/decisions.md and docs/context-reconciliation.md; no newer application work was replaced.

GitHub CLI is now authenticated as Fiam-ian over HTTPS. Public source repository: https://github.com/Fiam-ian/basketwise-muenster (main). Initial release commit: b160d3aeefcfce844998e214340ac771b43f0362. The first GitHub Actions run passed: https://github.com/Fiam-ian/basketwise-muenster/actions/runs/37684660805.

The retained Git release checkout is /tmp/basketwise-release.l01YFV. This workspace was preserved and still has its original parent Git metadata; do not assume its prototype directory is the published Git checkout. For later source updates use the retained release checkout, or clone the public repository into a separate development directory if the temporary checkout disappears. The new-repository publisher is for initial creation; do not rerun --publish against the existing repository. PowerShell publisher edits remain unexecuted in WSL.

Publication is source-only: no hosted website or live price comparison was deployed. Tracked release paths were checked and contain no local-data, node_modules, .tools or .env entries.

The bounded continuation reviewed provider location 6627 → OSM WAY 125838042 → Lidl Friedrich-Ebert-Straße 17 against OSM address tags and the official retailer page. See docs/branch-evidence.md and data/muenster-stores.json; this separate manual mapping does not change the inspector’s unverified-metadata output or routing eligibility.

Next: perform and document source/product/pack reviews for the retained records before marking entries in the local draft reviewed. The diagnostic itself is implemented; see docs/historical-eligibility.md for exact constraints, quantity basis, historical precedence/conflicts, conditions and Pfand. Additional branch-specific price evidence and product/pack matching are needed before real basket ranking. One location, one proof and one observation date do not establish independent shopping trips, current prices or stock. Walking routing remains separate and unwired. Full screen-reader auditing, other browser engines and offline file-mode interaction remain unverified.

Preserve fictional comparisons, historical evidence separation, integer cents, whole packs, separate Pfand, equivalent-demand merging and incomplete-basket exclusions. Never commit local-data or tool/browser artifacts.

## Catalogue continuation

Implemented the bounded product catalogue and explicit alternative matcher, including reviewed milk source/fat/processing/dietary attributes and hard brand requests. Implemented offline SQLite aggregation with separate product identities, report-bound metadata snapshots, location identities and dated observations. No browser or optimizer wiring changed. See product-catalog.md and real-data-roadmap.md.

The bounded 90-day 3 km audit yielded 77 observations/71 product codes/four locations. Its private SQLite projection was created successfully with every review gate false. Candidate metadata does not provide the missing milk/eggs/tomatoes or complete comparable baskets at two supermarkets. This is historical source coverage, not current inventory. Additional reviewed evidence remains the next dependency. The conditional initial pilot estimate is 5–11 focused engineer-days assuming usable evidence; acquisition can take longer.

Final native WSL verification passes 142 authored tests across twelve files, including SQLite privacy projection, snapshot preservation, exclusive output creation, nested identity fallbacks, conflict rejection and milk constraint exclusions. Node's built-in SQLite emits its expected experimental warning. No UI changes were made; the earlier browser verification remains the latest browser check.

## Official retailer continuation

Source priority now includes branch-specific advertised offers and public leaflets; see retailer-sources.md. The actual EDEKA 074601 capture succeeded for four public resources, including the five-page 5–10 October leaflet. Two milk/tomato candidates were visually reviewed and stored only in ignored local-data/edeka-retailer-capture-v1/reviewed-candidates-v1.json with remaining exclusions. Exact source snapshots and hashes are in the same private capture directory. No prices or leaflet copies were published, no source automatically grants item eligibility, and the demo/browser/optimizer remain unchanged.

REWE returned 403 in direct HTTP and normal browser access; EDEKA's branch page succeeds through native HTTP while its browser access returned 403. Public leaflet browser access succeeded and exposed the official PDF download. No access controls were bypassed. No freely documented official inventory API was established. Continue reviewed candidate extraction and second-branch sourcing; full inventories and a maintained current-price service remain unproven.

Final native suite passes 149 authored tests across thirteen files. New checks cover branch/template mismatches, impossible/reversed/ambiguous dates, allowlisted viewers, capture permissions and preservation, size/content bounds, and stopping on HTTP denial. Architecture council reviewed the capture/evidence boundary; output containment and date ambiguity findings were corrected before release. Isolated browser and rendered PDF source checks were completed; there were no application UI changes.
