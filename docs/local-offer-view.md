# Local leaflet candidate inspection

Implemented 8 October 2026. `offers.html` displays locally imported, visually reviewed leaflet candidates for Rotthowe Aegidiimarkt (074601) and Wiewel Aaseemarkt (074835), with branch/category filters and a six-item starter-request evidence table. It does not provide a live feed, stock, equivalent product matching, complete basket coverage or rankings.

## Run it in WSL

Use the project-local Node runtime, then from `prototype`:

```bash
npm run offers:prepare -- --capture local-data/edeka-retailer-capture-v1 --out local-data/NEW_OFFER_VIEW.json
npm run retailer:capture -- --out local-data/NEW_AASEEMARKT_CAPTURE --store edeka-074835
npm run retailer:capture -- --out local-data/NEW_AASEEMARKT_PRIMARY_CAPTURE --store edeka-074835 --leaflet primary
npm run dev
```

Open `http://127.0.0.1:8000/offers.html` (or the configured `PORT`) and select up to three generated JSON files together, one per branch and leaflet. Actual prepared files are `local-data/offer-view-v2.json`, `local-data/aaseemarkt-offer-view-v1.json` and `local-data/aaseemarkt-primary-offer-view-v1.json`. Earlier reports and all original captures/reviews remain preserved. A new capture alone has no candidates: its source-linked manual `reviewed-candidates-v1.json` must be prepared before running `offers:prepare` on that directory. The primary capture/review is `local-data/aaseemarkt-primary-capture-v1`.

The preparation tool reads the existing capture manifest and `reviewed-candidates-v1.json`. It checks the review’s manifest fingerprint, every one of the four allowlisted source filenames/URLs, exact-byte source hashes and lengths, the leaflet fingerprint and matching review/page dates. Only allowlisted display fields enter the new private JSON, written exclusively with mode 0600. Inputs and outputs must be immediate children of the real local-data directory; linked capture/source paths and existing outputs are rejected. This is an offline consistency check, not authentication of a reviewer or evidence that all comparison gates pass.

The browser validates the supported report version, exact branch, bounded counts and fields, integer cents, dates, units, unique candidate IDs and disabled ranking/inventory flags. It builds text nodes and supplies the official branch link from code rather than using arbitrary imported URLs. It shows leaflet dates separately from capture time, classifies the selected date against the recorded leaflet period, filters categories and discloses pack basis, known milk fat, unknown Pfand and remaining checks. Manual review claims remain assertions. Leaflet dates do not certify item-specific validity. Unknown Pfand prevents checkout totals. Candidates never enter the demo state or optimizer.

Reports identifying the same leaflet hash trigger a shared-publication disclosure. This does not authenticate the import or make repeated candidates independent price observations. Duplicate branch/leaflet reports are rejected atomically; a main leaflet and supplement for the same branch are distinct inputs. Old reports without `leafletId` mean `supplement`; `primary` is allowed only for 074835 and selects the exact allowlisted Stroetmann viewer/PDF. Review and capture leaflet IDs must agree; all four resource hashes are still checked. There is no silent newest-snapshot selection. The starter request mirrors `data/pilot-basket.json`: 2 L milk, 750 g pasta, six eggs, 500 g oats, 800 g tomatoes and 1.5 L water. Counts aggregate publications by branch and are category candidates, not equivalent-product matches, quantity coverage or usable basket lines. Comparison eligibility remains disabled. The coverage table always covers all imported branches; display filters do not change its denominator.

Files stay in memory: no uploads, fetches or localStorage writes occur during import. Clearing invalidates an outstanding read. Malformed/oversized imports clear the previous report and display a static error without source contents. The local server serves the new page/modules through its fixed allowlist and still returns 404 for local-data.

## Second-source trial

The ordinary direct request to Netto Weseler Str. 109 branch 6046 returned 403. The earlier successful Netto city source check used a different branch; it does not establish access to this one. Collection stopped without bypassing denial.

