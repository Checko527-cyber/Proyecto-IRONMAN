import { mismaSesion } from '../lib/misma-sesion.js';

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


// Strava como red de seguridad.
// El 18/10/2026 Intervals.icu dejó de recibir actividades durante tres días —
// el bienestar seguía entrando, los entrenamientos no — y la app se quedó ciega
// justo el día de una carrera. Desde entonces completamos los huecos con Strava,
// que recibe directo del reloj. Intervals manda cuando tiene el dato; Strava
// solo rellena lo que falta.
async function traerStrava(dias) {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) return [];
  try {
    const tk = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token', refresh_token: STRAVA_REFRESH_TOKEN })
    });
    const t = await tk.json();
    if (!t.access_token) return [];
    const after = Math.floor((Date.now() - 86400000 * Math.min(dias, 183)) / 1000);
    let page = 1, todas = [];
    while (page <= 4) {
      const r = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`,
        { headers: { Authorization: 'Bearer ' + t.access_token } });
      const lote = await r.json();
      if (!Array.isArray(lote) || !lote.length) break;
      todas = todas.concat(lote);
      if (lote.length < 200) break;
      page++;
    }
    const dep = x => { x = (x || '').toLowerCase();
      if (x.includes('run')) return 'run';
      if (x.includes('ride') || x.includes('bike') || x.includes('cycl')) return 'bike';
      if (x.includes('swim')) return 'swim';
      return 'other'; };
    return todas.map(a => ({
      id: a.id ? 's' + a.id : null,
      date: (a.start_date_local || a.start_date || '').slice(0, 10),
      startedAt: a.start_date || a.start_date_local || null,
      sport: dep(a.sport_type || a.type),
      tipo_crudo: a.sport_type || a.type || '',
      name: a.name || '',
      min: Math.round((a.moving_time || 0) / 60),
      km: a.distance != null ? +((a.distance / 1000).toFixed(2)) : null,
      desnivel: a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : null,
      fc_media: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      fc_max: a.max_heartrate ? Math.round(a.max_heartrate) : null,
      carga: a.suffer_score != null ? Math.round(a.suffer_score) : null,
      kcal: a.calories != null ? Math.round(a.calories) : null,
      cadencia: a.average_cadence != null ? +a.average_cadence : null,
      prs: a.pr_count || 0,
      fuente: 'strava'
    })).filter(a => a.date && a.min);
  } catch (e) { return []; }
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

    const dias = Math.min(900, Math.max(7, parseInt(req.query && req.query.dias, 10) || 120));
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

    // Una sola actividad no basta como muestra: una recien importada puede llegar
    // sin campos y dejar la deteccion en nulo para todas las demas. Se unen las
    // claves de un buen puñado de registros.
    const muestra = {};
    for (const a of crudas.slice(0, 60)) {
      if (!a || typeof a !== 'object') continue;
      for (const k of Object.keys(a)) if (a[k] != null && !(k in muestra)) muestra[k] = a[k];
    }
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
        startedAt: a.start_date || a.start_date_local || null,
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
        cadencia: num(a[kCad]),
        fuente: 'intervals'
      };
    }).filter(a => a.date).sort((a, b) => a.date < b.date ? 1 : -1);

    // --- Fusión con Strava: solo rellena lo que Intervals no tiene ---
    const deStrava = await traerStrava(dias);
    const CAMPOS = ['min', 'km', 'fc_media', 'fc_max', 'carga', 'kcal', 'desnivel'];
    const completitud = a => CAMPOS.filter(k => a[k] != null).length;
    // Dos registros son la misma sesion si coinciden fecha y deporte y, ademas,
    // el nombre, la duracion o la distancia. Con tres criterios basta que uno
    // acierte, asi que un campo vacio ya no rompe el emparejamiento.
    const fusionadas = actividades.slice();
    let rellenadas = 0, mejoradas = 0;
    for (const sv of deStrava) {
      if (sv.date < desde) continue;
      const i = fusionadas.findIndex(x => mismaSesion(x, sv));
      if (i < 0) { fusionadas.push(sv); rellenadas++; continue; }
      // Misma sesion por dos vias: gana la version con mas datos, conservando
      // de la otra cualquier campo que a la ganadora le falte.
      if (completitud(sv) > completitud(fusionadas[i])) {
        const perdedor = fusionadas[i];
        const ganador = Object.assign({}, sv);
        for (const k of CAMPOS) if (ganador[k] == null && perdedor[k] != null) ganador[k] = perdedor[k];
        if (!ganador.name && perdedor.name) ganador.name = perdedor.name;
        ganador.fuente = sv.fuente + '+' + perdedor.fuente;
        fusionadas[i] = ganador;
        mejoradas++;
      } else {
        for (const k of CAMPOS) if (fusionadas[i][k] == null && sv[k] != null) fusionadas[i][k] = sv[k];
      }
    }
    // Un registro sin duración no es una sesión: es una importación a medias.
    // Se descarta DESPUÉS de fusionar, para no tirar uno que Strava sí completó.
    const descartadas = fusionadas.filter(a => a.min == null).length;
    const limpias = fusionadas.filter(a => a.min != null);
    limpias.sort((a, b) => a.date < b.date ? 1 : -1);

    const conDatos = actividades.filter(a => a.min != null);
    const ultIntervals = conDatos.length ? conDatos[0].date : null;
    const hoyStr = fmt(new Date());
    const desfase = ultIntervals
      ? Math.round((new Date(hoyStr) - new Date(ultIntervals)) / 86400000) : null;

    // Horas y carga agrupadas por semana ISO, para la barra de hecho vs objetivo.
    const semanaDe = iso => {
      const [y, m, d] = iso.split('-').map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      const dow = dt.getUTCDay() || 7;
      dt.setUTCDate(dt.getUTCDate() - dow + 1);
      return dt.toISOString().slice(0, 10);
    };
    const semanas = {};
    for (const a of limpias) {
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
      actividades: limpias,
      por_semana,
      count: limpias.length,
      fuentes: { intervals: actividades.length, strava_rellenadas: rellenadas, completadas_con_strava: mejoradas, incompletas_descartadas: descartadas },
      sincronizacion: {
        ultima_de_intervals: ultIntervals,
        dias_de_desfase: desfase,
        aviso: (desfase != null && desfase >= 2)
          ? 'Intervals.icu lleva ' + desfase + ' dias sin recibir actividades. Los huecos se rellenaron con Strava.'
          : null
      },
      rango: { desde, hasta },
      campos_detectados: { kDur, kDist, kDesn, kFcAvg, kFcMax, kCarga, kKcal, kCad }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error consultando Intervals.icu.', detail: String(e) });
  }
}
