// Solo lectura. La fuente inyectada debe ser autenticada, independiente y autorizada.
// No modifica sesiones ni envía métricas individuales a ingeniería.
export function crearProveedorDeportivo({proyectoId,leerActividades,revisarEvidencia,reloj=()=>new Date().toISOString()}){
 if(typeof proyectoId!=='string'||!/^ironman[-_a-z0-9]{0,72}$/i.test(proyectoId)||typeof leerActividades!=='function'||typeof revisarEvidencia!=='function') throw new TypeError('Dependencias deportivas incompletas');
 const validar=t=>{if(t?.proyectoId!==proyectoId||typeof t.id!=='string'||!t.id)throw new Error('Tarea no autorizada');};
 return Object.freeze({
 async revisionDeportiva(t){
  validar(t);const ahora=Date.parse(reloj());
  if(!Number.isFinite(ahora))throw new Error('Corte inválido');
  const datos=await leerActividades({proyectoId,dias:7});
  const corte=Date.parse(datos?.corte);
  if(datos?.completa!==true||!Number.isFinite(corte)||corte>ahora||ahora-corte>86400000||!Array.isArray(datos.actividades)||!datos.actividades.length)return {estado:'insuficiente'};
  if(datos.actividades.length>500)return {estado:'insuficiente'};
  const ids=new Set();
  for(const a of datos.actividades){
   if(!a||typeof a.id!=='string'||!a.id||ids.has(a.id)||!['swim','bike','run','other'].includes(a.sport)||typeof a.min!=='number'||!Number.isFinite(a.min)||a.min<=0||a.min>1440||
      (a.km!=null&&(typeof a.km!=='number'||!Number.isFinite(a.km)||a.km<0)))return {estado:'propuesta',solicitud:'indicador'};
   ids.add(a.id);
  }
  return {estado:'verificado'};
 },
 async validacionDeportiva(t){
  validar(t);const r=await revisarEvidencia({proyectoId,id:t.id});
  return {estado:r?.verificada===true&&r?.unidadesCorrectas===true&&r?.respetaPrescripcion===true?'verificado':'insuficiente'};
 }
 });
}
