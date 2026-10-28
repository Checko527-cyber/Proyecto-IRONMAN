import { evaluarMotor } from '../lib/motor-adaptativo.js';

// GET /api/recomendacion — lectura de datos actuales, sin almacenamiento adicional.
export default async function handler(req, res) {
  res.setHeader('Cache-Control','private, no-store');
  if (req.method !== 'GET') return res.status(405).json({error:'Método no permitido.'});
  const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = process.env;
  if (!INTERVALS_API_KEY) return res.status(503).json({error:'Integración de recuperación no configurada.'});
  const id=encodeURIComponent((INTERVALS_ATHLETE_ID || '0').trim());
  const auth='Basic '+Buffer.from('API_KEY:'+INTERVALS_API_KEY).toString('base64');
  const fecha = d => new Date(d).toISOString().slice(0,10);
  const ahora=new Date();
  const inicio=fecha(ahora.getTime()-28*86400000);
  const fin=fecha(ahora.getTime()+86400000);
  const base='https://intervals.icu/api/v1/athlete/'+id;
  const headers={Authorization:auth,Accept:'application/json'};
  try {
    const [w,a]=await Promise.all([
      fetch(base+'/wellness?oldest='+inicio+'&newest='+fin,{headers}),
      fetch(base+'/activities?oldest='+inicio+'&newest='+fin,{headers})
    ]);
    if (!w.ok || !a.ok) return res.status(502).json({
      error:'No se pudieron consultar los datos diarios de Intervals.icu.',
      fuentes:{bienestar:w.status,actividades:a.status}
    });
    const [well,acts]=await Promise.all([w.json(),a.json()]);
    if (!Array.isArray(well) || !Array.isArray(acts)) {
      return res.status(502).json({error:'Formato de datos inesperado.'});
    }
    return res.status(200).json(evaluarMotor(well,acts,{ahora}));
  } catch (_e) {
    return res.status(502).json({error:'La sincronización de recomendaciones no está disponible temporalmente.'});
  }
}
