// api/actividad.js — Detalle de UNA actividad: parciales por kilómetro y curva de pulso.
//
// Sirve para analizar una carrera de verdad: si fue negative split, cuánta deriva
// cardíaca hubo, dónde se rompió el ritmo. El resumen por sí solo no lo dice.
//
// Uso: /api/actividad?id=i197193726   (el id tal como lo devuelve /api/actividades)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const { INTERVALS_API_KEY, INTERVALS_ATHLETE_ID } = process.env;
    if (!INTERVALS_API_KEY) return res.status(500).json({ error: 'Falta INTERVALS_API_KEY.' });

    let id = String((req.query && req.query.id) || '').trim();
    if (!id) return res.status(400).json({ error: 'Falta el parámetro id.' });
    // Un id que empieza por 's' viene de Strava: se lee de allí.
    // Pasa cuando Intervals aún no ha terminado de importar la sesión.
    const esStrava = id.startsWith('s');

    let resumen = null, S = {};

    if (esStrava) {
      const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN } = process.env;
      if (!STRAVA_CLIENT_ID) return res.status(500).json({ error: 'Faltan credenciales de Strava.' });
      const tk = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET,
          grant_type: 'refresh_token', refresh_token: STRAVA_REFRESH_TOKEN })
      });
      const t = await tk.json();
      if (!t.access_token) return res.status(502).json({ error: 'No se pudo autenticar con Strava.' });
      const H = { Authorization: 'Bearer ' + t.access_token };
      const sid = id.slice(1);
      const [ra, rs] = await Promise.all([
        fetch('https://www.strava.com/api/v3/activities/' + sid, { headers: H }),
        fetch('https://www.strava.com/api/v3/activities/' + sid +
              '/streams?keys=time,distance,heartrate,altitude,cadence&key_by_type=true', { headers: H })
      ]);
      if (!ra.ok) return res.status(404).json({ error: 'Strava no encontró esa actividad.' });
      const a = await ra.json();
      resumen = {
        name: a.name, start_date_local: a.start_date_local, type: a.sport_type || a.type,
        distance: a.distance, moving_time: a.moving_time,
        average_heartrate: a.average_heartrate, max_heartrate: a.max_heartrate,
        icu_training_load: a.suffer_score, total_elevation_gain: a.total_elevation_gain,
        average_cadence: a.average_cadence
      };
      if (rs.ok) {
        const st = await rs.json();
        for (const k of Object.keys(st || {})) if (st[k] && st[k].data) S[k] = st[k].data;
      }
      return res.status(200).json(armar(id, resumen, S, 'strava'));
    }

    if (!id.startsWith('i')) id = 'i' + id;
    const auth = 'Basic ' + Buffer.from('API_KEY:' + INTERVALS_API_KEY).toString('base64');
    const base = 'https://intervals.icu/api/v1/activity/' + encodeURIComponent(id);
    const pedir = async (ruta) => {
      try {
        const r = await fetch(base + ruta, { headers: { Authorization: auth, Accept: 'application/json' } });
        if (!r.ok) return null;
        return await r.json();
      } catch (e) { return null; }
    };

    const [resumenI, streams] = await Promise.all([
      pedir(''),
      pedir('/streams?types=time,distance,heartrate,altitude,cadence,velocity_smooth')
    ]);
    if (!resumenI) return res.status(404).json({ error: 'Intervals.icu no encontró esa actividad.' });

    // Los streams de Intervals llegan como lista de objetos {type, data}
    if (Array.isArray(streams)) for (const s of streams) if (s && s.type) S[s.type] = s.data;

    return res.status(200).json(armar(id, resumenI, S, 'intervals'));
  } catch (e) {
    return res.status(500).json({ error: 'Error leyendo la actividad.', detail: String(e) });
  }
}

