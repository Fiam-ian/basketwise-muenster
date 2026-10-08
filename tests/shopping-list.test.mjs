import test from 'node:test';
import assert from 'node:assert/strict';
import { GROCERY_INTENTS, searchGroceryIntents, createShoppingRequest,
  addShoppingRequest, removeShoppingRequest, shoppingRequestLabel,
  findShoppingCandidateLeads } from '../src/shopping-list.mjs';

test('bounded catalogue searches German and English grocery requests', () => {
  assert.equal(GROCERY_INTENTS.length, 6);
  assert.deepEqual(searchGroceryIntents('HAfer').map(item => item.id), ['oats']);
  assert.deepEqual(searchGroceryIntents('egg').map(item => item.id), ['eggs']);
  assert.deepEqual(searchGroceryIntents('h-milch').map(item => item.id), ['milk']);
  assert.deepEqual(searchGroceryIntents('unknown'), []);
  assert.equal(searchGroceryIntents('').length, 6);
  assert.throws(() => searchGroceryIntents('x'.repeat(101)));
});

test('milk hard preferences remain explicit and have no inferred defaults', () => {
  assert.deepEqual(createShoppingRequest('milk').constraints, {});
  const request = createShoppingRequest('milk', { quantity: 2000, brand: '  Brand A ',
    milkSource: 'cow', fatBasisPoints: 150, processing: 'uht', lactoseFree: true });
  assert.deepEqual(request, { category: 'milk', quantity: 2000, unit: 'ml',
    constraints: { brand: 'Brand A', milkSource: 'cow', fatBasisPoints: 150, processing: 'uht', lactoseFree: true } });
  assert.match(shoppingRequestLabel(request), /1\.5% fat/);
  assert.match(shoppingRequestLabel(request), /UHT/);
  assert.throws(() => createShoppingRequest('milk', { fatBasisPoints: 15 }));
  assert.throws(() => createShoppingRequest('milk', { milkSource: 'oat' }));
  assert.throws(() => createShoppingRequest('pasta', { processing: 'uht' }));
  assert.throws(() => createShoppingRequest('milk', { organic: 'yes' }));
});

test('merge only equivalent requests and never mutate the original list', () => {
  const milk = createShoppingRequest('milk', { fatBasisPoints: 150 });
  const initial = [milk];
  const merged = addShoppingRequest(initial, milk);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].quantity, 2000);
  assert.equal(initial[0].quantity, 1000);
  let list = merged;
  for (const options of [{ fatBasisPoints: 350 }, {}, { fatBasisPoints: 150, processing: 'fresh' },
    { fatBasisPoints: 150, brand: 'Brand A' }, { fatBasisPoints: 150, brand: 'Brand B' },
    { fatBasisPoints: 150, organic: false }, { fatBasisPoints: 150, organic: true }]) {
    list = addShoppingRequest(list, createShoppingRequest('milk', options));
  }
  assert.equal(list.length, 8);
  const ordered = createShoppingRequest('milk', { processing: 'uht', fatBasisPoints: 150 });
  assert.equal(addShoppingRequest([ordered], createShoppingRequest('milk', { fatBasisPoints: 150, processing: 'uht' })).length, 1);
  assert.equal(removeShoppingRequest(list, 0).length, 7);
  assert.equal(list.length, 8);
  assert.throws(() => removeShoppingRequest(list, -1));
});

test('quantities, request units, unknown constraints and overflow fail closed', () => {
  for (const quantity of [null, 0, -1, 1.5, NaN, Infinity, '500', 1000001]) {
    assert.throws(() => createShoppingRequest('eggs', { quantity }));
  }
  assert.throws(() => createShoppingRequest('unknown'));
  assert.throws(() => createShoppingRequest('milk', { mysterious: true }));
  const full = createShoppingRequest('water', { quantity: 1000000 });
  assert.throws(() => addShoppingRequest([full], createShoppingRequest('water')));
  assert.throws(() => addShoppingRequest([], { ...full, unit: 'g' }));
  assert.throws(() => addShoppingRequest([], { ...full, constraints: { quantity: 2 } }));
});

