BEGIN;
CREATE FUNCTION ironman_agents.validar_transicion_qa() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,ironman_agents AS $$
BEGIN
 IF OLD.proyecto_id <> 'ironman-qa' AND NEW.proyecto_id <> 'ironman-qa' THEN RETURN NEW; END IF;
 IF NEW.proyecto_id IS DISTINCT FROM OLD.proyecto_id OR NEW.id IS DISTINCT FROM OLD.id OR NEW.evento_id IS DISTINCT FROM OLD.evento_id OR NEW.agente IS DISTINCT FROM OLD.agente THEN
   RAISE EXCEPTION 'Identidad de tarea inmutable' USING ERRCODE='23514';
 END IF;
 IF NEW.estado='en_progreso' AND NEW.intentos=OLD.intentos+1 AND NEW.lease IS NOT NULL AND NEW.lease IS DISTINCT FROM OLD.lease AND NEW.lease_hasta>now() AND
    ((OLD.estado='pendiente' AND (OLD.disponible_en IS NULL OR OLD.disponible_en<=now())) OR (OLD.estado='en_progreso' AND OLD.lease_hasta<=now())) THEN RETURN NEW; END IF;
 IF OLD.estado='en_progreso' AND NEW.intentos=OLD.intentos AND NEW.lease IS NULL AND NEW.lease_hasta IS NULL THEN
   IF OLD.lease_hasta>now() AND NEW.estado='validacion' AND jsonb_typeof(NEW.resultado)='object' AND NEW.resultado->>'estado'='validacion' THEN RETURN NEW; END IF;
   IF OLD.lease_hasta>now() AND OLD.intentos<4 AND NEW.estado='pendiente' AND NEW.disponible_en>now() THEN RETURN NEW; END IF;
   IF OLD.intentos>=4 AND NEW.estado='bloqueada' THEN RETURN NEW; END IF;
 END IF;
 IF OLD.estado='validacion' AND NEW.estado='completada' AND NEW.intentos=OLD.intentos AND NEW.lease IS NULL AND NEW.lease_hasta IS NULL THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'Transición QA inválida' USING ERRCODE='23514';
END;
$$;
REVOKE ALL ON FUNCTION ironman_agents.validar_transicion_qa() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER qa_transicion_tarea BEFORE UPDATE ON ironman_agents.tareas FOR EACH ROW EXECUTE FUNCTION ironman_agents.validar_transicion_qa();
ALTER TABLE ironman_agents.tareas VALIDATE CONSTRAINT qa_cierre_triple;
-- Función de evento de la base propia, no RPC pública. Conservar el trigger.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC,anon,authenticated;
COMMIT;
