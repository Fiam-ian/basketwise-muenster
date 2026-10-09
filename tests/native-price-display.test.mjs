import test from 'node:test';
import assert from 'node:assert/strict';
import { nativePriceDisplay } from '../src/native-price-display.mjs';
const channel = 'lidl_app_guest_offers';
test('Lidl ordinary, loyalty and reference amounts remain separate', () => {
  assert.deepEqual(nativePriceDisplay({ priceCents: null, normalPriceCents: 321, lidlPlusPriceCents: 234, referencePriceCents: 543 }, channel), { primaryLabel: 'Ordinary offer amount', primaryCents: 321, loyaltyCents: 234, referenceCents: 543 });
});
test('missing ordinary amount never falls back to loyalty, reference or canonical price', () => {
  assert.deepEqual(nativePriceDisplay({ priceCents: 321, normalPriceCents: null, lidlPlusPriceCents: 234, referencePriceCents: 543 }, channel), { primaryLabel: 'Price needs review', primaryCents: null, loyaltyCents: 234, referenceCents: 543 });
});
test('unknown, invalid and fractional amounts are not zero', () => {
  for (const value of [null, undefined, '321', -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.equal(nativePriceDisplay({ normalPriceCents: value }, channel).primaryCents, null);
  assert.equal(nativePriceDisplay({ normalPriceCents: 0 }, channel).primaryCents, 0);
});
test('REWE and ALDI preserve captured amount without exposing foreign price roles', () => {
  for (const priceChannel of ['pickup', 'aldi_app_unmapped_branch']) assert.deepEqual(nativePriceDisplay({ priceCents: 321, normalPriceCents: 456, lidlPlusPriceCents: 234, referencePriceCents: 543 }, priceChannel), { primaryLabel: 'Captured amount', primaryCents: 321, loyaltyCents: null, referenceCents: null });
});
test('ordinary channels also retain unknown price and invalid candidates fail', () => {
  assert.equal(nativePriceDisplay({ priceCents: null }, 'pickup').primaryCents, null);
  for (const value of [null, [], undefined]) assert.throws(() => nativePriceDisplay(value, channel), TypeError);
});
