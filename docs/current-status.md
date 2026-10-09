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

## Broader source continuation — 8 October 2026

Added data/source-registry.json covering 25 source candidates: main chains, organic/international grocers, region candidates and grocery delivery providers. Official-source findings, unknown presence and next adapters are documented in muenster-source-map.md. Ten public native access checks are retained privately; nine returned 200 and the Lieferando menu returned 403. Entry access alone does not establish catalogue coverage.

Implemented one-page public Wolt/Flink delivery listing capture; actual run saved 21 unique priced listings (two duplicates removed) in ignored local-data/wolt-flink-capture-v1. Prices remain delivery-channel snapshots with unreviewed packs/Pfand, unknown fees/serviceability/active validity and disabled ranking. The raw public page is private; the projected data omit unrelated session/telemetry/stock fields. No account was required or created.

Implemented bounded OSM shop discovery around the public pilot centre, configurable up to 25 km, with five grocery shop kinds, public metadata projection and geometric distance labels. Actual 10 km live service requests failed with 500/504; no successful shop list or complete coverage was fabricated. Preserve the existing branch registry. Next: source-specific branch offers, constrained listing review and a successful discovery/reconciliation run when the public service is available.

Final native suite passes 165 authored tests across sixteen files. The product council reviewed delivery and discovery boundaries without blockers. No browser/app/optimizer wiring changed; the prior app browser verification remains the latest app check. Retailer/page data remain ignored, source code updates are authorized, and whole-inventory/current checkout promises remain unproven.

## Neighbourhood pilot decision — 8 October 2026

The next product slice is a small, explicit Pluggendorf–Aasee branch pilot rather than broad citywide collection. See `docs/neighbourhood-pilot.md` for the four candidate branches, a dated-offer-finder first release, and gates for staged radius expansion. Official public sources confirm Wiewel Aaseemarkt (Von-Witzleben-Str. 10), REWE Geiststr. 2–4 (market 565814), and Netto Weseler Str. 109 (branch 6046); the existing EDEKA Rotthowe Aegidiimarkt source remains the first collector. “Within 1 km” is not yet established because the area wording does not specify a precise centre and branch coordinates are not verified. Start with official pages/leaflets, then use free apps only to fill evidence gaps; no app accounts were created. This is a source-feasibility pilot, not full inventory or availability coverage.

## Local offer browser slice — 8 October 2026

Implemented `offers.html` with private report import, category filtering, selected-date leaflet-period status, source/capture dates, product/pack/price display, explicit milk fat and remaining review/Pfand gaps. No candidate enters basket totals or demo state. `npm run offers:prepare` checks all four source hashes and the review binding before writing a new private projection. Actual two-candidate report: `local-data/offer-view-v2.json`; previous files remain preserved. See `docs/local-offer-view.md` for commands and constraints.

Netto’s named pilot branch returned direct HTTP 403. Wiewel’s public offers page and linked 17-page PDF succeeded; cover dates explicitly show 5–10 October 2026 despite a filename containing `_25_`. A pasta candidate was visually reviewed, but exact Aaseemarkt applicability remains unverified. Three public source snapshots, hashes, dates and the private candidate are retained under `local-data/wiewel-source-trial-v1`. No account was needed or created. Next: resolve the Wiewel branch-specific offer link, then extend the source/view adapter and matching review; this is still partial evidence rather than current complete baskets.

Native WSL suite passes 169 tests across 17 files. Real Chromium desktop/mobile checks passed for actual local import, category/date controls, clear, malformed-file safety, zero import network/storage writes and no mobile overflow. Offline preview rebuilt; raw data/browser artifacts stay ignored. No website was deployed.

## Two-branch leaflet pilot — 8 October 2026

Confirmed the exact official Wiewel Aaseemarkt branch 074835 at Von-Witzleben-Str. 10 and its own dated prospect link. Its prospect page explicitly embeds the SUUPER supplement as well as the primary Stroetmann_25 viewer. Extended the allowlisted collector and preparation/view schema for this branch. Actual new four-resource capture: `local-data/aaseemarkt-retailer-capture-v1`; generated view: `local-data/aaseemarkt-offer-view-v1.json`. The supplement PDF exactly matches Rotthowe’s retained PDF; reused visual review only after this hash check and recorded a new branch/manifest binding. The separate Wiewel group PDF/pasta candidate still has no established branch applicability.

