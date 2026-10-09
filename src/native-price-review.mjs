import { createHash } from 'node:crypto';
import { parseNativeAppReport } from './native-app-data.mjs';
const fail = message => { throw new Error(message); };
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
export function bindReports(inputs) {
  if (!Array.isArray(inputs) || !inputs.length || inputs.length > 6) fail('Supply one to six reports.');
  return inputs.map(bytes => ({ sha256: digest(bytes), report: parseNativeAppReport(Buffer.from(bytes).toString('utf8')) }));
}
function selection(bound, item) {
  const source = bound.find(source => source.sha256 === item.reportSha256);
  if (!source || !Number.isInteger(item.productIndex) || !source.report.products[item.productIndex]) fail('Selection does not match a hash-bound report.');
  if (source.report.priceChannel !== 'pickup') fail('This bounded review accepts REWE pickup only.');
  if (typeof item.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.requestId) || !Number.isSafeInteger(item.requestedQuantity) || item.requestedQuantity <= 0 || !['ml', 'g', 'count'].includes(item.unit)) fail('Supply an explicit request identity, quantity and unit.');
  const product = source.report.products[item.productIndex];
  return { requestId: item.requestId, reportSha256: source.sha256, productIndex: item.productIndex, requestedQuantity: item.requestedQuantity, unit: item.unit,
    priceChannel: source.report.priceChannel, branchDisplay: source.report.branchDisplay, branchContextSha256: source.report.branchContextSha256,
    productName: product.productName, packDisplay: product.packDisplay, priceCents: product.priceCents, amountRole: 'displayed_app_amount_unreviewed', reviewedPackQuantity: null, reviewedPackUnit: null, depositCents: null, evidence: product.evidence,
    priceConflicted: product.priceConflicted, reviewAssertions: { pack: false, deposit: false, conditions: false, branch: false, validity: false, serviceFees: false }, comparisonEligible: false };
}
export function draftNativePriceReview(inputs, requests, selections) {
  const bound = bindReports(inputs);
  if (!Array.isArray(requests) || !requests.length || requests.length > 6 || !Array.isArray(selections) || !selections.length || selections.length > 6) fail('Supply one to six explicit requests and selections.');
  const identities = new Set();
  for (const request of requests) {
    // Validate demand independently, including lines omitted from selections.
    if (typeof request.requestId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(request.requestId) || identities.has(request.requestId) || !Number.isSafeInteger(request.requestedQuantity) || request.requestedQuantity <= 0 || !['ml', 'g', 'count'].includes(request.unit)) fail('Invalid or duplicate request.');
    identities.add(request.requestId);
  }
  const selected = selections.map(item => selection(bound, item));
  const used = new Set();
  for (const item of selected) {
    const request = requests.find(request => request.requestId === item.requestId);
    if (!request || used.has(item.requestId) || request.requestedQuantity !== item.requestedQuantity || request.unit !== item.unit) fail('Selection demand differs from the explicit request.');
    used.add(item.requestId);
  }
  return { schemaVersion: 1, mode: 'native_price_review_draft', priceChannel: 'pickup', reportSha256: bound.map(source => source.sha256), requests: requests.map(({ requestId, requestedQuantity, unit }) => ({ requestId, requestedQuantity, unit })), selections: selected, comparisonEligible: false };
}
export function auditNativePriceReview(inputs, review) {
  if (review?.schemaVersion !== 1 || review.mode !== 'native_price_review_draft' || review.priceChannel !== 'pickup' || review.comparisonEligible !== false) fail('Unsupported review or channel.');
  const expected = draftNativePriceReview(inputs, review.requests, review.selections);
  if (JSON.stringify(review.reportSha256) !== JSON.stringify(expected.reportSha256)) fail('Report bytes or order changed.');
  const lines = expected.selections.map((item, index) => {
    const supplied = review.selections[index];
    for (const key of ['priceChannel', 'branchDisplay', 'branchContextSha256', 'productName', 'packDisplay', 'priceCents', 'amountRole', 'evidence', 'priceConflicted', 'reviewedPackQuantity', 'reviewedPackUnit', 'depositCents']) if (JSON.stringify(supplied[key]) !== JSON.stringify(item[key])) fail('Commercial selection or evidence changed.');
    if (supplied.comparisonEligible !== false) fail('Review cannot grant comparison eligibility.');
    const gaps = ['pack_quantity_and_basis', 'deposit_treatment', 'price_role_and_conditions', 'independent_branch_applicability', 'explicit_validity_or_observation_policy', 'pickup_service_fees'];
    if (item.priceConflicted) gaps.push('conflicting_amounts');
    const assertions = supplied.reviewAssertions;
    if (!assertions || Object.keys(item.reviewAssertions).some(key => typeof assertions[key] !== 'boolean')) fail('Invalid review assertions.');
    return { requestId: item.requestId, reportSha256: item.reportSha256, productIndex: item.productIndex, gaps, manualAssertions: Object.fromEntries(Object.keys(item.reviewAssertions).map(key => [key, assertions[key]])), assertionsIndependentlyVerified: false, comparisonEligible: false };
  });
  const omittedRequests = expected.requests.filter(request => !lines.some(line => line.requestId === request.requestId)).map(request => request.requestId);
  return { schemaVersion: 1, mode: 'native_price_review_audit', priceChannel: 'pickup', requiredRequestCount: expected.requests.length, selectedRequestCount: lines.length, omittedRequests, lines, completeBasket: false, comparisonEligible: false, totalsComputed: false, rankingComputed: false, note: 'Manual flags are assertions. Raw pack wording, capture timestamps and branch context do not independently resolve evidence gates.' };
}
