# Münster Grocery Planner

A dependency-free, mobile web prototype for comparing a shopping list across
one or two shops. This first release uses **fictional shops and synthetic prices**.
It does not find live Münster bargains or provide verified walking routes.

## Offline preview

Open preview.html directly in a browser while keeping it beside styles.css.
It is a generated snapshot of the same demo, engine and app, with module
sources inlined so it does not need a local HTTP server. After source changes,
regenerate it with npm run preview. The canonical HTTP app has passed bounded Chromium desktop/mobile checks; offline file-mode interaction remains unverified.

## Run locally

Requires Node.js 22 or newer. No dependency installation or account is needed.

From this directory (the workspace's prototype/ folder), run:

```sh
npm run dev
```

Open http://127.0.0.1:8000. Serve the app over HTTP; opening index.html directly
with a file URL will not reliably load browser ES modules.

```sh
npm test
```

## Comparison rules

- Quantities use grams, millilitres or item counts and purchases use whole packs.
- Prices use integer EUR cents. Deposits are included in checkout and itemised.
- Only complete baskets enter the main rankings; partial baskets are separate.
- Brand and tag constraints must match. Restricted offers require explicit opt-in.
- Expired, wrong-branch or mixed demo/real evidence is excluded.
- Round trips include the return leg. Distances are straight-line estimates,
  which can understate real walking. A routing provider is a later milestone.
- Two shops means at most two actual visited shops, never duplicate purchases.
- Each list item uses one product and pack size. Mixed pack-size purchases are
  outside this prototype's comparison model; equivalent demands are merged.
- Stock is unknown. An advertisement does not establish stock availability.

## Price integrations

The Open Prices adapter is a read-only provider boundary, separate from the
demo UI. Historical records are not promoted to valid current offers.
Live local coverage and a reliable full-basket price feed remain unverified.
Retailer adapters require source-specific reuse checks before automation.

## Next pilot tools

- docs/windows-recovery.md gives the environment recovery steps.
- scripts/check-environment.ps1 checks the local runtime without installing tools.
- scripts/audit-coverage.mjs profiles bounded historical Open Prices observations.
  See docs/coverage-audit.md before running; output is not a priced shopping list.
- src/routing.mjs validates provider walking-route evidence. It is not wired
  into the demo optimiser and cannot certify a whole-trip walking budget.
- data/muenster-stores.json records three source-checked pilot addresses.
  It contains no inferred coordinates and is separate from the fictional stores.
- docs/pilot-gate.md defines what evidence is needed for each live capability.

## Privacy

Lists are saved in this browser when local storage is available. The demo has
no accounts, analytics, remote price requests or location permission prompt.
Do not commit personal locations, receipts, API tokens or real shopping lists.

## Development

The UI, fixture data, provider boundary and pure comparison engine are separate
ES modules. Test edge cases before changing ranking logic. Preserve price-source
dates and branch identity. New cities should use new provider configuration,
not changes to pack-price arithmetic.

See docs/ for council decisions, data-source research and verification status.
MIT covers original code and synthetic fixtures. Third-party datasets retain
their own licences and attribution requirements.

## Verification status

Initial tests and UI verification are recorded separately in
docs/verification.md and docs/wsl-verification.md. The WSL run passed all 96 authored tests and bounded real Chromium checks. Do not interpret a written test suite as a completed
Node test run or a static review as a browser test.

## WSL development and release

See docs/wsl-handoff.md for the project-local runtime PATH. Source is published at https://github.com/Fiam-ian/basketwise-muenster and the first GitHub Actions test run passed. Local audit evidence and tools are excluded. The initial publisher, scripts/publish-wsl.sh, creates a new repository; use normal commits and pushes from a clone for subsequent updates.
