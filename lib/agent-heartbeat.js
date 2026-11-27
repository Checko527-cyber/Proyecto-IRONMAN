import {AGENTES} from './agent-orchestration.js';
const MOTIVOS=new Set(['limite_tiempo','politica_no_disponible','suspendido','fallo_ejecutor','cola_vacia','respuesta_invalida','requiere_revision','limite_tareas']);
export function crearRegistroActividad({query,proyectoId}){
 if(typeof query!=='function'||typeof proyectoId!=='string'||!/^ironman[-_a-z0-9]{0,72}$/i.test(proyectoId)) throw new TypeError('Configuración inválida');
 return Object.freeze({
 async registrar(agente,resultado){
  if(!AGENTES.includes(agente)||resultado?.agente!==agente||!MOTIVOS.has(resultado.motivo)||!Number.isInteger(resultado.procesadas)||resultado.procesadas<0||resultado.procesadas>10) throw new TypeError('Resultado inválido');
  await query(`INSERT INTO ironman_agents.actividad (proyecto_id,agente,motivo,procesadas,actualizada_en)
 VALUES ($1,$2,$3,$4,now()) ON CONFLICT (proyecto_id,agente) DO UPDATE SET motivo=EXCLUDED.motivo,procesadas=EXCLUDED.procesadas,actualizada_en=EXCLUDED.actualizada_en`,[proyectoId,agente,resultado.motivo,resultado.procesadas]);
 }
 });
}
export function estadoActividad({registro,ahora,ventanaMs=900000}){
 const t=Date.parse(ahora),f=Date.parse(registro?.actualizadaEn);
 if(!Number.isFinite(t)||!Number.isInteger(ventanaMs)||ventanaMs<=0) throw new TypeError('Ventana inválida');
 if(!Number.isFinite(f)||f>t||!MOTIVOS.has(registro?.motivo)) return 'sin_evidencia';
 if(t-f>ventanaMs) return 'sin_reporte_reciente';
 if(['suspendido','politica_no_disponible'].includes(registro.motivo)) return 'suspendido';
 if(['fallo_ejecutor','respuesta_invalida','requiere_revision'].includes(registro.motivo)) return 'requiere_revision';
 return 'reporte_reciente';
}
