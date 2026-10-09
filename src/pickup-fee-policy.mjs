// General published terms are diagnostic evidence, never an exact branch quote.
const SOURCE_URLS = Object.freeze([
  'https://www.rewe.de/service/agb/abholservice',
  'https://www.rewe.de/service/abholservice',
]);

export function diagnosePickupFeePolicy(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Supply a pickup policy request.');
  const { merchandiseCents, firstOrder, policyApplicable, transportBoxCount } = input;
  if (!Number.isSafeInteger(merchandiseCents) || merchandiseCents < 0) throw new Error('Merchandise must be nonnegative safe integer cents, excluding Pfand and fees.');
  for (const [key, value] of Object.entries({ firstOrder, policyApplicable })) {
    if (value !== null && typeof value !== 'boolean') throw new Error(`${key} must be true, false or null.`);
  }
  if (transportBoxCount !== null && (!Number.isSafeInteger(transportBoxCount) || transportBoxCount < 0 || transportBoxCount > 20)) throw new Error('Transport box count must be null or an integer from zero to twenty.');

  let serviceFeeCents = null;
  let transportBoxDepositCents = null;
  const gaps = ['product_pfand_unresolved', 'exact_branch_checkout_quote_unresolved'];
  if (policyApplicable !== true) {
    gaps.push(policyApplicable === false ? 'general_policy_not_applicable' : 'general_policy_applicability_unconfirmed');
  } else {
    if (firstOrder === true || merchandiseCents > 7000) serviceFeeCents = 0;
    else if (merchandiseCents === 7000) gaps.push('exact_7000_cent_threshold_source_conflict');
    else if (firstOrder === false) serviceFeeCents = 200;
    else gaps.push('first_order_status_unknown');

    if (transportBoxCount !== null) transportBoxDepositCents = transportBoxCount * 800;
    else gaps.push('transport_box_count_unknown');
  }
  return {
    schemaVersion: 1,
    mode: 'pickup_fee_policy_diagnostic',
    provenance: 'general_published_terms_not_branch_quote',
    termsEffectiveDate: '2025-01-01',
    sourceURLs: [...SOURCE_URLS],
    input: { merchandiseCents, firstOrder, policyApplicable, transportBoxCount },
    serviceFeeCents,
    transportBoxDepositCents,
    productDepositCents: null,
    conditions: {
      merchandiseBasis: 'excluding_product_pfand_transport_box_deposits_and_service_fees',
      applicability: 'must_confirm_branch_uses_general_terms_independent_merchants_may_use_own_terms',
      firstOrder: 'first_online_shop_order_service_fee_waived',
      threshold: 'terms_exceeds_7000_cents_marketing_from_7000_cents_exact_boundary_unresolved',
      transportBoxes: 'optional_available_transport_boxes_800_cents_each_count_requires_confirmation',
    },
    gaps,
    comparisonEligible: false,
    checkoutTotalCents: null,
  };
}
