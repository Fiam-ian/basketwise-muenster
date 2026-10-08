# Local leaflet candidate inspection

Implemented 8 October 2026. This is the first real-source browser slice of the Pluggendorf–Aasee pilot. `offers.html` displays locally imported, visually reviewed EDEKA 074601 leaflet candidates. It does not provide a live feed, stock, equivalent product matching, complete basket coverage or rankings.

## Run it in WSL

Use the project-local Node runtime, then from `prototype`:

```bash
npm run offers:prepare -- --capture local-data/edeka-retailer-capture-v1 --out local-data/NEW_OFFER_VIEW.json
npm run dev
```

Open `http://127.0.0.1:8000/offers.html` (or the configured `PORT`) and select the generated JSON. The actual report prepared in this continuation is `local-data/offer-view-v2.json`; the earlier v1 report is preserved. The original capture/review files remain unchanged.

The preparation tool reads the existing capture manifest and `reviewed-candidates-v1.json`. It checks the review’s manifest fingerprint, every one of the four allowlisted source filenames/URLs, exact-byte source hashes and lengths, the leaflet fingerprint and matching review/page dates. Only allowlisted display fields enter the new private JSON, written exclusively with mode 0600. Inputs and outputs must be immediate children of the real local-data directory; linked capture/source paths and existing outputs are rejected. This is an offline consistency check, not authentication of a reviewer or evidence that all comparison gates pass.

The browser validates the supported report version, exact branch, bounded counts and fields, integer cents, dates, units, unique candidate IDs and disabled ranking/inventory flags. It builds text nodes and supplies the official branch link from code rather than using arbitrary imported URLs. It shows leaflet dates separately from capture time, classifies the selected date against the recorded leaflet period, filters categories and discloses pack basis, known milk fat, unknown Pfand and remaining checks. Manual review claims remain assertions. Leaflet dates do not certify item-specific validity. Unknown Pfand prevents checkout totals. Candidates never enter the demo state or optimizer.

Files stay in memory: no uploads, fetches or localStorage writes occur during import. Clearing invalidates an outstanding read. Malformed/oversized imports clear the previous report and display a static error without source contents. The local server serves the new page/modules through its fixed allowlist and still returns 404 for local-data.

## Second-source trial

The ordinary direct request to Netto Weseler Str. 109 branch 6046 returned 403. The earlier successful Netto city source check used a different branch; it does not establish access to this one. Collection stopped without bypassing denial.

The public [Wiewel offers page](https://wiewel.eu/angebote.html) succeeded and directly linked a 17-page downloadable leaflet. Three exact public resources (offers page, linked PDF, official branch list) are retained privately with hashes and completion timestamps under `local-data/wiewel-source-trial-v1`. This was a manual feasibility capture, not a maintained Wiewel adapter. The linked filename contains `KW41_25`, but rendered cover text explicitly says 5–10 October **2026**. Never infer validity from a filename year. A cover-page pasta candidate was visually checked; no prices or leaflet copies are published in project source.

The PDF is a Wiewel group leaflet and includes a business imprint; it does not explicitly name the Aaseemarkt branch in the extracted text. The official branch list confirms the address, but does not establish that every group promotion applies there. Keep branch applicability unreviewed and leave this candidate outside the branch-specific browser import and comparisons. Next: follow the exact Aaseemarkt official branch offer link, reconcile that leaflet, then add a reviewed Wiewel adapter/schema when its branch evidence is established.

## Verification

- Native WSL suite: 169 tests pass across 17 files. New checks cover untrusted URL/private-field projection, date boundaries, malformed report/schema/duplicate identities and invalid money/pack fields, source-byte tampering, hash-pinned review binding, exclusive private outputs and output containment.
- Real headless Chromium: imported the actual two-candidate private report, rendered desktop and 390 px mobile screenshots and inspected the mobile image. Category filter, date expiry, clear and malformed-file handling passed. Import caused zero network requests and no localStorage keys were created. No page errors or mobile horizontal overflow were detected.
- Rebuilt the offline demo preview. The demo optimizer remains separate. Browser artifacts and all retailer/source reports remain ignored. Other engines and full screen-reader auditing are unverified.