The browser accepts two reports together, filters branches/categories, discloses a shared leaflet and shows the six-item starter request’s category evidence gaps. Actual imports produce two milk/tomato candidates per branch, not four independent prices. The remaining product, pack-basis, Pfand and condition checks still prevent basket eligibility; missing four categories prevent complete totals. No savings, complete inventories, stock or route eligibility are claimed. The existing registry entries are preserved and the exact new branch’s address-only record was added.

171 native tests pass across 17 files. Real Chromium verified actual two-report import, correct branch links, shared-source disclosure, filters, six starter rows/zero eligible lines, expired dates, duplicate rejection, clear and zero import network/storage writes. Desktop/mobile screenshots were inspected with no page errors or document overflow. Next: obtain usable primary-leaflet category coverage and complete product/pack/Pfand matching before any basket totals. Documentation describes the source relationship and the still-unverified group leaflet separately; all price/source data remain local and ignored.

## Main leaflet and staple coverage — 8 October 2026

Added `--leaflet primary` for branch 074835’s explicitly embedded Stroetmann_25 viewer/PDF, with exact source selection and capture/review leaflet binding. Actual four-resource capture/review: `local-data/aaseemarkt-primary-capture-v1`; prepared report: `local-data/aaseemarkt-primary-offer-view-v1.json`. The 17-page source explicitly advertises 5–10 October; rendered cover/pages 13 and 15 were reviewed afresh because PDF bytes differ from the prior Wiewel group download.

The main source adds two pasta leads and a mineral-water lead. The lower De Cecco DealMobil price is excluded from the retained ordinary action price. Water has a single-bottle wording/multipack-image conflict: priced quantity and total deposit stay unknown despite explicit per-bottle Pfand wording. The browser now accepts three reports, keyed by branch and leaflet, aggregates the six-line candidate table into two branch columns and displays seven leads with source/publication and ambiguity labels. Wiewel has four of six starter categories with leads; eggs/oats remain missing. No complete basket or validated cheaper alternative is enabled. Direct REWE Geiststraße access again returned 403 and supplied no usable captured evidence.

173 native tests pass across 17 files. Chromium verified actual three-file import, correct branch/publication counts, pasta conditions, water warnings, branch isolation, duplicate-primary rejection and no network/storage writes, errors or mobile document overflow. Previous data and reports are preserved; all new price/source/browser artifacts remain ignored. Next: usable independent branch price evidence, resolved product/pack/Pfand/conditions and overlap before real basket integration.

## Searchable grocery list and app-access investigation — 8 October 2026

The offer page now provides German/English search and dropdown selection for six grocery request types, editable quantities, removal, exact-brand requests and milk source/fat/processing preferences. Equivalent requests combine; distinct preferences stay separate. Actual imported branch leads appear under each request, with explicit known fat conflicts and unresolved equivalence. Clearing reports preserves the private in-memory list. No real basket ranking is enabled.

REWE officially allows shopping lists and regional offers without login. Its online pickup prices may differ from shelf prices, so registration would not by itself resolve in-store evidence gaps. Normal Chromium shop access returned 403; no native mobile runtime or project account is available. A phone guest-mode branch/product check is pending user input. See app-access.md.

178 native tests passed; real Chromium verified merging, constraints, three-report candidate display, clearing, and mobile layout. Source-only release; raw sources, reports and lists remain outside Git. Next: phone-access feasibility, usable branch price acquisition, and reviewed complete matching before real cheapest-basket integration.

## Current-list branch coverage — 8 October 2026

Replaced the fixed starter table in the local offer UI with diagnostics for the actual user list. Branch columns aggregate multiple leaflets once per branch and distinguish category leads, recorded-period leads, known fat/unit conflicts and zero verified matches. Quantities, list edits/removals and date changes update coverage immediately; empty/invalid dates render a prompt safely. The underlying starter audit API is preserved. No candidate-only import can enable ranking or complete-basket totals.

