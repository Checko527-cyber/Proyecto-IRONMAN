import { createHash } from 'node:crypto';
const roles=Object.freeze({
 rendimiento:Object.freeze({'revision.deportiva':'revisionDeportiva','validacion.deportiva':'validacionDeportiva'}),
 ingenieria:Object.freeze({'mejora.tecnica':'mejoraTecnica','validacion.tecnica':'validacionTecnica'})
});
const resultados=Object.freeze({
 verificado:'Resultado verificado por el proveedor; requiere revisión independiente',
 insuficiente:'Evidencia insuficiente; requiere revisión',
 propuesta:'Propuesta preparada; no implica publicación'
});
const solicitudes=Object.freeze({
 indicador:'Revisar cálculo y unidades de indicador deportivo',
 visual:'Revisar representación visual de indicador',
 regresion:'Revisar regresión funcional del indicador'
});
// Los proveedores son capacidades de servidor expresamente autorizadas.
// No se transmite texto libre ni resultados biométricos al otro agente.
export function crearManejadores({agente,proyectoId,proveedores}){
 if(!Object.hasOwn(roles,agente)||typeof proyectoId!=='string'||!/^ironman[-_a-z0-9]{0,72}$/i.test(proyectoId)) throw new TypeError('Rol o proyecto inválido');
 const entries=Object.entries(roles[agente]);
 if(!proveedores||entries.some(([,key])=>typeof proveedores[key]!=='function')) throw new TypeError('Capacidades del rol incompletas');
 return Object.freeze(Object.fromEntries(entries.map(([tipo,key])=>[tipo,async tarea=>{
  if(tarea?.proyectoId!==proyectoId||typeof tarea.id!=='string'||!tarea.id||tarea.id.length>128) throw new Error('Tarea fuera del ámbito autorizado');
  const salida=await proveedores[key](Object.freeze({id:tarea.id,proyectoId}));
  if(!salida||!Object.hasOwn(resultados,salida.estado)) throw new Error('Resultado de proveedor inválido');
  const resultado={resumen:resultados[salida.estado]};
  if(salida.solicitud!==undefined){
   if(agente!=='rendimiento'||tipo!=='revision.deportiva'||!Object.hasOwn(solicitudes,salida.solicitud)) throw new Error('Transferencia no autorizada');
   const id=createHash('sha256').update(JSON.stringify([proyectoId,tarea.id,tipo,salida.solicitud])).digest('hex');
   resultado.evento={id,proyectoId,origen:agente,destino:'ingenieria',tipo:'mejora.tecnica',resumen:solicitudes[salida.solicitud]};
  }
  if(salida.devolverRevision!==undefined){
   if(agente!=='ingenieria'||tipo!=='mejora.tecnica'||salida.devolverRevision!==true||
      salida.estado!=='verificado'||resultado.evento) throw new Error('Retorno no autorizado');
   const id=createHash('sha256').update(JSON.stringify([proyectoId,tarea.id,tipo,'retorno'])).digest('hex');
   resultado.evento={id,proyectoId,origen:agente,destino:'rendimiento',tipo:'validacion.deportiva',resumen:'Revisar resultado técnico asociado a la solicitud original'};
  }
  return resultado;
 }])));
}
