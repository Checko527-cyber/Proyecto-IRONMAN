-- Proyecto IRONMAN: preparación para una BD propia y privada.
-- NO ejecutar en Supabase ATLAS-GIU. Ejecutar solo tras identificar el proyecto correcto.
-- Esquema no expuesto a Data API, sin grants a anon/authenticated, RLS por defensa en profundidad.
BEGIN;
CREATE SCHEMA IF NOT EXISTS ironman_agents;
REVOKE ALL ON SCHEMA ironman_agents FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS ironman_agents.eventos (
 id text PRIMARY KEY,
 proyecto_id text NOT NULL,
 origen text NOT NULL CHECK (origen IN ('rendimiento','ingenieria')),
 destino text NOT NULL CHECK (destino IN ('rendimiento','ingenieria')),
 tipo text NOT NULL,
 resumen varchar(280) NOT NULL,
 creada_en timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT agente_distinto CHECK (origen <> destino),
 CONSTRAINT evento_identidad UNIQUE (proyecto_id, id)
);
CREATE TABLE IF NOT EXISTS ironman_agents.tareas (
 id text PRIMARY KEY,
 proyecto_id text NOT NULL,
 evento_id text NOT NULL REFERENCES ironman_agents.eventos(id),
 agente text NOT NULL CHECK (agente IN ('rendimiento','ingenieria')),
 tipo text NOT NULL,
 resumen varchar(280) NOT NULL,
 estado text NOT NULL DEFAULT 'pendiente'
   CHECK (estado IN ('pendiente','en_progreso','validacion','completada','bloqueada')),
 prioridad smallint NOT NULL DEFAULT 0,
 intentos integer NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 4),
 lease uuid,
 lease_hasta timestamptz,
 disponible_en timestamptz,
 resultado jsonb,
 ultimo_error varchar(160),
 creada_en timestamptz NOT NULL DEFAULT now(),
 actualizada_en timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT tarea_identidad UNIQUE (proyecto_id, id),
 CONSTRAINT lease_consistente CHECK ((lease IS NULL) = (lease_hasta IS NULL))
);
CREATE TABLE IF NOT EXISTS ironman_agents.auditoria (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 proyecto_id text NOT NULL,
 tarea_id text REFERENCES ironman_agents.tareas(id),
 accion text NOT NULL,
 detalle jsonb NOT NULL DEFAULT '{}'::jsonb,
 creada_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ironman_tareas_consumo
 ON ironman_agents.tareas (proyecto_id, agente, estado, prioridad DESC, creada_en);
CREATE INDEX IF NOT EXISTS idx_ironman_auditoria_tarea
 ON ironman_agents.auditoria (proyecto_id, tarea_id, creada_en DESC);
ALTER TABLE ironman_agents.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ironman_agents.tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ironman_agents.auditoria ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA ironman_agents FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA ironman_agents FROM PUBLIC, anon, authenticated;
-- No crear políticas permisivas. Un futuro worker debe usar un rol backend
-- mínimo y segregación por proyecto, jamás la clave service_role en frontend.
COMMIT;