181 native tests passed. Chromium verified actual three-report imports against a two-line custom list, correct denominator, expired/empty date changes, quantity/removal refresh, no page errors and no mobile document overflow; screenshot inspected. Phone guest-mode access remains pending. Next: resolve real source/matching evidence; the current list cannot yet produce a real cheapest basket.

## Product-first app and native sandbox — 8 October 2026

The primary local entry is now an installable standalone PWA app shell with Explore, Basket and Stores screens. Customers search product/brand/category and choose a captured product card; source attributes replace user-filled fat/brand fields. Five distinct retained products from seven branch listings are available in the configured local sandbox, with exact selections, quantity steppers and per-branch/date capture coverage. Commercially identical shared-publication listings merge while branch-specific review records are retained. No verified product equivalence, complete inventory or real checkout total is claimed.

The local API loads only three explicitly configured private report basenames, projects allowlisted fields and rejects links/traversal/cross-origin requests. Raw local-data remains inaccessible. Public shell assets alone are cached for installed offline startup; baskets and sources remain in memory. Real Chromium verified search, selection, counts, branch detail, mobile vector art, no overflow, offline shell/navigation, empty persistent storage and no API cache. 190 native tests pass. See app-interface.md.

Full-publication extraction now processed all 17 primary and five supplement pages into ignored, source-hash-bound review queues with 120 + 20 large price anchors. These are amounts, not 140 products: loyalty duplicates, spatial association and image-only gaps remain explicit. See leaflet-catalogue.md. Existing selected reports and originals were preserved.

The user has no phone for this trial and explicitly requested a WSL emulator. Official platform-tools, emulator37.2.12 and API30 GooglePlayx86_64 image revision10 are installed under ignored .tools/android. The private AVD and namespace launch scripts are in place. Binary/device discovery succeeds; KVM access initially failed for the current user. First software/headless startup is running, with ADB initially offline and boot verification pending. No retailer app/account/catalogue was accessed. See mobile-app-access.md for verified commands and limitations.

Android verification update: the first headless trial showed Google's boot screen but remained ADB-offline at roughly twelve minutes. The WSLg retry exited139 after X display errors, despite reaching core Android services. A third headless/no-animation SwiftShader trial with Vulkan disabled passed that stage and started guest networking. Complete boot, usable GUI and retailer-app access remain unverified; installation is verified. Data/logs are preserved.

KVM correction: the native WSL check finds /dev/kvm and loaded kvm/kvm_intel modules. The restricted filesystem view hid the device in the initial check. The actual user lacks group-kvm permission; opening it read/write returns PermissionError. Sudo requires local authentication, so the user was asked to run sudo usermod -aG kvm chava. Accelerated startup is prepared through sg kvm and remains pending that result. The third software trial also exited139; no emulator remains running. Do not repeat the earlier claim that this WSL kernel has no KVM. Installation and source/app verification are complete; usable Android boot and retailer access remain unverified.

Accelerated verification completed after the user added chava to kvm: accel-check0, KVMAPI12 and VM creation succeeded. Android boot completed in roughly49seconds with ADBonline/sys.boot_completed1. Actual Android Chrome83 opened the app via ADBreverse localhost8013, displayed5products, and merged two milk selections into one basket line/count2 with both branches. Older DOM/string APIs and viewport/flex spacing were adjusted for this browser. No Google/retailer account was used. A visible KVM/software-rendered window trial is underway; official retailer installation/access remains next.

Visible Android verification completed too: the WSLg emulator window is mapped, Android boot=1 and ADBonline. The working KVM/software backend remains running; the private local app bridge is restored. REWE's official Play entry is open and requires Google sign-in before installation. User completion on the emulator's own surface is pending; no account credentials were requested or captured. Added run-android-emulator.sh for the verified accelerated configuration. Current source/runtime checks:190tests and desktop/mobile/actualAndroid app interactions pass.

Official REWE app trial now succeeds after private user-completed Play sign-in. Installed package de.rewe.app.mobile version5.18.1; Android first-install compilation delayed launch, then guest startup succeeded. Optional tracking was declined. Manual postcode search selected REWE Geiststr.2–4,48151 Münster and exposed its5–10October prospect and market offers. Guest Milch search returned seven visible named suggestions with pack/fat labels; selecting one added it to the list, without any displayed price. These suggestions do not establish branch inventory or priced alternatives. Private product UI captures are retained in local-data; no retailer login was needed. The existing AVD was restarted after its X connection closed, preserving Play access. Next: structure catalogue metadata separately and review exact-branch advertised prices; complete real baskets remain unavailable. See mobile-app-access.md.

