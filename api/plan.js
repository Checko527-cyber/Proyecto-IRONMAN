// api/plan.js — Trae los entrenos PLANEADOS del calendario de Intervals.icu
// (que a su vez los recibe de TrainingPeaks). Usa la misma API key que wellness.js.
//
// Variables de entorno: INTERVALS_API_KEY, INTERVALS_ATHLETE_ID (opcional).
// Endpoint Intervals: GET /api/v1/athlete/{id}/events?category=WORKOUT&resolve=true

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = process.env;
    if (!INTERVALS_API_KEY) {
      return res.status(500).json({ error: 'Falta INTERVALS_API_KEY en Vercel.' });
    }
    const athlete = (INTERVALS_ATHLETE_ID || '0').trim();
    const auth = 'Basic ' + Buffer.from('API_KEY:' + INTERVALS_API_KEY).toString('base64');

    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    // Ventana: desde hace 7 días (para ver lo reciente) hasta 60 días adelante.
    const back = parseInt(req.query && req.query.back, 10) || 7;
    const fwd = parseInt(req.query && req.query.fwd, 10) || 60;
    const oldest = new Date(Date.now() - back * 86400000);
    const newest = new Date(Date.now() + fwd * 86400000);

    const url = `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athlete)}/events?category=WORKOUT&resolve=true&oldest=${fmt(oldest)}&newest=${fmt(newest)}`;
    const r = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });

    if (r.status === 401 || r.status === 403) {
      return res.status(502).json({ error: 'Intervals.icu rechazó la clave, o falta el permiso CALENDAR:READ. Revisa tu API key.' });
    }
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Intervals.icu error ' + r.status, detail: t.slice(0, 300) });
    }
    const raw = await r.json();
    if (!Array.isArray(raw)) {
      return res.status(502).json({ error: 'Respuesta inesperada.', detail: JSON.stringify(raw).slice(0, 300) });
    }

    const mapSport = (t) => {
      t = (t || '').toLowerCase();
      if (t.includes('run')) return 'run';
      if (t.includes('ride') || t.includes('bike') || t.includes('cycl') || t.includes('virtual')) return 'bike';
      if (t.includes('swim')) return 'swim';
      if (t.includes('weight') || t.includes('strength') || t.includes('gym')) return 'strength';
      return 'other';
    };

    // Convierte los pasos estructurados en texto legible para humanos.
    const stepText = (steps) => {
      if (!Array.isArray(steps)) return [];
      const out = [];
      const one = (st, reps) => {
        const parts = [];
        if (st.reps && Array.isArray(st.steps)) {
          st.steps.forEach(s => one(s, st.reps));
          return;
        }
        const dur = st.duration ? (st.duration >= 60 ? Math.round(st.duration / 60) + "'" : st.duration + '"') : (st.distance ? (st.distance >= 1000 ? (st.distance / 1000) + ' km' : st.distance + ' m') : '');
        let tgt = '';
        if (st._power && st._power.value) tgt = Math.round(st._power.value) + ' W';
        else if (st.power && st.power.value) tgt = Math.round(st.power.value) + '%FTP';
        else if (st._pace && st._pace.value) tgt = 'ritmo';
        else if (st._hr && st._hr.value) tgt = Math.round(st._hr.value) + ' ppm';
        const kind = st.intensity || (st.warmup ? 'calent' : st.cooldown ? 'suelta' : '');
        const label = [reps ? reps + '×' : '', dur, tgt].filter(Boolean).join(' ');
        parts.push((label || kind || 'paso').trim());
        out.push(parts.join(' '));
      };
      steps.forEach(s => one(s, s.reps));
      return out;
    };

    const workouts = raw.filter(e => e.category === 'WORKOUT').map(e => {
      const wd = e.workout_doc || {};
      return {
        id: e.id,
        date: (e.start_date_local || '').slice(0, 10),
        sport: mapSport(e.type),
        name: e.name || 'Entreno',
        description: (e.description || wd.description || '').slice(0, 600),
        duration_min: wd.duration ? Math.round(wd.duration / 60) : (e.moving_time ? Math.round(e.moving_time / 60) : null),
        distance_km: wd.distance ? +(wd.distance / 1000).toFixed(1) : null,
        load: e.icu_training_load || e.training_load || null,
        target: wd.target || null,
        steps: stepText(wd.steps),
        external: e.external_id || null
      };
    }).filter(w => w.date);

    workouts.sort((a, b) => (a.date < b.date ? -1 : 1));

    return res.status(200).json({
      workouts,
      count: workouts.length,
      range: { oldest: fmt(oldest), newest: fmt(newest) }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error consultando el plan de Intervals.icu.', detail: String(e) });
  }
}
