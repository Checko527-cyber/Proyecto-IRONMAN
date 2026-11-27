import test from 'node:test';import assert from 'node:assert/strict';
import {crearHandlerRunQA} from '../api/agent-run-qa.js';
const ref='hifnimutdifkuchxdkrj',token='synthetic-run-token-at-least-32-chars';
const env={VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'qa/ironman-multiagente-fase0',IRONMAN_QA_RUN_TOKEN:token,IRONMAN_QA_AGENTS_ENABLED:'true',IRONMAN_PROJECT_ID:'ironman-qa',IRONMAN_ENVIRONMENT:'qa',IRONMAN_SUPABASE_URL:'https://'+ref+'.supabase.co',IRONMAN_SUPABASE_REF:ref,IRONMAN_SUPABASE_REF_APROBADA:ref,IRONMAN_INFRA_INDEPENDIENTE:'true'};
const req={method:'POST',headers:{authorization:'Bearer '+token},body:{action:'rendimiento'}};
const response=()=>({setHeader(){},status(n){this.code=n;return this},json(o){this.body=o;return this}});
test('bloquea producción, token inválido y suspensión antes de crear conexión',async()=>{
 let n=0;const conector=()=>{n++;throw Error()};
 for(const [e,q,c] of [[{...env,VERCEL_ENV:'production'},req,404],[env,{...req,headers:{}},401],[{...env,IRONMAN_QA_AGENTS_ENABLED:'false'},req,503],[env,{...req,body:{action:'seed',extra:'x'}},400]]){
  const res=response();await crearHandlerRunQA({env:e,conector})(q,res);assert.equal(res.code,c);
 }assert.equal(n,0);
});
test('ejecutor acotado y respuesta sin datos deportivos',async()=>{
 const res=response();let n=0;
 await crearHandlerRunQA({env,conector:()=>async()=>{},ejecutar:async o=>{n++;assert.equal(o.maxTareas,1);assert.equal(o.agente,'rendimiento');assert.equal((await o.consultarPolitica()).habilitado,true);return {agente:'rendimiento',motivo:'limite_tareas',procesadas:1,conteo:{validacion:1},registro:'guardado',privado:'no devolver'};}})(req,res);
 assert.equal(res.code,200);assert.equal(res.body.procesadas,1);assert.equal('privado'in res.body,false);assert.equal(n,1);
});
test('semilla determinista para los dos agentes, sin datos personales',async()=>{
 const ids=[];let cerrado=0;const rol={rol:'ironman_qa_worker_login',sesion:'ironman_qa_worker_login',privilegiado:false,autorizado:true,crear:false,inseguro:false,worker:true,approver:false};
 const conector=()=>async()=>({supabaseRef:ref,proyectoId:'ironman-qa',query:async(q,p)=>{if(q.includes('current_user AS rol'))return {rows:[rol]};ids.push(p);return {rows:[{id:p[0]}]}},cerrar:async()=>{cerrado++}});
 const res=response();await crearHandlerRunQA({env,conector,reloj:()=>new Date('2026-11-27T14:00:00Z')})({...req,body:{action:'seed'}},res);
 assert.equal(res.code,200);assert.deepEqual(ids.map(p=>p[0]),['qa-sport-2026-11-27','qa-ci-2026-11-27']);assert.equal(cerrado,1);
});