The public [Wiewel offers page](https://wiewel.eu/angebote.html) succeeded and directly linked a 17-page downloadable leaflet. Three exact public resources (offers page, linked PDF, official branch list) are retained privately with hashes and completion timestamps under `local-data/wiewel-source-trial-v1`. This was a manual feasibility capture, not a maintained Wiewel adapter. The linked filename contains `KW41_25`, but rendered cover text explicitly says 5–10 October **2026**. Never infer validity from a filename year. A cover-page pasta candidate was visually checked; no prices or leaflet copies are published in project source.

The group PDF includes a business imprint but does not explicitly name the Aaseemarkt branch. Its pasta candidate remains outside branch-specific imports and comparisons. The subsequent branch-link check below establishes a different, shared supplement; it does not grant applicability to this group PDF.

## Exact Aaseemarkt source confirmation

The old official Aaseemarkt URL redirects normally to [branch 074835](https://www.edeka.de/maerkte/074835/). Its dated offers section identifies **Von-Witzleben-Str. 10, 48151 Münster**, explicitly gives 5–10 October 2026 and links [its own prospect page](https://www.edeka.de/maerkte/074835/prospekte/). That page directly embeds both `RHEINRUHR/Stroetmann_25/index.html` and `RHEINRUHR/SUUPER_Angebote/index.html`. The collector selects the allowlisted SUUPER supplement already supported for Rotthowe. No app account or private endpoint was used.

All four source resources were captured anew for 074835. Its PDF hash exactly matches the retained Rotthowe PDF, so the previous visual review of the two item/price pairs could be reused with new branch-specific candidate IDs and a new manifest binding. Date, branch and item-price checks are distinct; the source relationship supports branch selection, while pack basis, Pfand, milk source and canonical product/condition review remain unresolved. The advertised milk fat is 3.5%; it cannot satisfy a hard 1.5% request. There are no captured pasta/eggs/oats/water candidates in this five-page supplement. Milk and tomatoes appear for both branches, with the same source prices; this provides no demonstrated branch savings or complete basket.

The subsequent primary-leaflet capture below adds category coverage. Keep totals disabled until the full requested basket has eligible evidence.

## Primary leaflet continuation

Captured branch 074835, its dated prospect page, the explicitly embedded Stroetmann_25 viewer and its complete PDF into a new private four-resource capture. The 17-page PDF is different in exact bytes from the earlier Wiewel-site download, so it received a fresh rendered cover/page 13/page 15 review rather than inheriting the group PDF’s review. Cover and relevant page dates explicitly give 5–10 October 2026. The branch-linked source relationship supports this publication’s branch selection.

Three candidates were prepared: two 500 g pasta listings and one mineral-water lead. The De Cecco listing has a separate lower DealMobil price; only the ordinary advertised action price is recorded, with the additional conditional discount explicitly excluded. Variant, pack basis, Pfand and conditions still need matching review. The water wording describes a 1.5 L bottle while the image shows a multipack. The source gives a per-bottle deposit, but neither the priced quantity nor total pack deposit is resolved. Keep `depositCents` null, preserve the source Pfand wording and show a prominent pack ambiguity warning; never calculate a checkout from the bottle quantity alone.

With all three private reports, the view displays seven branch candidates across two branches and three publications. Rotthowe has milk/tomato leads; Wiewel has milk/tomato/pasta/water leads, including two pasta options. Eggs and oats remain uncaptured. A new ordinary direct REWE Geiststraße request returned 403; no protected endpoint/account or bypass was used and no indexed search result was promoted to a captured price source. These outcomes supply no validated cross-store savings or complete basket. Next: find usable independent branch evidence for overlapping products and resolve remaining product/pack/condition/deposit checks.

## Verification

- Native WSL suite: 173 tests pass across 17 files. Additional checks require the main viewer when selecting the primary leaflet, reject cross-leaflet review binding, retain pack/deposit ambiguity, group distinct leaflets by branch and reject duplicate branch/leaflet reports. The existing branch/source/privacy/price/date and request-contract checks remain passing.
- Real headless Chromium: imported the actual two-candidate private report, rendered desktop and 390 px mobile screenshots and inspected the mobile image. Category filter, date expiry, clear and malformed-file handling passed. Import caused zero network requests and no localStorage keys were created. No page errors or mobile horizontal overflow were detected.
- Subsequent Chromium verification imported both actual branch reports, displayed four branch candidates with a shared-leaflet warning, checked branch/category filters, exact Aaseemarkt source link, six starter rows and zero eligible lines, expiry, clear and duplicate-branch rejection. Desktop and 390 px mobile screenshots were captured and the mobile image inspected; imports caused zero network/storage writes, no page errors and no document horizontal overflow.
- Main-leaflet browser verification imported all three actual reports and showed seven candidates, two branch columns, three publications, two pasta choices with the conditional discount excluded, and the water pack/Pfand warning. Branch/category isolation and duplicate-primary rejection passed. Imports made no network/storage writes or page errors; desktop/mobile screenshots were captured and inspected with no document overflow.
- Rebuilt the offline demo preview. The demo optimizer remains separate. Browser artifacts and all retailer/source reports remain ignored. Other engines and full screen-reader auditing are unverified.
