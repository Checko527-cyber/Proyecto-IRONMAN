// Ciclo acotado. No activa cron, servicios externos ni facturación.
// La política se consulta antes de cada reclamación; debe provenir de un servidor autorizado.
export async function ejecutarCiclo({worker, consultarPolitica, maxTareas=1, reloj=Date.now, limiteMs=20000}) {
  if (!worker || !['rendimiento','ingenieria'].includes(worker.agente) ||
      typeof worker.ejecutarUna !== 'function' || typeof consultarPolitica !== 'function') {
    throw new TypeError('Ejecutor o política inválidos');
  }
  if (!Number.isInteger(maxTareas) || maxTareas<1 || maxTareas>10 ||
      !Number.isInteger(limiteMs) || limiteMs<1 || limiteMs>60000) throw new TypeError('Límite inválido');
  const inicio=reloj();
  const conteo={validacion:0,error:0,bloqueada:0};
  const finalizar=motivo=>({agente:worker.agente,motivo,procesadas:Object.values(conteo).reduce((a,b)=>a+b,0),conteo});
  for(let i=0;i<maxTareas;i++){
    if(reloj()-inicio>=limiteMs) return finalizar('limite_tiempo');
    let p;
    try {p=await consultarPolitica(worker.agente);} catch {return finalizar('politica_no_disponible');}
    if(!p || p.habilitado!==true || p.infraIndependiente!==true ||
       p.riesgoAtlas!==false || p.costoAdicional!==false) return finalizar('suspendido');
    if(reloj()-inicio>=limiteMs) return finalizar('limite_tiempo');
    let resultado;
    try {resultado=await worker.ejecutarUna();} catch {return finalizar('fallo_ejecutor');}
    if(resultado?.estado==='sin_tareas') return finalizar('cola_vacia');
    if(!Object.hasOwn(conteo,resultado?.estado)) return finalizar('respuesta_invalida');
    conteo[resultado.estado]++;
    if(resultado.estado!=='validacion') return finalizar('requiere_revision');
  }
  return finalizar('limite_tareas');
}
