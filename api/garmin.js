import { timingSafeEqual } from 'node:crypto';

// Read-only Garmin Personal API bridge. Never expose the API key or bearer token.
export default async function handler(req,res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'GET') return res.status(405).json({error:'Método no permitido.'});
  const expected=process.env.COACH_TOKEN;
  const provided=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if (!expected || !provided || Buffer.byteLength(expected)!==Buffer.byteLength(provided) ||
      !timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))
    return res.status(401).json({error:'Acceso no autorizado.'});
  const key=process.env.GARMIN_PERSONAL_API_KEY;
  if (!key) return res.status(503).json({error:'La conexión personal de Garmin aún no está configurada.'});
  const activityId=String(req.query?.activityId||'');
  const details=activityId !== '';
  if (details && !/^[1-9][0-9]{0,19}$/.test(activityId))
    return res.status(400).json({error:'Identificador de actividad inválido.'});
  const start=String(req.query?.startDate||'');
  const end=String(req.query?.endDate||'');
  if (!details && (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      !Number.isFinite(Date.parse(start)) || !Number.isFinite(Date.parse(end)) ||
      Date.parse(end)<Date.parse(start) || Date.parse(end)-Date.parse(start)>7*86400000))
    return res.status(400).json({error:'Se requieren fechas válidas startDate/endDate (máximo 7 días).'});
  try {
    const t=await fetch('https://personal.connectapi.garmin.com/personalapitoken-service/personal-api/personal-api-key/token',{
      method:'POST',headers:{Authorization:'ApiKey '+key},signal:AbortSignal.timeout(12000)
    });
    if (!t.ok) return res.status(502).json({error:'No se pudo autenticar con Garmin.',estado:t.status});
    // Garmin Personal API devuelve un JWT en texto plano, no JSON.
    const token=(await t.text()).trim();
    if (!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
      return res.status(502).json({error:'Garmin no devolvió un JWT válido.'});
    if(details){
      const detail=await fetch('https://personal.connectapi.garmin.com/activity-service/activity/'+activityId,{
        headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000)
      });
      if(!detail.ok)return res.status(502).json({error:'No se pudo consultar el detalle Garmin.',estado:detail.status});
      const payload=await detail.json();
      return res.status(200).json({fuente:'garmin-personal',actividad:payload});
    }
    const qs=new URLSearchParams({start:'0',limit:'30',startDate:start,endDate:end});
    const a=await fetch('https://personal.connectapi.garmin.com/activitylist-service/activities/search/activities?'+qs,{
      headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000)
    });
    if(!a.ok) return res.status(502).json({error:'Garmin no devolvió actividades.',estado:a.status});
    const list=await a.json();
    if(!Array.isArray(list))return res.status(502).json({error:'Respuesta de actividades inesperada.'});
    // Only return the fields necessary for the athlete's own training analysis.
    const items=list.map(x=>({
      id:x.activityId??null,
      nombre:x.activityName??null,
      inicio:x.startTimeLocal??null,
      deporte:x.activityType?.typeKey??null,
      segundos:x.duration??null,
      metros:x.distance??null,
      fcMedia:x.averageHR??null,
      fcMax:x.maxHR??null,
      cadencia:x.averageBikingCadenceInRevPerMinute??x.averageRunningCadenceInStepsPerMinute??null
    }));
    return res.status(200).json({fuente:'garmin-personal',desde:start,hasta:end,actividades:items,total:items.length});
  }catch(_e){return res.status(502).json({error:'Garmin no está disponible temporalmente.'});}
}
