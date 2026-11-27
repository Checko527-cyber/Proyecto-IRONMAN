import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ejecutarAgente} from '../lib/agent-runner.js';
const ref='hifnimutdifkuchxdkrj';
const verificacion={rol:'ironman_qa_worker_login',sesion:'ironman_qa_worker_login',privilegiado:false,autorizado:true,crear:false,inseguro:false,worker:true,approver:false};
const env={IRONMAN_PROJECT_ID:'ironman-qa',IRONMAN_ENVIRONMENT:'qa',IRONMAN_SUPABASE_URL:'https://'+ref+'.supabase.co',IRONMAN_SUPABASE_REF:ref,IRONMAN_SUPABASE_REF_APROBADA:ref,IRONMAN_INFRA_INDEPENDIENTE:'true'};
const ok={habilitado:true,infraIndependiente:true,riesgoAtlas:false,costoAdicional:false};
const proveedores={revisionDeportiva:async()=>({estado:'propuesta'}),validacionDeportiva:async()=>({estado:'verificado'})};
test('veto no abre conexión',async()=>{
 let n=0;
 const r=await ejecutarAgente({env,agente:'rendimiento',proveedores,consultarPolitica:async()=>({...ok,riesgoAtlas:true}),conectar:async()=>{n++;}});
 assert.equal(r.registro,'no_conectado');assert.equal(n,0);
});
test('ciclo vacío registra actividad y cierra conexión',async()=>{
 let cerrado=0;const sql=[];
 const r=await ejecutarAgente({env,agente:'rendimiento',proveedores,consultarPolitica:async()=>ok,conectar:async()=>({supabaseRef:ref,proyectoId:'ironman-qa',query:async(q,p)=>{sql.push([q,p]);return {rows:q.includes('current_user AS rol')?[verificacion]:[]};},cerrar:async()=>{cerrado++;}})});
 assert.equal(r.motivo,'cola_vacia');assert.equal(r.registro,'guardado');assert.equal(cerrado,1);
 assert.deepEqual(sql.at(-1)[1],['ironman-qa','rendimiento','cola_vacia',0]);
});
test('cambio de política antes de registro impide escritura',async()=>{
 let n=0;const sql=[];
 const r=await ejecutarAgente({env,agente:'rendimiento',proveedores,consultarPolitica:async()=>({...ok,riesgoAtlas:++n>=3}),conectar:async()=>({supabaseRef:ref,proyectoId:'ironman-qa',query:async(q,p)=>{sql.push(q);return {rows:q.includes('current_user AS rol')?[verificacion]:[]};}})});
 assert.equal(r.registro,'no_autorizado');assert.equal(sql.length,3);
});

test('el ciclo rechaza un rol administrativo antes de reclamar tareas',async()=>{
 let llamadas=0,cerrado=0;
 await assert.rejects(ejecutarAgente({env,agente:'rendimiento',proveedores,consultarPolitica:async()=>ok,conectar:async()=>({supabaseRef:ref,proyectoId:'ironman-qa',query:async()=>{llamadas++;return {rows:[{...verificacion,rol:'postgres'}]};},cerrar:async()=>{cerrado++;}})}),/Conexión QA rechazada/);
 assert.equal(llamadas,1);assert.equal(cerrado,1);
});
