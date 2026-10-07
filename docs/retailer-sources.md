# Official retailer sources — 7 October 2026

Prioritize official branch-specific advertised offers and leaflets for the active-offer pilot. Keep Open Prices for separately labelled historical observations and catalogue evidence. A product catalogue, an advertised price, an online delivery price and branch stock are different facts. Advertisements can support useful alternatives even when they cannot price a complete shopping list.

## Bounded feasibility findings

| Source | Observed result | Pilot decision |
| --- | --- | --- |
| [REWE Roggenmarkt offers](https://www.rewe.de/angebote/muenster/250486/rewe-markt-roggenmarkt-15-16/) | Search/web retrieval exposes pack prices, deposits and selected branch; direct WSL request and normal isolated Chromium both returned 403 | Retain official source link; automated collection unavailable from this environment. No access circumvention |
| [EDEKA Rotthowe 074601](https://www.edeka.de/maerkte/074601/) | Native Node and Python retrieved HTTP 200; exact branch/address and 5–10 October page window captured. Chromium returned 403 | First implemented public-source collector |
| [EDEKA branch prospects](https://www.edeka.de/maerkte/074601/prospekte/) | Actual retrieved HTML links the Rhein-Ruhr SUUPER viewer | Capture this branch-to-viewer link with the leaflet |
| [Lidl prospects](https://www.lidl.de/c/online-prospekte/s10005610) | Official site offers regional branch selection and date-labelled leaflets; branch-specific leaflet applicability not established in this pass | Next ordinary branch-selection investigation; no national-to-local price assumption |

[REWE's official instructions](https://www.rewe.de/service/papierlos/) describe selecting a market by postcode/city/address and browsing offers or its digital prospect. A search-index excerpt is not a captured current page: different retrievals exposed different weeks. Always retain the actual source, retrieval time and its explicit validity.

[EDEKA's official API gateway](https://b2c-gw.api.edeka/) says to contact EDEKA for access. No documented freely usable official inventory API was established for these retailers. Third-party commercial scrapers and undocumented app endpoints are not adopted. Public visibility does not establish a redistribution licence. Retailer snapshots stay local; their content does not inherit MIT or Open Prices' ODbL licence.

## Implemented EDEKA capture

From `prototype`, with Node 22 and an existing local-data directory:

```bash
npm run retailer:capture -- --out local-data/NEW_CAPTURE_NAME
```

The collector requests exactly four allowlisted public resources: branch page, branch prospect page, viewer shell and the viewer's complete PDF. The PDF link was discovered using the visible **Weitere Aktionen → Speichern → Komplettes PDF** browser controls; this is a manually reviewed resource configuration, not an automatically verified public API contract.

Limits: 25-second timeout per request, no retries or redirects, 2 MiB per HTML resource and 20 MiB per PDF. Access denial, unexpected content, changed branch structure, ambiguous page dates, unexpected viewer or oversized response stop collection. It preserves exact-byte SHA-256 hashes and timestamps, writes a new private directory/files with 0700/0600 permissions, rejects existing outputs before network work, and requires a direct child of the non-symlinked ignored local-data directory. No login, cookies, receipt upload, scheduled job or arbitrary crawl is added.

The actual run captured all four sources, including a 7,846,851-byte five-page PDF. Its title page and the branch page both state 5–10 October 2026. The PDF SHA-256 is `ebfa1625898b8a5f52c4efa69473ccb6fae4f60c0cb64184860a87d4406ba1d4`. Do not assume a future retrieval at this mutable URL has the same content. Another leaflet section carries a longer item-specific period; item validity must be reviewed rather than universally assigned from the page window.

Manual text-plus-image review found milk and tomato candidates, stored privately with their page references, pack sizes, integer-cent prices, attributes and remaining exclusions. Milk has 3.5% fat and cannot satisfy a hard 1.5% request. Muesli is not substituted for plain oats. Text extraction interleaves spatially separate prices: the kiwi/cucumber reading order is misleading. A text-only parser is therefore insufficient to certify these offers. No candidate has been promoted into the optimizer; deposit, quantity basis, conditions and catalogue identity still require review.

The collector reports **capture only**, zero automatically extracted price candidates, unknown inventory and disabled ranking. The separate private manual review records two candidates; this is not complete six-line or two-shop basket coverage.

## Next integration

Build source-specific extraction into unreviewed candidates, using structured public data where available and reviewed leaflet blocks otherwise. Preserve base checkout price separately from unit-price labels, former prices, bonus credit, membership coupons and Pfand. Join verified branch, dated applicability and reviewed catalogue constraints before creating active offers for the existing optimizer. Surface missing lines rather than inventing regular shelf prices. Refresh cadence and source access reliability need measurement before promising a current-price service.
