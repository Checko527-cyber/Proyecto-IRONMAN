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
    if (id.startsWith('s')) return res.status(400).json({ error: 'Ese id es de Strava. Esta ruta solo lee actividades de Intervals.icu.' });
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

    const [resumen, streams] = await Promise.all([
      pedir(''),
      pedir('/streams?types=time,distance,heartrate,altitude,cadence,velocity_smooth')
    ]);
    if (!resumen) return res.status(404).json({ error: 'Intervals.icu no encontró esa actividad.' });

    // Los streams llegan como lista de objetos {type, data}
    const S = {};
    if (Array.isArray(streams)) for (const s of streams) if (s && s.type) S[s.type] = s.data;

    // --- Parciales por kilómetro, calculados desde el stream ---
    let km = [];
    if (S.distance && S.time && S.distance.length === S.time.length) {
      const d = S.distance, t = S.time, hr = S.heartrate || [], alt = S.altitude || [];
      let marca = 1000, iniT = t[0], iniI = 0;
      for (let i = 1; i < d.length; i++) {
        if (d[i] >= marca) {
          const seg = t[i] - iniT;
          const hrTramo = hr.slice(iniI, i).filter(x => x > 0);
          const altTramo = alt.slice(iniI, i).filter(x => x != null);
          let subida = 0;
          for (let k = 1; k < altTramo.length; k++) { const dz = altTramo[k] - altTramo[k-1]; if (dz > 0) subida += dz; }
          km.push({
            km: km.length + 1,
            seg: Math.round(seg),
            ritmo: Math.floor(seg / 60) + ':' + String(Math.round(seg % 60)).padStart(2, '0'),
            fc_media: hrTramo.length ? Math.round(hrTramo.reduce((a, b) => a + b, 0) / hrTramo.length) : null,
            fc_max: hrTramo.length ? Math.max(...hrTramo) : null,
            desnivel: Math.round(subida)
          });
          iniT = t[i]; iniI = i; marca += 1000;
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
      const Z = [['Z1', 0, 141], ['Z2', 142, 149], ['Z3', 150, 157], ['Z4', 158, 167], ['Z5', 168, 250]];
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

    return res.status(200).json({
      id,
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
    });
  } catch (e) {
    return res.status(500).json({ error: 'Error leyendo la actividad.', detail: String(e) });
  }
}
