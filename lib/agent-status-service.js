import {prepararArranqueSeguro} from './ironman-infra-guard.js';
import {estadoActividad} from './agent-heartbeat.js';
import {AGENTES,ESTADOS} from './agent-orchestration.js';

// Servicio interno. El autenticador debe verificar identidad y permisos en servidor;
// no se acepta identidad declarada por el navegador ni se publica un endpoint abierto.
export async function consultarEstadoAgentes({env,credencial,autorizar,conectar,consultarPolitica,reloj=()=>new Date().toISOString()}){
 const config=prepararArranqueSeguro(env);
 if(typeof autorizar!=='function'||typeof conectar!=='function'||typeof consultarPolitica!=='function') throw new TypeError('Dependencias incompletas');
 const permiso=await autorizar(credencial,config.proyectoId,'agentes:lectura');
 if(permiso?.autorizado!==true||permiso.proyectoId!==config.proyectoId) throw new Error('Acceso denegado');
 const p=await consultarPolitica();
 if(p?.infraIndependiente!==true||p.riesgoAtlas!==false||p.costoAdicional!==false) throw new Error('Infraestructura no autorizada');
 let bd;
 try{
  bd=await conectar(config);
  if(bd?.supabaseRef!==config.supabaseRef||bd.proyectoId!==config.proyectoId||typeof bd.query!=='function') throw new Error('Identidad de conexión incompatible');
  const ahora=reloj();
  if(!Number.isFinite(Date.parse(ahora))) throw new Error('Corte inválido');
  // Agregación en una sola consulta, sin recuperar textos, biometría ni credenciales.
  const resultado=await bd.query(`WITH resumen AS (
 SELECT agente,estado,count(*)::integer AS cantidad,
 max(actualizada_en) AS ultima,
 count(*) FILTER(WHERE estado='en_progreso' AND lease_hasta <= $2::timestamptz)::integer AS vencidas
 FROM ironman_agents.tareas WHERE proyecto_id=$1 GROUP BY agente,estado
 ), actividad AS (
 SELECT agente,motivo,procesadas,actualizada_en FROM ironman_agents.actividad WHERE proyecto_id=$1
 )
 SELECT (SELECT coalesce(jsonb_agg(resumen),'[]'::jsonb) FROM resumen) AS tareas,
 (SELECT coalesce(jsonb_agg(actividad),'[]'::jsonb) FROM actividad) AS actividad`,[config.proyectoId,ahora]);
  const fila=resultado?.rows?.[0];
  if(!Array.isArray(fila?.tareas)||!Array.isArray(fila.actividad)) throw new Error('Lectura incompleta');
  const agentes=Object.fromEntries(AGENTES.map(a=>[a,{estados:Object.fromEntries(ESTADOS.map(e=>[e,0])),leasesVencidos:0,ultimaActualizacion:null,ultimaActividad:null,procesadasUltimoCiclo:null,actividad:'sin_evidencia'}]));
  const vistos=new Set();
  for(const t of fila.tareas){
   const k=JSON.stringify([t.agente,t.estado]);
   if(!AGENTES.includes(t.agente)||!ESTADOS.includes(t.estado)||vistos.has(k)||!Number.isSafeInteger(t.cantidad)||t.cantidad<0||!Number.isSafeInteger(t.vencidas)||t.vencidas<0||t.vencidas>t.cantidad) throw new Error('Agregado inválido');
   vistos.add(k);const a=agentes[t.agente];a.estados[t.estado]=t.cantidad;a.leasesVencidos+=t.vencidas;
   const f=Date.parse(t.ultima);if(Number.isFinite(f)&&f<=Date.parse(ahora)&&(!a.ultimaActualizacion||f>Date.parse(a.ultimaActualizacion))) a.ultimaActualizacion=new Date(f).toISOString();
  }
  const activos=new Set();
  for(const t of fila.actividad){
   if(!AGENTES.includes(t.agente)||activos.has(t.agente)||!Number.isSafeInteger(t.procesadas)||t.procesadas<0) throw new Error('Actividad inválida');
   activos.add(t.agente);
   const a=agentes[t.agente];a.actividad=estadoActividad({registro:{motivo:t.motivo,actualizadaEn:t.actualizada_en},ahora});
   if(a.actividad!=='sin_evidencia'){a.ultimaActividad=new Date(t.actualizada_en).toISOString();a.procesadasUltimoCiclo=t.procesadas;}
  }
  return {disponible:true,corte:new Date(ahora).toISOString(),agentes};
 }finally{if(typeof bd?.cerrar==='function') await bd.cerrar();}
}
