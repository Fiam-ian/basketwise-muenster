# Native price evidence review — 9 October 2026

The searchable catalogue is useful now; its selections are not yet eligible
checkout prices. This bounded review inspected private projected reports and
one retained REWE milk detail. It changes no matching rules or comparison gates.
No actual retailer amounts, source XML or account data are published here.

## Retained sample and outstanding gates

| Source channel | Sample | Evidence available | Main gaps before totals |
| --- | --- | --- | --- |
| REWE pickup | 50 listings: milk 16, eggs 6, tomatoes 8, pasta 8, oats 6, water 6 | Exact displayed amount, literal pack wording, source hashes/timestamps, separate pickup branch header | Product-detail review, merchandise price basis/conditions, explicit deposit treatment, independently checked branch applicability, pickup service charges/terms |
| ALDI Nord app, unmapped branch | 50 native references: 26 assortment and 24 promotion | Primary amount distinct from reference amounts; literal pack/brand wording; raw conditions | Exact Münster applicability, item detail and footnote review, promotion validity with year, deposit treatment; assortment prices need an explicitly defined observation policy |
| Lidl guest offers | 37 records from a bounded 24-screen capture | 27 explicit normal amounts, 30 parsed Lidl Plus amounts, 37 reference amounts; 37 raw date displays | Full-year validity, exact variant/pack, conditions and footnotes, deposit treatment, branch applicability review; missing parsed loyalty amount is not a zero price |

All 137 native records retain unknown deposit amounts and disabled comparison
eligibility. REWE and ALDI project no displayed-price conflicts in this sample;
that does not establish that there are no retailer-side conflicts. Lidl keeps
the canonical price null so that reference, ordinary and loyalty roles cannot
be chosen accidentally. The displayed Lidl offer count was 49, while 37 distinct
records were projected; neither number certifies exhaustive inventory.

REWE and ALDI captures date from 8 October; the Lidl capture dates from 9 October.
Retrieval and generation times do not establish advertised validity. Separate
branch screens are operator session context, not independently authenticated
per-product applicability. No retained source verifies stock.

## What can be reviewed locally

Current source bytes permit checking exact display amounts, pack wording,
price-role separation and the correspondence between a projected record and its
hash-pinned capture. The REWE detail explicitly describes the sampled bio milk
as ultra-high-temperature treated, homogenised and 3.8% fat. That supports a
local attribute review for this exact selection; another milk name does not
inherit those attributes. No cross-brand equivalence follows from it.

Egg results include explicit six- and ten-count REWE packs and ten-count ALDI
packs, with differing husbandry wording. The count can be reviewed from the
capture, but equivalent husbandry, size/grade, dietary requirements and price
conditions still need evidence. Pasta searches include dry noodles, lasagne
and ready meals: a query match is not a staple-category match. Select one actual
dry-pasta detail before treating its mass as a compatible requested quantity.

ALDI's ordinary milk cards provide litre pack wording, but do not independently
establish every requested fat/processing constraint. Yearless offer dates,
asterisks and grouped variants remain literal evidence pending review. A missing
deposit label is insufficient evidence for setting deposit to zero. The same
applies to apparently ordinary egg, pasta or carton-milk packaging.

New detail captures are needed for attributes and footnotes absent from these
cards. Full-year offer evidence and branch applicability need their own source
checks. An account login alone resolves none of these evidence gates. Existing
historical eligibility tooling accepts its historical provider schema; native
app reports must not be relabelled as receipt observations to reuse it.

## Smallest runnable next milestone

Start with a private three-line review for exact milk, egg and dry-pasta
selections at the retained REWE pickup branch. Preserve the pickup channel;
do not compare it to shelf or delivered checkout prices. Capture the branch
context and each product detail again, with source hashes and capture dates,
then record pack quantity/basis, amount role, restrictions, price conditions,
deposit status and explicit exclusions in a separate review file. Choose exact
products first so this step needs no inferred substitution model.

Produce a coverage audit and, only where reviewed evidence permits it, an
explicitly labelled observed merchandise estimate. A timestamped displayed app
price may be retained as an observation under a disclosed policy, but it is not
an active-offer validity window or a receipt-confirmed checkout amount. Unknown
service charges keep pickup checkout totals unresolved. This milestone supplies
no cheapest-market ranking and does not certify a future checkout.

Validate whole-pack arithmetic using synthetic fixtures: two litres from a
one-litre pack, twelve eggs from a ten-count pack, and a demand exceeding one
dry-pasta pack. Show integer pack counts, excess quantity and deposits separately.
Verify rejection of changed report hashes, missing pack basis, unknown deposit,
ambiguous variants, unresolved branch/conditions and conflicting amounts. Verify
that an omitted required line prevents a complete basket and that channels never
merge. Test future dates and expired/full-year offer windows when active-price
review is introduced. Keep fixtures synthetic and actual reviews in local-data.

