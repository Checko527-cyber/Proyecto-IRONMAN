import { validarEvento } from './agent-orchestration.js';
// Adaptador PostgreSQL preparado para uso EXCLUSIVO en backend autenticado.
// La función query debe apuntar a un cliente de BD con permisos mínimos,
// jamás ejecutarse desde el navegador ni incluir claves en archivos públicos.
export function crearAlmacenPostgres({ query, proyectoId }) {
  if (typeof query !== 'function') throw new TypeError('query del servidor requerida');
  if (typeof proyectoId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(proyectoId)) {
    throw new TypeError('Identificador de proyecto inválido');
  }
  const ejecutar = async (sql, params) => {
    const respuesta = await query(sql, params);
    if (!respuesta || !Array.isArray(respuesta.rows)) throw new Error('Respuesta SQL inválida');
    return respuesta.rows;
  };
  return Object.freeze({
    async publicar(evento) {
      const ev = validarEvento(evento);
      if (ev.proyectoId !== proyectoId) throw new Error('Proyecto no autorizado');
      // Inserción atómica de evento + tarea. Los eventos técnicos solo contienen resumen.
      const rows = await ejecutar(
        `WITH creado AS (
           INSERT INTO ironman_agents.eventos
             (id, proyecto_id, origen, destino, tipo, resumen)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (proyecto_id, id) DO NOTHING
           RETURNING id, proyecto_id, destino, tipo, resumen
         ), tarea AS (
           INSERT INTO ironman_agents.tareas
             (id, proyecto_id, evento_id, agente, tipo, resumen)
           SELECT id, proyecto_id, id, destino, tipo, resumen FROM creado
           RETURNING id
         )
         SELECT id FROM creado`,
        [ev.id, proyectoId, ev.origen, ev.destino, ev.tipo, ev.resumen]
      );
      if (rows.length) return { creado: true };
      // Un duplicado nunca debe silenciar una colisión con payload distinto.
      const prev = await ejecutar(
        `SELECT id, proyecto_id AS "proyectoId", origen, destino, tipo, resumen
           FROM ironman_agents.eventos WHERE id = $1 AND proyecto_id = $2`,
        [ev.id, proyectoId]
      );
      if (prev.length !== 1 ||
          !['id', 'proyectoId', 'origen', 'destino', 'tipo', 'resumen'].every(k => prev[0][k] === ev[k])) {
        throw new Error('Conflicto de idempotencia');
      }
      return { creado: false };
    },
    async reclamar(agente) {
      if (!['rendimiento', 'ingenieria'].includes(agente)) throw new TypeError('Agente inválido');
      // Recuperar trabajos cuyo último intento murió sin ACK.
      await ejecutar(
        `WITH agotadas AS (
           UPDATE ironman_agents.tareas SET estado = 'bloqueada',
             lease = NULL, lease_hasta = NULL, ultimo_error = 'Lease agotado',
             actualizada_en = now()
           WHERE proyecto_id = $1 AND agente = $2 AND estado = 'en_progreso'
             AND intentos >= 4 AND lease_hasta <= now()
           RETURNING id, proyecto_id
         )
         INSERT INTO ironman_agents.auditoria (proyecto_id, tarea_id, accion)
         SELECT proyecto_id, id, 'lease_agotado' FROM agotadas RETURNING tarea_id`,
        [proyectoId, agente]
      );
      const rows = await ejecutar(
        `WITH siguiente AS (
           SELECT id, proyecto_id FROM ironman_agents.tareas
           WHERE proyecto_id = $1 AND agente = $2
             AND ((estado = 'pendiente' AND (disponible_en IS NULL OR disponible_en <= now()))
                  OR (estado = 'en_progreso' AND lease_hasta < now()))
             AND intentos < 4
           ORDER BY prioridad DESC, creada_en ASC
           FOR UPDATE SKIP LOCKED LIMIT 1
         )
         UPDATE ironman_agents.tareas t
         SET estado = 'en_progreso', intentos = intentos + 1,
             lease = gen_random_uuid(), lease_hasta = now() + interval '5 minutes',
             actualizada_en = now()
         FROM siguiente WHERE t.id = siguiente.id AND t.proyecto_id = siguiente.proyecto_id
         RETURNING t.id, t.proyecto_id AS "proyectoId", t.agente,
                   t.tipo, t.resumen, t.lease`, [proyectoId, agente]
      );
      return rows[0] || null;
    },
    async completar(id, lease, resultado) {
      if (resultado?.estado !== 'validacion' || typeof resultado.resumen !== 'string') {
        throw new TypeError('ACK de agente solo permite pasar a validación');
      }
      if (resultado.evento) {
        const ev = validarEvento(resultado.evento);
        if (ev.proyectoId !== proyectoId) throw new Error('Evento de salida fuera del proyecto');
      }
      const seguro = { estado: 'validacion', resumen: resultado.resumen.slice(0, 280),
        evento: resultado.evento ? validarEvento(resultado.evento) : null };
      // ACK, auditoría y salida al otro agente ocurren atómicamente.
      // Si el lease expiró, ninguno de los tres cambios se realiza.
      const rows = await ejecutar(
        `WITH confirmada AS (
           UPDATE ironman_agents.tareas
           SET estado = 'validacion', resultado = $4::jsonb, lease = NULL,
               lease_hasta = NULL, actualizada_en = now()
           WHERE id = $1 AND proyecto_id = $2 AND lease = $3
             AND estado = 'en_progreso' AND lease_hasta > now()
             AND (jsonb_typeof($4::jsonb->'evento') IS DISTINCT FROM 'object'
                  OR agente = $4::jsonb->'evento'->>'origen')
           RETURNING id, proyecto_id, agente
         ), nuevo_evento AS (
           INSERT INTO ironman_agents.eventos
             (id, proyecto_id, origen, destino, tipo, resumen)
           SELECT $4::jsonb->'evento'->>'id', confirmada.proyecto_id,
                  $4::jsonb->'evento'->>'origen', $4::jsonb->'evento'->>'destino',
                  $4::jsonb->'evento'->>'tipo', $4::jsonb->'evento'->>'resumen'
           FROM confirmada
           WHERE jsonb_typeof($4::jsonb->'evento') = 'object'
           RETURNING id, proyecto_id, destino, tipo, resumen
         ), nueva_tarea AS (
           INSERT INTO ironman_agents.tareas
             (id, proyecto_id, evento_id, agente, tipo, resumen)
           SELECT id, proyecto_id, id, destino, tipo, resumen FROM nuevo_evento
           RETURNING id
         ), auditoria AS (
           INSERT INTO ironman_agents.auditoria (proyecto_id, tarea_id, accion, detalle)
           SELECT proyecto_id, id, 'a_validacion', $4::jsonb FROM confirmada
           RETURNING tarea_id
         )
         SELECT id FROM confirmada`, [id, proyectoId, lease, JSON.stringify(seguro)]
      );
      if (!rows.length) throw new Error('Lease vencido o tarea no encontrada');
      return true;
    },
    async fallar(id, lease, razon, fecha) {
      const rows = await ejecutar(
        `WITH fallida AS (
           UPDATE ironman_agents.tareas
           SET estado = CASE WHEN intentos >= 4 THEN 'bloqueada' ELSE 'pendiente' END,
               disponible_en = CASE WHEN intentos >= 4 THEN NULL
                                    ELSE now() + make_interval(secs => 30 * intentos) END,
               ultimo_error = $4, lease = NULL, lease_hasta = NULL, actualizada_en = now()
           WHERE id = $1 AND proyecto_id = $2 AND lease = $3
             AND estado = 'en_progreso' AND lease_hasta > now()
           RETURNING id, proyecto_id
         ), auditoria AS (
           INSERT INTO ironman_agents.auditoria (proyecto_id, tarea_id, accion, detalle)
           SELECT proyecto_id, id, 'intento_fallido', jsonb_build_object('razon',$4,'fecha',$5::text)
           FROM fallida RETURNING tarea_id
         )
         SELECT id FROM fallida`, [id, proyectoId, lease, ['Tipo sin manejador autorizado', 'Fallo de ejecución o validación'].includes(razon) ? razon : 'Fallo de ejecución o validación', fecha]
      );
      if (!rows.length) throw new Error('Lease vencido o tarea no encontrada');
      return true;
    }
  });
}
