import { prepararArranqueSeguro } from './ironman-infra-guard.js';
import { crearAlmacenPostgres } from './agent-store-pg.js';
import { crearWorker } from './agent-worker.js';

const TIPOS = Object.freeze({
  rendimiento: ['revision.deportiva', 'validacion.deportiva'],
  ingenieria: ['mejora.tecnica', 'validacion.tecnica']
});

// Composición de servidor, sin conexión automática ni programación.
// El proveedor debe comprobar la identidad real de la BD antes de devolver query.
export async function prepararEjecutor({ env, agente, conectar, manejadores }) {
  const config = prepararArranqueSeguro(env);
  if (!Object.hasOwn(TIPOS, agente)) throw new TypeError('Rol no autorizado');
  if (typeof conectar !== 'function') throw new TypeError('Proveedor de BD requerido');
  if (!manejadores || TIPOS[agente].some(t => typeof manejadores[t] !== 'function')) {
    throw new TypeError('Manejadores del rol incompletos');
  }
  const bd = await conectar(config);
  if (!bd || typeof bd.query !== 'function' ||
      bd.supabaseRef !== config.supabaseRef ||
      bd.proyectoId !== config.proyectoId) {
    throw new Error('Identidad de conexión incompatible');
  }
  const almacen = crearAlmacenPostgres({query: bd.query.bind(bd), proyectoId: config.proyectoId});
  const worker = crearWorker({agente, almacen, manejadores});
  return Object.freeze({agente, ejecutarUna: () => worker.ejecutarUna()});
}
