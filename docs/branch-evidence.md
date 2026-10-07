# Reviewed provider branch identity — 7 October 2026

Scope: map the observed provider location to an address-only pilot branch. This is separate manual evidence review; the local inspector itself does not authenticate branches.

The retained audit's allowlisted inspector output consistently associates provider location 6627 with OSM WAY 125838042, Lidl, Münster 48153, with no conflicting metadata. All 22 observations belong to that location. No proof images or contributor details were reviewed or published.

A read-only retrieval of [OSM way 125838042](https://api.openstreetmap.org/api/0.6/way/125838042) returned version 17, timestamp 2026-01-06T16:45:41Z. Allowlisted tags specify Lidl, supermarket, Friedrich-Ebert-Straße 17, 48153 Münster. The [official Lidl branch page](https://www.lidl.de/s/de-DE/filialen/muenster/friedrich-ebert-str-17/) independently names that same chain and address. Street abbreviation in the registry is normalized only for this address comparison.

Reviewed mapping: `open-prices location 6627` → `OSM WAY 125838042` → registry `lidl-friedrich-ebert-17`. Product, data/provenance and architecture roles reviewed the context reconciliation; the data council reviewed this exact identity evidence and agreed it supports the address mapping.

This establishes a reviewed public-address identity link, not authenticated file origin, receipt authenticity, independent visits, current prices or basket matches. The provider's link to OSM is retained provider metadata. Coordinates, pedestrian entrances/access legs, shopping-date hours, stock and complete-basket coverage remain unverified. Registry routing eligibility remains false.

Do not publish the fetched raw OSM XML: it includes contributor fields outside this allowlist. OSM and Open Prices retain their own attribution and ODbL provenance; MIT covers this project's original code, not their source records. Record only reviewed identity/provenance in the registry; no raw provider dataset is redistributed here.
