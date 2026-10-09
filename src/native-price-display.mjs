/** Display explicit price roles without granting checkout eligibility. */
export function nativePriceDisplay(candidate, priceChannel) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) throw new TypeError('Price candidate required');
  const amount = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  if (priceChannel === 'lidl_app_guest_offers') {
    const primaryCents = amount(candidate.normalPriceCents);
    return {
      primaryLabel: primaryCents == null ? 'Price needs review' : 'Ordinary offer amount',
      primaryCents,
      loyaltyCents: amount(candidate.lidlPlusPriceCents),
      referenceCents: amount(candidate.referencePriceCents)
    };
  }
  const primaryCents = amount(candidate.priceCents);
  return { primaryLabel: primaryCents == null ? 'Price needs review' : 'Captured amount', primaryCents, loyaltyCents: null, referenceCents: null };
}
