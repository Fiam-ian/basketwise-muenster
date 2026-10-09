# REWE pickup fee policy review — 9 October 2026

The [official Metzer Straße branch page](https://www.rewe.de/marktseite/muenster-geist/1940219/rewe-markt-metzer-str-62-64/)
identifies REWE Markt GmbH as operator and advertises pickup service. That
supports applying the general published policy to this branch, through an
explicit operator review. It does not authenticate product applicability or
provide a selected-slot quote. The separately retained app header remains
capture-session context.

The [general pickup terms](https://www.rewe.de/service/agb/abholservice),
dated 1 January 2025, describe a €2 service fee from the second online-shop
order, with exemption when merchandise excluding deposits and fees exceeds
€70. The [service page](https://www.rewe.de/service/abholservice/)
advertises exemption from €70 and no first-order fee. At exactly €70 those
wordings differ; keep that boundary unresolved unless a first-order exemption
is independently established. Independent merchants can use their own terms.

Section 6.3 specifies an €8 deposit per available transport box borrowed.
Box count remains a separate unknown until explicitly chosen or quoted;
absence of an amount in the basket does not imply zero. Product Pfand is a
different field and is not resolved by these transport terms. A new account
does not establish first-order promotional eligibility.

`src/pickup-fee-policy.mjs` provides a bounded policy diagnostic, with explicit
applicability, first-order status and box count. It preserves unknowns and the
threshold discrepancy and cannot emit a checkout total or grant comparison
eligibility. Synthetic tests cover the threshold, merchant applicability,
first-order uncertainty, box count and invalid inputs.

Official pages were reviewed through the web tool. A direct REWE HTML request
returned 403 and was stopped; no exact HTML hash is claimed for that source.
The private quote-bound diagnostic retains the operator review separately and
leaves first-order status and box count unknown. No reservation, order or payment
was made. General policy knowledge is separate from the pre-slot basket sum.
