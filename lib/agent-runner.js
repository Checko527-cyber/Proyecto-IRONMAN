import {prepararArranqueSeguro} from './ironman-infra-guard.js';
import {prepararEjecutor} from './agent-bootstrap.js';
import {crearManejadores} from './agent-handlers.js';
import {ejecutarCiclo} from './agent-cycle.js';
import {crearRegistroActividad} from './agent-heartbeat.js';

// Ejecuta un solo ciclo solicitado explícitamente. No inicia cron ni abre conexiones por sí mismo.
// conectar y consultarPolitica deben ser proveedores de servidor autorizados.
export async function ejecutarAgente({env,agente,conectar,proveedores,consultarPolitica,maxTareas=1}){
 const config=prepararArranqueSeguro(env);
 if(typeof consultarPolitica!=='function'||typeof conectar!=='function') throw new TypeError('Proveedores incompletos');
 const politica=await consultarPolitica(agente);
 if(!politica||politica.habilitado!==true||politica.infraIndependiente!==true||
 politica.riesgoAtlas!==false||politica.costoAdicional!==false) return {agente,motivo:'suspendido',procesadas:0,registro:'no_conectado'};
 const manejadores=crearManejadores({agente,proyectoId:config.proyectoId,proveedores});
 let bd;
 try{
  const worker=await prepararEjecutor({env,agente,manejadores,conectar:async c=>{bd=await conectar(c);return bd;}});
  const resultado=await ejecutarCiclo({worker,consultarPolitica,maxTareas});
  try{
   // Un veto posterior impide incluso registrar en infraestructura.
   const p=await consultarPolitica(agente);
   if(!p||p.infraIndependiente!==true||p.riesgoAtlas!==false||p.costoAdicional!==false) return {...resultado,registro:'no_autorizado'};
   await crearRegistroActividad({query:bd.query.bind(bd),proyectoId:config.proyectoId}).registrar(agente,resultado);
   return {...resultado,registro:'guardado'};
  }catch{return {...resultado,registro:'no_guardado'};}
 }finally{
  if(typeof bd?.cerrar==='function') await bd.cerrar();
 }
}
