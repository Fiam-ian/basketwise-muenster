# Acceptance gates for the first real-data Münster pilot

The static demo remains fictional. Real source observations, verified store metadata, and walking-route evidence belong in separate adapters and audits until their gates pass. This document sets acceptance criteria; it does not claim that current Münster coverage or route availability has been verified.

## Release only the capability supported by the evidence

| Capability | Required evidence | Permitted claim |
| --- | --- | --- |
| Source and coverage audit | Reproducible source records, verified branch identity, explicit exclusions and coverage denominators | Which requested items have usable evidence; no basket recommendation is required |
| Historical observed-price basket | Every priced line has eligible dated receipt or shelf evidence at the applicable branch, known quantities and price conditions, and a disclosed freshness policy | Estimated checkout cost using observed prices, with observation dates and missingness; no claim of current or future validity |
| Active-price complete basket | Every requested line has eligible source evidence explicitly valid for the selected shopping date, branch applicability, reviewed product matching, known Pfand and resolved conditions | Lowest compared complete basket within the disclosed product, source and shop scope |
| Trip satisfying a walking budget | Complete pedestrian route evidence for every required leg, including return home, with known route distance and disclosed duration assumptions | Within the routed distance budget; walking time remains an estimate |

Failure of one capability gate does not prevent publishing an honest coverage audit or a clearly labelled estimate. Zero eligible price evidence means coverage is unknown or unavailable for that request; it does not establish that a shop lacks the product. Missing lines never contribute zero to a complete basket.

The next observation audit profiles provider records, dates, identifiers, missing fields and retrieval truncation. It does not authenticate branches or match requested shopping-list lines. Observation counts and distinct product-code counts must therefore remain separate from basket coverage. The gates above are requirements for later capabilities, not functionality already established by that audit.

## Price and matching requirements

- Record the source URL or evidence identifier, observation date, retrieval timestamp, applicability, original pack quantity, unit/basis, price, Pfand, and conditions. Preserve the original captured record and record transformations. Retrieval time must never substitute for advertised validity or observation time.
- Establish the branch using an official address or another verified store identifier. Document coordinate provenance separately; proximity to a map point alone does not authenticate an observation's shop.
- Active offers require explicit validity bounds covering the shopping date. Historical observations have no inferred validity bounds. A recently fetched historical price remains a historical observation.
- Historical freshness cutoffs are configurable heuristics, not guarantees of price stability. Show the cutoff, observation dates, age at the requested date, exclusion reasons, and whether an estimated basket mixes observation dates. Exclude impossible future observation dates; do not extrapolate an active discount beyond its validity.
- Before historical basket ranking, define latest-observation precedence for the same branch/product/pack/conditions. Older evidence cannot win merely because its price was lower. Conflicting prices at the same identity and observation time need review or exclusion. This is a future matching requirement; the observation profile itself does not resolve these conflicts or compute basket totals.
- Product equivalence must respect named brands, hard dietary constraints, category, and compatible quantity units/basis. Net and drained weight are not interchangeable. Unknown restrictions, deposits, quantities, or unresolved matches exclude a line from strict active comparison.
- Price actual whole packs. Show excess quantity, merchandise subtotal, refundable deposit, and checkout total. Membership prices require explicit opt-in; uncertain conditions remain excluded. The prototype compares one product per item, rather than all possible mixtures of pack sizes or basket promotions.
- An audit records the exact requested items and quantities, shopping date, mode, branch set and eligibility policy. Coverage counts matched requested lines, with exclusions recorded separately from absent evidence. Report any unpriced required items alongside partial baskets.

## Route and location requirements

- Define search radius explicitly. A straight-line origin-to-shop radius is useful discovery geometry, but is not a walking-distance guarantee.
- A geometric home → shop(s) → home estimate must keep its estimate label. Applying a nominal walking speed does not produce a verified pedestrian route or a guaranteed walking time. Streets, barriers, access restrictions and route endpoint snapping can change the trip.
- For routed trips, validate every leg, the shop visitation order, the return leg, origin/endpoint correspondence, and that returned totals match the legs. Record provider, walking mode, routing date and endpoint adjustments. Unaccounted connections or absent legs mean route coverage is incomplete.
- A missing, failed or unsupported routing response means walking feasibility is unknown. Do not silently replace it with geometry while retaining a routed or within-budget claim. Do not assert a universal geometric lower bound without stating and satisfying its assumptions.
- Ranking baskets by cost remains separate from the user's effort decision. Do not silently monetise walking time. A straight-line shortlist can remain visible, provided it is not presented as verified walking eligibility.

## Pilot evidence to collect before enabling live recommendations

Use a small, versioned basket of staple categories and a documented central Münster branch set. Run both active-offer and observation audits, report coverage and exclusions, and manually review source applicability and product matching. Check a small number of whole-pack basket calculations against source records. These are feasibility measurements, not invented savings or stock checks.

Routine matching, audit format, route-boundary handling, and adapter implementation are autonomous project decisions. Seek user input for paid services or credentials, public receipt sharing or other privacy-model changes, and material changes to the intended grocery-trip promise. No paid service, receipt upload, account requirement or public sharing of private shopping data is needed for this milestone.
