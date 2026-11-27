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
    async reclamar(agente) {
      if (!['rendimiento', 'ingenieria'].includes(agente)) throw new TypeError('Agente inválido');
      const rows = await ejecutar(
        `WITH siguiente AS (
           SELECT id FROM ironman_agents.tareas
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
         FROM siguiente WHERE t.id = siguiente.id
         RETURNING t.id, t.proyecto_id AS "proyectoId", t.agente,
                   t.tipo, t.resumen, t.lease`, [proyectoId, agente]
      );
      return rows[0] || null;
    },
    async completar(id, lease, resultado) {
      if (resultado?.estado !== 'validacion' || typeof resultado.resumen !== 'string') {
        throw new TypeError('ACK de agente solo permite pasar a validación');
      }
      // Llamada atomizada mediante CTE: si el lease expiró, no actualiza ni registra un evento.
      const rows = await ejecutar(
        `WITH confirmada AS (
           UPDATE ironman_agents.tareas
           SET estado = 'validacion', resultado = $4::jsonb, lease = NULL,
               lease_hasta = NULL, actualizada_en = now()
           WHERE id = $1 AND proyecto_id = $2 AND lease = $3
             AND estado = 'en_progreso' AND lease_hasta > now()
           RETURNING id, proyecto_id
         ), auditoria AS (
           INSERT INTO ironman_agents.auditoria (proyecto_id, tarea_id, accion, detalle)
           SELECT proyecto_id, id, 'a_validacion', $4::jsonb FROM confirmada
           RETURNING tarea_id
         )
         SELECT id FROM confirmada`, [id, proyectoId, lease, JSON.stringify(resultado)]
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
         SELECT id FROM fallida`, [id, proyectoId, lease, razon, fecha]
      );
      if (!rows.length) throw new Error('Lease vencido o tarea no encontrada');
      return true;
    }
  });
}