test('category leads never assert requested equivalence, eligibility or quantity coverage', () => {
  const candidate = { id: 'milk1', category: 'milk', productName: '3.5% Brand B',
    fatBasisPoints: 350, comparisonEligible: false };
  const reports = [{ storeId: 'store-a', storeName: 'Store A', leafletId: 'primary', candidates: [candidate,
    { id: 'pasta', category: 'pasta' }] }];
  const leads = findShoppingCandidateLeads(reports,
    createShoppingRequest('milk', { fatBasisPoints: 150, brand: 'Brand A' }));
  assert.equal(leads.length, 1);
  assert.equal(leads[0].candidate, candidate);
  assert.equal(leads[0].categoryLead, true);
  assert.equal(leads[0].equivalenceVerified, false);
  assert.equal(leads[0].comparisonEligible, false);
  assert.deepEqual(findShoppingCandidateLeads(reports, createShoppingRequest('eggs')), []);
  assert.throws(() => findShoppingCandidateLeads([...reports, ...reports], createShoppingRequest('milk')));
  assert.throws(() => findShoppingCandidateLeads([{ ...reports[0], mode: 'demo' }], createShoppingRequest('milk')));
});

import { inspectShoppingListCoverage } from '../src/shopping-list.mjs';
const coverageReport = (storeId, leafletId = 'supplement') => ({ storeId, storeName: storeId, leafletId,
  rankingEnabled: false, inventoryComplete: false, validFrom: '2026-10-05', validTo: '2026-10-10',
  candidates: [{ id: 'milk', category: 'milk', unit: 'ml', fatBasisPoints: 350, depositCents: null }] });
test('actual list coverage aggregates publications once per branch and preserves distinct milk constraints', () => {
  const reports = [coverageReport('a'), coverageReport('b'), coverageReport('b', 'primary')];
  const list = [createShoppingRequest('milk', { fatBasisPoints: 150 }), createShoppingRequest('milk', { fatBasisPoints: 350 }), createShoppingRequest('eggs')];
  const coverage = inspectShoppingListCoverage(reports, list, '2026-10-08');
  assert.equal(coverage.branches.length, 2);
  assert.equal(coverage.rows.length, 3);
  assert.equal(coverage.rows[0].branches[1].candidateCount, 2);
  assert.equal(coverage.rows[0].branches[1].knownConflictCount, 2);
  assert.equal(coverage.rows[1].branches[1].knownConflictCount, 0);
  assert.equal(coverage.rows[2].branches[1].candidateCount, 0);
  assert.ok(coverage.branches.every(branch => branch.requestedLineCount === 3 && branch.linesWithCategoryLeads === 2 && branch.complete === false));
  assert.equal(coverage.rankingEnabled, false);
});
test('outside-period category leads do not count as active and unknown attributes remain exclusions', () => {
  const coverage = inspectShoppingListCoverage([coverageReport('a')], [createShoppingRequest('milk', { brand: 'A', milkSource: 'cow', processing: 'fresh' })], '2026-10-11');
  const row = coverage.rows[0];
  assert.equal(row.branches[0].withinPeriodCount, 0);
  assert.ok(row.leads[0].reasons.includes('outside_recorded_period'));
  assert.ok(row.leads[0].reasons.includes('deposit_unknown'));
  assert.ok(row.leads[0].reasons.includes('required_brand_unverified'));
  assert.ok(row.leads[0].reasons.includes('required_attribute_unverified:milkSource'));
  assert.equal(row.branches[0].comparisonEligibleCount, 0);
});
test('coverage rejects impossible dates, duplicate publications and eligibility promotion', () => {
  const report = coverageReport('a');
  assert.throws(() => inspectShoppingListCoverage([report], [], '2026-02-30'));
  assert.throws(() => inspectShoppingListCoverage([report, report], [], '2026-10-08'));
  assert.throws(() => inspectShoppingListCoverage([{ ...report, rankingEnabled: true }], [], '2026-10-08'));
});
