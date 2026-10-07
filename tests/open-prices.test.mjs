import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchOpenPricesObservations } from '../src/open-prices.mjs';
const coords = {lat:51.9625,lon:7.6251};
const response = payload => ({ok:true,status:200,json:async()=>payload});
test('retains proof and historical date without creating a current offer',async()=>{
  const raw={id:17,date:'2026-10-01',proof_id:8,currency:'EUR',price:1.29};
  let called;
  const r=await fetchOpenPricesObservations({...coords,observedSince:'2026-10-01',fetchImpl:async(url,opts)=>{
    called={url,opts};return response({items:[raw],pages:1,total:1});
  }});
  assert.equal(r.observations[0].raw,raw);
  assert.equal(r.observations[0].observedOn,'2026-10-01');
  assert.equal(r.observations[0].eligibleAsActiveOffer,false);
  assert.equal(r.observations[0].validity,'unconfirmed');
  assert.ok(called.url.includes('radius_km=3'));
  assert.ok(called.url.includes('date__gte=2026-10-01'));
  assert.equal(called.opts.credentials,'omit');
});
test('caps pagination and reports truncation',async()=>{
  let calls=0;
  const r=await fetchOpenPricesObservations({...coords,maxPages:2,pageSize:1,
    fetchImpl:async()=>response({items:[{id:++calls}],pages:4,total:4})});
  assert.equal(calls,2);assert.equal(r.observations.length,2);assert.equal(r.truncated,true);
});
test('deduplicates provider records across pages',async()=>{
  let calls=0;
  const r=await fetchOpenPricesObservations({...coords,
    fetchImpl:async()=>{calls++;return response({items:[{id:7}],pages:2,total:2});}});
  assert.equal(calls,2);assert.equal(r.observations.length,1);
});
test('empty local coverage stays empty',async()=>{
  const r=await fetchOpenPricesObservations({...coords,
    fetchImpl:async()=>response({items:[],pages:0,total:0})});
  assert.equal(r.observations.length,0);assert.equal(r.truncated,false);
});
test('rejects malformed provider pagination',async()=>{
  await assert.rejects(fetchOpenPricesObservations({...coords,
    fetchImpl:async()=>response({items:[],pages:0,total:1})}),/Inconsistent/);
});
test('HTTP failure is actionable and does not yield invented data',async()=>{
  await assert.rejects(fetchOpenPricesObservations({...coords,
    fetchImpl:async()=>({ok:false,status:429})}),/429/);
});
test('invalid dates and bounds fail before making requests',async()=>{
  let calls=0;const fetchImpl=async()=>{calls++;throw new Error('must not fetch');};
  for(const invalid of [{lat:91},{radiusKm:0},{maxPages:6},{pageSize:101},{observedSince:'2026-02-30'}]){
    await assert.rejects(fetchOpenPricesObservations({...coords,...invalid,fetchImpl}),TypeError);
  }
  assert.equal(calls,0);
});
test('abort timeout is reported',async()=>{
  await assert.rejects(fetchOpenPricesObservations({...coords,timeoutMs:5,
    fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>{
      signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});
    })}),/timed out/);
});
