# Local leaflet candidate inspection

Implemented 8 October 2026. `offers.html` displays locally imported, visually reviewed leaflet candidates for Rotthowe Aegidiimarkt (074601) and Wiewel Aaseemarkt (074835), with branch/category filters and a six-item starter-request evidence table. It does not provide a live feed, stock, equivalent product matching, complete basket coverage or rankings.

## Run it in WSL

Use the project-local Node runtime, then from `prototype`:

```bash
npm run offers:prepare -- --capture local-data/edeka-retailer-capture-v1 --out local-data/NEW_OFFER_VIEW.json
npm run retailer:capture -- --out local-data/NEW_AASEEMARKT_CAPTURE --store edeka-074835
npm run dev
```

Open `http://127.0.0.1:8000/offers.html` (or the configured `PORT`) and select up to two generated JSON files together, one per branch. Actual prepared files are `local-data/offer-view-v2.json` and `local-data/aaseemarkt-offer-view-v1.json`. The earlier v1 report and all original captures/reviews remain preserved. A new capture alone has no candidates: its source-linked manual `reviewed-candidates-v1.json` must be prepared before running `offers:prepare` on that directory. The actual new capture/review is `local-data/aaseemarkt-retailer-capture-v1`.

The preparation tool reads the existing capture manifest and `reviewed-candidates-v1.json`. It checks the review’s manifest fingerprint, every one of the four allowlisted source filenames/URLs, exact-byte source hashes and lengths, the leaflet fingerprint and matching review/page dates. Only allowlisted display fields enter the new private JSON, written exclusively with mode 0600. Inputs and outputs must be immediate children of the real local-data directory; linked capture/source paths and existing outputs are rejected. This is an offline consistency check, not authentication of a reviewer or evidence that all comparison gates pass.

The browser validates the supported report version, exact branch, bounded counts and fields, integer cents, dates, units, unique candidate IDs and disabled ranking/inventory flags. It builds text nodes and supplies the official branch link from code rather than using arbitrary imported URLs. It shows leaflet dates separately from capture time, classifies the selected date against the recorded leaflet period, filters categories and discloses pack basis, known milk fat, unknown Pfand and remaining checks. Manual review claims remain assertions. Leaflet dates do not certify item-specific validity. Unknown Pfand prevents checkout totals. Candidates never enter the demo state or optimizer.

Two reports identifying the same leaflet hash trigger a shared-publication disclosure. This does not authenticate the import or make repeated candidates independent price observations. Duplicate branch reports are rejected atomically; there is no silent newest-snapshot selection. The starter request mirrors `data/pilot-basket.json`: 2 L milk, 750 g pasta, six eggs, 500 g oats, 800 g tomatoes and 1.5 L water. Counts are category candidates, not equivalent-product matches, quantity coverage or usable basket lines. Comparison eligibility remains disabled. The coverage table always covers all imported branches; display filters do not change its denominator.

Files stay in memory: no uploads, fetches or localStorage writes occur during import. Clearing invalidates an outstanding read. Malformed/oversized imports clear the previous report and display a static error without source contents. The local server serves the new page/modules through its fixed allowlist and still returns 404 for local-data.

## Second-source trial

The ordinary direct request to Netto Weseler Str. 109 branch 6046 returned 403. The earlier successful Netto city source check used a different branch; it does not establish access to this one. Collection stopped without bypassing denial.

The public [Wiewel offers page](https://wiewel.eu/angebote.html) succeeded and directly linked a 17-page downloadable leaflet. Three exact public resources (offers page, linked PDF, official branch list) are retained privately with hashes and completion timestamps under `local-data/wiewel-source-trial-v1`. This was a manual feasibility capture, not a maintained Wiewel adapter. The linked filename contains `KW41_25`, but rendered cover text explicitly says 5–10 October **2026**. Never infer validity from a filename year. A cover-page pasta candidate was visually checked; no prices or leaflet copies are published in project source.

The group PDF includes a business imprint but does not explicitly name the Aaseemarkt branch. Its pasta candidate remains outside branch-specific imports and comparisons. The subsequent branch-link check below establishes a different, shared supplement; it does not grant applicability to this group PDF.

## Exact Aaseemarkt source confirmation

The old official Aaseemarkt URL redirects normally to [branch 074835](https://www.edeka.de/maerkte/074835/). Its dated offers section identifies **Von-Witzleben-Str. 10, 48151 Münster**, explicitly gives 5–10 October 2026 and links [its own prospect page](https://www.edeka.de/maerkte/074835/prospekte/). That page directly embeds both `RHEINRUHR/Stroetmann_25/index.html` and `RHEINRUHR/SUUPER_Angebote/index.html`. The collector selects the allowlisted SUUPER supplement already supported for Rotthowe. No app account or private endpoint was used.

All four source resources were captured anew for 074835. Its PDF hash exactly matches the retained Rotthowe PDF, so the previous visual review of the two item/price pairs could be reused with new branch-specific candidate IDs and a new manifest binding. Date, branch and item-price checks are distinct; the source relationship supports branch selection, while pack basis, Pfand, milk source and canonical product/condition review remain unresolved. The advertised milk fat is 3.5%; it cannot satisfy a hard 1.5% request. There are no captured pasta/eggs/oats/water candidates in this five-page supplement. Milk and tomatoes appear for both branches, with the same source prices; this provides no demonstrated branch savings or complete basket.

Next: review the primary `Stroetmann_25` leaflet explicitly linked for Aaseemarkt, and find equivalent branch-specific evidence at a second shop for categories missing from the supplement. Do not equate that viewer to the previously captured Wiewel group PDF without checking bytes/dates. Keep totals disabled until the full requested basket has eligible evidence.

## Verification

- Native WSL suite: 171 tests pass across 17 files. Additional checks reject wrong-branch address/prospect pairs and unsupported collection targets, confirm the two canonical branch URLs, enforce duplicate-branch rejection and ensure category candidate counts remain distinct from basket eligibility. The starter request is checked against the public request JSON.
- Real headless Chromium: imported the actual two-candidate private report, rendered desktop and 390 px mobile screenshots and inspected the mobile image. Category filter, date expiry, clear and malformed-file handling passed. Import caused zero network requests and no localStorage keys were created. No page errors or mobile horizontal overflow were detected.
- Subsequent Chromium verification imported both actual branch reports, displayed four branch candidates with a shared-leaflet warning, checked branch/category filters, exact Aaseemarkt source link, six starter rows and zero eligible lines, expiry, clear and duplicate-branch rejection. Desktop and 390 px mobile screenshots were captured and the mobile image inspected; imports caused zero network/storage writes, no page errors and no document horizontal overflow.
- Rebuilt the offline demo preview. The demo optimizer remains separate. Browser artifacts and all retailer/source reports remain ignored. Other engines and full screen-reader auditing are unverified.