// Mismos cálculos para las dos fuentes: parciales, mitades, deriva y zonas.
function armar(id, resumen, S, fuente) {
  try {

    // --- Parciales por kilómetro, calculados desde el stream ---
    let km = [];
    if (S.distance && S.time && S.distance.length === S.time.length) {
      const d = S.distance, t = S.time, hr = S.heartrate || [], alt = S.altitude || [];
      const esNado = (resumen.type || '').toLowerCase().includes('swim');
      const tramo = esNado ? 500 : 1000;   // en natación, 500 m dice más que 1 km
      let marca = tramo, iniT = t[0], iniI = 0;
      for (let i = 1; i < d.length; i++) {
        if (d[i] >= marca) {
          const seg = t[i] - iniT;
          const hrTramo = hr.slice(iniI, i).filter(x => x > 0);
          const altTramo = alt.slice(iniI, i).filter(x => x != null);
          let subida = 0;
          for (let k = 1; k < altTramo.length; k++) { const dz = altTramo[k] - altTramo[k-1]; if (dz > 0) subida += dz; }
          km.push({
            km: km.length + 1,
            metros: tramo * (km.length + 1),
            por_100m: esNado ? Math.floor(seg / 10 / 60) + ':' + String(Math.round((seg / (tramo / 100)) % 60)).padStart(2, '0') : null,
            seg: Math.round(seg),
            ritmo: Math.floor(seg / 60) + ':' + String(Math.round(seg % 60)).padStart(2, '0'),
            fc_media: hrTramo.length ? Math.round(hrTramo.reduce((a, b) => a + b, 0) / hrTramo.length) : null,
            fc_max: hrTramo.length ? Math.max(...hrTramo) : null,
            desnivel: Math.round(subida)
          });
          iniT = t[i]; iniI = i; marca += tramo;
        }
      }
    }

    // --- Mitades y deriva cardíaca ---
    let mitades = null;
    if (km.length >= 4) {
      const m = Math.floor(km.length / 2);
      const bloque = (arr) => {
        const seg = arr.reduce((a, b) => a + b.seg, 0);
        const fcs = arr.map(x => x.fc_media).filter(x => x != null);
        return {
          km: arr.length, seg: Math.round(seg),
          ritmo_medio: Math.floor(seg / arr.length / 60) + ':' + String(Math.round((seg / arr.length) % 60)).padStart(2, '0'),
          fc_media: fcs.length ? Math.round(fcs.reduce((a, b) => a + b, 0) / fcs.length) : null
        };
      };
      const p = bloque(km.slice(0, m)), s2 = bloque(km.slice(m));
      mitades = {
        primera: p, segunda: s2,
        negative_split: (s2.seg / s2.km) < (p.seg / p.km),
        diferencia_seg_por_km: Math.round((s2.seg / s2.km) - (p.seg / p.km)),
        deriva_fc: (p.fc_media && s2.fc_media) ? s2.fc_media - p.fc_media : null
      };
    }

    // --- Tiempo por zona de pulso (zonas de carrera calibradas) ---
    let zonas = null;
    if (S.heartrate && S.time) {
      // Cada deporte con sus zonas: usar las de carrera para medir una natación
      // da un reparto sin sentido, porque el pulso en el agua corre más bajo.
      // Carrera medida en el Allianz 15K (umbral 165); bici 157; nado 158.
      const t = (resumen.type || '').toLowerCase();
      const Z = t.includes('swim')
        ? [['Z1', 0, 133], ['Z2', 134, 141], ['Z3', 142, 149], ['Z4', 150, 156], ['Z5', 157, 250]]
        : (t.includes('ride') || t.includes('bike') || t.includes('cycl'))
        ? [['Z1', 0, 132], ['Z2', 133, 139], ['Z3', 140, 147], ['Z4', 148, 156], ['Z5', 157, 250]]
        : [['Z1', 0, 139], ['Z2', 140, 147], ['Z3', 148, 155], ['Z4', 156, 164], ['Z5', 165, 250]];
      const conteo = Z.map(() => 0);
      for (let i = 1; i < S.heartrate.length; i++) {
        const h = S.heartrate[i]; if (!h) continue;
        const dt = (S.time[i] - S.time[i-1]) || 1;
        const z = Z.findIndex(([, lo, hi]) => h >= lo && h <= hi);
        if (z >= 0) conteo[z] += dt;
      }
      const tot = conteo.reduce((a, b) => a + b, 0) || 1;
      zonas = Z.map(([n], i) => ({ zona: n, seg: Math.round(conteo[i]), pct: +(conteo[i] / tot * 100).toFixed(1) }));
    }

    return {
      id, fuente,
      nombre: resumen.name || '',
      fecha: (resumen.start_date_local || '').slice(0, 19),
      tipo: resumen.type || '',
      distancia_km: resumen.distance != null ? +(resumen.distance / 1000).toFixed(2) : null,
      duracion_min: resumen.moving_time != null ? Math.round(resumen.moving_time / 60) : null,
      fc_media: resumen.average_heartrate || null,
      fc_max: resumen.max_heartrate || null,
      carga: resumen.icu_training_load != null ? Math.round(resumen.icu_training_load) : null,
      desnivel: resumen.total_elevation_gain != null ? Math.round(resumen.total_elevation_gain) : null,
      cadencia: resumen.average_cadence || null,
      kilometros: km,
      mitades,
      zonas,
      _streams: Object.keys(S)
    };
  } catch (e) {
    return { id, fuente, error: 'No se pudieron calcular los parciales.', detail: String(e) };
  }
}
