import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnosePickupFeePolicy } from '../src/pickup-fee-policy.mjs';

const request = overrides => ({ merchandiseCents: 5000, firstOrder: false, policyApplicable: true, transportBoxCount: 0, ...overrides });

test('confirmed general terms resolve first-order and second-order fees below threshold', () => {
  assert.equal(diagnosePickupFeePolicy(request()).serviceFeeCents, 200);
  assert.equal(diagnosePickupFeePolicy(request({ firstOrder: true })).serviceFeeCents, 0);
  const unknown = diagnosePickupFeePolicy(request({ firstOrder: null }));
  assert.equal(unknown.serviceFeeCents, null);
  assert.ok(unknown.gaps.includes('first_order_status_unknown'));
});

test('threshold boundary preserves the discrepancy between terms and marketing', () => {
  assert.equal(diagnosePickupFeePolicy(request({ merchandiseCents: 6999 })).serviceFeeCents, 200);
  for (const firstOrder of [false, null]) {
    const result = diagnosePickupFeePolicy(request({ merchandiseCents: 7000, firstOrder }));
    assert.equal(result.serviceFeeCents, null);
    assert.ok(result.gaps.includes('exact_7000_cent_threshold_source_conflict'));
  }
  assert.equal(diagnosePickupFeePolicy(request({ merchandiseCents: 7000, firstOrder: true })).serviceFeeCents, 0);
  for (const firstOrder of [true, false, null]) assert.equal(diagnosePickupFeePolicy(request({ merchandiseCents: 7001, firstOrder })).serviceFeeCents, 0);
});

test('independent merchant or unknown applicability prevents assuming general fees or deposits', () => {
  for (const policyApplicable of [false, null]) {
    const result = diagnosePickupFeePolicy(request({ policyApplicable, firstOrder: true, transportBoxCount: 2 }));
    assert.equal(result.serviceFeeCents, null);
    assert.equal(result.transportBoxDepositCents, null);
    assert.ok(result.gaps.some(gap => gap.startsWith('general_policy_')));
  }
});

test('only an explicit box count resolves box deposits, separately from product Pfand', () => {
  assert.equal(diagnosePickupFeePolicy(request()).transportBoxDepositCents, 0);
  assert.equal(diagnosePickupFeePolicy(request({ transportBoxCount: 2 })).transportBoxDepositCents, 1600);
  assert.equal(diagnosePickupFeePolicy(request({ transportBoxCount: 20 })).transportBoxDepositCents, 16000);
  const unknown = diagnosePickupFeePolicy(request({ transportBoxCount: null }));
  assert.equal(unknown.transportBoxDepositCents, null);
  assert.ok(unknown.gaps.includes('transport_box_count_unknown'));
  assert.equal(unknown.productDepositCents, null);
});

test('policy results cannot become a checkout quote or grant comparison eligibility', () => {
  const result = diagnosePickupFeePolicy(request({ firstOrder: true }));
  assert.equal(result.checkoutTotalCents, null);
  assert.equal(result.comparisonEligible, false);
  assert.equal(result.provenance, 'general_published_terms_not_branch_quote');
  assert.equal(result.sourceURLs.length, 2);
  assert.ok(result.gaps.includes('product_pfand_unresolved'));
  assert.ok(result.gaps.includes('exact_branch_checkout_quote_unresolved'));
  assert.equal(diagnosePickupFeePolicy(request({ merchandiseCents: Number.MAX_SAFE_INTEGER })).serviceFeeCents, 0);
});

test('reject invalid, missing, unsafe and coercible policy inputs', () => {
  for (const input of [undefined, null, [], 'request']) assert.throws(() => diagnosePickupFeePolicy(input));
  for (const merchandiseCents of [-1, 1.5, '5000', NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, undefined]) assert.throws(() => diagnosePickupFeePolicy(request({ merchandiseCents })));
  for (const key of ['firstOrder', 'policyApplicable']) for (const value of [undefined, 0, 1, 'true', {}]) assert.throws(() => diagnosePickupFeePolicy(request({ [key]: value })));
  for (const transportBoxCount of [undefined, -1, 21, 1.5, '0', Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => diagnosePickupFeePolicy(request({ transportBoxCount })));
});
