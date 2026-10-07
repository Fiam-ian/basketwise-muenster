# Historical product/pack eligibility diagnostic

This local CLI checks a versioned requested basket against retained historical observations and an explicit manual review file. It reports branch-scoped requested-line coverage and exclusions. It computes no checkout totals, ranks no baskets and changes neither the demo nor the browser inspector. Eligibility is conditional on local review assertions, not independent authentication of receipts, source files or current prices.

## Run a bounded local pilot

From `prototype/`, with the project-local Node/npm PATH in [wsl-handoff.md](wsl-handoff.md):

```bash
npm run historical:audit -- --draft \
  --report local-data/muenster-coverage-2026-10-07.json \
  --basket data/pilot-basket.json \
  --shopping-date 2026-10-07 --max-age-days 13 \
  --out local-data/historical-review-v1.json

npm run historical:audit -- \
  --report local-data/muenster-coverage-2026-10-07.json \
  --review local-data/historical-review-v1.json \
  --out local-data/historical-eligibility-v1.json
```

Outputs must be new files: existing files and concurrent creations are protected by exclusive writing. To repeat an audit, choose a new output filename. Inputs are read locally, bounded to 2 MiB, and not overwritten; no network calls or proof-image downloads occur. Keep reviews and generated results under ignored `local-data/`. Errors print static guidance, without echoing malformed private JSON. `--help` prints usage. `--registry` optionally selects a local branch registry; the default is `data/muenster-stores.json`.

The starter basket is a public request definition, not reviewed product matching. Its six lines are milk, pasta, eggs, oats, tomatoes and water. The draft pins the exact source report bytes with SHA-256 and sets every record to `reviewed: false`. A changed report, including whitespace changes, requires a new draft/review. Hash equality binds files; it does not prove provider authenticity. The registry contains a separate reviewed address mapping for the single observed branch; unrelated registry branches are not silently included as mapped evidence.

The initial run should report zero eligible lines until product/pack/source/condition/deposit reviews actually happen. It must not infer that a shop lacks these products.

## Explicit review contract

The draft carries `auditReviewVersion: 1`, the report fingerprint, an explicit `shoppingDate`, `maxAgeDays`, `allowMembership`, the versioned basket and `recordReviews`. Freshness is a heuristic relative to the requested calendar date, not to retrieval time. Age is inclusive: a limit of 13 includes fourteen calendar dates. Future observations are excluded. Membership is disabled in a fresh draft.

Each basket item defines an ID, category, positive requested quantity, unit (`g`, `ml`, `count`), quantity basis (`net`, `drained`, `count`), explicit brand (`null` permits generic equivalents), and required tags. Equivalent demands merge before coverage calculation. Brand, basis, unit and sorted required tags are part of equivalence. IDs identify request entries in the private review; report lines use sequential numbers in merged order and omit product names/brands/tags from printed output.

After examining the exact referenced observation and its applicable source evidence locally, a reviewed entry requires:

| Field | Required assertion |
| --- | --- |
| `providerRecordId`, `reviewed` | Exact record in the pinned report; mark true only after review |
| `category`, `brand`, `tags` | Reviewed requested category and hard constraints; provider labels alone do not establish them |
| `packQuantity`, `unit`, `basis` | Actual purchasable pack and net/drained/count basis; receipt purchase quantity is not pack size |
| `priceBasis` | `per_pack`: the observed price represents merchandise for one purchasable pack, excluding separately assessed Pfand |
| `depositCents` | Explicit nonnegative safe integer cents, including reviewed zero; `null` means unknown and excludes eligibility |
| `requiresMembership` | Explicit applicable condition; known loyalty evidence cannot be marked unconditional |
| `priceIsDiscounted`, `discountType` | Match the raw discount flag and type (`null`, `SALE`, `LOYALTY_PROGRAM`); unknown or missing discount evidence stays excluded |
| `conditionsReviewed` | Applicable historical sale/loyalty and other purchase conditions reviewed, not merely a recent date |
| `sourceEvidenceReviewed` | Evidence applies to this branch, product, pack and observed price; a positive consistent proof identifier is also required |

No example here marks an actual private record reviewed. These fields are manual assertions, not proof that a review was performed. The tool does not read proof images or infer dietary compliance, unknown Pfand, ordinary-price eligibility or advertised validity from receipt fields.

## Selection, conflicts and exclusions

Only structurally supported `PRODUCT` EUR observations with consistent identities and the exact reviewed OSM branch mapping can contribute. Provider-marked duplicates are excluded. EUR decimal values must resolve exactly to safe integer cents with at most two fractional digits. Non-null `price_per` values remain unsupported in this slice; review cannot override them. Pack quantity/unit must match provider metadata exactly: no kilogram/litre conversions or inferred drained weights are implemented. A genuine unsupported pack is reported as excluded rather than converted silently.

Newest dated coherent same-branch/product evidence on or before the shopping date suppresses older evidence, even when the newest record is unreviewed. This deliberately broad policy can exclude different packs/conditions under the same product code; it avoids resurrecting an older convenient price while review is incomplete. Future observations do not suppress historical evidence for an earlier request. Date-only evidence cannot establish within-day order.

Same-day inconsistent price, pack, basis, deposit, conditions, reviewed constraints or structural eligibility blocks the affected candidate group. The tool does not choose its cheapest price. Different valid proof IDs alone do not establish a conflict or independent visits. Relevant observations remain excluded when branch/source identity, date, constraints, conditions, membership, deposit, price basis or pack evidence fail their gates.

The report names the basket version, shopping date, age policy, membership policy, record/truncation context and included mapped branches. Each branch contains the merged-line denominator, covered and missing lines, candidate counts and one primary exclusion reason per examined candidate. Each line's `eligibleDateProfile` discloses dates, calendar-day ages and observation counts for eligible candidates after conflict exclusion; `mixesEligibleObservationDates` flags more than one such date. This profiles alternative candidate evidence, not purchases selected for a basket. Unreviewed records are considered unknown candidates for every requested line; reason counts across lines may repeat the same record and must not be interpreted as independent observations. Candidate coverage is limited to the retained records; truncation or source query scope can leave other evidence unseen.

Printed results omit raw record/product/proof identifiers, receipt URLs/images, owners, coordinates and prices. They retain requested quantities and mapped public branch IDs. The output always declares historical diagnostic mode, unverified local provenance, `currentPriceEligible: false` and `rankingEnabled: false`. Covered lines alone do not establish a checkout estimate, current/future validity, stock, independent shopping trips or walking feasibility. Optimizer historical ranking and browser integration remain future gated work.

## First actual local run

On 2026-10-07, the CLI read the retained 22-record 3 km report using the public six-line starter and 13-day age limit. The reviewed address mapping covered the single provider location. With all product reviews false, each required line reported zero eligible candidates and an empty eligible date profile; branch coverage was 0/6. The `unreviewed_product` exclusions were repeated per line as unknown candidates, not 132 independent observations. Review and aggregate files remain in ignored local-data; no actual record identities or prices are published.