## Priced native catalogue — 8 October 2026

The preserved emulator now runs headlessly; the launcher defaults to no window
and supports --show-window for required human authentication. REWE guest
ordering opens a pickup catalogue for Metzer Str.62–64,48151 Münster/Geist.
This is a different branch and channel from Geiststr.2–4's market offers.
Six milk-search screens plus two screens for each of Eier,Tomaten,Nudeln,
Haferflocken,Wasser captured50distinct name/price/display listings. Product
detail for one milk was visually checked. These are sampled search results,
not complete inventory, verified stock or basket-eligible prices.

Added bounded native-UI capture and hash/query/package-bound private projection
scripts. Branch context is explicitly an operator capture-session assertion;
product screens do not repeat the branch header. Source XML, reports and account
state remain ignored. The app's advertised-leaflet UI remains separate from this
new pickup report schema. See android-catalogue.md. Six Python extraction tests
and the existing190Node tests pass; launcher Bash syntax passes.

User-authorized REWE registration reached email verification after updating
bundled Chrome83 to official Play version154.0.8037.126. The modern browser's
normal verification passed. Required personal details and a generated unique
password remain private; registration is not complete until the six-digit email
code is accepted. Connected Gmail confirms the verification message arrived,
but deliberately masks authentication codes. verify-rewe-email.py provides a
hidden local terminal prompt; human code entry is pending. No order, reservation,
payment, loyalty enrolment or newsletter subscription was submitted.

Account verification subsequently completed using the user-provided code through
the hidden local prompt and REWE's normal confirmation control. The native
account menu shows Abmelden and the supplied account name, confirming login.
Private credential status is authenticated; no account identity or code is
published. The release's190Node and6Python tests also passed in GitHub CI:
https://github.com/Fiam-ian/basketwise-muenster/actions/runs/37818134756.
The reusable capture CLI then completed a fresh authenticated one-screen milk
trial at the retained pickup branch; its private projection contains four
listings. This checks the collector after login and is a separate snapshot,
not four extra unique products added to the 50-listing sample.

## Additional retailer-app trials — 8–9 October 2026

Installed EDEKA, Netto Marken-Discount, Lidl Plus and ALDI Nord through official
Google Play in the preserved private Android device. Installation does not
establish catalogue access. EDEKA's manual 48151/Muenster search returned no
markets; Netto's 48151 search returned a technical-content error. Neither trial
selected a Münster branch. Lidl was switched to Germany/Deutsch and reached
branch selection; catalogue acquisition remains pending. No additional retailer
account was created, and optional tracking was declined.

ALDI Nord guest search succeeded. Six bounded queries (milk, eggs, tomatoes,
pasta, oats and water) yielded 50 distinct native listing references: 26 ordinary
assortment cards and 24 promotion cards. These are search results, not six
verified categories or a complete inventory. Exact branch applicability remains
unknown. Hash-pinned XML and projections stay in ignored local-data; nothing
from this capture enters the app's catalogue or basket ranking automatically.

The new scripts/extract-aldi-app-catalogue.py preserves visible title, brand,
pack wording, primary price in integer cents, unit-price wording, footnotes and
flags. It excludes reference prices and ambiguous/hidden price fields, verifies
source hashes and query identity, retains conflicts, and writes exclusive private
outputs. Dates, deposit totals, stock and branch review remain unresolved.
Run npm run catalogue:aldi:extract -- --capture-dir local-data/<capture>
--output local-data/<new-report>.json. The Android extractor suite passes ten
tests, including four ALDI adapter checks.

The resumed Lidl trial subsequently succeeded in manual postcode search (48151).
Selected Münster-Friedrich-Ebert-Straße, Friedrich-Ebert-Str.17,48153; native
branch marker DE5054. Confirmed the ordinary selection dialog and reached guest
Home/Prospekte/Lidl Plus/Onlineshop/Konto navigation. No account was required for
this step. Product/price acquisition remains pending; branch selection alone
establishes neither inventory nor price applicability.
