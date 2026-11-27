import test from 'node:test';import assert from 'node:assert/strict';
import {comprobarConcurrenciaQA} from '../lib/agent-concurrency-qa.js';
const config={proyectoId:'ironman-qa',supabaseRef:'hifnimutdifkuchxdkrj',entorno:'qa',infraestructura:'independiente'};
test('la segunda sesión se usa mientras la primera mantiene el bloqueo',async()=>{
 let conexiones=0,cerradas=0,activa=false;
 const conectar=async()=>{const i=++conexiones;return {cerrar:async()=>{cerradas++},transaccion:async f=>{if(i===1)activa=true;else assert.equal(activa,true);try{return await f({query:async(q,p)=>{assert.equal(p[0],'ironman-qa');if(i===2)assert.match(q,/SKIP LOCKED/);return {rows:[{id:i===1?'qa-sport-2026-11-27':'qa-ci-2026-11-27',pid:i}]}}});}finally{if(i===1)activa=false;}}}};
 assert.deepEqual(await comprobarConcurrenciaQA({config,conectar,dia:'2026-11-27'}),{concurrente:true,sesiones:2,estadosModificados:0});assert.equal(cerradas,2);
});
test('rechaza una segunda conexión con el mismo PID',async()=>{
 let n=0;const conectar=async()=>{const i=++n;return {transaccion:async f=>f({query:async()=>({rows:[{id:i===1?'qa-sport-2026-11-27':'qa-ci-2026-11-27',pid:1}]})})}};
 await assert.rejects(comprobarConcurrenciaQA({config,conectar,dia:'2026-11-27'}),/Concurrencia no demostrada/);
});
