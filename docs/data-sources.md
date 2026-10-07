# Data sources and truthful comparison

Research date: 7 October 2026 (Europe/Berlin). The prototype uses fictional shops and invented prices, marked **Synthetic demo fixture**. Coordinates illustrate the Münster area; they do not identify actual supermarket branches. Synthetic offers must never enter a real-price ranking.

## First provider boundary: Open Prices

[Open Prices](https://openfoodfacts.github.io/open-prices/) publishes a read-only price API and crowdsourced observations, with receipt or shelf-label evidence. Its [price-list documentation](https://openfoodfacts.github.io/documentation/docs/Open-prices/prices/prices_list/) documents geographic `lat`, `lon`, `radius_km` filters, EUR currency, observed dates and pagination. [Nearby locations](https://openfoodfacts.github.io/documentation/docs/Open-prices/locations/locations_nearby_list/) can identify provider locations. The adapter preserves raw records and provenance, bounds requests, reports truncation, and never turns a historical observation into a current promotion.

The live geographic query could not be verified during research: web fetching failed and local execution was unavailable. No Münster price count or coverage claim is established. A successful empty response means no records in that query, not evidence that a shop lacks the products. An API failure must remain an error, not an empty successful dataset.

[Project API guidance](https://github.com/openfoodfacts/open-prices/blob/main/API.md) requires ODbL compliance and attribution, and cautions against mixing incompatible non-free data. MIT licensing of our original code does not relicense imported data. Preserve dataset provenance and licensing separately; evaluate the implications before distributing combined datasets. No credentials or contributions are needed for this prototype's read-only boundary.

## Retailer feasibility

[REWE Roggenmarkt](https://www.rewe.de/marktseite/muenster/250486/rewe-markt-roggenmarkt-15-16/) provides branch identity, promotional prices, quantities and validity text. Retrieved snapshots disagreed: canonical-page retrieval showed offers expired on 3 October while search results showed validity through 10 October. Capture source validity, not merely retrieval time; an expired snapshot cannot support a current comparison. This is a candidate for reviewed import, not proof of complete shelf-price coverage. [REWE robots.txt](https://www.rewe.de/robots.txt) disallows `/restservices/`; no undocumented internal endpoint is used. Public visibility and robots rules do not establish data-reuse rights.

[Lidl's Robert-Bosch-Str. branch page](https://www.lidl.de/s/de-DE/filialen/muenster/robert-bosch-str-2-4/) verifies a local branch but retrieved text did not expose branch-specific grocery prices. [EDEKA Rotthowe](https://www.edeka.de/maerkte/074602/) exposes branch identity and prospect links, but the retrieved offers were dated February 2026. Those offers are expired. Retailer automation/reuse terms and usable current local coverage remain unverified. No full scraper, prospect archive or retailer imagery is distributed.

## Eligibility rules

- Keep captured timestamps, observed dates and advertised validity separate. Shelf labels and receipts are historical observations; a freshness window is an estimation policy, not guaranteed current validity.
- Require verified branch applicability, reviewed product/category matching, known normalized pack quantities, integer EUR cents and an applicable advertised date range for strict active-offer comparisons.
- Enforce requested dietary and brand constraints. Ambiguous matches remain excluded. Preserve original quantity text and distinguish net from drained weight.
- Purchase whole packs and expose excess quantity. Missing required items block complete-basket ranking; show known subtotal and coverage separately.
- Require explicit membership eligibility for conditional prices. Future cashback is separate from checkout cost. Keep refundable deposit separate; unknown applicable deposits prevent an exact checkout total.
- An advertised offer does not establish stock availability. Never apply one branch's price to every branch of a chain without explicit source scope.
- Do not mix synthetic fixtures with real observations. A source failure cannot silently switch real comparisons into demo results.

## Next evidence milestone

Verify a bounded Open Prices query through a working runtime; count usable, recent observations per verified branch and staple category. Audit representative product matches against evidence. Only after that audit should live observations become an explicitly labelled estimate view. Current advertised offers require an additional validated import path with source dates and reuse terms assessed.
