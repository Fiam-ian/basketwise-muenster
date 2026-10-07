# Pluggendorf–Aasee neighbourhood pilot

Decision date: 8 October 2026. Start with a small, explicit set of official branch sources and expand coverage only after the first data path is repeatable. Treat this as a **branch pilot**, not a claim that every shop or product in a 1 km radius is covered.

## Initial branch set

| Branch | Address | Public source and what it gives us | Pilot role |
| --- | --- | --- | --- |
| EDEKA Rotthowe Aegidiimarkt | Aegidiimarkt 7, 48143 Münster | [Official branch page](https://www.edeka.de/maerkte/074601/) and dated local leaflet; the existing public collector works | First in-store leaflet source |
| EDEKA Wiewel Aaseemarkt | Von-Witzleben-Str. 10, 48151 Münster | [Wiewel branch list](https://wiewel.eu/unsere-maerkte.html); official EDEKA branch page identifies its local market | Second EDEKA branch, to test branch-specific leaflet selection |
| REWE Geiststraße | Geiststr. 2–4, 48151 Münster (market 565814) | [Official market page](https://www.rewe.de/marktseite/muenster/565814/rewe-markt-geiststr-2-4/) currently exposes dated offer highlights in its public page | Public-page feasibility test; retain source denial/failure as a valid result |
| Netto Marken-Discount | Weseler Str. 109, 48151 Münster (branch 6046) | [Official branch page](https://www.netto-online.de/filialen/muenster/weseler-str-109/6046) shows branch offers and prices | Fourth branch after the first two-source flow is stable |

The names in the initial suggestion need two corrections: it is **Wiewel**, and the Aaseemarkt branch is at Von-Witzleben-Str. 10. The official Netto finder places the nearby branch at Weseler Str. 109, rather than a branch named Kolde-Ring. Rotthowe has distinct Aegidiimarkt and Aegidiistraße branches; use the Aegidiimarkt branch for the first offer trial and never merge them.

These branches are a useful neighbourhood set, but the phrases “Pluggendorf,” “Aasee,” and “within 1 km” do not identify a single map centre. Keep the four as an explicit candidate list while we verify geocoded branch points and pick a public map centre. Do not mark all four as within 1 km without that check. The user’s private home address is not needed: any later radius can be centred on a public landmark or an explicitly entered location kept locally.

## What the first working version should do

Make a **dated local offer finder** for a few grocery categories and branches. Display the product/pack wording, price, unit basis when supplied, promotion conditions, retailer, branch, source date and capture time. Include a source link and label stale or ambiguous evidence. Keep advertised in-store prices separate from delivery listings and historical observations.

The first version should help find cheaper acceptable alternatives, rather than claim to mirror each supermarket’s inventory. Start with a short, user-editable basket (for example milk, eggs, tomatoes, oats and pasta). A match counts only when the required attributes and pack are explicit and reviewed. If a store has no usable offer for a requested item, say “no verified offer found”; do not say it is unavailable. Do not rank a complete basket until every required line has eligible price and pack evidence, whole-pack quantities work, and applicable Pfand is shown separately.

## Collection order

1. Use public official branch pages and downloadable weekly leaflets; capture exact source bytes, URL, retrieval timestamp, branch identity and the source’s explicit validity dates. Existing EDEKA capture is the first adapter to exercise.
2. Review extracted text/visual layout before treating item-price pairs as evidence. Keep candidates and reviewer decisions private under ignored `local-data/` until the offer model and display are implemented.
3. Try REWE’s public branch offer page and Netto’s public branch offers without an account. Record 403s, missing fields and source changes; never bypass access controls.
4. Use free retailer apps only for gaps that materially block the pilot. Select the exact market by address/postcode where supported, document any registration requirement, and store credentials outside the repository. An account does not imply a full catalogue API or permission to republish retailer content.
5. Add radius-discovered branches only after a successful, attributed map discovery run and official branch reconciliation. OSM coordinates identify map features, not necessarily pedestrian entrances or complete shop coverage.

REWE’s official app FAQ says users can choose a market by place, street or postcode and view that market’s offers. EDEKA says its free app shows offers for the chosen favourite market. That makes apps a reasonable fallback for interactive verification, but public branch web pages and leaflets are cheaper to test first and do not require creating four accounts up front.

## Expansion gate

Add the next branch only when the existing branch’s capture is repeatable and dated, product/pack evidence can be reviewed, and the UI can show the source and its limitations. Add more branches within the same small area before widening the radius; this tests retailer-specific differences without confusing area coverage with source coverage. Then widen the public radius in measured steps (for example 1 km, 2 km, 3 km), reconcile new map candidates against official sources, and report which branches actually produced eligible offers.

The pilot is useful when it reliably presents some current, traceable offers across at least two branches and clearly exposes gaps. Complete inventories, stock, full basket savings, delivery checkout totals and route-verified walking plans are later milestones. A free consumer account cannot remove those evidence requirements.
