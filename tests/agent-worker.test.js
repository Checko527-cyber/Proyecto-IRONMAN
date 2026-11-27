import test from 'node:test';
import assert from 'node:assert/strict';
import { crearWorker } from '../lib/agent-worker.js';
import { crearAlmacenPostgres } from '../lib/agent-store-pg.js';

const tarea = { id: 't1', lease: 'lease1', agente: 'ingenieria',
  tipo: 'mejora.tecnica', proyectoId: 'ironman', resumen: 'Corregir visual de potencia' };
test('no procesa una tarea de otro agente', async () => {
  const worker = crearWorker({ agente: 'rendimiento', almacen: {
    reclamar: async () => tarea, completar: async () => {}, fallar: async () => {}
  }, manejadores: {} });
  await assert.rejects(() => worker.ejecutarUna(), /otro agente/);
});
test('un trabajo técnico termina en revisión, no se autopublica', async () => {
  let final = null;
  const worker = crearWorker({ agente: 'ingenieria', almacen: {
    reclamar: async () => tarea,
    completar: async (id, lease, r) => { final = r; },
    fallar: async () => { throw new Error('Inesperado'); }
  }, manejadores: { 'mejora.tecnica': async () => ({ resumen: 'QA lista' }) },
  reloj: () => '2026-11-27T00:00:00Z' });
  assert.equal((await worker.ejecutarUna()).estado, 'validacion');
  assert.equal(final.estado, 'validacion');
});
test('registra error al fallar el ejecutor', async () => {
  let error = '';
  const worker = crearWorker({ agente: 'ingenieria', almacen: {
    reclamar: async () => tarea,
    completar: async () => { throw new Error('No debería completarse'); },
    fallar: async (id, lease, motivo) => { error = motivo; }
  }, manejadores: { 'mejora.tecnica': async () => { throw new Error('No hay datos'); } } });
  assert.equal((await worker.ejecutarUna()).estado, 'error');
  assert.match(error, /No hay datos/);
});
test('rechaza evento saliente no autorizado', async () => {
  let error = '';
  const worker = crearWorker({ agente: 'ingenieria', almacen: {
    reclamar: async () => tarea,
    completar: async () => { throw new Error('No debe completar'); },
    fallar: async (id, lease, msg) => { error = msg; }
  }, manejadores: { 'mejora.tecnica': async () => ({
    resumen: 'OK',
    evento: { id: 'e2', proyectoId: 'ironman', origen: 'rendimiento',
      destino: 'ingenieria', tipo: 'revision.deportiva', resumen: 'Incorrecto' }
  }) } });
  assert.equal((await worker.ejecutarUna()).estado, 'error');
  assert.match(error, /no autorizado/);
});
test('adaptador PG consulta paramétricamente y valida tenant', async () => {
  const calls = [];
  const store = crearAlmacenPostgres({ proyectoId: 'ironman', query: async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [tarea] };
  } });
  const claimed = await store.reclamar('ingenieria');
  assert.equal(claimed.id, 't1');
  assert.deepEqual(calls[0].params, ['ironman','ingenieria']);
  assert.match(calls[0].sql, /SKIP LOCKED/);
  await store.completar('t1', 'lease1', { estado: 'validacion', resumen: 'OK' });
  assert.match(calls[1].sql, /lease_hasta > now/);
  assert.throws(() => crearAlmacenPostgres({ proyectoId: "ironman'; DROP", query: async () => ({ rows: [] }) }), /inválido/);
});
test('rechaza completado sin revisión', async () => {
  const store = crearAlmacenPostgres({ proyectoId: 'ironman', query: async () => ({ rows: [] }) });
  await assert.rejects(() => store.completar('t1', 'lease1', { estado: 'completada', resumen: 'Aprobado' }), /validación/);
});

test('publicar usa evento validado y crea tarea durable en una sola consulta', async () => {
  const consultas = [];
  const ev = { id: 'evento-unico', proyectoId: 'ironman', origen: 'rendimiento',
    destino: 'ingenieria', tipo: 'mejora.tecnica', resumen: 'Revisar gráficos de potencia' };
  const store = crearAlmacenPostgres({ proyectoId: 'ironman', query: async (sql, params) => {
    consultas.push({ sql, params });
    return { rows: [{ id: ev.id }] };
  } });
  assert.deepEqual(await store.publicar(ev), { creado: true });
  assert.equal(consultas.length, 1);
  assert.match(consultas[0].sql, /INSERT INTO ironman_agents.eventos/);
  assert.match(consultas[0].sql, /INSERT INTO ironman_agents.tareas/);
  await assert.rejects(() => store.publicar({ ...ev, proyectoId: 'otro' }), /Proyecto no autorizado/);
});
test('repetición exacta no duplica tarea, distinta carga falla', async () => {
  const ev = { id: 'e1', proyectoId: 'ironman', origen: 'rendimiento',
    destino: 'ingenieria', tipo: 'mejora.tecnica', resumen: 'Validar potencia' };
  let distintos = false;
  const store = crearAlmacenPostgres({ proyectoId: 'ironman', query: async (sql) => {
    if (sql.includes('WITH creado')) return { rows: [] };
    return { rows: [{ ...ev, ...(distintos ? { resumen: 'Otro objetivo' } : {}) }] };
  } });
  assert.deepEqual(await store.publicar(ev), { creado: false });
  distintos = true;
  await assert.rejects(() => store.publicar(ev), /idempotencia/);
});
test('ACK almacena publicación al segundo agente en la misma operación', async () => {
  const llamadas = [];
  const store = crearAlmacenPostgres({ proyectoId: 'ironman', query: async (sql, params) => {
    llamadas.push({ sql, params });
    return { rows: [{ id: 't1' }] };
  } });
  const outgoing = { id: 'r1', proyectoId: 'ironman', origen: 'ingenieria',
    destino: 'rendimiento', tipo: 'validacion.deportiva', resumen: 'Verificar unidades' };
  await store.completar('t1', 'lease1', { estado: 'validacion', resumen: 'Revisión técnica', evento: outgoing });
  assert.equal(llamadas.length, 1);
  assert.match(llamadas[0].sql, /nuevo_evento/);
  assert.match(llamadas[0].sql, /nueva_tarea/);
  assert.match(llamadas[0].sql, /WITH confirmada/);
});
