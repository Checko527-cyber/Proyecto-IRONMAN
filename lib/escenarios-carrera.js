import {generarCronograma} from './planificador-carrera.js';

// Escenarios de duración, no predicciones ni probabilidades de rendimiento.
export function compararEscenarios(config,consumos=[]){
  const base=generarCronograma(config,consumos);
  const tramos=config.tiempos||{};
  const alternativa=(nombre,factor)=>{
    const tiempos=Object.fromEntries(Object.entries(tramos).map(([clave,valor])=>[
      clave,['swim','bike','run'].includes(clave)&&Number.isFinite(Number(valor))&&valor!==null&&valor!==''?
        Math.round(Number(valor)*factor):valor
    ]));
    return {nombre,...generarCronograma({...config,tiempos},consumos)};
  };
  return [{nombre:'Base declarada',...base},alternativa('Etapas deportivas +5 %',1.05),alternativa('Etapas deportivas +10 %',1.10)];
}
