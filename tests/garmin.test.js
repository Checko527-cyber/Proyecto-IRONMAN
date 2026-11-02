import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/garmin.js';

function mockRes(){
  return {statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},
    status(n){this.statusCode=n;return this;},json(data){this.body=data;return this;},send(data){this.body=data;return this;}};
}
const oldKey=process.env.GARMIN_PERSONAL_API_KEY,oldCoach=process.env.COACH_TOKEN,oldFetch=global.fetch;
test.after(()=>{
  if(oldKey===undefined)delete process.env.GARMIN_PERSONAL_API_KEY;else process.env.GARMIN_PERSONAL_API_KEY=oldKey;
  if(oldCoach===undefined)delete process.env.COACH_TOKEN;else process.env.COACH_TOKEN=oldCoach;
  global.fetch=oldFetch;
});
test('no expone datos Garmin sin autorización',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 const res=mockRes();
 await handler({method:'GET',headers:{},query:{}},res);
 assert.equal(res.statusCode,401);
 assert.equal(res.body.error,'Acceso no autorizado.');
});
test('rechaza fechas inválidas antes de consultar Garmin',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 const res=mockRes();
 await handler({method:'GET',headers:{authorization:'Bearer test-only'},query:{startDate:'2026-11-01',endDate:'2026-12-01'}},res);
 assert.equal(res.statusCode,400);
});
test('consulta Garmin y devuelve campos de actividad sin tokens',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 const calls=[];
 global.fetch=async (url,opts)=>{
   calls.push({url:String(url),authorization:opts.headers.Authorization});
   if(calls.length===1)return {ok:true,text:async()=>('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.c2lnbmF0dXJl')};
   return {ok:true,json:async()=>[{activityId:123,activityName:'Brick bike',startTimeLocal:'2026-11-01 07:00:00',activityType:{typeKey:'cycling'},duration:3600,distance:30000,averageHR:142,maxHR:168,averageBikingCadenceInRevPerMinute:76}]};
 };
 const res=mockRes();
 await handler({method:'GET',headers:{authorization:'Bearer test-only'},query:{startDate:'2026-11-01',endDate:'2026-11-02'}},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.total,1);
 assert.equal(res.body.actividades[0].cadencia,76);
 assert.equal(calls.length,2);
 assert.ok(!JSON.stringify(res.body).includes('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.c2lnbmF0dXJl'));
 assert.ok(!JSON.stringify(res.body).includes('mock-value'));
});

test('consulta el detalle de una actividad Garmin con ID válido',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 global.fetch=async(url)=>String(url).includes('/token')?{ok:true,text:async()=>('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.c2lnbmF0dXJl')}:{ok:true,json:async()=>({activityId:456,activityName:'Bici con series'})};
 const res=mockRes();
 await handler({method:'GET',headers:{authorization:'Bearer test-only'},query:{activityId:'456'}},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.actividad.activityId,456);
});
test('rechaza identificadores Garmin maliciosos antes de consultar API',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 const res=mockRes();
 await handler({method:'GET',headers:{authorization:'Bearer test-only'},query:{activityId:'../../../secrets'}},res);
 assert.equal(res.statusCode,400);
});

test('rechaza token de Garmin que no sea JWT',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 global.fetch=async()=>({ok:true,text:async()=>'<html>error</html>'});
 const res=mockRes();
 await handler({method:'GET',headers:{authorization:'Bearer test-only'},query:{activityId:'456'}},res);
 assert.equal(res.statusCode,502);
 assert.match(res.body.error,/JWT/);
});

test('descarga el ZIP Garmin sin revelar el JWT',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 const zip=Uint8Array.from([80,75,3,4,0,0,0,0]);
 global.fetch=async(url)=>String(url).includes('/token')?{ok:true,text:async()=>('eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.c2lnbmF0dXJl')}:
 {ok:true,headers:{get:()=>String(zip.length)},arrayBuffer:async()=>zip.buffer};
 const res=mockRes();
 await handler({method:'GET',headers:{authorization:'Bearer test-only'},query:{activityId:'24929713327',download:'fit'}},res);
 assert.equal(res.statusCode,200);
 assert.equal(res.headers['Content-Type'],'application/zip');
 assert.equal(res.body[0],80);
 assert.ok(!JSON.stringify(res.headers).includes('eyJhbGci'));
});

test('rechaza descarga sin identificador',async()=>{
 process.env.COACH_TOKEN='test-only';process.env.GARMIN_PERSONAL_API_KEY='mock-value';
 const res=mockRes();
 await handler({method:'GET',headers:{authorization:'Bearer test-only'},query:{download:'fit'}},res);
 assert.equal(res.statusCode,400);
});
