// Worker aislado. El transporte y la persistencia se inyectan desde el servidor.
// No se importan credenciales, endpoints externos ni datos médicos aquí.
import { AGENTES, validarEvento } from './agent-orchestration.js';

const HANDLEABLE = Object.freeze({
  rendimiento: ['revision.deportiva', 'validacion.deportiva'],
  ingenieria: ['mejora.tecnica', 'validacion.tecnica']
});

export function crearWorker({ agente, almacen, manejadores, reloj = () => new Date().toISOString() }) {
  if (!AGENTES.includes(agente)) throw new TypeError('Agente inválido');
  if (!almacen || ['reclamar', 'completar', 'fallar'].some(k => typeof almacen[k] !== 'function')) {
    throw new TypeError('Almacén persistente requerido');
  }
  if (!manejadores || typeof manejadores !== 'object') throw new TypeError('Manejadores requeridos');
  return Object.freeze({
    agente,
    async ejecutarUna() {
      const tarea = await almacen.reclamar(agente);
      if (!tarea) return { estado: 'sin_tareas', agente };
      if (tarea.agente !== agente || !tarea.id || !tarea.lease) {
        throw new Error('Reclamación incompatible: no procesar tareas de otro agente');
      }
      const tipo = tarea.tipo;
      if (!HANDLEABLE[agente].includes(tipo) || typeof manejadores[tipo] !== 'function') {
        await almacen.fallar(tarea.id, tarea.lease, 'Tipo sin manejador autorizado', reloj());
        return { estado: 'bloqueada', tareaId: tarea.id };
      }
      try {
        const salida = await manejadores[tipo](Object.freeze({
          id: tarea.id, proyectoId: tarea.proyectoId, resumen: tarea.resumen
        }));
        if (!salida || typeof salida !== 'object' || typeof salida.resumen !== 'string') {
          throw new TypeError('Resultado no verificable del agente');
        }
        if (salida.evento) {
          const ev = validarEvento(salida.evento);
          if (ev.origen !== agente || ev.proyectoId !== tarea.proyectoId) {
            throw new Error('Evento de salida no autorizado');
          }
        }
        // "Completada" requiere QA triple. Este ACK solo entrega a revisión.
        await almacen.completar(tarea.id, tarea.lease, {
          estado: 'validacion', resumen: salida.resumen.slice(0, 280),
          evento: salida.evento || null, fecha: reloj()
        });
        return { estado: 'validacion', tareaId: tarea.id };
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : String(error);
        await almacen.fallar(tarea.id, tarea.lease, mensaje.slice(0, 160), reloj());
        return { estado: 'error', tareaId: tarea.id };
      }
    }
  });
}
