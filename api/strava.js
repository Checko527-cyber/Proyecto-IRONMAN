// api/strava.js — Vercel Serverless Function
// Lee tus actividades de Strava de los últimos 6 meses y las entrega a "La Ruta".
//
// Variables de entorno requeridas (Project Settings → Environment Variables en Vercel):
//   STRAVA_CLIENT_ID       (de tu API Application en Strava)
//   STRAVA_CLIENT_SECRET   (de tu API Application en Strava)
//   STRAVA_REFRESH_TOKEN   (lo obtienes una vez con el flujo OAuth — ver README.md)
//
// No requiere dependencias: usa fetch nativo de Node 18+.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
    if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
      return res.status(500).json({ error: 'Faltan variables de entorno de Strava. Revisa STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET y STRAVA_REFRESH_TOKEN en Vercel.' });
    }

    // 1) Cambiar el refresh token por un access token vigente
    const tokenResp = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: STRAVA_REFRESH_TOKEN
      })
    });
    const token = await tokenResp.json();
    if (!token.access_token) {
      return res.status(502).json({ error: 'No se pudo autenticar con Strava.', detail: token });
    }
    const access = token.access_token;

    // 2) Traer actividades de los últimos ~6 meses (paginando)
    const after = Math.floor((Date.now() - 1000 * 60 * 60 * 24 * 183) / 1000);
    let page = 1, all = [];
    while (page <= 6) {
      const resp = await fetch(`https://www.strava.com/api/v3/athlete/activities?after=${after}&per_page=200&page=${page}`, {
        headers: { Authorization: `Bearer ${access}` }
      });
      const batch = await resp.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      all = all.concat(batch);
      if (batch.length < 200) break;
      page++;
    }

    // 3) Normalizar y mapear deportes
    const mapSport = (t) => {
      t = (t || '').toLowerCase();
      if (t.includes('run')) return 'run';
      if (t.includes('ride') || t.includes('bike') || t.includes('cycl')) return 'bike';
      if (t.includes('swim')) return 'swim';
      return 'other';
    };
    const norm = all.map(a => ({
      date: (a.start_date_local || a.start_date || '').slice(0, 10),
      sport: mapSport(a.sport_type || a.type),
      name: a.name || mapSport(a.sport_type || a.type),
      km: +(((a.distance || 0) / 1000).toFixed(1)),
      min: Math.round((a.moving_time || 0) / 60),
      kcal: Math.round(a.calories || a.kilojoules || 0),
      elev: Math.round(a.total_elevation_gain || 0),
      avgHr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      maxHr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
      mps: a.average_speed || null,
      watts: a.average_watts ? Math.round(a.average_watts) : null,
      cadence: a.average_cadence ? Math.round(a.average_cadence) : null,
      effort: a.suffer_score || null,
      prs: a.pr_count || 0,
      achv: a.achievement_count || 0
    })).filter(a => a.date);
    norm.sort((x, y) => (x.date < y.date ? 1 : -1));

    // 4) Agregar por semana ISO
    const isoWeek = (ds) => {
      const dt = new Date(ds);
      const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
      const day = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - day);
      const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const wk = Math.ceil((((d - ys) / 86400000) + 1) / 7);
      return d.getUTCFullYear() + '-W' + wk;
    };
    const wk = {}, longest = { run_km: 0, bike_km: 0, swim_km: 0 };
    let totMin = 0;
    norm.forEach(a => {
      totMin += a.min;
      const k = isoWeek(a.date);
      wk[k] = wk[k] || { hours: 0, sessions: 0 };
      wk[k].hours += a.min / 60;
      wk[k].sessions++;
      if (a.sport === 'run' && a.km > longest.run_km) longest.run_km = a.km;
      if (a.sport === 'bike' && a.km > longest.bike_km) longest.bike_km = a.km;
      if (a.sport === 'swim' && a.km > longest.swim_km) longest.swim_km = a.km;
    });
    const byWeek = Object.keys(wk).sort().map(k => ({ week: k, hours: +wk[k].hours.toFixed(1), sessions: wk[k].sessions }));
    const weeks = Math.max(1, byWeek.length);
    const summary = {
      weeks,
      avgWeeklyHours: +(totMin / 60 / weeks).toFixed(1),
      sessPerWeek: +(norm.length / weeks).toFixed(1),
      longest: {
        run_km: +longest.run_km.toFixed(1),
        bike_km: +longest.bike_km.toFixed(1),
        swim_km: +longest.swim_km.toFixed(1)
      },
      byWeek
    };

    return res.status(200).json({ sessions: norm.slice(0, 60), summary });
  } catch (e) {
    return res.status(500).json({ error: 'Error consultando Strava.', detail: String(e) });
  }
}
