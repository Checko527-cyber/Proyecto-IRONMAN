import test from 'node:test';
import assert from 'node:assert/strict';
import {crearHandlerQA} from '../api/agent-qa.js';
import {crearLecturaIntervalsQA} from '../lib/agent-intervals-qa.js';
const ref='hifnimutdifkuchxdkrj',token='synthetic-test-token-not-real-123';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'qa/ironman-multiagente-fase0',COACH_TOKEN:token,IRONMAN_PROJECT_ID:'ironman-qa',IRONMAN_ENVIRONMENT:'qa',IRONMAN_SUPABASE_URL:'https://'+ref+'.supabase.co',IRONMAN_SUPABASE_REF:ref,IRONMAN_SUPABASE_REF_APROBADA:ref,IRONMAN_INFRA_INDEPENDIENTE:'true'};
const req={method:'GET',headers:{authorization:'Bearer '+token},query:{check:'intervals'}};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(o){this.body=o;return this}}}
test('producción bloqueada, credenciales por URL no aceptadas, método inválido',async()=>{
 let llamadas=0;const lectura=()=>{llamadas++;return async()=>({completa:true,actividades:[]})};
 for(const [e,r,c] of [[{...env,VERCEL_ENV:'production'},req,404],[env,{...req,headers:{},query:{token}},401],[env,{...req,method:'POST'},405],[env,{...req,query:{check:'x'}},400]]){
  const res=response();await crearHandlerQA({env:e,lectura})(r,res);assert.equal(res.code,c);assert.equal(res.headers['Cache-Control'],'no-store');
 }assert.equal(llamadas,0);
});
test('diagnóstico Intervals no devuelve actividades ni identificadores',async()=>{
 const res=response();await crearHandlerQA({env,lectura:()=>async()=>({completa:true,corte:'2026-11-27T14:00:00Z',actividades:[{id:'private',min:30}]})})(req,res);
 assert.equal(res.code,200);assert.deepEqual(res.body,{fuente:'intervals',disponible:true,corte:'2026-11-27T14:00:00Z'});
});
test('errores de fuente saneados',async()=>{
 const res=response();await crearHandlerQA({env,lectura:()=>async()=>{throw Error('secret')}})(req,res);assert.equal(res.code,503);assert.deepEqual(res.body,{error:'integracion_no_verificada'});
});
test('lector Intervals restringido a GET, siete días y host fijo',async()=>{
 const config={proyectoId:'ironman-qa',supabaseRef:ref,entorno:'qa',infraestructura:'independiente'};
 let n=0;const leer=crearLecturaIntervalsQA({config,env:{INTERVALS_API_KEY:'synthetic',INTERVALS_ATHLETE_ID:'i123'},reloj:()=>new Date('2026-11-27T14:00:00Z'),fetcher:async(u,o)=>{n++;assert.equal(u.hostname,'intervals.icu');assert.equal(o.method,'GET');assert.equal(o.redirect,'error');return {ok:true,json:async()=>[{id:'a',type:'Ride',moving_time:3600,distance:30000,name:'private'}]}}});
 const out=await leer({proyectoId:config.proyectoId,dias:7});assert.deepEqual(out.actividades,[{id:'a',sport:'bike',min:60,km:30}]);await assert.rejects(leer({proyectoId:config.proyectoId,dias:30}));assert.equal(n,1);
});
