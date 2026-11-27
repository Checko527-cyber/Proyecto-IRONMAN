import {AGENTES,ESTADOS} from './agent-orchestration.js';
// Proyección de servidor para futuro panel autenticado; no expone filas ni textos.
export function resumirAgentes({proyectoId,tareas,ahora}){
 if(typeof proyectoId!=='string'||!proyectoId||!Array.isArray(tareas)||!Number.isFinite(Date.parse(ahora))) throw new TypeError('Entrada inválida');
 const agentes=Object.fromEntries(AGENTES.map(a=>[a,{estados:Object.fromEntries(ESTADOS.map(e=>[e,0])),ultimaActualizacion:null,leasesVencidos:0}]));
 for(const t of tareas){
  if(t?.proyectoId!==proyectoId) continue;
  if(!AGENTES.includes(t.agente)||!ESTADOS.includes(t.estado)) throw new Error('Estado de tarea inválido');
  const a=agentes[t.agente];a.estados[t.estado]++;
  const fecha=Date.parse(t.actualizadaEn);
  if(Number.isFinite(fecha)&&fecha<=Date.parse(ahora)&&(!a.ultimaActualizacion||fecha>Date.parse(a.ultimaActualizacion))) a.ultimaActualizacion=new Date(fecha).toISOString();
  const lease=Date.parse(t.leaseHasta);
  if(t.estado==='en_progreso'&&Number.isFinite(lease)&&lease<=Date.parse(ahora)) a.leasesVencidos++;
 }
 return {corte:new Date(ahora).toISOString(),agentes};
}