After this audit works, resolve ALDI branch applicability or a second exact
branch's equally reviewed source. Only then add explicit acceptable substitutes
and compare complete baskets within a disclosed channel and evidence policy.

## Completed exact-detail slice

The next three-product source review now has fresh 9 October detail captures:
one bio carton milk, one ten-count free-range egg pack and one 500-gram dry
spaghetti pack. Each detail exposes a distinct retailer article number. Both
ordinary detail and expanded product-detail views were retained; their displayed
amounts agree with the selected earlier capture records. The milk detail records
processing and fat wording explicitly, the egg detail records husbandry wording,
and the pasta detail identifies durum-wheat pasta. These observations support
literal metadata review for those exact listings; they do not establish canonical
identities, interchangeable products or active-price validity.

Six product screens and separate before/after pickup-context screens are hash-pinned
under ignored local-data. A separate private annotation report records the literal
pack quantity/unit and source bindings. Missing deposit treatment, price conditions,
independently checked branch applicability, an observation/validity policy and
pickup service fees still prevent a checkout total. No item was added to a retailer
cart, no slot reserved and no purchase made during this slice.

## Repeatable private review diagnostic

`npm run native:price-review` creates a draft or validates its exact selections.
It accepts one to six explicitly named immediate-child private reports, rejects
symlinked roots/files and oversized inputs, and writes new files with owner-only
permissions. Each selection refers to its own original report bytes and product
index; no combined report or category is invented. Requests remain explicit,
including any request omitted from the selections.

For example, this **sample diagnostic demand**, separate from the user's basket,
selects the retained exact milk, egg and pasta listings for 2 litres, 12 eggs and
750 grams respectively:

```sh
npm run native:price-review -- \
  --report rewe-pickup-milk-candidates-v2.json \
  --report rewe-pickup-eier-candidates-v1.json \
  --report rewe-pickup-nudeln-candidates-v1.json \
  --requests '[{"requestId":"sample-milk","requestedQuantity":2000,"unit":"ml"},{"requestId":"sample-eggs","requestedQuantity":12,"unit":"count"},{"requestId":"sample-pasta","requestedQuantity":750,"unit":"g"}]' \
  --selection '[{"reportOrdinal":0,"productIndex":0,"requestId":"sample-milk","requestedQuantity":2000,"unit":"ml"},{"reportOrdinal":1,"productIndex":0,"requestId":"sample-eggs","requestedQuantity":12,"unit":"count"},{"reportOrdinal":2,"productIndex":7,"requestId":"sample-pasta","requestedQuantity":750,"unit":"g"}]' \
  --draft-output rewe-three-product-review-next.json
npm run native:price-review -- \
  --report rewe-pickup-milk-candidates-v2.json \
  --report rewe-pickup-eier-candidates-v1.json \
  --report rewe-pickup-nudeln-candidates-v1.json \
  --review rewe-three-product-review-next.json \
  --output rewe-three-product-audit-next.json
```

Indices identify these exact retained report versions, not permanent retailer
identities; changed source bytes invalidate the review. The actual diagnostic
selected all three sample lines and reports six unresolved evidence requirements
per selection, with no totals or rankings. This first diagnostic deliberately
cannot resolve those requirements by turning manual flags on. Reviewed detail
annotations are a separate private artifact; importing them into an eligibility
engine requires a future structured evidence contract. Pack/deposit placeholders
in this draft remain null, and unsupported edits are rejected.

## Pre-slot basket evidence

A reversible one-pack trial at the retained REWE pickup branch reached the
basket without reserving a slot. Its merchandise line exposes an ordinary
unit amount, quantity and line amount. The packing-fee row instead states
“Kein Termin gewählt”; the basket also mentions deposit transport boxes.
Neither the displayed sum nor missing product-Pfand wording establishes zero
charges. Keep the provisional displayed subtotal separate from an unresolved
checkout total, product deposit, transport-box deposit and packing fee.

The source XML and its hash remain private. The single trial pack was removed
and the empty basket verified afterward. No slot was reserved or order placed.
This improves evidence about the quote's limitations; it does not resolve the
three-product review's checkout eligibility or branch applicability.

The bounded extractor supports this observed single-line, single-pack layout:

```sh
npm run pickup:quote:extract -- \
  --capture-dir rewe-basket-quote-v1 \
  --output rewe-basket-quote-report-next.json
```

It checks source bounds, package, row relationships and agreement between the
item, subtotal and checkout-button amounts, then writes a new owner-only private
report. Checkout total, both deposit fields and packing fee remain null. The
basket screen itself has no pickup header, so its channel is not independently
established by the extractor; separate capture-session context remains an
operator assertion. Unsupported layouts fail rather than implying coverage.
