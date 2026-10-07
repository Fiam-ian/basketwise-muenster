# Inspect a retained historical audit locally

From `prototype` in PowerShell, reuse the bundled Node runtime:

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" .\scripts\inspect-coverage.mjs --file .\local-data\muenster-coverage-2026-10-07.json
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" --test .\tests\inspect-coverage.test.mjs
```

The inspector accepts audit files of at most 2 MiB and a version-1 audit with no more than 300 Open Prices observations. It writes nothing, performs no network calls, uploads nothing and preserves the original audit. The console prints only allowlisted metadata: provider location and OSM identifiers, public provider store name/brand/city/postcode/country, per-location observation counts/date counts and distinct proof counts. It excludes provider owner/user fields, proof identifiers and URLs/images, product codes, prices and purchase records. Errors use a generic message so malformed raw JSON is not echoed.

Share the printed summary for the next branch lookup, rather than the raw audit. Provider location metadata is a candidate identity, not verified branch identity. Conflicting location/proof identifiers are flagged; conflicting metadata versions remain visible as candidates. Missing metadata remains unknown. Distinct proofs are not necessarily independent receipts, contributors or shopping trips. A date count does not establish current price validity, stock or basket coverage. URL/email-like strings are excluded from public-name fields; input metadata is still untrusted provider content.

The successful user-executed audit reported 22 observations, 22 product codes, one location, all dated 26 September 2026, with no truncation. That evidence does not reveal the branch or distinct proof count until this local inspection runs. No raw-record inference is made from those aggregate counts.

Five authored inspector test callbacks with 25 assertions passed using retained source in V8 with minimal test/assert shims, checking aggregation, private-field exclusion, conflicts, missing metadata, invalid inputs and preservation of the original report. Actual Node test execution, CLI/file reads and user-audit inspection remain unverified until the commands are run in a working local Node runtime.
