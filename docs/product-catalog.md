# Product catalogue and local aggregation

Start with acceptable cheaper alternatives for a small requested basket, rather than promising every product stocked by every shop in a radius. A product catalogue describes products; dated observations describe prices at particular locations. Neither establishes stock or a complete shop inventory.

`src/product-catalog.mjs` validates a bounded versioned catalogue and matches explicit constraints. Category, unit, quantity basis and a requested brand must match. Milk source, fat percentage, fresh/UHT processing, organic and lactose-free requirements are independent hard attributes when requested. Fat uses integer basis points: 1.5% is 150. A missing or unreviewed attribute cannot satisfy a hard requirement. Display names never infer attributes. Brand changes are allowed only when the request leaves brand unrestricted. Pack sizes may differ; later checkout calculations must still buy whole packs.

This matcher establishes product equivalence only. It returns no prices, savings, shop availability or complete-inventory assertion. It is not yet wired into historical ranking or the browser. Manual review flags are assertions; source review remains necessary.

## Offline SQLite foundation

The dependency-free local importer uses Node 22's built-in experimental `node:sqlite`. Run from `prototype`:

```bash
npm run catalog:build -- --report local-data/LOCAL_AUDIT.json --out local-data/NEW_CATALOG.sqlite
```

It reads a validated report of at most 2 MiB/300 observations, performs no network requests, fingerprints its exact bytes and exclusively creates a new database with permissions 0600. Existing outputs and original reports are preserved. Choose a new filename for another snapshot; incremental merging is not implemented.

`data/catalog-schema.sql` separates report provenance, provider product identities, location identities, report-bound product snapshots and dated price observations. Each observation retains its metadata snapshot, including conflicting labels; no latest label overwrites older evidence. Missing product codes remain record-specific unidentified candidates. Price decimals are retained source values, not reviewed integer-cent checkout prices. Pack basis, product category, dietary attributes, deposits, branch review and price eligibility remain unknown/unreviewed. Location identities are not automatically joined to the reviewed branch registry.

Only selected product/price/provenance fields are projected. Owners, comments, product creators, proof IDs, receipts, image URLs and arbitrary provider JSON are omitted. Product names are third-party display metadata, not verified statements. Database output and original reports remain under ignored local-data; MIT covers code, while imported Open Prices/Open Food Facts data retain ODbL attribution. This CLI is a local development foundation, not a browser database endpoint.

Licensing fields retain report provenance; this import does not independently verify rights for every upstream metadata field. Nested identity fallbacks are supported; conflicting top-level/nested product codes or location IDs reject the import. Always place output under local-data; SQLite files are also ignored repository-wide as a second safeguard.

Next integration must join reviewed product identities to reviewed branch-specific evidence, preserve historical freshness/conflict rules, convert reviewed merchandise prices to integer cents, resolve conditions and Pfand, and exclude missing required lines before totals. The importer deliberately supplies none of those approvals.
