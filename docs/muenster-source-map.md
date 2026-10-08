# Münster grocery source map — 8 October 2026

The user expanded source research to supermarket chains, independent grocers, delivery platforms, websites and apps, both near the pilot origin and farther away. Implement location discovery separately from per-retailer price adapters. Finding a shop does not establish a machine-readable, complete or current product inventory. A consumer account does not establish access to a retailer's partner API.

The machine-readable register is `data/source-registry.json`: 25 retailer/platform candidates, explicit presence uncertainty, public source URLs and access findings. This is a bounded source review, not an exhaustive census of every shop. New independent locations can enter through map discovery and official branch checks; they are not omitted merely because they lack a chain adapter.

## Supermarkets and independent grocers

For the compact Pluggendorf–Aasee branch pilot and its sequencing, see [neighbourhood-pilot.md](neighbourhood-pilot.md). The initial candidate branches are Rotthowe Aegidiimarkt, Wiewel Aaseemarkt, REWE Geiststraße (market 565814) and Netto Weseler Straße 109 (branch 6046). They are an explicit source test set, not a verified 1 km-radius census. REWE and Netto official branch pages expose public offer content, so test those before creating app accounts.

The subsequent direct test of Netto branch 6046 returned 403; indexed/public offer content does not establish direct collection access. Wiewel’s public offers page supplied a current explicitly dated 17-page leaflet, but exact Aaseemarkt applicability remains unreviewed. See [local-offer-view.md](local-offer-view.md) for retained private evidence and the working EDEKA candidate browser view.

