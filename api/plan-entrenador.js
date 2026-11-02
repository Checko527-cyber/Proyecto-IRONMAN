// Lectura del calendario gratuito de Intervals.icu: las sesiones TrainingPeaks
// solo aparecen si el usuario las sincroniza/importa por una vía autorizada.
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='GET')return res.status(405).json({error:'Método no permitido'});
 const key=process.env.INTERVALS_API_KEY,id=process.env.INTERVALS_ATHLETE_ID||'0';
 if(!key)return res.status(503).json({error:'Intervals.icu sin configurar'});
 const oldest=String(req.query?.oldest||new Date().toISOString().slice(0,10));
 const newest=String(req.query?.newest||new Date(Date.now()+14*86400000).toISOString().slice(0,10));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(oldest)||!/^\d{4}-\d{2}-\d{2}$/.test(newest)||
 Date.parse(newest)<Date.parse(oldest)||Date.parse(newest)-Date.parse(oldest)>90*86400000)
 return res.status(400).json({error:'Rango inválido (máximo 90 días)'});
 const auth='Basic '+Buffer.from('API_KEY:'+key).toString('base64');
 try{
 const url='https://intervals.icu/api/v1/athlete/'+encodeURIComponent(id)+'/events?'+new URLSearchParams({oldest,newest});
 const upstream=await fetch(url,{headers:{Authorization:auth,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
 if(!upstream.ok)return res.status(502).json({error:'No se pudo consultar calendario',estado:upstream.status});
 const data=await upstream.json();
 if(!Array.isArray(data))return res.status(502).json({error:'Respuesta calendario inesperada'});
 const workouts=data.filter(e=>e.category==='WORKOUT').map(e=>({
  id:e.id,fecha:e.start_date_local?.slice(0,10)||null,nombre:String(e.name||'Entrenamiento').slice(0,160),
  deporte:e.type||'Other',minutos:Number.isFinite(e.moving_time)?Math.round(e.moving_time/60):null,
  distanciaKm:Number.isFinite(e.distance)?Math.round(e.distance/100)/10:null,
  carga:Number.isFinite(e.icu_training_load)?e.icu_training_load:null,
  descripcion:String(e.description||'').slice(0,2500),
  fuente:'intervals.icu',origenTrainingPeaks:'no_verificado'
 }));
 return res.status(200).json({fuente:'intervals.icu',aviso:'La procedencia TrainingPeaks no se puede deducir sin identificador de origen.',entrenamientos:workouts,total:workouts.length});
 }catch{return res.status(502).json({error:'Calendario no disponible temporalmente'});}
}
