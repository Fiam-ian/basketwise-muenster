# Initial council decisions — 7 October 2026

## Authority and workflow

The product, data-provenance and architecture agents independently proposed
constraints and exchanged findings. The coordinator resolved the shared
contract before assigning separate implementation files. Advisory agents
review implementation in subsequent passes; implementation does not change
approved comparison invariants without a recorded decision.

Only material product-scope changes, recurring spending, privacy-model changes
or unresolved public ownership decisions require user input. Routine engineering
choices are delegated. No paid services are used.

## First slice

- Work in a new prototype/ subdirectory to preserve any existing workspace files.
- Use dependency-free browser ES modules, a local Node HTTP server and node:test.
- Default to the Münster city centre with fictional demonstration stores.
- Limit enumeration to one or two stores; calculate integer-cent whole-pack costs.
- Keep demo, advertised active offers and historical observations distinct.
- Only complete baskets receive a cheapest ranking.
- Keep savings and walking effort separate; no hidden monetary value for time.
- Label geometric distances explicitly. Verified pedestrian routes come later.
- Keep the first app local, without accounts or remote telemetry.
- Public GitHub release is authorised; original code uses MIT.

## Next gates

1. Execute Node tests and verify the app in a real browser when local runtime
   paths work. Fix any failures before claiming a tested app.
2. Verify Open Prices coverage in Münster, date quality and product matching.
3. Add reviewed branch metadata and an explicitly historical estimate mode.
4. Obtain a reliable source for more complete current shelf-price coverage.
5. Add a pedestrian routing provider with documented usage limits and attribution.
6. Publish the tested source to a new public GitHub repository; never publish
   third-party price proofs or personal information without appropriate scope.

## Historical Windows operational limits

The configured working directory uses /mnt/c/ paths while the desktop runtime
reports Windows paths. exec_command cannot start a shell and node_repl rejects
the sandbox working-directory URI. apply_patch can edit files. GitHub connector
authentication succeeds but its exposed tools do not include repository creation.
These are execution/capability limits, not requests for a new user permission.

## WSL reconciliation and next slice

The private original-chat briefing was reconciled with current work on 2026-10-07. Native WSL tests, bounded browser checks, retained-audit inspection and public GitHub source publication supersede the old operational limits above. See current-status.md and context-reconciliation.md. No optimizer invariant or public/private data boundary changed.

Persist Münster-first scope, separate checkout cost and walking effort, bounded council review with distinct ownership and newer-evidence precedence. The dependency-free stack is the first-slice implementation, not a permanent technology mandate.

Proceed to local historical product/pack eligibility diagnostics before enabling ranking. A reviewed public-address mapping for the single observed branch is recorded separately in branch-evidence.md. This does not supply reviewed product matches, current prices, stock, shop entrances or walking eligibility.

## Historical eligibility diagnostic implementation

The CLI-only diagnostic is now implemented separately from the app and optimizer; see historical-eligibility.md. Its starter request carries six public staple demands, with all actual source records left unreviewed. Exact-byte report fingerprints bind local review files; supported identities, dates, source proof presence, pack quantities/basis, constraints, explicit merchandise price basis, discount conditions, membership and known Pfand gate eligibility. Newer coherent product observations suppress older ones; same-day conflicts fail closed. Candidate dates/ages are disclosed. Exact pack-unit equality is intentionally required in this first slice.

The actual retained pilot reports zero eligible requested lines, not product absence or free items. Keep source evidence review as the next gate. No historical totals/ranking, browser import changes, receipt uploads, live routes or paid service were introduced.

## Catalogue and real-data continuation

Proceed with a curated catalogue and explicit acceptable substitutions, not a full market-inventory promise. The versioned product matcher treats requested milk attributes and brand as hard constraints and excludes unknown/unreviewed attributes. An offline SQLite projection separates product snapshots from location-specific historical observations; built-in Node SQLite is experimental and adds no external dependency. Database imports grant no evidence review or ranking eligibility.

A broader 90-day bounded audit supplied 77 observations/71 product codes/four provider locations but no apparent complete two-supermarket starter basket. Additional evidence remains the limiting dependency. See product-catalog.md and real-data-roadmap.md for implemented boundaries and the conditional 5–11 engineer-day initial pilot estimate. Raw source material and databases remain ignored.

## Official offer-source priority

Following the user's source suggestion, prioritize branch-specific official advertised offers and public leaflets. A four-resource EDEKA 074601 collector succeeded using ordinary public HTTP requests, with hash-pinned local snapshots and strict size/date/template checks. Manual visual review found two starter-category candidates; automatic ranking remains disabled. REWE direct/browser access returned 403; EDEKA's API gateway requires requesting access. No free official whole-inventory API was verified, protected access bypassed or retailer content published. See retailer-sources.md for actual findings, source links and remaining review gates. Historical evidence remains separate.

## Broader supermarket and delivery discovery — 8 October

The user requested chain/independent/delivery source breadth and radius expansion. Registered 25 source candidates with exact public sources and uncertain presence kept explicit; see muenster-source-map.md and data/source-registry.json. Implemented OSM radius discovery and a working public Wolt/Flink listing collector. The latter captured 21 distinct priced delivery listings without an account. Map-discovery live requests failed with service errors and established no coverage. Consumer accounts are not substitutes for merchant API onboarding; public collectors currently need none.

Delivery listings remain a separate channel with unknown fees/address applicability and no shelf/stock/ranking claim. Preserve public source snapshots privately and update sources independently; broader source scope does not justify promising every shop's full inventory. HIT/Netto/PENNY and Marktkauf are next branch-offer candidates. No private identity/account, paid service or order was introduced.

## Searchable request list and retailer login — 8 October 2026

Implement the local searchable request list independently of retailer authentication. User-selected quantities, brands and milk preferences are explicit; only identical requests merge. Imported category leads remain unverified and cannot produce totals. REWE guest functionality supports testing before registration; authenticated pickup and delivery prices retain their own channels. See app-access.md for official sources and access results.

## App UX and acquisition direction — 8 October 2026

Use a product-first, installable app interface rather than exposing product-attribute forms to shoppers. Let captured catalogue selections carry their recorded attributes, then edit counts. Keep technical provenance/review controls within settings or a separate workspace. The current implementation is a PWA shell, not an Android APK; native packaging remains a later deployment choice.

At the user's request, pursue an isolated WSL Android emulator despite missing acceleration; preserve host settings and private device/account state. Installation, Android boot, official retailer-app access and complete branch inventory are separate milestones. Continue full-publication leaflet extraction as a review queue alongside this route, without promoting automated amount anchors to verified products or checkout totals.
