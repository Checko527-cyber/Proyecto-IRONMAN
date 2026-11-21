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
  // Restricciones declaradas por el atleta: nunca inferir una enfermedad solo por HRV o ausencia de sesiones.
  // Formato: {tipo:'enfermedad'|'disponibilidad'|'lesion', desde:'YYYY-MM-DD', hasta:'YYYY-MM-DD',
  //           estado:'activo'|'recuperacion', disciplinas:['swim'|'bike'|'run'|'strength']}.
  const restricciones = (Array.isArray(opciones.restricciones) ? opciones.restricciones : [])
    .filter(r => r && /^\d{4}-\d{2}-\d{2}$/.test(r.desde || '') &&
      /^\d{4}-\d{2}-\d{2}$/.test(r.hasta || '') && r.desde <= hoy && r.hasta >= hoy)
    .map(r => ({
      tipo: ['enfermedad','lesion','disponibilidad'].includes(r.tipo) ? r.tipo : 'disponibilidad',
      estado: r.estado === 'recuperacion' ? 'recuperacion' : 'activo',
      desde: r.desde, hasta: r.hasta,
      disciplinas: Array.isArray(r.disciplinas) ? r.disciplinas.filter(x => ['swim','bike','run','strength'].includes(x)) : []
    }));
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
  } else if ((sleep != null && sleep < 6.75) || (suenoTres != null && suenoTres < 6.75)) {
    senales.push('sueño_corto');
    razones.push('El sueño reciente está claramente por debajo de 6,75 horas; revisa la recuperación.');
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
  const enfermedad = restricciones.find(r => r.tipo==='enfermedad' || r.tipo==='lesion');
  if (enfermedad) {
    const recuperando = enfermedad.estado === 'recuperacion';
    estado = recuperando ? 'recuperar' : 'pausar';
    factor = recuperando ? 0.5 : 0;
    intensidad = recuperando ? 'Sin intensidad hasta revisar síntomas' : 'Pausar entrenamiento propuesto';
    razones.unshift(recuperando
      ? 'Has declarado una recuperación en curso. No recuperes las sesiones perdidas ni intensifiques por métricas aisladas.'
      : 'Has declarado una enfermedad o lesión activa. Suspende la propuesta automática y consulta con tu profesional si hay síntomas de alarma.');
    senales.unshift('restriccion_salud_declarada');
  }
  const disponibilidad = restricciones.filter(r => r.tipo==='disponibilidad');
  if (disponibilidad.length) {
    senales.push('disponibilidad_limitada');
    razones.push('Hay restricciones de disponibilidad: reorganiza únicamente sesiones complementarias, sin sustituir las del entrenador.');
  }
  // Propuesta subordinada al plan del entrenador: no contiene fechas, duraciones,
  // sesiones nuevas ni instrucciones de reprogramación automática.
  const disciplinasLimitadas=[...new Set(disponibilidad.flatMap(r=>r.disciplinas))];
  const propuesta={
    modo:'solo_sugerencia', modificaCalendario:false, sesionesEntrenadorProtegidas:true,
    disciplinasLimitadas,
    prioridad:estado==='pausar'||estado==='recuperar'?'salud_y_recuperacion':
      estado==='reducir'||estado==='moderar'?'regular_carga':'respetar_plan',
    sugerencias: estado==='pausar'?['No generar sesiones complementarias durante la restricción de salud activa.']:
      estado==='recuperar'?['No recuperar horas ni sesiones perdidas; cualquier retorno requiere valorar los síntomas y seguir las indicaciones profesionales.']:
      disciplinasLimitadas.length?[`Evitar propuestas complementarias en: ${disciplinasLimitadas.join(', ')}.`,'Consultar con el entrenador antes de redistribuir carga a otros deportes.']:
      ['Mantener la estructura protegida por el entrenador; no añadir intensidad de forma automática.']
  };
  return {
    version:'1.0', fecha:hoy, estado, factor, intensidad,
    titular: estado==='pausar' ? 'Prioriza tu salud' : estado==='recuperar' ? 'Vuelve gradualmente' :
      estado==='reducir' ? 'Frena hoy' : estado==='moderar' ? 'Baja un cambio' :
      estado==='sin_datos' ? 'Faltan datos recientes' : 'Mantén lo programado',
    porQue: estado==='pausar' ? 'Una enfermedad o lesión declarada tiene prioridad frente a los indicadores de carga.' :
      estado==='recuperar' ? 'El retorno debe guiarse por evolución clínica y síntomas, no solo por métricas del reloj.' :
      estado==='reducir' ? 'La recuperación no acompaña la carga: el estímulo intenso puede acumular fatiga.' :
      estado==='moderar' ? 'Una señal de recuperación aconseja limitar la intensidad sin perder continuidad.' :
      estado==='sin_datos' ? 'No conviene cambiar la dosis de entrenamiento sin mediciones recientes.' :
      'La evolución se consolida sosteniendo el bloque, no añadiendo intensidad extra.',
    razones, senales, restricciones, propuesta, evidencia: {
      bienestar: estadoDatos, ultimaFecha: ult?.date || null, diasSinDatos: antiguedad,
      ultimoEntreno, suenoH:sleep, suenoMediana3d:suenoTres,
      hrv, hrvReferencia:baseHrv, fcReposo:restingHR, fcReferencia:baseFc,
      ctl, atl, forma
    },
    limites: [
      'No estima el porcentaje de Z3 con FC media: requiere tiempo real en zonas.',
      'Solo considera síntomas o lesiones si el atleta los declara; no los diagnostica ni estima su resolución clínica. Ante dolor torácico, síncope o disnea inusual, detén el ejercicio y busca valoración médica.',
      'No modifica los umbrales medidos ni sustituye una evaluación de medicina del deporte.'
    ]
  };
}
