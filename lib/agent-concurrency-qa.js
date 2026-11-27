import {validarDestinoQA} from './agent-db-permissions.js';
// Dos sesiones simultáneas y dos filas existentes; no cambia estados, datos ni leases.
export async function comprobarConcurrenciaQA({config,conectar,dia}){
 validarDestinoQA(config);
 if(typeof conectar!=='function'||!/^\d{4}-\d{2}-\d{2}$/.test(dia||'')) throw new TypeError('Prueba QA inválida');
 const idA='qa-sport-'+dia,idB='qa-ci-'+dia;
 let a,b;
 try{
  a=await conectar(config);b=await conectar(config);
  if(typeof a.transaccion!=='function'||typeof b.transaccion!=='function') throw new Error('Sesiones independientes requeridas');
  return await a.transaccion(async tx=>{
   const uno=(await tx.query("SELECT id, pg_backend_pid()::integer AS pid FROM ironman_agents.tareas WHERE proyecto_id=$1 AND id=$2 AND estado='pendiente' FOR UPDATE",[config.proyectoId,idA])).rows;
   if(uno.length!==1||uno[0].id!==idA||!Number.isInteger(uno[0].pid)) throw new Error('Primera tarea no pendiente');
   return b.transaccion(async ty=>{
    const dos=(await ty.query("SELECT id, pg_backend_pid()::integer AS pid FROM ironman_agents.tareas WHERE proyecto_id=$1 AND id IN ($2,$3) AND estado='pendiente' ORDER BY CASE WHEN id=$2 THEN 0 ELSE 1 END FOR UPDATE SKIP LOCKED LIMIT 1",[config.proyectoId,idA,idB])).rows;
    if(dos.length!==1||dos[0].id!==idB||!Number.isInteger(dos[0].pid)||dos[0].pid===uno[0].pid) throw new Error('Concurrencia no demostrada');
    return {concurrente:true,sesiones:2,estadosModificados:0};
   });
  });
 }finally{try{await b?.cerrar?.();}finally{await a?.cerrar?.();}}
}
