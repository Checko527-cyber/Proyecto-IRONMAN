// Núcleo puro de orquestación: ningún dato médico, credencial ni transporte externo.
// Los workers persistentes y la base privada deben usar estas mismas reglas.
export const AGENTES = Object.freeze(['rendimiento', 'ingenieria']);
export const ESTADOS = Object.freeze(['pendiente', 'en_progreso', 'validacion', 'completada', 'bloqueada']);
const TRANSICIONES = Object.freeze({
  pendiente: ['en_progreso', 'bloqueada'],
  en_progreso: ['validacion', 'bloqueada'],
  validacion: ['en_progreso', 'completada', 'bloqueada'],
  bloqueada: ['pendiente'],
  completada: []
});
const esTexto = x => typeof x === 'string' && x.trim().length > 0;
function exigir(condicion, mensaje) {
  if (!condicion) throw new TypeError(mensaje);
}
export function validarEvento(evento) {
  exigir(evento && typeof evento === 'object' && !Array.isArray(evento), 'Evento inválido');
  exigir(esTexto(evento.id) && evento.id.length <= 128, 'ID de evento obligatorio');
  exigir(AGENTES.includes(evento.origen) && AGENTES.includes(evento.destino), 'Agentes desconocidos');
  exigir(evento.origen !== evento.destino, 'Un agente no puede enviarse eventos a sí mismo');
  exigir(esTexto(evento.tipo) && /^[a-z][a-z0-9_.-]{1,63}$/.test(evento.tipo), 'Tipo de evento inválido');
  exigir(esTexto(evento.proyectoId) && evento.proyectoId.length <= 128, 'Proyecto obligatorio');
  exigir(esTexto(evento.resumen) && evento.resumen.length <= 280, 'Resumen de evento inválido');
  exigir(!('datosMedicos' in evento) && !('secretos' in evento), 'No incluir datos sensibles en eventos técnicos');
  return Object.freeze({
    id: evento.id, proyectoId: evento.proyectoId, origen: evento.origen,
    destino: evento.destino, tipo: evento.tipo, resumen: evento.resumen
  });
}
export function ingresarEvento(estado, evento) {
  const e = validarEvento(evento);
  const actual = estado || { eventos: [], tareas: [], auditoria: [] };
  const eventos = Array.isArray(actual.eventos) ? actual.eventos : [];
  const tareas = Array.isArray(actual.tareas) ? actual.tareas : [];
  const auditoria = Array.isArray(actual.auditoria) ? actual.auditoria : [];
  const anterior = eventos.find(x => x.id === e.id && x.proyectoId === e.proyectoId);
  if (anterior) {
    exigir(['id', 'proyectoId', 'origen', 'destino', 'tipo', 'resumen'].every(k => anterior[k] === e[k]), 'Conflicto de idempotencia: mismo ID, distinto contenido');
    return { estado: actual, duplicado: true };
  }
  const tarea = Object.freeze({
    id: e.id, proyectoId: e.proyectoId, agente: e.destino,
    eventoId: e.id, titulo: e.resumen, estado: 'pendiente', historial: ['pendiente']
  });
  return {
    duplicado: false,
    estado: {
      eventos: [...eventos, e],
      tareas: [...tareas, tarea],
      auditoria: [...auditoria, { tareaId: tarea.id, proyectoId: e.proyectoId, accion: 'creada', agente: e.origen }]
    }
  };
}
export function moverTarea(estado, tareaId, nuevoEstado, agente, validacion = {}) {
  exigir(estado && Array.isArray(estado.tareas), 'Estado no inicializado');
  exigir(ESTADOS.includes(nuevoEstado), 'Estado destino inválido');
  exigir(AGENTES.includes(agente), 'Agente desconocido');
  const candidatos = estado.tareas.map((t, i) => ({ t, i })).filter(({ t }) =>
    t.id === tareaId && (validacion.proyectoId === undefined || t.proyectoId === validacion.proyectoId));
  exigir(candidatos.length <= 1, 'Tarea ambigua: indicar proyectoId');
  const indice = candidatos[0]?.i ?? -1;
  exigir(indice >= 0, 'Tarea inexistente');
  const tarea = estado.tareas[indice];
  exigir(tarea.agente === agente, 'Solo el agente responsable puede cambiar el estado');
  exigir(TRANSICIONES[tarea.estado]?.includes(nuevoEstado), 'Transición no permitida');
  if (nuevoEstado === 'completada') {
    exigir(validacion.tecnica === true && validacion.deportiva === true && validacion.visual === true,
      'Se requieren verificaciones técnica, deportiva y visual');
  }
  const actualizada = Object.freeze({ ...tarea, estado: nuevoEstado, historial: [...tarea.historial, nuevoEstado] });
  const nuevas = [...estado.tareas];
  nuevas[indice] = actualizada;
  return {
    ...estado, tareas: nuevas,
    auditoria: [...(estado.auditoria || []), { tareaId, proyectoId: tarea.proyectoId, accion: 'estado:' + nuevoEstado, agente }]
  };
}
export function priorizarTareas(tareas) {
  exigir(Array.isArray(tareas), 'Lista de tareas inválida');
  return tareas.map(t => {
    for (const k of ['impacto', 'urgencia', 'riesgo', 'esfuerzo']) {
      exigir(Number.isInteger(t[k]) && t[k] >= 1 && t[k] <= 5, 'Escala 1–5 inválida: ' + k);
    }
    return { ...t, puntuacion: t.impacto * 3 + t.urgencia * 2 - t.riesgo * 2 - t.esfuerzo };
  }).sort((a, b) => b.puntuacion - a.puntuacion || String(a.id).localeCompare(String(b.id)));
}
