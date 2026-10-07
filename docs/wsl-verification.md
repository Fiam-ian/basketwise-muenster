# WSL verification — 7 October 2026

Runtime: WSL2 Ubuntu 24.04, native Linux Node 22.23.3. Tools were downloaded and extracted locally; system packages were unchanged.

## Canonical tests

npm test passed all eight test files. Direct Node execution counted 96 authored tests: audit CLI 6, audit view 16, coverage 5, inspector 5, provider 8, optimizer 29, routing 21, UI smoke 6. Zero failures or cancellations. The first WSL run exposed three accidentally nested optimizer tests; moving their existing bodies to the top level resolved Node cancellations without altering engine code. Final npm test passed after favicon and publisher edits. npm run preview regenerated the offline snapshot.

## Retained evidence

The privacy-conscious inspector found 22 distinct observations, location 6627, one distinct proof, all dated 2026-09-26. Its allowlisted provider metadata says Lidl, Münster 48153, OSM way 125838042; this is an unverified provider label. Missing and conflicting identity counters were zero. The 3 km and 10 km reports have identical raw records and record ID sets; only capturedAt differs in their observation wrappers. Comparisons occurred in memory, without printing raw records or writing another evidence copy.

This does not establish current prices, stock, branch authentication, independent visits or full-basket coverage.

## Real browser and HTTP

Playwright CLI 0.1.22 drove headless Chromium 155.0.8059.12, using temporary locally extracted libnspr4/libnss3. Desktop and mobile screenshots were visually inspected; the accessibility snapshot exposed named controls and live status regions. At 390 × 844, the layout had no horizontal overflow.

Verified:

- Initial fictional basket renders three complete options.
- Selecting the actual retained audit displays recomputed 22-record/one-location/22-product counters.
- Import does not alter fictional basket results, makes zero network requests, and does not store raw audit records in localStorage.
- Mouse and keyboard clearing remove audit output; malformed JSON leaves no aggregate summary and shows the supported-format error.
- Adding another 750 g pasta demand produces one 1500 g demand.
- Canonical HTTP modules load. Favicon returns 200; local-data URL returns 404. Final browser visit has zero page/console errors.

Ignored artifacts: workspace output/playwright/desktop-final.png, desktop.png, mobile.png and CLI snapshots. These contain demonstration UI and audit aggregates, not raw receipts. Screenshot checks are bounded visual review, not a full accessibility audit. Other engines, screen readers and offline file-mode interaction were not tested.

## Publication

scripts/publish-wsl.sh passed bash -n. Its real --check stopped because gh auth status reports no authenticated hosts. Public snapshot creation/commit/push and GitHub CI are unexecuted. The script includes index.html, styles.css and favicon.svg, which are also now included by the Windows publisher. Source snapshots exclude local-data and project tool/browser artifacts.

### Completed publication

After local browser authentication, gh verified Fiam-ian over HTTPS. Authenticated --check passed all 96 tests and preview generation. --publish created the public repository and pushed main at b160d3aeefcfce844998e214340ac771b43f0362. The first GitHub Actions run succeeded: https://github.com/Fiam-ian/basketwise-muenster/actions/runs/37684660805. Release tracked paths contain no local-data, node_modules, .tools or .env entries. The retained checkout is /tmp/basketwise-release.l01YFV; the development workspace was preserved. Earlier publication-gate notes above describe the pre-authentication check.

## Context reconciliation and bounded branch continuation

The user-provided private structured briefing was copied byte-identically from Windows with exclusive creation; the source remained intact and Git check-ignore confirmed the Linux copy and reference are excluded. All council handoff documents were read, and recreated product/data/architecture roles reviewed the lasting decisions. Application modules, optimizer, preview, server and stylesheet bytes match the published source; no newer implementation was overwritten.

The address-only registry now includes a separately reviewed provider-location mapping based on public OSM identity/address tags and the official retailer page. Its original three entries retain null coordinates and false routing eligibility. Registry JSON and mapping targets were checked. npm test passed all eight files after documentation/registry edits; the unchanged authored suite remains 96 tests. No additional browser run was needed for these non-UI changes.

## Historical eligibility slice

Native WSL npm test passed 124 tests across ten files (96 existing, 25 eligibility engine, 3 historical CLI), with zero failures/cancellations/skips. Meaningful added checks cover hashed report/review binding, requested-line merging, evidence/identity/discount/Pfand/constraint gates, as-of date precedence, same-day conflicts, candidate date/age disclosure and aggregate privacy. CLI tests use temporary files to verify exclusive output creation, input preservation, restrictive output modes, zero network calls and static errors without raw private JSON. A subprocess stderr assertion could not capture stderr in the sandbox; native execution outside it passed the complete suite.

The actual retained report was drafted locally, with all 22 record reviews false. The final aggregate at the mapped branch reports 0/6 eligible requested lines; all candidates require product review. A final v2 output was written without overwriting the earlier v1 output. The report and private briefing hashes were checked, and application/optimizer/demo/inspector source bytes remained identical to the previous release. No UI changed; bounded browser checks from the previous slice remain applicable without claiming the new CLI was tested in a browser.

Private review/result files are ignored by Git. Only original source, tests, a public starter request and reviewed documentation are release assets. The diagnostic still supplies no current-price validity, stock, checkout total, basket ranking or walking eligibility.
