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

The primary app still loads its advertised-leaflet schema only. These pickup
candidates intentionally do not enter it until channel-aware display and
selection contracts are added; they never enable checkout rankings directly.
