import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, rm, stat } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { discoverShops, shopDiscoveryQuery } from '../scripts/discover-shops.mjs';
import { captureWoltListings } from '../scripts/capture-wolt-listings.mjs';

const root = fileURLToPath(new URL('../local-data/', import.meta.url));
await mkdir(root, { recursive: true });
const output = () => root + 'source-test-' + randomUUID();
const listingsHtml = () => '<script type="application/json" class="query-state">' + JSON.stringify({queries:[
  {queryKey:['venue','static','de-mus-zent','de'],state:{data:{venue:{slug:'de-mus-zent',city:'Münster',country:'DEU',currency:'EUR',name:'Synthetic delivery test'}}}},
  {queryKey:['venue-assortment','venue-content','de-mus-zent'],state:{data:{pages:[{sections:[{items:[{id:'test-item',name:'Synthetic pack',price:123,unit_info:'500 g',owner:'PRIVATE_SENTINEL'}]}]}]}}}
]}) + '</script>';

test('public delivery capture keeps raw source local and excludes unrelated fields from projected listings', async () => {
  const path = output(), calls = [];
  try {
    const summary = await captureWoltListings(path, {fetchImpl:async (url, options) => {
      calls.push(url); assert.equal(options.redirect, 'error');
      return new Response(listingsHtml(), {headers:{'content-type':'text/html; charset=utf-8'}});
    }});
    assert.equal(calls.length, 1); assert.equal(summary.listingCount, 1); assert.equal(summary.checkoutFeesKnown, false);
    const bytes = await readFile(path + '/listings.json', 'utf8'), report = JSON.parse(bytes);
    assert.equal(bytes.includes('PRIVATE_SENTINEL'), false);
    assert.equal(report.channel, 'delivery_listing'); assert.equal(report.listings[0].pack.quantity, null);
    assert.equal((await stat(path + '/listings.json')).mode & 0o777, 0o600);
    await assert.rejects(captureWoltListings(path, {fetchImpl: () => assert.fail('Existing output caused request')}));
  } finally {await rm(path, {recursive:true,force:true});}
});

test('delivery denial creates no output', async () => {
  const path = output();
  await assert.rejects(captureWoltListings(path, {fetchImpl:async () => new Response('denied',{status:403})}));
  await assert.rejects(stat(path), {code:'ENOENT'});
});

test('bounded radius discovery records provenance and leaves verification gates closed', async () => {
  const path = output();
  try {
    const summary = await discoverShops(3, path, {fetchImpl:async (url, options) => {
      assert.match(url,/^https:\/\/overpass-api\.de\/api\/interpreter\?/);
      assert.equal(options.redirect,'error');
      return new Response(JSON.stringify({elements:[{type:'node',id:1,lat:51.96236,lon:7.62571,
        tags:{shop:'supermarket',name:'Synthetic store',owner:'PRIVATE_SENTINEL'}}]}));
    }});
    assert.equal(summary.mappedCandidates,1); assert.equal(summary.discoveryComplete,false);
    const data = await readFile(path,'utf8'), report = JSON.parse(data);
    assert.equal(data.includes('PRIVATE_SENTINEL'),false);
    assert.equal(report.shops[0].distanceBasis,'straight_line_to_osm_point');
    assert.equal(report.shops[0].branchIdentityReviewed,false);
    await assert.rejects(discoverShops(3,path,{fetchImpl:() => assert.fail('Existing output caused request')}));
  } finally {await rm(path,{force:true});}
});

test('partial map responses and unbounded radii cannot become complete discovery', async () => {
  const path = output();
  await assert.rejects(discoverShops(3,path,{fetchImpl:async () => new Response(JSON.stringify({elements:[],remark:'timeout'}))}));
  await assert.rejects(stat(path),{code:'ENOENT'});
  for (const radius of [0,26,NaN,Infinity]) assert.throws(() => shopDiscoveryQuery(radius));
  await assert.rejects(discoverShops(3,path,{endpoint:'https://untrusted.invalid',fetchImpl:() => assert.fail('Unexpected request')}));
});
