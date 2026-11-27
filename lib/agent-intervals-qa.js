import {validarDestinoQA} from './agent-db-permissions.js';
const deporte=t=> /swim/i.test(t)?'swim':/ride|bike|cycl/i.test(t)?'bike':/run|treadmill/i.test(t)?'run':'other';
// Solo lectura, ventana fija, sin nombres ni métricas de salud en la salida.
export function crearLecturaIntervalsQA({config,env,fetcher=fetch,reloj=()=>new Date()}){
 validarDestinoQA(config);
 return async ({proyectoId,dias})=>{
  if(proyectoId!==config.proyectoId||dias!==7) throw new Error('Ventana no autorizada');
  const key=env?.INTERVALS_API_KEY, atleta=env?.INTERVALS_ATHLETE_ID?.trim();
  if(typeof key!=='string'||!key||!/^i[0-9]+$/.test(atleta||'')) throw new Error('Fuente deportiva no configurada');
  const ahora=reloj(), corte=ahora.toISOString();
  const url=new URL('https://intervals.icu/api/v1/athlete/'+encodeURIComponent(atleta)+'/activities');
  url.searchParams.set('oldest',new Date(ahora.getTime()-7*86400000).toISOString().slice(0,10));
  url.searchParams.set('newest',corte.slice(0,10));
  try{
   const r=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(6000),headers:{Authorization:'Basic '+Buffer.from('API_KEY:'+key).toString('base64'),Accept:'application/json'}});
   if(!r.ok) throw new Error('Fuente no disponible');
   const datos=await r.json();
   if(!Array.isArray(datos)||datos.length>500) throw new Error('Respuesta inválida');
   const actividades=datos.map(a=>({id:typeof a?.id==='string'?a.id:typeof a?.id==='number'?String(a.id):null,sport:deporte(String(a?.type||a?.sport||'')),
      min:typeof a?.moving_time==='number'?a.moving_time/60:null,km:typeof a?.distance==='number'?a.distance/1000:null}));
   return {completa:true,corte,actividades};
  }catch{throw new Error('Fuente deportiva QA no disponible');}
 };
}
