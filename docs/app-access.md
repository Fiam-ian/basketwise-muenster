# Retailer app access and searchable lists — 8 October 2026

Our local offer page now supports six German/English searchable grocery request types, editable quantities, required brands and explicit milk source/fat/processing preferences. Identical requests merge; different hard preferences remain separate. Lists stay in tab memory, separate from imported reports; clearing sources preserves the list. No user lists or retailer credentials are published.

Imported category leads appear beneath each request, including advertised-period status and known fat conflicts. They are not verified alternatives. The fixed six-staple evidence table remains a separate source audit. No real basket total is enabled until exact product matching, pack, conditions, Pfand, date and complete-line coverage pass existing gates.

## Official access findings

- [REWE app](https://www.rewe.de/service/app/) FAQ 4 explicitly allows regional offers, recipes and shopping lists without an account. Bonus and online ordering require an account.
- [REWE app FAQ](https://www.rewe.de/service/faq-app/) describes product suggestions while adding shopping-list entries. Suggestions do not prove branch-priced inventory.
- [Pickup terms](https://www.rewe.de/service/agb/abholservice), section 5.2, allow online prices to differ from in-market prices at collection. Preserve pickup, delivery and shelf-price channels separately.
- [EDEKA app](https://www.edeka.de/services/edeka-app/) supports branch offers and loyalty features; complete searchable branch inventory was not established.

A normal isolated Chromium navigation to the official REWE shop returned HTTP 403/access challenge in this WSL environment. No account was created and no access controls bypassed. No adb, Android emulator, scrcpy or waydroid was available in the checked runtime paths. A phone guest-mode trial should select Geiststraße 2–4 and distinguish product suggestions from branch-priced listings. If an authenticated source is needed, use a designated user-controlled account and private retailer login; never collect passwords in this planner or chat.

## Verification

178 native tests passed. Chromium verified German search, equivalent-demand merging, separate milk fat requests, actual three-report leads and fat conflicts, source clearing preserving requests, and 390-pixel layout without document overflow. Mobile screenshot inspected. Source data, browser outputs and shopping lists remain private/ignored. App access and live inventory are still unverified.
