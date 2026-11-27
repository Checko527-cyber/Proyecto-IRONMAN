-- QA exclusivamente IRONMAN. No contiene contraseñas.
BEGIN;
CREATE ROLE ironman_qa_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ironman_qa_worker_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ironman_qa_approver_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE ironman_qa_reader_login NOLOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT ironman_qa_worker TO ironman_qa_worker_login WITH INHERIT TRUE, SET FALSE;
GRANT ironman_qa_approver TO ironman_qa_approver_login WITH INHERIT TRUE, SET FALSE;
GRANT ironman_qa_reader TO ironman_qa_reader_login WITH INHERIT TRUE, SET FALSE;
GRANT USAGE ON SCHEMA ironman_agents TO ironman_qa_reader;
GRANT SELECT(proyecto_id,agente,estado,actualizada_en,lease_hasta) ON ironman_agents.tareas TO ironman_qa_reader;
GRANT SELECT(proyecto_id,agente,motivo,actualizada_en) ON ironman_agents.actividad TO ironman_qa_reader;
CREATE POLICY qa_tareas_reader ON ironman_agents.tareas FOR SELECT TO ironman_qa_reader USING(proyecto_id='ironman-qa');
CREATE POLICY qa_activity_reader ON ironman_agents.actividad FOR SELECT TO ironman_qa_reader USING(proyecto_id='ironman-qa');
ALTER TABLE ironman_agents.tareas ADD CONSTRAINT qa_cierre_triple CHECK (
 proyecto_id <> 'ironman-qa' OR estado <> 'completada' OR COALESCE((
  resultado->'revisiones'->'tecnica'->'aprobada' = 'true'::jsonb AND
  resultado->'revisiones'->'deportiva'->'aprobada' = 'true'::jsonb AND
  resultado->'revisiones'->'visual'->'aprobada' = 'true'::jsonb AND
  jsonb_typeof(resultado->'revisiones'->'tecnica'->'evidencia')='string' AND
  jsonb_typeof(resultado->'revisiones'->'deportiva'->'evidencia')='string' AND
  jsonb_typeof(resultado->'revisiones'->'visual'->'evidencia')='string' AND
  resultado->'revisiones'->'tecnica'->>'evidencia' ~ '^[a-zA-Z0-9][a-zA-Z0-9_./:#-]{3,255}$' AND
  resultado->'revisiones'->'deportiva'->>'evidencia' ~ '^[a-zA-Z0-9][a-zA-Z0-9_./:#-]{3,255}$' AND
  resultado->'revisiones'->'visual'->>'evidencia' ~ '^[a-zA-Z0-9][a-zA-Z0-9_./:#-]{3,255}$'
 ),false)
) NOT VALID;
COMMIT;
