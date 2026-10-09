# Private native catalogue projection

REWE's official Android app exposes priced pickup product search without a
retailer login after choosing a pickup market. The tested market is Metzer
Str. 62–64, 48151 Münster/Geist. This is separate from the earlier selected
Geiststr. 2–4 shelf-offer context. Pickup and shelf prices must not be merged.

The first bounded capture covers six Milch-search screens and 16 distinct
name/price/display records, including dairy and plant drinks. One product
detail was visually checked: REWE Bio H-Vollmilch 3.8%, 1 litre, 125 cents,
ultra-high-temperature treated and homogenised, brand REWE Bio. Neither that
example nor the search sample establishes complete inventory or current stock.
An additional two-screen sample per query captured 6 egg, 8 tomato, 8 pasta,
6 oat and 6 water listings: 50 distinct display identities across all six queries.
Search results can include related products; a query does not certify product
category or suitability. All remain comparison-ineligible.
After login, the reusable CLI captured one further milk-search screen and its
four listings successfully. This is a separate snapshot of the same catalogue,
not four extra products added to the sample count.

## Extraction

For repeat collection, boot the preserved emulator headlessly, open REWE, and
select the pickup branch first. The capture command uses current visible
control bounds and requires that exact branch header before and after each
query. It neither logs in nor chooses an alternative branch automatically.
It captures a bounded sample and does not scroll until exhaustive coverage.

```sh
npm run catalogue:android:capture -- \
  --output-dir local-data/rewe-pickup-next-capture \
  --branch-display 'Abholen | Metzer Str. 62-64, 48151 Münster / Geist' \
  --query Milch --query Eier --screens 2
```

Run from prototype. Output directories are exclusive and private. Interrupted
captures are preserved; use a new directory on retry. Authentication overlays,
missing controls, lost branch context or mismatched query surfaces stop the
collector. Google Play sign-in and retailer account surfaces are outside this
collector. Each query has its own directory for the following projection.

Python3's standard library projects captured Android UI XML. No SDK or account
is required to run the projection. Raw XML and output remain under ignored
local-data. Each capture directory contains branch.xml and a manifest.json with
the context's SHA256, exact query, and source entries containing an immediate
child XML filename, SHA256 and timezone-aware retrieval timestamp. Product XML
must show the exact query and REWE's product-detail accessibility descriptions.

```sh
cd prototype
npm run catalogue:android:extract -- \
  --capture-dir local-data/rewe-pickup-milk-capture-v1 \
  --branch-display 'Abholen | Metzer Str. 62-64, 48151 Münster / Geist' \
  --output local-data/rewe-pickup-milk-candidates-v2.json
npm run test:android-catalogue
```

Use a new output name: existing files are preserved. Output is owner-readable
and writable only from creation. Projection excludes unrelated XML fields,
account data and notifications. Input size, XML declarations, query/package,
source hashes, branch header, timestamp timezone and child-file paths are
checked; linked files are rejected.

The selected header is context captured in the same operator-controlled
session. Search screens do not repeat that header, so branch applicability is
explicitly an operator assertion, not independently verified by the hash.
Source hashing detects alteration; it does not certify retailer authenticity.
Commercially identical display rows merge with all source references retained;
different displayed prices for one name are flagged. These are captured listing
identities, not canonical products or independently counted price observations.

Price cents are exact integers. Pack and condition wording stays in its original
display field pending review. Pfand, active validity, canonical identity, stock,
complete catalogue and comparison eligibility remain unresolved. Retrieval time
does not establish advertised validity. Pickup fees and service terms remain
separate from merchandise prices. No order, reservation or payment is made.

The primary app now supports these pickup candidates and ALDI Nord app
candidates alongside leaflet reports. Each card preserves its price channel and
capture date. App search results stay unclassified; neither the search query nor
a product name certifies a category or equivalent substitute. All selections
remain comparison-ineligible and never enable checkout rankings directly.

## ALDI and Lidl continuation

ALDI Nord guest search supplied 50 distinct native references across six queries:
26 assortment cards and 24 promotions. Its branch remains unmapped. The ALDI
extractor preserves the primary displayed amount and raw pack/brand/condition
wording; reference amounts cannot replace it. Search results are not inventory.

Lidl Plus guest offers were captured after selecting Friedrich-Ebert-Straße 17,
Münster (DE5054). A 24-screen bounded run stopped when the screen repeated,
projecting 37 distinct offer records. The displayed offer count was 49; this does
not mean the extractor covered every offer or that all records are groceries.
The adapter requires the checked Meine Filiale filter, supports the observed
expanded and collapsed offers headers, and verifies separate branch headers
before and after. Preserve raw yearless date ranges. Explicit Normalpreis,
Lidl Plus and reference amounts are separate fields; priceCents stays null.
The primary app can now project these records for search and exact selection.
Ordinary and Lidl Plus amounts remain separately labelled; absent ordinary
amounts show “Price needs review” without a loyalty/reference fallback. Reference
amounts, literal pack/conditions and yearless periods appear in expandable offer
details. This display support does not resolve checkout eligibility.

```sh
npm run catalogue:lidl:capture -- \
  --output-dir local-data/lidl-next-capture \
  --branch-display 'Münster-Friedrich-Ebert-Straße' --screens 30
npm run catalogue:lidl:extract -- \
  --capture-dir local-data/lidl-next-capture \
  --output local-data/lidl-next-candidates.json
```

The capture command starts from Lidl's selected guest branch and visible bottom
navigation. It does not register, activate coupons or make purchases. Use new
output paths; interrupted captures remain preserved.

## Run the searchable private pilot

From prototype, with the project-local Node runtime on PATH:

```sh
npm run app:pilot
```

This launcher chooses up to 16 known pilot report basenames when present under
local-data. It never scans account directories. The actual retained configuration
loads 142 distinct selections: five leaflet products, 50 REWEpickup listings,
50 ALDIapp listings and 37 Lidl offer records. The Lidl sample includes nonfood
products; no grocery category is inferred from it. A public checkout without
these private reports starts empty.
Use PORT to change the loopback port. General npm run dev remains configurable
through BASKETWISE_REPORTS, now bounded at 16 reports/300 distinct products.

The API projects allowlisted display metadata only, strips local filenames and
unrelated account fields, refuses linked or oversized reports and sends no-store.
The service worker caches public shell modules only. Imported reports and basket
state remain in memory. Clearing catalogue data preserves selections, with a
source-unavailable label. Pickup branch context remains an assertion and ALDI
branch applicability remains unknown. Product selection is not a price match.
