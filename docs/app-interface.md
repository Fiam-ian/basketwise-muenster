# Product-first app interface — 8 October 2026

The primary local entry now opens the Basketwise app shell. Search a product name, brand as written in its name, or German/English grocery category; choose an actual captured listing card; add it to the basket and adjust its count. Fat and pack details come from the selected listing rather than user-filled fields. Explore, Basket and Stores are separate screens with fixed bottom navigation. Original vector category art is illustrative, not product packaging.

This is an installable progressive web app with standalone display, manifest, application icons and a public-code-only service worker. It is not an APK or a verified native mobile release. A browser that supports installation can use its app/install menu (or the Stores settings install button when the browser exposes a prompt). The installed start URL is `/app.html`; its shell can reopen offline. Data and basket remain in memory and are unavailable after an offline reload until sources are reconnected/imported.

## Local sandbox

Use the project-local Node runtime, then run from `prototype`:

```sh
PORT=8013 BASKETWISE_REPORTS='["offer-view-v2.json","aaseemarkt-offer-view-v1.json","aaseemarkt-primary-offer-view-v1.json"]' npm run dev
```

Open http://127.0.0.1:8013/app.html. These three existing private projections populate the partial catalogue automatically; users do not need JSON imports to browse this sandbox. Without `BASKETWISE_REPORTS`, the source-only app starts with an empty catalogue. Optional imports remain under Stores → Local data. Source inspection and the fictional optimizer remain separately available at `offers.html` and `index.html`.

Only configured immediate-child JSON files under the real `local-data` directory may be loaded. The loader rejects links, traversal, oversized files and duplicate branch/publication reports, and projects allowlisted fields. The local `/api/catalogue` response has `no-store`; no arbitrary file endpoint exists. It rejects cross-origin requests and non-loopback Host values. The server binds only 127.0.0.1, so this setup does not expose the catalogue to a phone over LAN. Do not publish private data with the source release.

## Selection and evidence

The five retained source products come from seven branch listings. Shared publication listings merge only when their commercial fields agree; every branch's original review record stays separate. This is captured listing identity, not a verified global SKU. Different packs, prices, periods/publications or ambiguous fields must not become automatic equivalents. Selections are exact listing choices; cheaper substitutions need reviewed canonical matching before totals.

Basket quantities are counts of the selected listing; uncertain priced packs remain visibly unresolved. The basket reports selected listing coverage per imported branch and date. It computes no incomplete or unreviewed total, never transfers demo prices into a real basket, and never infers inventory/stock from leaflet data. Catalogue reload/import preserves basket selections; missing source records are labelled.
