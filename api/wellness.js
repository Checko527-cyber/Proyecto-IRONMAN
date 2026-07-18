// api/wellness.js — Trae sueño, HRV, Body Battery y peso desde Intervals.icu (que a su vez los recibe de tu Garmin).
//
// Variables de entorno requeridas en Vercel:
//   INTERVALS_API_KEY       (intervals.icu → Settings → Developer Settings)
//   INTERVALS_ATHLETE_ID    (opcional; ej. i123456. Si no se pone, se intenta resolver solo)
//
// Autenticación: Basic auth con usuario "API_KEY" y contraseña = tu API key.
// No requiere dependencias: usa fetch nativo de Node 18+.

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = process.env;
    if (!INTERVALS_API_KEY) {
      return res.status(500).json({ error: 'Falta INTERVALS_API_KEY en Vercel. Ve a intervals.icu → Settings → Developer Settings, copia tu API key y agrégala como variable de entorno. Luego haz Redeploy.' });
    }

    const athlete = (INTERVALS_ATHLETE_ID || '0').trim();
    const auth = 'Basic ' + Buffer.from('API_KEY:' + INTERVALS_API_KEY).toString('base64');

    // Rango: últimos ~120 días (suficiente para tendencias sin traer de más)
    const days = Math.min(365, Math.max(7, parseInt(req.query && req.query.days, 10) || 120));
    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const newest = new Date();
    const oldest = new Date(Date.now() - days * 86400000);

    const url = `https://intervals.icu/api/v1/athlete/${encodeURIComponent(athlete)}/wellness?oldest=${fmt(oldest)}&newest=${fmt(newest)}`;
    const r = await fetch(url, { headers: { Authorization: auth, Accept: 'application/json' } });

    if (r.status === 401 || r.status === 403) {
      return res.status(502).json({ error: 'Intervals.icu rechazó la clave. Revisa que INTERVALS_API_KEY esté bien copiada (sin espacios) y que hiciste Redeploy.' });
    }
    if (r.status === 404) {
      return res.status(502).json({ error: 'No se encontró el atleta. Agrega INTERVALS_ATHLETE_ID en Vercel con tu ID de intervals.icu (aparece en la URL de tu perfil, ej. i123456).' });
    }
    if (!r.ok) {
      const t = await r.text();
      return res.status(502).json({ error: 'Intervals.icu respondió con error ' + r.status, detail: t.slice(0, 300) });
    }

    const raw = await r.json();
    if (!Array.isArray(raw)) {
      return res.status(502).json({ error: 'Respuesta inesperada de Intervals.icu.', detail: JSON.stringify(raw).slice(0, 300) });
    }

    // Los nombres de campo pueden variar. Buscamos por coincidencia flexible.
    const findKey = (obj, ...needles) => {
      const keys = Object.keys(obj || {});
      for (const n of needles) {
        const exact = keys.find(k => k.toLowerCase() === n);
        if (exact) return exact;
      }
      for (const n of needles) {
        const partial = keys.find(k => k.toLowerCase().replace(/[_\s-]/g, '').includes(n.replace(/[_\s-]/g, '')));
        if (partial) return partial;
      }
      return null;
    };
    const num = (v) => (v == null || v === '' || isNaN(+v)) ? null : +v;

    const sample = raw.find(d => d && Object.keys(d).length > 3) || raw[0] || {};
    const kSleep = findKey(sample, 'sleepsecs', 'sleep_secs', 'sleeptime', 'sleep');
    const kHrv = findKey(sample, 'hrv', 'hrvsdnn', 'hrv_sdnn');
    const kBB = findKey(sample, 'bodybattery', 'body_battery', 'battery');
    const kWeight = findKey(sample, 'weight');
    const kRhr = findKey(sample, 'restinghr', 'resting_hr');
    const kReady = findKey(sample, 'readiness');
    const kCtl = findKey(sample, 'ctl');
    const kAtl = findKey(sample, 'atl');
    const kRamp = findKey(sample, 'ramprate', 'ramp_rate');
    const kVo2 = findKey(sample, 'vo2max', 'vo2_max', 'icu_vo2max');
    const kSleepScore = findKey(sample, 'sleepscore', 'sleep_score');

    const wellness = raw.map(d => {
      const sleepRawVal = kSleep ? num(d[kSleep]) : null;
      // sleep_secs viene en segundos; si el número es pequeño, ya son horas.
      const sleepH = sleepRawVal == null ? null
        : (sleepRawVal > 100 ? +(sleepRawVal / 3600).toFixed(2) : +sleepRawVal.toFixed(2));
      const ctl = kCtl ? num(d[kCtl]) : null;
      const atl = kAtl ? num(d[kAtl]) : null;
      return {
        date: d.id || d.date || null,
        sleep: sleepH,
        sleepScore: kSleepScore ? num(d[kSleepScore]) : null,
        hrv: kHrv ? num(d[kHrv]) : null,
        bb: kBB ? num(d[kBB]) : null,
        weight: kWeight ? num(d[kWeight]) : null,
        restingHR: kRhr ? num(d[kRhr]) : null,
        readiness: kReady ? num(d[kReady]) : null,
        ctl: ctl == null ? null : +ctl.toFixed(1),
        atl: atl == null ? null : +atl.toFixed(1),
        form: (ctl != null && atl != null) ? +(ctl - atl).toFixed(1) : null,
        rampRate: kRamp ? num(d[kRamp]) : null,
        vo2max: kVo2 ? num(d[kVo2]) : null
      };
    }).filter(d => d.date && (d.sleep != null || d.hrv != null || d.bb != null || d.weight != null || d.ctl != null));

    wellness.sort((a, b) => (a.date < b.date ? 1 : -1));

    return res.status(200).json({
      wellness,
      count: wellness.length,
      mapped: { sleep: kSleep, hrv: kHrv, bodyBattery: kBB, weight: kWeight, restingHR: kRhr, readiness: kReady, ctl: kCtl, atl: kAtl, rampRate: kRamp, vo2max: kVo2 },
      availableFields: Object.keys(sample)
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error consultando Intervals.icu.', detail: String(e) });
  }
}
