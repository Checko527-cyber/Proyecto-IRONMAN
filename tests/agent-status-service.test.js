import {test} from 'node:test';
import assert from 'node:assert/strict';
import {consultarEstadoAgentes} from '../lib/agent-status-service.js';
const ref='abcdefghijklmnopqrst',proyectoId='ironman-qa',ahora='2026-11-27T10:00:00Z';
const env={IRONMAN_PROJECT_ID:proyectoId,IRONMAN_ENVIRONMENT:'qa',IRONMAN_SUPABASE_URL:'https://'+ref+'.supabase.co',IRONMAN_SUPABASE_REF:ref,IRONMAN_SUPABASE_REF_APROBADA:ref,IRONMAN_INFRA_INDEPENDIENTE:'true'};
const base={env,credencial:'sintetica',autorizar:async()=>({autorizado:true,proyectoId}),consultarPolitica:async()=>({infraIndependiente:true,riesgoAtlas:false,costoAdicional:false}),reloj:()=>ahora};
test('deniega acceso y veto antes de conexión',async()=>{
 let n=0;const conectar=async()=>{n++;};
 await assert.rejects(consultarEstadoAgentes({...base,conectar,autorizar:async()=>({autorizado:true,proyectoId:'otro'})}));
 await assert.rejects(consultarEstadoAgentes({...base,conectar,consultarPolitica:async()=>({infraIndependiente:true,riesgoAtlas:true,costoAdicional:false})}));
 assert.equal(n,0);
});
test('agrega estados y actividad sin exponer datos libres',async()=>{
 let cerrado=0;
 const r=await consultarEstadoAgentes({...base,conectar:async()=>({supabaseRef:ref,proyectoId,query:async(sql,p)=>{
 assert.deepEqual(p,[proyectoId,ahora]);
 return {rows:[{tareas:[{agente:'rendimiento',estado:'en_progreso',cantidad:3,vencidas:1,ultima:ahora,secreto:'NO PUBLICAR'}],actividad:[{agente:'rendimiento',motivo:'cola_vacia',actualizada_en:ahora}]}]};
 },cerrar:async()=>{cerrado++;}})});
 assert.equal(r.agentes.rendimiento.estados.en_progreso,3);
 assert.equal(r.agentes.rendimiento.leasesVencidos,1);
 assert.equal(r.agentes.rendimiento.actividad,'reporte_reciente');
 assert.equal(r.agentes.ingenieria.actividad,'sin_evidencia');
 assert.equal(cerrado,1);assert.ok(!JSON.stringify(r).includes('NO PUBLICAR'));
});
test('lectura incompleta nunca produce ceros ficticios',async()=>{
 let cerrado=0;
 await assert.rejects(consultarEstadoAgentes({...base,conectar:async()=>({supabaseRef:ref,proyectoId,query:async()=>({rows:[]}),cerrar:async()=>{cerrado++;}})}));
 assert.equal(cerrado,1);
});
