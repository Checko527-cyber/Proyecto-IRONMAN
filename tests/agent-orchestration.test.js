import test from 'node:test';
import assert from 'node:assert/strict';
import { AGENTES, validarEvento, ingresarEvento, moverTarea, priorizarTareas } from '../lib/agent-orchestration.js';

const evento = { id: 'evento-001', proyectoId: 'ironman', origen: 'rendimiento', destino: 'ingenieria', tipo: 'mejora.propuesta', resumen: 'Mostrar balance bilateral con fuente y fecha' };
test('reconoce dos agentes especializados', () => {
  assert.deepEqual(AGENTES, ['rendimiento', 'ingenieria']);
});
test('valida contrato sin incorporar datos sensibles', () => {
  assert.equal(validarEvento(evento).destino, 'ingenieria');
  assert.throws(() => validarEvento({ ...evento, datosMedicos: { hrv: 51 } }), /sensibles/);
  assert.throws(() => validarEvento({ ...evento, origen: 'ingenieria' }), /sí mismo/);
});
test('evento crea una sola tarea e impide cambios inconsistentes con mismo ID', () => {
  const primera = ingresarEvento(null, evento);
  assert.equal(primera.duplicado, false);
  assert.equal(primera.estado.tareas.length, 1);
  const repetida = ingresarEvento(primera.estado, evento);
  assert.equal(repetida.duplicado, true);
  assert.equal(repetida.estado.tareas.length, 1);
  assert.throws(() => ingresarEvento(primera.estado, { ...evento, resumen: 'Otro alcance' }), /idempotencia/);
});
test('una tarea requiere QA triple y respeta al responsable', () => {
  const s0 = ingresarEvento(null, evento).estado;
  assert.throws(() => moverTarea(s0, evento.id, 'en_progreso', 'rendimiento'), /responsable/);
  const s1 = moverTarea(s0, evento.id, 'en_progreso', 'ingenieria');
  const s2 = moverTarea(s1, evento.id, 'validacion', 'ingenieria');
  assert.throws(() => moverTarea(s2, evento.id, 'completada', 'ingenieria', { tecnica: true }), /técnica, deportiva y visual/);
  const s3 = moverTarea(s2, evento.id, 'completada', 'ingenieria', { tecnica: true, deportiva: true, visual: true });
  assert.equal(s3.tareas[0].estado, 'completada');
  assert.deepEqual(s3.tareas[0].historial, ['pendiente', 'en_progreso', 'validacion', 'completada']);
  assert.throws(() => moverTarea(s3, evento.id, 'en_progreso', 'ingenieria'), /Transición/);
});
test('priorización dinámica pondera impacto, urgencia, riesgo y esfuerzo', () => {
  const tareas = [
    { id: 'cosmetica', impacto: 2, urgencia: 1, riesgo: 1, esfuerzo: 1 },
    { id: 'integridad', impacto: 5, urgencia: 5, riesgo: 1, esfuerzo: 2 }
  ];
  assert.equal(priorizarTareas(tareas)[0].id, 'integridad');
  assert.throws(() => priorizarTareas([{ id: 'x', impacto: 9, urgencia: 1, riesgo: 1, esfuerzo: 1 }]), /Escala/);
});

test('IDs iguales entre proyectos requieren selección explícita y auditoría segregada', () => {
  const a = ingresarEvento(null, evento).estado;
  const b = ingresarEvento(a, {...evento, proyectoId:'laboratorio-b'}).estado;
  assert.throws(() => moverTarea(b, evento.id, 'en_progreso', 'ingenieria'), /ambigua/);
  assert.throws(() => moverTarea(b, evento.id, 'en_progreso', 'ingenieria', {proyectoId:'inexistente'}), /inexistente/);
  const c = moverTarea(b, evento.id, 'en_progreso', 'ingenieria', {proyectoId:'laboratorio-b'});
  assert.equal(c.tareas[0].estado, 'pendiente');
  assert.equal(c.tareas[1].estado, 'en_progreso');
  assert.equal(c.auditoria.at(-1).proyectoId, 'laboratorio-b');
});
