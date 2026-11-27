// Validación sin conexiones externas. Debe ejecutarse ANTES de crear un cliente PG,
// una cola, un cron, o un worker. No inspecciona ni toca ATLAS.
const REF = /^[a-z]{20}$/;
const PROJECT = /^[a-zA-Z0-9_-]{1,80}$/;
const VALID_HOST = /^https:\/\/([a-z]{20})\.supabase\.co\/?$/;
const isText = value => typeof value === 'string' && value.length > 0;

export function validarInfraestructuraIronman(configuracion) {
  if (!configuracion || typeof configuracion !== 'object') {
    throw new Error('Infraestructura IRONMAN sin configuración');
  }
  const {
    proyectoId, supabaseUrl, supabaseRef, refAprobada,
    esProyectoIndependiente, entorno, atlasRefProhibida
  } = configuracion;

  if (!PROJECT.test(proyectoId || '') || !/ironman/i.test(proyectoId)) {
    throw new Error('Identificador exclusivo IRONMAN obligatorio');
  }
  if (entorno !== 'qa' && entorno !== 'production') {
    throw new Error('Entorno desconocido: no iniciar ejecutores');
  }
  if (esProyectoIndependiente !== true) {
    throw new Error('No existe confirmación de infraestructura independiente');
  }
  if (!REF.test(supabaseRef || '') || !REF.test(refAprobada || '')) {
    throw new Error('Referencia Supabase IRONMAN inválida');
  }
  if (supabaseRef !== refAprobada) {
    throw new Error('El proyecto Supabase no coincide con la referencia IRONMAN aprobada');
  }
  const match = isText(supabaseUrl) && supabaseUrl.match(VALID_HOST);
  if (!match || match[1] !== supabaseRef) {
    throw new Error('URL Supabase no coincide con el proyecto aprobado');
  }
  if (/atlas/i.test([proyectoId, supabaseUrl].join(' ')) ||
      (isText(atlasRefProhibida) && atlasRefProhibida === supabaseRef)) {
    throw new Error('ATLAS está prohibido para IRONMAN');
  }
  return Object.freeze({ proyectoId, supabaseRef, entorno, infraestructura: 'independiente' });
}

// No hacer logging del objeto de entorno completo; puede contener secretos.
export function prepararArranqueSeguro(env) {
  if (!env || typeof env !== 'object') {
    throw new Error('Faltan variables de arranque IRONMAN');
  }
  if (!isText(env.IRONMAN_SUPABASE_REF_APROBADA)) {
    throw new Error('Sin referencia privada aprobada: arranque bloqueado');
  }
  return validarInfraestructuraIronman({
    proyectoId: env.IRONMAN_PROJECT_ID,
    supabaseUrl: env.IRONMAN_SUPABASE_URL,
    supabaseRef: env.IRONMAN_SUPABASE_REF,
    refAprobada: env.IRONMAN_SUPABASE_REF_APROBADA,
    esProyectoIndependiente: env.IRONMAN_INFRA_INDEPENDIENTE === 'true',
    entorno: env.IRONMAN_ENVIRONMENT,
    atlasRefProhibida: env.ATLAS_SUPABASE_PROJECT_REF
  });
}
