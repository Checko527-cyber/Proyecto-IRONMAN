import test from 'node:test';
import assert from 'node:assert/strict';
import { crearWorker } from '../lib/agent-worker.js';
import { validarEvento } from '../lib/agent-orchestration.js';

// Store de laboratorio: simula el transporte y el lease sin base de datos externa.
// NO demuestra persistencia, RLS ni ejecución de workers en producción.
function crearAlmacenLaboratorio() {
  const eventos = new Map(), tareas = new Map(), auditoria = [];
  let secuencia = 0;
  return {
    eventos, tareas, auditoria,
    publicar(entrada) {
      const evento = validarEvento(entrada);
      const previo = eventos.get(evento.id);
      if (previo) {
        assert.deepEqual(previo, evento, 'ID duplicado con contenido distinto');
        return { creado: false };
      }
      eventos.set(evento.id, evento);
      tareas.set(evento.id, {
        id: evento.id, proyectoId: evento.proyectoId, agente: evento.destino,
        tipo: evento.tipo, resumen: evento.resumen, estado: 'pendiente', intentos: 0
      });
      auditoria.push({ accion: 'publicada', id: evento.id, agente: evento.origen });
      return { creado: true };
    },
    async reclamar(agente) {
      const tarea = [...tareas.values()].find(t => t.agente === agente && t.estado === 'pendiente');
      if (!tarea) return null;
      tarea.estado = 'en_progreso';
      tarea.intentos += 1;
      tarea.lease = 'lease-' + (++secuencia);
      auditoria.push({ accion: 'reclamada', id: tarea.id, agente });
      return { ...tarea };
    },
    async completar(id, lease, salida) {
      const tarea = tareas.get(id);
      if (!tarea || tarea.lease !== lease || tarea.estado !== 'en_progreso') throw new Error('Lease inválido');
      if (salida.evento) {
        const ev = validarEvento(salida.evento);
        if (ev.proyectoId !== tarea.proyectoId || ev.origen !== tarea.agente) throw new Error('Salida no autorizada');
        const result = this.publicar(ev);
        if (!result.creado) throw new Error('El handoff ya existía');
      }
      tarea.estado = 'validacion';
      delete tarea.lease;
      auditoria.push({ accion: 'a_validacion', id, agente: tarea.agente });
    },
    async fallar(id, lease, razon) {
      const tarea = tareas.get(id);
      if (!tarea || tarea.lease !== lease || tarea.estado !== 'en_progreso') throw new Error('Lease inválido');
      tarea.estado = tarea.intentos >= 4 ? 'bloqueada' : 'pendiente';
      delete tarea.lease;
      auditoria.push({ accion: 'fallida', id, razon });
    }
  };
}

test('end-to-end simulado: rendimiento -> ingeniería -> rendimiento con memoria compartida del adaptador', async () => {
  const almacen = crearAlmacenLaboratorio();
  const inicio = {
    id: 'evt-1', proyectoId: 'ironman', origen: 'rendimiento',
    destino: 'ingenieria', tipo: 'mejora.tecnica',
    resumen: 'Revisar visualización de balance de pedaleo'
  };
  assert.equal(almacen.publicar(inicio).creado, true);
  assert.equal(almacen.publicar(inicio).creado, false);
  let tecnico = 0, deportivo = 0;
  const ingenieria = crearWorker({
    agente: 'ingenieria', almacen,
    manejadores: {
      'mejora.tecnica': async t => {
        tecnico++;
        return {
          resumen: 'Cambio técnico listo para revisión deportiva',
          evento: {
            id: 'evt-2', proyectoId: t.proyectoId, origen: 'ingenieria',
            destino: 'rendimiento', tipo: 'validacion.deportiva',
            resumen: 'Comprobar unidades y referencias del balance bilateral'
          }
        };
      }
    }
  });
  const rendimiento = crearWorker({
    agente: 'rendimiento', almacen,
    manejadores: {
      'validacion.deportiva': async () => {
        deportivo++;
        return { resumen: 'Revisión deportiva registrada; aún falta QA triple' };
      }
    }
  });
  assert.deepEqual(await ingenieria.ejecutarUna(), { estado: 'validacion', tareaId: 'evt-1' });
  assert.deepEqual(await rendimiento.ejecutarUna(), { estado: 'validacion', tareaId: 'evt-2' });
  assert.equal((await ingenieria.ejecutarUna()).estado, 'sin_tareas');
  assert.equal((await rendimiento.ejecutarUna()).estado, 'sin_tareas');
  assert.deepEqual([tecnico, deportivo], [1, 1]);
  assert.equal(almacen.tareas.size, 2);
  assert.equal(almacen.tareas.get('evt-1').estado, 'validacion');
  assert.equal(almacen.tareas.get('evt-2').estado, 'validacion');
  assert.equal(almacen.auditoria.filter(x => x.accion === 'a_validacion').length, 2);
});
test('un fallo no marca completado ni genera evento de seguimiento', async () => {
  const almacen = crearAlmacenLaboratorio();
  almacen.publicar({
    id: 'evt-fail', proyectoId: 'ironman', origen: 'rendimiento',
    destino: 'ingenieria', tipo: 'mejora.tecnica', resumen: 'Tarea técnica'
  });
  const worker = crearWorker({
    agente: 'ingenieria', almacen,
    manejadores: { 'mejora.tecnica': async () => { throw new Error('Falta fuente validada'); } }
  });
  assert.equal((await worker.ejecutarUna()).estado, 'error');
  assert.equal(almacen.tareas.get('evt-fail').estado, 'pendiente');
  assert.equal(almacen.eventos.size, 1);
});
