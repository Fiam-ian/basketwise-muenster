# First useful real-data app

Planning date: 7 October 2026. Scope: a small Münster staple basket, acceptable product alternatives, two reviewed shops, whole-pack checkout estimates using explicitly historical prices. Complete inventories, current shelf-price promises and verified walking routes are separate milestones.

## Observed data constraint

A bounded 3 km query covering 9 July–7 October returned 77 observations, 71 distinct product codes and four provider locations, without retrieval truncation. The pool is dominated by one Lidl location; other locations include a hardware retailer. Thus four locations do not establish four suitable supermarkets. Only 22 observations fall in the recent 14-day window.

Private metadata triage finds possible plain pasta, rolled oats and carbonated water candidates, but no apparent dairy milk, eggs or tomatoes for the six-line starter request. These are unreviewed candidates, not certified matches or proof that stores lack those products. The broader pool does not supply comparable complete baskets at two supermarkets. Source product metadata also changed between retained reports; snapshots must be preserved.

The offline database has actually imported this pool as 77 observations, 71 product identities and four unreviewed locations. Zero products are reviewed; rankings remain disabled. Raw reports, checklists and database remain private under local-data. Aggregate counts do not authenticate price evidence or branch inventory.

## Conditional effort estimate

One focused developer, using accessible sources and roughly six reviewed staples at two shops:

| Work | Estimated effort |
| --- | --- |
| Catalogue contract and local aggregation | 1–2 engineer-days; foundation now implemented |
| Review evidence and obtain second-shop coverage | 1–3 engineer-days if evidence is available |
| Historical basket integration and usable browser flow | 2–4 engineer-days |
| Verification and release preparation | 1–2 engineer-days |
| Initial total | 5–11 focused engineer-days |

This is a planning range, not a calendar commitment or measured remaining-time forecast. Data acquisition is the largest uncertainty and can exceed the range. The foundation completed here reduces engineering work, but unsupported price coverage cannot be solved by adding database tables. A maintained current-price service needs a reliable collection/refresh source and a separate estimate after a feasibility trial.

## Next concrete milestone

Obtain and review dated branch-specific evidence for a narrow common basket at two shops; then feed eligible normalized offers into the existing whole-pack optimizer and show dates, exclusions and partial coverage in a separate historical mode. Never synthesize missing prices or silently substitute dairy/plant milk, fat percentage, dietary restrictions or a hard requested brand. No receipt upload or public sharing is authorized by this milestone.

Subsequent source trial: official branch offer pages/leaflets now take priority for an active advertised-offer slice, with historical mode retained separately. The implemented EDEKA collector obtained a current explicitly dated public leaflet and manual review found two starter-category candidates. See retailer-sources.md. This improves source feasibility but does not yet establish six-staple/two-shop coverage or justify a shorter delivery promise. An offer finder with partial coverage can be released before complete-basket recommendations once reviewed offer integration and browser validation are implemented.
