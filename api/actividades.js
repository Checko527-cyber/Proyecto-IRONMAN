// api/actividades.js — Actividades reales desde Intervals.icu (que las recibe de tu Garmin).
//
// Alimenta dos cosas en la app:
//   1. El cumplimiento automatico: si Garmin registro la sesion, el plan la marca hecha.
//   2. Las horas reales por semana, para la barra de "hecho vs objetivo".
//
// Variables de entorno en Vercel (las mismas que ya usa /api/wellness):
//   INTERVALS_API_KEY
//   INTERVALS_ATHLETE_ID
//
// Mismo modelo de confianza que /api/wellness: solo lectura, sin datos sensibles.

const DEPORTE = {
  Swim: 'swim', OpenWaterSwim: 'swim',
  Ride: 'bike', VirtualRide: 'bike', GravelRide: 'bike', MountainBikeRide: 'bike', EBikeRide: 'bike',
  Run: 'run', TrailRun: 'run', VirtualRun: 'run', Treadmill: 'run',
  WeightTraining: 'other', Workout: 'other', Yoga: 'other', Walk: 'other', Hike: 'other'
};

function num(v) {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return (typeof n === 'number' && isFinite(n)) ? n : null;
}

// Intervals.icu no garantiza el nombre de cada campo: lo resolvemos por aproximacion.
function clave(obj, nombres) {
  const ks = Object.keys(obj || {});
  for (const n of nombres) {
    const exacta = ks.find(k => k.toLowerCase() === n.toLowerCase());
    if (exacta) return exacta;
  }
  for (const n of nombres) {
    const parcial = ks.find(k => k.toLowerCase().includes(n.toLowerCase()));
    if (parcial) return parcial;
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = process.env;
    if (!INTERVALS_API_KEY) {
      return res.status(500).json({ error: 'Falta INTERVALS_API_KEY en Vercel.' });
    }
    const athlete = (INTERVALS_ATHLETE_ID || '0').trim();
    const auth = 'Basic ' + Buffer.from('API_KEY:' + INTERVALS_API_KEY).toString('base64');

    const dias = Math.min(400, Math.max(7, parseInt(req.query && req.query.dias, 10) || 120));
    const pad = n => String(n).padStart(2, '0');
    const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const desde = fmt(new Date(Date.now() - dias * 86400000));
    const hasta = fmt(new Date(Date.now() + 86400000));

    const url = `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athlete)}/activities?oldest=${desde}&newest=${hasta}`;
    const r = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });

    if (r.status === 401 || r.status === 403) {
      return res.status(502).json({ error: 'Intervals.icu rechazo la clave. Revisa INTERVALS_API_KEY y haz Redeploy.' });
    }
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Intervals.icu respondio ' + r.status, detail: t.slice(0, 300) });
    }

    const crudas = await r.json();
    if (!Array.isArray(crudas)) {
      return res.status(502).json({ error: 'Respuesta inesperada de Intervals.icu.' });
    }

    const muestra = crudas[0] || {};
    const kDur  = clave(muestra, ['moving_time', 'elapsed_time', 'duration']);
    const kDist = clave(muestra, ['distance']);
    const kDesn = clave(muestra, ['total_elevation_gain', 'elevation_gain']);
    const kFcAvg = clave(muestra, ['average_heartrate', 'icu_average_hr', 'avg_hr']);
    const kFcMax = clave(muestra, ['max_heartrate', 'icu_max_hr', 'max_hr']);
    const kCarga = clave(muestra, ['icu_training_load', 'training_load', 'tss']);
    const kKcal  = clave(muestra, ['calories', 'icu_calories']);
    const kCad   = clave(muestra, ['average_cadence', 'avg_cadence']);

    const actividades = crudas.map(a => {
      const seg = num(a[kDur]);
      const m = num(a[kDist]);
      const tipo = a.type || a.sport || '';
      return {
        id: a.id || null,
        date: (a.start_date_local || a.start_date || '').slice(0, 10),
        sport: DEPORTE[tipo] || 'other',
        tipo_crudo: tipo,
        name: a.name || tipo,
        min: seg != null ? Math.round(seg / 60) : null,
        km: m != null ? +(m / 1000).toFixed(2) : null,
        desnivel: num(a[kDesn]),
        fc_media: num(a[kFcAvg]),
        fc_max: num(a[kFcMax]),
        carga: num(a[kCarga]),
        kcal: num(a[kKcal]),
        cadencia: num(a[kCad])
      };
    }).filter(a => a.date).sort((a, b) => a.date < b.date ? 1 : -1);

    // Horas y carga agrupadas por semana ISO, para la barra de hecho vs objetivo.
    const semanaDe = iso => {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const dow = dt.getUTCDay() || 7;
      dt.setUTCDate(dt.getUTCDate() - dow + 1);
      return dt.toISOString().slice(0, 10);
    };
    const semanas = {};
    for (const a of actividades) {
      const k = semanaDe(a.date);
      const s = semanas[k] || (semanas[k] = { lunes: k, min: 0, carga: 0, sesiones: 0, desnivel: 0, por_deporte: {} });
      s.min += a.min || 0;
      s.carga += a.carga || 0;
      s.desnivel += a.desnivel || 0;
      s.sesiones++;
      s.por_deporte[a.sport] = (s.por_deporte[a.sport] || 0) + (a.min || 0);
    }
    const por_semana = Object.values(semanas)
      .map(s => ({ ...s, horas: +(s.min / 60).toFixed(2), carga: Math.round(s.carga), desnivel: Math.round(s.desnivel) }))
      .sort((a, b) => a.lunes < b.lunes ? -1 : 1);

    return res.status(200).json({
      actividades,
      por_semana,
      count: actividades.length,
      rango: { desde, hasta },
      campos_detectados: { kDur, kDist, kDesn, kFcAvg, kFcMax, kCarga, kKcal, kCad }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error consultando Intervals.icu.', detail: String(e) });
  }
}
