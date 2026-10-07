# Inspect a local observation audit

1. Open the prototype with its local server, or open `preview.html` with the adjacent `styles.css` present.
2. Find **Read your price audit** below the fictional basket results.
3. Choose the audit JSON produced by the project's audit command from your `local-data` folder. Files are limited to 2 MiB and 300 observations.
4. Read the recomputed record, product-code and provider-location counts, observation dates, missing fields and freshness window. Freshness is relative to the imported report's reference day, not today's date. Retrieval totals and truncation are declarations in the file, not independently authenticated.
5. Use **Clear inspection** to remove the view and release the selected file from the input.

The file is read locally. This panel performs no upload or network request and does not save audit data in local storage. It displays only the validated aggregate view, without owners, raw identifiers, receipt images or proof links. It never adds imported records to the shopping list, demo offers or basket rankings.

Historical observations do not confirm current prices or stock. Product codes are not shopping-list coverage, and provider location identifiers are not verified supermarket branches. An invalid or oversized file leaves the aggregate view empty and shows a static error. Selecting a different file or clearing the view prevents an older outstanding read from restoring obsolete results.

After changing canonical modules, rebuild the offline snapshot with `npm run preview` from `prototype`. The preview uses the same parser and coverage code in isolated scopes; it still requires the adjacent stylesheet. DOM-stub checks cover logic, not visual browser verification.
