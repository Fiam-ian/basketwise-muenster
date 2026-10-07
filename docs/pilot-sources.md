# Source check: Münster pilot branches — 7 October 2026

Status note (2026-10-07 WSL continuation): execution-limit and pending-check statements below describe the original session. Native tests, bounded browser checks, raw-audit inspection and public source release subsequently completed; see [current status](current-status.md), [WSL verification](wsl-verification.md) and [context reconciliation](context-reconciliation.md). Live walking, real product/pack eligibility and current-price coverage remain gated.

An address-only registry is saved in data/muenster-stores.json. It is not imported
by the demo. Coordinates are deliberately absent; a verified address does not
establish a pedestrian entrance or a walking route.

- REWE branch 250486: Roggenmarkt 15–16, 48143 Münster.
  https://www.rewe.de/marktseite/muenster/250486/rewe-markt-roggenmarkt-15-16/
- EDEKA branch 074601: Aegidiimarkt 7, 48143 Münster.
  https://www.edeka.de/maerkte/074601/
- Lidl: Friedrich-Ebert-Str. 17, 48153 Münster.
  https://www.lidl.de/s/de-DE/filialen/muenster/friedrich-ebert-str-17/

EDEKA 074602 is Hamannplatz 2. The same business name does not authenticate the
Aegidiimarkt branch. Reviewed price imports must keep the source branch identity.

The retrieved REWE page still showed a validity ending 3 October 2026, before
the current 7 October reference day. It was not imported as current evidence.
The EDEKA Aegidiimarkt page stated an offer period of 5–10 October 2026, but
a period alone supplies no item-level prices or complete-basket coverage.
Public source visibility does not establish a full automated reuse workflow.

Attempts to fetch the Open Prices geographic API through web tooling failed.
That is an access limitation, not evidence of zero Münster observations. Run
the bounded audit from a functioning local runtime to establish what it returns.

Raw audit outputs should be stored under local-data/ (ignored by Git) and should
not be confused with publishable original code or the synthetic demo fixture.
