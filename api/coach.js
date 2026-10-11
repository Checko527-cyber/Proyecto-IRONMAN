// api/coach.js — Agregador único de datos para el entrenador.
//
// Reúne en UNA respuesta todo lo que hace falta para analizar el entrenamiento:
// perfil y zonas, estado de forma de hoy, tendencias de recuperación,
// volumen semanal por deporte, distancias máximas, actividades y plan.
//
// Fuente: Intervals.icu (gratuito), que ya recibe automáticamente Garmin y Strava.
//
// Variables de entorno (ya configuradas en Vercel):
//   INTERVALS_API_KEY · INTERVALS_ATHLETE_ID · COACH_TOKEN
//
// Uso:
//   GET /api/coach?token=XXX                 → ventana por defecto (120 días)
//   GET /api/coach?token=XXX&dias=60         → ventana más corta
//   GET /api/coach?token=XXX&formato=breve   → sin listados largos

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID, COACH_TOKEN } = process.env;

  if (!COACH_TOKEN) {
    return res.status(500).json({ error: 'Falta COACH_TOKEN en Vercel.' });
  }
  if (((req.query && req.query.token) || '') !== COACH_TOKEN) {
    return res.status(401).json({ error: 'Token invalido.' });
  }
  if (!INTERVALS_API_KEY) {
    return res.status(500).json({ error: 'Falta INTERVALS_API_KEY en Vercel.' });
  }

  const atleta = (INTERVALS_ATHLETE_ID || '0').trim();
  const auth = 'Basic ' + Buffer.from('API_KEY:' + INTERVALS_API_KEY).toString('base64');
  const headers = { Authorization: auth, Accept: 'application/json' };

  const dias = Math.min(365, Math.max(14, parseInt(req.query.dias, 10) || 120));
  const breve = req.query.formato === 'breve';

  const fmt = (d) => d.toISOString().slice(0, 10);
  const hoy = new Date();
  const desde = new Date(hoy.getTime() - dias * 86400000);
  const planDesde = new Date(hoy.getTime() - 7 * 86400000);
  const planHasta = new Date(hoy.getTime() + 60 * 86400000);

  const base = `https://intervals.icu/api/v1/athlete/${encodeURIComponent(atleta)}`;

  async function pedir(url, etiqueta) {
    try {
      const r = await fetch(url, { headers });
      if (!r.ok) return { _error: `${etiqueta}: HTTP ${r.status}` };
      return await r.json();
    } catch (e) {
      return { _error: `${etiqueta}: ${String(e.message || e)}` };
    }
  }

  const [perfil, bienestar, actividades, planificados] = await Promise.all([
    pedir(base, 'perfil'),
    pedir(`${base}/wellness?oldest=${fmt(desde)}&newest=${fmt(hoy)}`, 'bienestar'),
    pedir(`${base}/activities?oldest=${fmt(desde)}&newest=${fmt(hoy)}`, 'actividades'),
    pedir(`${base}/events?category=WORKOUT&resolve=true&oldest=${fmt(planDesde)}&newest=${fmt(planHasta)}`, 'plan')
  ]);

  // ---------- normalizacion ----------

  const deporte = (t) => {
    t = String(t || '').toLowerCase();
    if (t.includes('run')) return 'carrera';
    if (t.includes('ride') || t.includes('bike') || t.includes('cycl') || t.includes('virtual')) return 'bici';
    if (t.includes('swim')) return 'nado';
    if (t.includes('weight') || t.includes('strength')) return 'fuerza';
    if (t.includes('brick') || t.includes('multi') || t.includes('cross')) return 'brick';
    return 'otro';
  };

  const ritmo = (seg, metros) => {
    if (!seg || !metros) return null;
    const s = seg / (metros / 1000);
    return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')} /km`;
  };

  const acts = Array.isArray(actividades) ? actividades.map(a => ({
    fecha: (a.start_date_local || '').slice(0, 10),
    deporte: deporte(a.type || a.sport),
    nombre: a.name || '',
    km: +(((a.distance || 0) / 1000).toFixed(2)),
    min: Math.round((a.moving_time || a.elapsed_time || 0) / 60),
    fc_media: a.average_heartrate || null,
    fc_max: a.max_heartrate || null,
    desnivel_m: a.total_elevation_gain != null ? Math.round(a.total_elevation_gain) : null,
    vatios: a.icu_average_watts || a.average_watts || null,
    carga: a.icu_training_load != null ? Math.round(a.icu_training_load) : null,
    kcal: a.calories || null,
    ritmo: ritmo(a.moving_time, a.distance)
  })).filter(a => a.fecha).sort((x, y) => (x.fecha < y.fecha ? 1 : -1)) : [];

  // Intervals.icu no garantiza los nombres de los campos de wellness,
  // asi que se resuelven dinamicamente (mismo patron que wellness.js).
  const buscarClave = (obj, ...candidatos) => {
    const claves = Object.keys(obj || {});
    for (const c of candidatos) {
      const exacta = claves.find(k => k.toLowerCase() === c);
      if (exacta) return exacta;
    }
    for (const c of candidatos) {
      const parcial = claves.find(k =>
        k.toLowerCase().replace(/[_\s-]/g, '').includes(c.replace(/[_\s-]/g, '')));
      if (parcial) return parcial;
    }
    return null;
  };
  const num = (v) => (v == null || v === '' || isNaN(+v)) ? null : +v;

  const bruto = Array.isArray(bienestar) ? bienestar : [];
  const muestra = bruto.find(d => d && Object.keys(d).length > 3) || bruto[0] || {};
  const kSueno = buscarClave(muestra, 'sleepsecs', 'sleep_secs', 'sleeptime', 'sleep');
  const kCalidad = buscarClave(muestra, 'sleepscore', 'sleep_score');
  const kHrv = buscarClave(muestra, 'hrv', 'hrvsdnn', 'hrv_sdnn');
  const kPeso = buscarClave(muestra, 'weight');
  const kFcrep = buscarClave(muestra, 'restinghr', 'resting_hr');
  const kCtl = buscarClave(muestra, 'ctl');
  const kAtl = buscarClave(muestra, 'atl');
  const kVo2 = buscarClave(muestra, 'vo2max', 'vo2_max', 'icu_vo2max');
  const kSpo2 = buscarClave(muestra, 'spo2', 'sp_o2');

  const well = bruto.map(w => {
    const s = kSueno ? num(w[kSueno]) : null;
    // sleep_secs llega en segundos; si el numero es pequeno ya son horas.
    const sueno = s == null ? null : (s > 100 ? +(s / 3600).toFixed(2) : +s.toFixed(2));
    const ctl = kCtl ? num(w[kCtl]) : null;
    const atl = kAtl ? num(w[kAtl]) : null;
    return {
      fecha: w.id || w.date || null,
      sueno_h: sueno,
      calidad_sueno: kCalidad ? num(w[kCalidad]) : null,
      hrv: kHrv ? num(w[kHrv]) : null,
      fc_reposo: kFcrep ? num(w[kFcrep]) : null,
      peso_kg: kPeso ? num(w[kPeso]) : null,
      ctl: ctl == null ? null : +ctl.toFixed(1),
      atl: atl == null ? null : +atl.toFixed(1),
      forma_tsb: (ctl != null && atl != null) ? +(ctl - atl).toFixed(1) : null,
      vo2max: kVo2 ? num(w[kVo2]) : null,
      spo2: kSpo2 ? num(w[kSpo2]) : null
    };
  }).filter(w => w.fecha).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

  const plan = Array.isArray(planificados) ? planificados
    .filter(e => e.category === 'WORKOUT')
    .map(e => ({
      fecha: (e.start_date_local || e.start_date || '').slice(0, 10),
      deporte: deporte(e.type),
      nombre: e.name || '',
      descripcion: (e.description || '').slice(0, 500),
      duracion_min: e.moving_time ? Math.round(e.moving_time / 60) : null,
      distancia_km: e.distance ? +((e.distance / 1000).toFixed(2)) : null,
      carga_tss: e.icu_training_load || null
    })).filter(w => w.fecha).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)) : [];

  // ---------- resumenes calculados ----------

  const semanaISO = (ds) => {
    const dt = new Date(ds + 'T12:00:00');
    const d = new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const ys = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return d.getUTCFullYear() + '-W' + String(Math.ceil((((d - ys) / 86400000) + 1) / 7)).padStart(2, '0');
  };

  const sem = {};
  const maximos = { carrera_km: 0, bici_km: 0, nado_km: 0 };
  acts.forEach(a => {
    const k = semanaISO(a.fecha);
    sem[k] = sem[k] || { semana: k, horas: 0, sesiones: 0, carga: 0, carrera_km: 0, bici_km: 0, nado_km: 0, desnivel_m: 0 };
    sem[k].horas += a.min / 60;
    sem[k].sesiones++;
    sem[k].carga += a.carga || 0;
    sem[k].desnivel_m += a.desnivel_m || 0;
    if (a.deporte === 'carrera') sem[k].carrera_km += a.km;
    if (a.deporte === 'bici') sem[k].bici_km += a.km;
    if (a.deporte === 'nado') sem[k].nado_km += a.km;
    const key = a.deporte + '_km';
    if (maximos[key] != null && a.km > maximos[key]) maximos[key] = a.km;
  });

  const porSemana = Object.values(sem).map(s => ({
    ...s,
    horas: +s.horas.toFixed(1),
    carrera_km: +s.carrera_km.toFixed(1),
    bici_km: +s.bici_km.toFixed(1),
    nado_km: +s.nado_km.toFixed(1),
    carga: Math.round(s.carga)
  })).sort((a, b) => (a.semana < b.semana ? -1 : 1));

  const ult8 = porSemana.slice(-8);
  const mediaHoras = ult8.length ? +(ult8.reduce((a, b) => a + b.horas, 0) / ult8.length).toFixed(1) : 0;

  const media = (arr, campo) => {
    const v = arr.map(x => x[campo]).filter(x => x != null && !isNaN(x));
    return v.length ? +(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : null;
  };
  const tendencia = (campo) => {
    const a = media(well.slice(0, 7), campo), b = media(well.slice(7, 14), campo);
    return { reciente_7d: a, previo_7d: b, cambio: (a != null && b != null) ? +(a - b).toFixed(2) : null };
  };
  const ultimo = (campo) => {
    const w = well.find(x => x[campo] != null);
    return w ? { valor: w[campo], fecha: w.fecha } : null;
  };

  const hoyW = well[0] || {};
  const ratio = (hoyW.ctl && hoyW.atl) ? +(hoyW.atl / hoyW.ctl).toFixed(2) : null;

  const zonas = Array.isArray(perfil && perfil.sportSettings) ? perfil.sportSettings.map(s => ({
    deportes: s.types || null,
    fc_umbral: s.lthr || null,
    fc_max: s.max_hr || null,
    potencia_umbral: s.ftp || null,
    zonas_fc: s.hr_zones || null
  })) : [];

  const errores = [perfil, bienestar, actividades, planificados].filter(x => x && x._error).map(x => x._error);

  return res.status(200).json({
    _fuente: 'Intervals.icu — recibe Garmin y Strava automaticamente',
    _generado: new Date().toISOString(),
    _ventana_dias: dias,
    _errores: errores.length ? errores : undefined,

    atleta: {
      nombre: (perfil && perfil.name) || null,
      peso_kg: ultimo('peso_kg'),
      fc_reposo: ultimo('fc_reposo'),
      vo2max: ultimo('vo2max'),
      zonas
    },

    estado_hoy: {
      fecha: hoyW.fecha || null,
      fitness_ctl: hoyW.ctl ?? null,
      fatiga_atl: hoyW.atl ?? null,
      forma_tsb: hoyW.forma_tsb ?? null,
      ratio_agudo_cronico: ratio,
      semaforo_ratio: ratio == null ? null : (ratio > 1.3 ? 'riesgo de lesion' : (ratio < 0.8 ? 'desentrenando' : 'optimo')),
      hrv: hoyW.hrv ?? null,
      sueno_h: hoyW.sueno_h ?? null
    },

    tendencias_14d: {
      sueno_h: tendencia('sueno_h'),
      hrv: tendencia('hrv'),
      fc_reposo: tendencia('fc_reposo'),
      peso_kg: tendencia('peso_kg')
    },

    volumen: {
      media_horas_semana_8sem: mediaHoras,
      distancias_maximas: maximos,
      por_semana: porSemana
    },

    plan_proximo: plan,
    _plan_nota: plan.length ? undefined
      : 'Sin entrenos planificados en Intervals.icu. Si los programas en TrainingPeaks, falta activar la sincronizacion TrainingPeaks -> Intervals.icu.',

    bienestar: breve ? well.slice(0, 21) : well,
    actividades: breve ? acts.slice(0, 30) : acts,

    _limitaciones: [
      'Body Battery y Training Readiness son metricas propietarias de Garmin y no llegan a Intervals.icu.',
      'El balance de carga aerobica de Garmin (AEROBIC_LOW_SHORTAGE) tampoco esta disponible aqui.',
      'Los entrenos planificados solo aparecen si TrainingPeaks sincroniza con Intervals.icu.'
    ]
  });
}
