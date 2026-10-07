# First live Münster coverage audit

Reference date: 2026-10-07 (Europe/Berlin). Evidence: the user executed scripts/audit-coverage.mjs in Windows PowerShell and pasted its successful printed JSON summary into the project chat. The assistant did not independently inspect the raw response file.

The invocation used the existing CLI defaults: Münster city centre (51.96236, 7.62571), 3 km radius, EUR, a lower observation-date bound of 2026-09-24, and at most three pages of 100 records. The local evidence file is local-data/muenster-coverage-2026-10-07.json. local-data is excluded from Git.

## Reported result

- Provider total and retrieved observation count: 22.
- Distinct provider records: 22; duplicate identifiers: zero.
- Distinct location identifiers: one.
- Distinct product codes: 22.
- Earliest and latest observation date: 2026-09-26.
- All 22 records fall in the report's fourteen-calendar-date recent window.
- No missing values were counted in the report's required identifier/date/price/currency/proof/pack fields.
- No older, future, missing-date or invalid-date records were counted.
- The provider response was not truncated under the configured audit bounds.

## Wider-radius comparison

The user subsequently ran the same audit with --radius-km 10 and an explicit --since 2026-09-24, saving local-data/muenster-coverage-10km-2026-10-07.json. Its pasted summary also reports 22 observations, one distinct location identifier, 22 distinct product codes, all observation dates 2026-09-26, providerTotal 22, and truncated false. Other reported freshness and missing-field counts match the 3 km summary.

Increasing the radius did not add records or locations according to these aggregate summaries. The raw record identities have not been compared, so this alone does not certify that the datasets are identical. It also does not establish coverage outside the requested date window or completeness across sources. Radius expansion alone has not supplied evidence for a recent comparison between supermarkets.

## What this establishes

The CLI successfully retrieved a nonempty set of recent historical observations through the live provider. This is a separate milestone from the 71 passing Node tests, whose network calls were mocked.

## What remains unknown

One location identifier is not a verified branch identity. All observations share a date, but the summary does not establish whether they share a receipt or contributor. Present fields do not prove that prices, products, proof, units or branch applicability have been reviewed. Twenty-two product codes do not establish matching coverage for the shopping list. Prices were observed eleven days before the reference date; the report establishes neither current shelf prices nor stock availability.

The audit is geographically and temporally bounded. It does not prove that Münster generally has only one represented supermarket, or that broader or older queries would yield no other data. The app must continue to keep this evidence separate from its synthetic basket comparisons.

## Next evidence needed

Inspect the saved report locally to count distinct proofs and identify its provider location IDs without exposing owner names or proof images. Look up the public location identity and review branch mapping. A separate bounded query at a wider radius can then assess whether geographic scope is the limiting factor. Basket matching and any current-price claim require their own evidence checks.

Source: Open Prices, https://prices.openfoodfacts.org/ . Provider data retains its own attribution and ODbL provenance; the repository's MIT code license does not relicense those records.

## WSL inspection update

On 2026-10-07 the native WSL inspector read the retained actual report. Location 6627 contains all 22 observations and one distinct proof, all dated 2026-09-26. Provider metadata labels it Lidl, Münster 48153, OSM way 125838042, without establishing branch authentication. Both radius reports have identical raw records and provider ID sets; their observation wrappers differ only in capturedAt. Earlier statements that raw reports had not been inspected describe the prior Windows handoff. See wsl-verification.md for the completed checks and limitations.
