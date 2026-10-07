# Resume the Münster grocery planner

This file preserves the current task if the project is reopened in a native
Windows chat. Resume from the existing source; do not scaffold a replacement.

User authorisation: develop the open-source grocery planner autonomously,
coordinate specialist agents, and publish a new public GitHub repository.
Refer only material scope, recurring cost, privacy or ownership choices to the
user. Routine changes, testing and integration are authorised.

## Existing prototype

Canonical app: index.html, styles.css and src/*.mjs. preview.html is a generated
offline snapshot of the actual demo/engine/app, not an independent implementation.
Regenerate with node scripts/build-preview.mjs after app-source changes.

All UI shops/prices are synthetic; distances are labelled geometric estimates.
Strict complete baskets use whole packs and integer cents, itemised Pfand,
brand/tag constraints, valid dates and explicit membership opt-in. Equivalent
demands merge. One item uses one product/pack size; mixed-size buying is outside
the model. Incomplete baskets never enter complete rankings.

## New work

- src/coverage.mjs and scripts/audit-coverage.mjs profile historical Open Prices
  observations; no observation-count result establishes current basket coverage.
- src/routing.mjs is a server/pure provider boundary, not wired into the optimizer.
  It validates return-trip geometry and metrics, but leaves shop-access/whole-trip
  walking-budget eligibility unverified. Caller must enforce a fetch deadline.
- data/muenster-stores.json has three verified retailer addresses with null
  coordinates; it is not imported by the demo.
- Raw audit reports belong under ignored local-data/, outside the release data.
- docs/pilot-gate.md and docs/verification.md record evidence gates and limits.

## Next executable actions

1. Inspect project instructions and current files; preserve authored work.
2. Check native Node, Git and gh availability. Bundled runtime paths may be found
   through the desktop dependency tool. Do not install more tools unnecessarily.
3. Run node --test from prototype/. This canonical Node run has not been completed.
4. Regenerate the offline preview; run the local server and verify a real browser.
5. Run a bounded coverage audit with a new ignored output file. Verify returned
   provenance and field completeness before implementing price matching.
6. Verify coordinates, entrances and shopping-date opening hours before real
   trip recommendations. Keep active offers distinct from historical estimates.
7. Authenticate GitHub CLI if needed and create the authorised new public repo
   Fiam-ian/basketwise-muenster. publish.ps1 rebuilds preview and gates on all tests.
   No repository has yet been created or pushed. Do not overwrite an existing repo.

## Execution blocker

The source is visible in Windows File Explorer (user confirmed preview.html).
exec_command still failed to spawn; node_repl rejected the /mnt/c/ sandbox URI
while desktop dependency paths were native Windows. Windows-native agent plus
a C:\ project path is the current recovery attempt, not a confirmed fix.

The three existing advisory agents are product_council, data_council and
architecture_council. Their shared contracts and review gates are recorded in
docs/. They may not be available across a new chat; preserve their decisions
and use a small team rather than repeating the research.
