# Whole-publication draft review queue

The earlier five distinct source items were manually selected staple leads,
not an attempted inventory of the retained publications. A reproducible offline
extractor now processes every retained PDF page and creates a spatial review
queue. It leaves the reviewed candidate files unchanged.

Run from `prototype/`:

```sh
node scripts/extract-leaflet-catalogue.mjs \
  --capture local-data/aaseemarkt-primary-capture-v1 \
  --out local-data/aaseemarkt-primary-draft-v1.json
```

Output must be a new file under ignored `local-data/`; existing outputs are
preserved. Capture and PDF hashes are checked. The CLI uses the already isolated
PyMuPDF environment at `/tmp/basketwise-pdf-env/bin/python`; callers can specify
another isolated interpreter through `extractLeafletCatalogue`'s
`pythonExecutable` option. It makes no network requests and installs nothing.
The source licence remains distinct from the code licence.

## Private output contract

`leafletDraftVersion: 1`, `mode: publication_review_queue` carries provenance
(PDF URL/hash, manifest hash, retrieval time, branch/leaflet and recorded date
window), page dimensions, every extracted word with its PDF-coordinate box,
and large standalone decimal amount anchors. Each draft has an anchor box,
context box and raw nearby snippet. Neighbouring text can overlap; product name
and merchandise price remain null, review status is unreviewed, and comparison
eligibility, ranking and inventory completeness remain false. No branch/product
equivalence is inferred from this text.

This is a review queue, not a consumer product catalogue. Font-size geometry
reduces small unit/Pfand/previous-price amounts but cannot reliably classify all
amounts. Loyalty and ordinary prices remain separate anchors. Image-only text,
percentage promotions and unsupported layouts can be missed. Processing all
pages is explicitly different from extracting all advertised products.

## Actual 8 October 2026 run

- Primary retained publication: 17 of 17 pages have text; 120 large amount
  anchors. Per-page counts: 6, 5, 6, 5, 7, 8, 8, 8, 4, 9, 9, 10, 9, 7, 8, 11, 0.
- Supplement: 5 of 5 pages have text; 20 anchors. Counts: 0, 5, 4, 5, 6.
- Outputs: `local-data/aaseemarkt-primary-draft-v1.json` and
  `local-data/aaseemarkt-supplement-draft-v1.json`; originals preserved.
- Primary page 13 was rendered and visually checked: seven priced product
  blocks plus two additional loyalty amounts produce nine anchors. The Mutti
  percentage promotion has no standalone price and is absent from the anchor
  queue; its text remains in the raw page words. Supplement cover and primary
  last page have no detected large amount anchors and are explicit review gaps,
  not proof of no offers.

Next review should bind each draft region to its product, pack, ordinary/app
price channel, conditions and Pfand. Native app access is a separate acquisition
route and may improve structured catalogue metadata; neither route alone proves
complete current branch inventory.
