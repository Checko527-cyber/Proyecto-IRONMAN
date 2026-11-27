import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepararEjecutor} from '../lib/agent-bootstrap.js';

const ref='abcdefghijklmnopqrst';
const env={IRONMAN_PROJECT_ID:'ironman-qa',IRONMAN_ENVIRONMENT:'qa',
 IRONMAN_SUPABASE_URL:'https://'+ref+'.supabase.co',
 IRONMAN_SUPABASE_REF:ref,IRONMAN_SUPABASE_REF_APROBADA:ref,
 IRONMAN_INFRA_INDEPENDIENTE:'true'};
const manejadores={'revision.deportiva':async()=>({resumen:'QA'}),
 'validacion.deportiva':async()=>({resumen:'QA'})};
test('sin infraestructura aprobada no conecta',async()=>{
 let calls=0;
 await assert.rejects(prepararEjecutor({env:{},agente:'rendimiento',manejadores,conectar:async()=>{calls++;}}));
 assert.equal(calls,0);
});
test('rol o manejadores incompletos no conectan',async()=>{
 let calls=0; const conectar=async()=>{calls++;};
 await assert.rejects(prepararEjecutor({env,agente:'admin',manejadores,conectar}));
 await assert.rejects(prepararEjecutor({env,agente:'ingenieria',manejadores,conectar}));
 assert.equal(calls,0);
});
test('rechaza identidad incompatible sin ejecutar SQL',async()=>{
 let queries=0;
 await assert.rejects(prepararEjecutor({env,agente:'rendimiento',manejadores,
 conectar:async()=>({supabaseRef:'otra',proyectoId:'ironman-qa',query:async()=>{queries++;}})}));
 assert.equal(queries,0);
});
test('ejecutor válido reclama solo tareas del rol y proyecto',async()=>{
 const params=[];
 const worker=await prepararEjecutor({env,agente:'rendimiento',manejadores,
 conectar:async()=>({supabaseRef:ref,proyectoId:'ironman-qa',query:async(sql,p)=>{params.push(p);return {rows:[]};}})});
 assert.equal(params.length,0);
 assert.deepEqual(await worker.ejecutarUna(),{estado:'sin_tareas',agente:'rendimiento'});
 assert.deepEqual(params,[['ironman-qa','rendimiento'],['ironman-qa','rendimiento']]);
});
