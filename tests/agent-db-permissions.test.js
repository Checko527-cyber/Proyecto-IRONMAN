import test from 'node:test';
import assert from 'node:assert/strict';
import {protegerConexionQA,verificarPermisosQA} from '../lib/agent-db-permissions.js';
const config={proyectoId:'ironman-qa',supabaseRef:'hifnimutdifkuchxdkrj',entorno:'qa',infraestructura:'independiente'};
const permisos={rol:'ironman_qa_worker_login',sesion:'ironman_qa_worker_login',privilegiado:false,autorizado:true,crear:false,inseguro:false,worker:true,approver:false};
const bd=(row=permisos)=>({supabaseRef:config.supabaseRef,proyectoId:config.proyectoId,query:async()=>({rows:[row]})});
test('acepta únicamente rol QA efectivo y no privilegiado',async()=>assert.equal(await verificarPermisosQA({config,bd:bd(),funcion:'worker'}),true));
test('rechaza cualquier destino distinto antes de conectar',async()=>{
 let llamadas=0;const conectar=protegerConexionQA({funcion:'worker',conectar:async()=>{llamadas++;return bd();}});
 await assert.rejects(conectar({...config,supabaseRef:'aaaaaaaaaaaaaaaaaaaa'}),/Destino QA/);
 await assert.rejects(conectar({...config,entorno:'production'}),/Destino QA/);
 assert.equal(llamadas,0);
});
test('rechaza admin, bypass, roles cruzados y permisos destructivos',async()=>{
 for(const cambio of [{rol:'postgres'},{sesion:'postgres'},{privilegiado:true},{autorizado:false},{crear:true},{inseguro:true},{approver:true},{worker:false}]){
  await assert.rejects(verificarPermisosQA({config,bd:bd({...permisos,...cambio}),funcion:'worker'}),/Permisos efectivos/);
 }
});
test('cierra conexión rechazada',async()=>{
 let cerrada=0;const conectar=protegerConexionQA({funcion:'worker',conectar:async()=>({...bd({...permisos,privilegiado:true}),cerrar:async()=>{cerrada++;}})});
 await assert.rejects(conectar(config),/Conexión QA rechazada/);assert.equal(cerrada,1);
});
test('acepta aprobador sin rol ejecutor',async()=>{
 const row={...permisos,rol:'ironman_qa_approver_login',sesion:'ironman_qa_approver_login',worker:false,approver:true};
 assert.equal(await verificarPermisosQA({config,bd:bd(row),funcion:'approver'}),true);
});
