// Motor adaptativo v1: recomendaciones de entrenamiento, no diagnóstico clínico.
// Entradas normalizadas: wellness de Intervals.icu y actividades de entrenamiento.
// Los umbrales son heurísticas conservadoras, no predictores validados de lesión.

const mediana = valores => {
  const v = valores.filter(Number.isFinite).sort((a,b)=>a-b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m-1] + v[m]) / 2;
};
const numero = x => (x == null || x === '' || !Number.isFinite(Number(x))) ? null : Number(x);
const fechaBogota = now => new Date(now.getTime() - 5 * 3600000).toISOString().slice(0,10);
const diasEntre = (a,b) => Math.round((Date.parse(a+'T12:00:00Z') - Date.parse(b+'T12:00:00Z'))/86400000);
const valor = (obj, names) => {
  const keys = Object.keys(obj || {});
  for (const name of names) {
    const key = keys.find(k => k.toLowerCase().replace(/[_-]/g,'') === name.toLowerCase().replace(/[_-]/g,''));
    if (key && obj[key] != null) return numero(obj[key]);
  }
  return null;
};

export function evaluarMotor(wellness, actividades, opciones = {}) {
  const hoy = opciones.hoy || fechaBogota(opciones.ahora || new Date());
  const datos = (Array.isArray(wellness) ? wellness : [])
    .filter(w => w && typeof (w.date || w.id) === 'string' && (w.date || w.id) <= hoy)
    .map(w => ({
      date: (w.date || w.id).slice(0,10),
      sleep: valor(w,['sleep','sleepSecs','sleep_secs']),
      hrv: valor(w,['hrv','hrvSdnn']),
      restingHR: valor(w,['restingHR','resting_hr','restingHr']),
      ctl: valor(w,['ctl']),
      atl: valor(w,['atl']),
      rampRate: valor(w,['rampRate','ramp_rate'])
    }))
    .sort((a,b)=>b.date.localeCompare(a.date));
  // sleepSecs se entrega en segundos; sleep en horas.
  for (const w of datos) if (w.sleep != null && w.sleep > 100) w.sleep = +(w.sleep/3600).toFixed(2);
  const ult = datos[0];
  const antiguedad = ult ? diasEntre(hoy,ult.date) : null;
  const recientes = datos.filter(w => diasEntre(hoy,w.date) >= 0 && diasEntre(hoy,w.date) <= 2);
  const actual = recientes.find(w => w.sleep != null || w.hrv != null || w.restingHR != null || w.ctl != null);
  const previos = datos.filter(w => diasEntre(hoy,w.date) >= 3 && diasEntre(hoy,w.date) <= 21);
  const linea = campo => {
    const valores=previos.map(w=>w[campo]).filter(Number.isFinite);
    return valores.length >= 7 ? mediana(valores) : null;
  };
  const baseHrv = linea('hrv'), baseFc = linea('restingHR');
  const suenoUltimos = datos.filter(w => diasEntre(hoy,w.date) <= 3).map(w=>w.sleep).filter(Number.isFinite);
  const suenoTres = suenoUltimos.length >= 2 ? mediana(suenoUltimos) : null;
  const razones = [];
  const senales = [];
  const sleep = actual?.sleep ?? null, hrv=actual?.hrv ?? null, restingHR=actual?.restingHR ?? null;
  if (sleep != null && sleep < 6) {
    senales.push('sueño_muy_corto');
    razones.push('Dormiste menos de 6 horas: reduce la exigencia y prioriza recuperar.');
  } else if ((sleep != null && sleep < 6.75) || (suenoTres != null && suenoTres < 7)) {
    senales.push('sueño_corto');
    razones.push('Tu sueño reciente está por debajo de lo deseable para asimilar la carga.');
  }
  if (baseHrv != null && hrv != null && baseHrv > 0 && hrv < baseHrv*0.85) {
    senales.push('hrv_baja');
    razones.push('Tu HRV está más de un 15 % por debajo de su referencia personal.');
  }
  if (baseFc != null && restingHR != null && restingHR >= baseFc+7) {
    senales.push('fc_reposo_alta');
    razones.push('Tu frecuencia cardíaca en reposo supera tu referencia personal.');
  }
  const ctl = actual?.ctl ?? null, atl=actual?.atl ?? null;
  const forma = ctl != null && atl != null ? +(ctl-atl).toFixed(1) : null;
  if (forma != null && forma < -25) {
    senales.push('fatiga_modelada');
    razones.push('La carga aguda supera ampliamente la condición crónica (forma muy negativa).');
  }
  if (actual?.rampRate != null && actual.rampRate > 7) {
    senales.push('carga_creciente');
    razones.push('La carga está aumentando rápido para un bloque de resistencia.');
  }

  const act = (Array.isArray(actividades) ? actividades : [])
    .filter(a => a && typeof (a.date || a.start_date_local) === 'string');
  const ultimoEntreno = act.map(a => (a.date || a.start_date_local).slice(0,10)).sort().at(-1) || null;
  const estadoDatos = antiguedad == null || antiguedad > 2 ? 'desactualizados' :
    (!actual || [sleep,hrv,restingHR].every(v=>v==null)) ? 'incompletos' : 'recientes';

  let estado = 'mantener', factor = 1, intensidad = 'según plan';
  if (estadoDatos !== 'recientes') {
    estado='sin_datos'; factor=1; intensidad='sin intensificar';
    razones.unshift('Faltan métricas recientes; conserva el plan base y no aumentes carga por inferencia.');
  } else if (senales.includes('sueño_muy_corto') || senales.length >= 2) {
    estado='reducir'; factor=0.5; intensidad='Z1 o descanso';
  } else if (senales.length === 1) {
    estado='moderar'; factor=0.75; intensidad='Z1–Z2';
  } else {
    razones.push('Sin alertas detectadas en las métricas disponibles. Mantén la progresión programada.');
  }
  return {
    version:'1.0', fecha:hoy, estado, factor, intensidad,
    titular: estado==='reducir' ? 'Frena hoy' : estado==='moderar' ? 'Baja un cambio' :
      estado==='sin_datos' ? 'Faltan datos recientes' : 'Mantén lo programado',
    porQue: estado==='reducir' ? 'La recuperación no acompaña la carga: el estímulo intenso puede acumular fatiga.' :
      estado==='moderar' ? 'Una señal de recuperación aconseja limitar la intensidad sin perder continuidad.' :
      estado==='sin_datos' ? 'No conviene cambiar la dosis de entrenamiento sin mediciones recientes.' :
      'La evolución se consolida sosteniendo el bloque, no añadiendo intensidad extra.',
    razones, senales, evidencia: {
      bienestar: estadoDatos, ultimaFecha: ult?.date || null, diasSinDatos: antiguedad,
      ultimoEntreno, suenoH:sleep, suenoMediana3d:suenoTres,
      hrv, hrvReferencia:baseHrv, fcReposo:restingHR, fcReferencia:baseFc,
      ctl, atl, forma
    },
    limites: [
      'No estima el porcentaje de Z3 con FC media: requiere tiempo real en zonas.',
      'No detecta síntomas, lesiones ni baja disponibilidad energética; ante dolor torácico, síncope o disnea inusual, detén el ejercicio y busca valoración médica.',
      'No modifica los umbrales medidos ni sustituye una evaluación de medicina del deporte.'
    ]
  };
}