| Retailer | Official Münster evidence / source | Current result |
| --- | --- | --- |
| REWE | [Roggenmarkt branch](https://www.rewe.de/marktseite/muenster/250486/rewe-markt-roggenmarkt-15-16/) | Branch offers exist; direct/browser 403 observed |
| EDEKA | [Aegidiimarkt 074601](https://www.edeka.de/maerkte/074601/) | Implemented four-resource leaflet collector succeeds |
| Lidl | [Münster branches](https://www.lidl.de/s/de-DE/filialen/muenster/) | Regional leaflet applicability requires selected branch |
| ALDI Nord | [Münsterstraße 40–42, 48167](https://www.aldi-nord.de/filialen-und-oeffnungszeiten/filialen-und-oeffnungszeiten/muenster/muensterstrasse-40-42/3181366.html) | Public entry 200; price extraction pending |
| Netto Marken-Discount | [Wolbecker Straße branch 5345](https://www.netto-online.de/filialen/muenster/wolbecker-str-220-226/5345) | Public entry 200; separate branch and online offers |
| PENNY | [Münster city list](https://www.penny.de/marktsuche/nordrhein-westfalen/muenster) | Public entry 200; selected Hansaring branch is 1775002 |
| HIT | [Local offers](https://www.hit.de/maerkte/muenster/angebote) | Public entry 200; [dated prospects](https://www.hit.de/maerkte/muenster/prospekte) are a useful next adapter |
| Marktkauf | [Loddenheide](https://marktkauf-loddenheide.de/) | Public entry 200; local deals and conditions |
| SuperBioMarkt | [Official markets](https://www.superbiomarkt.de/unsere-maerkte/) | Münster locations; public entry 200 |
| Denns | [Hammer Straße 39](https://www.biomarkt.de/muenster-hammer-str-39/marktseite/) | Public entry 200; complete local price source unverified |
| Mix Markt | [Official Münster branch 317](https://www.mixmarkt.eu/de/germany/maerkte/317/) | Local international grocer; source adapter pending |
| Asia Hua Xin | [Local address](https://huaxinsupermarkt.de/impressum/) and [public shop](https://huaxinsupermarkt.de/der-laden/) | Product prices visible; online-to-shelf equivalence unverified |
| Aries Feinkost | [Official site](https://www.aries-feinkost.de/) | Local international assortment; price extraction unverified |
| K+K | [Official site](https://www.klaas-und-kock.de/) | Exact Münster branch not established in this bounded official-source review |
| Combi | [Market finder](https://www.combi.de/unseremaerkte/marktsuche) | [Emsdetten](https://www.combi.de/marktauswahl/Emsdetten) is a wider-region candidate; Münster city branch unconfirmed |
| Kaufland | [Official branch service](https://filiale.kaufland.de/) | Exact Münster NRW branch unconfirmed |
| Alnatura | [Official finder](https://www.alnatura.de/marktfinder) | Distinguish own markets from partner products and delivery references; own Münster branch unconfirmed |

Unconfirmed is not absent. Exclude false geographic matches: Münsterstraße in Vechta/Ibbenbüren is not a Münster NRW location; Munster in Lower Saxony is a different city. HTTP 200 confirms access to an entry page, not availability of product data or permission to republish it. No freely documented official whole-inventory price API was established for these chains in this pass.

## Delivery sources

| Service | Official source | Current result |
| --- | --- | --- |
| Wolt / Flink Berliner Platz | [Public venue listing](https://wolt.com/de/deu/munster/venue/de-mus-zent) | Implemented collector succeeds: 21 distinct priced listings, two duplicate occurrences removed |
| Flink direct | [Public shop](https://www.goflink.com/de-DE) | Münster presence established via Wolt; direct address-scoped catalogue unverified |
| Lieferando | [Münster groceries](https://www.lieferando.de/lieferdienst/muenster/lebensmittel), [Flink menu](https://www.lieferando.de/speisekarte/flink-demuszent) | Public merchant discovery; direct menu request returned 403 |
| Picnic | [Official Münster service](https://picnic.app/de/locations/muenster/) | Public entry 200; app catalogue and address eligibility need verification |
| flaschenpost | [Food catalogue](https://www.flaschenpost.de/lebensmittel) | Public entry 200; displayed prices depend on location. Münster delivery reference appears in [Alnatura's partner list](https://www.alnatura.de/de-de/ueber-uns/alnatura-produkte-online-kaufen/) |
| REWE delivery | [Official delivery service](https://www.rewe.de/service/lebensmittel-lieferservice/) | Address, slot, fees and basket applicability unresolved |
| Knuspr | [Official service FAQ](https://www.knuspr.de/de-DE/seite/faq) | Münster service not established; exclude pending evidence |
| Bringmeister | No verified official Münster source | Exclude pending evidence |

[Wolt retail APIs](https://developer.wolt.com/docs/getting-started/retail) require participating merchant onboarding/credentials. This is not a verified public cross-merchant catalogue API. EDEKA's gateway likewise requires requesting access. Account creation is unnecessary for the two implemented public collectors. A login-only trial would need a designated project account/email or phone and its ordinary verification; no account was created or private identity submitted in this pass.

## Implemented public listing scrape

```bash
cd prototype
npm run delivery:capture -- --out local-data/NEW_WOLT_CAPTURE
```

The collector performs one GET to the exact public Münster Flink venue page, rejects redirects/HTTP denial, caps HTML at 2 MiB and uses a 25-second timeout. It reads the embedded JSON used to render that page; it does not call undocumented app endpoints, execute page scripts or copy unrelated query data into the projection. Venue/city/country/currency must match. Duplicate conflicting listing identities fail closed. Original source and allowlisted listing projection have byte hashes and timestamps and are written exclusively into a new private local-data directory.

The actual capture retains 21 unique listings under `local-data/wolt-flink-capture-v1`. Integer-cent listing prices are source values, not certified checkout totals. Pack quantities/basis, Pfand review, product constraints, active validity, address serviceability and total fees remain unknown. Bundles can have misleading displayed unit quantities; never automatically infer their pack size. The page describes a virtual store; no walk-in branch or shelf-price equivalence is inferred. The projection omits barcode, stock counters, session and telemetry fields. Full inventory and ranking remain disabled; retailer/platform reuse rights are not established.

## Radius discovery

```bash
npm run shops:discover -- --radius-km 10 --out local-data/NEW_SHOP_DISCOVERY.json
```

The new bounded OpenStreetMap/Overpass adapter searches supermarket, convenience, grocery, greengrocer and health-food tags around the existing public Münster centre (51.96236, 7.62571). Radius is configurable up to 25 km. It supports node points and way/relation centres, projects public names/addresses, deduplicates OSM identities and labels straight-line distances. Map points are not pedestrian entrances or verified active shops. Data retain OpenStreetMap attribution and ODbL; no store completeness or inventory claim is enabled.

The live 10 km requests failed at documented public instances with 500/504 service errors. Collection stopped; no successful city shop inventory or shop count was recorded. A failed discovery response never becomes an empty complete list. Another successful run can supply candidate locations for official branch reconciliation; the existing three reviewed-address registry records remain preserved. Raw captures and access diagnostics remain ignored.

## Work order

1. Use the working EDEKA leaflet and Wolt delivery listing as separate source streams; finish constrained product/pack/condition review.
2. Prioritize the neighbourhood pilot: resolve Wiewel Aaseemarkt leaflet applicability and retry REWE Geiststraße only through ordinary accessible public sources. Netto’s selected branch currently denies direct access. HIT, PENNY, Marktkauf and other sources follow after the small branch/display flow is repeatable. Leaflet extraction needs visual review.
3. Re-run bounded location discovery when its public service recovers; reconcile candidate addresses against official branches. Do not scrape every page merely because a map found a location.
4. Evaluate address-scoped delivery catalogues. Compare delivered checkout totals only once delivery/service/small-order fees, minimum spend, discounts and address applicability are known. Unknown fees never default to zero; walking effort belongs to in-person trips.
5. Assess specific login-only sources if public sources leave a meaningful coverage gap. Preserve credentials privately and use a designated project identity. Consumer accounts do not resolve missing partner access or complete shelf data.

Every retailer needs source-specific matching, refresh checks and maintenance. Broader discovery is feasible; universal full inventory through a single scrape is not established. The earlier engineering estimate remains conditional on usable evidence; this larger source programme is additional scope and has no verified completion date.
