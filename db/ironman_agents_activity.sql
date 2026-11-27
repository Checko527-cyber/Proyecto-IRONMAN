-- Solo en base IRONMAN aprobada, después de ironman_agents_schema.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS ironman_agents.actividad (
 proyecto_id text NOT NULL,
 agente text NOT NULL CHECK (agente IN ('rendimiento','ingenieria')),
 motivo text NOT NULL CHECK (motivo IN ('limite_tiempo','politica_no_disponible','suspendido','fallo_ejecutor','cola_vacia','respuesta_invalida','requiere_revision','limite_tareas')),
 procesadas integer NOT NULL CHECK (procesadas BETWEEN 0 AND 10),
 actualizada_en timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (proyecto_id,agente)
);
ALTER TABLE ironman_agents.actividad ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ironman_agents.actividad FROM PUBLIC, anon, authenticated;
-- La salida atómica existente conserva el ID del evento hijo en auditoría.
-- Vista interna: nunca conceder acceso directo al navegador.
CREATE OR REPLACE VIEW ironman_agents.enlaces_tareas WITH (security_invoker=true) AS
 SELECT a.proyecto_id,a.tarea_id AS tarea_origen,e.id AS tarea_destino,a.creada_en
 FROM ironman_agents.auditoria a
 JOIN ironman_agents.eventos e ON e.proyecto_id=a.proyecto_id AND e.id=a.detalle->'evento'->>'id'
 WHERE a.accion='a_validacion' AND a.tarea_id IS NOT NULL;
REVOKE ALL ON ironman_agents.enlaces_tareas FROM PUBLIC, anon, authenticated;
COMMIT;
