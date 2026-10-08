# Contributor and agent instructions

## Goal and continuity

- Build the Münster-first open-source grocery planner: requested quantities, user-selected shops/radius, actual checkout cost and separately visible walking effort.
- Continue the existing WSL prototype. Read docs/current-status.md, docs/decisions.md, docs/context-reconciliation.md and docs/pilot-gate.md; older Windows handoffs describe historical states.
- The dependency-free stack is the current implementation choice, not a permanent production requirement. Do not change it without a concrete need.
- Routine reversible development, checks and public source updates are authorized. Seek user input only for material scope, spending, privacy or public ownership changes; execution approval controls still apply.
- Use bounded product/UX, data/provenance and architecture council reviews when useful. Assign distinct file ownership, exchange contracts and review invariant changes before integration. Old agent sessions are not inherited automatically.
- Preserve newer Linux work over older briefing status. Never re-run migration or the initial new-repository publisher over an existing destination/repository.

## Comparison and evidence rules

- Preserve the separation between demo, active advertised offers and historical observations.
- Never infer price validity from retrieval date or stock from an advertisement.
- Use integer EUR cents, actual whole-pack purchases and separately displayed Pfand.
- Missing required prices prevent complete-basket rankings.
- One item uses one product/pack option; mixing pack sizes is outside the initial model.
- Merge equivalent shopping-list demands before comparison.
- Label geometric distance estimates; do not call them walking routes.
- Preserve provenance and dataset licensing separately from the MIT source licence.
- Run npm test; use a real browser for visual/accessibility checks.
- Keep implementation tasks in owned files and seek review for invariant changes.
- No real receipts, personal locations, credentials or private shopping lists in Git.
- Routine decisions are delegated; escalate material scope, paid services or privacy changes.
- Keep checkout cost and walking effort separate; do not silently assign a monetary value to time.
- Exact branch, product/pack, quantity basis, conditions and applicable Pfand need reviewed evidence before real basket comparison. Missing or ambiguous evidence remains excluded.
- Historical estimates need an explicit shopping date/freshness policy, latest equivalent observation precedence and conflict exclusions. Observation dates and retrieval dates do not establish advertised validity.
- Provider location/product/proof counts are diagnostics, not requested-line coverage, authenticated branches or independent shopping trips. Reviewed branch mappings are separate from the automatic inspector.
- Route provider success does not verify access legs, opening hours or whole-trip walking eligibility. Keep price and route gates independent; failures must not silently become demo or geometric fallback.
- Keep private brainstorm material and raw reports under ignored local-data. Persist sanitized decisions and provenance in docs; never publish a full private transcript automatically.
- Historical eligibility diagnostics use an explicit versioned request and hash-pinned local review; manual review flags are unverified assertions. Keep these diagnostics separate from totals/ranking, disclose eligible candidate dates/ages and record exclusions. Do not turn unknown pack basis, discounts or Pfand into automatic matches.
- Build a curated product catalogue for acceptable cheaper alternatives first. Catalogue metadata, branch-specific dated price evidence and inventory coverage are separate concepts; never promise full inventory from crowdsourced observations.
- Preserve report-bound metadata snapshots when provider labels change. Match milk source, fat percentage, processing and dietary requirements only through explicit reviewed attributes; free-text names do not establish equivalence. Keep local SQLite databases under ignored local-data.
- Prioritize accessible official branch offer pages and leaflets for active advertised prices; retain Open Prices as a separate historical source. Capture branch selection, exact source bytes and explicit dates. Page windows do not automatically certify item validity; text/OCR layout can misassign prices. Keep retailer snapshots local and preserve their separate rights/provenance.
- Include major chains, independent grocers and grocery delivery services in source discovery. Preserve presence uncertainty and distinguish Münster NRW from other cities/street names. Failed location discovery does not establish an empty or complete shop list.
- Keep delivery-platform listing prices separate from in-store shelf/advertised prices. Address serviceability, fees, minimum spend, pack/deposit review and validity must be resolved before delivered checkout comparisons; unknown fees never become zero. Use public sources first and designated project credentials only when a specific login-only source requires them.
- Prioritize the small Pluggendorf–Aasee branch pilot and a dated offer finder; expand branches/radius after repeatable source and display checks. A group leaflet is not exact-branch applicability. Determine validity from explicit source text, not a PDF filename year. Local candidate imports remain review assertions and never enter basket totals automatically.
- A dated exact-branch prospect link can establish the selection of its explicitly embedded leaflet. Keep multiple leaflets distinct; do not grant a group PDF applicability through a different supplement. Shared PDF hashes across branches identify one publication, not independent price observations. Starter-list category leads remain separate from product equivalence, quantity coverage and basket eligibility.
- Key local reports by branch and leaflet, aggregating candidate leads into branch columns without double-counting branches. Preserve conflicting bottle/multipack wording and per-container Pfand separately from unknown priced-pack quantity or deposit totals. Lower app/loyalty amounts never silently replace an ordinary advertised price.

- Retailer login is not a prerequisite for our searchable grocery requests. REWE officially permits guest shopping lists/market offers; preserve pickup/delivery price channels because authenticated online prices need not equal shelf prices. Keep private accounts on retailer login surfaces. Request types and imported category leads must never imply inventory or verified alternatives; list state remains separate from source import/clear.

- User-list branch coverage must use the actual current requests and shopping date, update on edits/removals, and aggregate leaflets once per branch. Category, recorded-period and conflict counts are distinct from verified requested-line coverage. Invalid dates must render safely and never retain stale eligible status.

- Prefer product-first app UX: search product/brand/category, choose a captured catalogue card, then adjust count. Do not require customers to fill fat/brand metadata fields. Product attributes come from selected source records; never infer canonical equivalence from names. Keep technical source/review tools inside settings or separate inspection surfaces.
- The installable app shell caches public code/assets only. Private report projections, retailer accounts, Android device state and baskets stay outside Git and browser persistent caches. Primary app, advertised catalogue, extraction review queue and fictional optimizer remain distinct.
- Native Android tooling and SDK images belong under ignored .tools/android, virtual devices/keys/logs under local-data. Use the isolated android-sandbox wrapper; preserve existing virtual devices. Boot verification is separate from installation or successful retailer catalogue acquisition.
- Run retailer acquisition headlessly by default; show the emulator only when human authentication or verification requires it. Registration details and generated credentials remain private. Pickup catalogue suggestions/prices stay separate from shelf offers. A captured branch header is context; product screens lacking that header retain an explicit capture-session branch assertion, not independently verified inventory.
