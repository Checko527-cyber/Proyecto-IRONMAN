import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/actividad.js';

test('devuelve balance bilateral desde streams oficiales de Intervals sin publicar credenciales',async()=>{
 const oldKey=process.env.INTERVALS_API_KEY,oldFetch=global.fetch;
 process.env.INTERVALS_API_KEY='only-for-tests';
 const calls=[];
 global.fetch=async url=>{
  calls.push(String(url));
  if(String(url).includes('/streams.json'))return {ok:true,json:async()=>[
   {type:'time',data:[0,300,600,900]},
   {type:'watts',data:[180,190,200,210]},
   {type:'left_right_balance',data:[49,50,51,52]}
  ]};
  return {ok:true,json:async()=>({id:'i1234',type:'Ride',name:'Bici',start_date_local:'2026-11-21',moving_time:900})};
 };
 const res={statusCode:0,headers:{},setHeader(k,v){this.headers[k]=v;return this;},status(v){this.statusCode=v;return this;},json(v){this.body=v;return this;}};
 try{
  await handler({query:{id:'i1234'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.balance.disponible,true);
  assert.equal(res.body.balance.izquierdaPct,49.5);
  assert.ok(calls.some(x=>x.includes('left_right_balance')));
  assert.ok(!JSON.stringify(res.body).includes('only-for-tests'));
 }finally{
  if(oldKey===undefined)delete process.env.INTERVALS_API_KEY;else process.env.INTERVALS_API_KEY=oldKey;
  global.fetch=oldFetch;
 }
});
