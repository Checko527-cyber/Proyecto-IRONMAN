# Operación multiagente — QA
Los módulos agent-bootstrap, agent-cycle, agent-handlers y agent-monitor son componentes de servidor, no servicios en ejecución.
- El ciclo comprueba política antes de cada reclamación; su límite temporal evita iniciar otra tarea, no cancela una operación en curso. El proveedor real debe implementar plazos y cancelación segura.
- Los manejadores reciben capacidades inyectadas; todavía no consultan actividades ni modifican código. Las solicitudes se limitan a categorías aprobadas y se deduplican. El retorno ingeniería → rendimiento deberá diseñarse con correlación y protección contra ciclos.
- El monitor agrega tareas del proyecto sin texto libre. No acredita actividad de un proceso ni sustituye un heartbeat; debe exponerse únicamente a través de un servicio autenticado y autorizado. Una fuente desconectada no es un conteo cero.
- No activar costos, llamadas de inferencia, cron ni base sin comprobar independencia de ATLAS y autorización.
- Pendiente: proveedor BD exclusivo, migración y RLS real, política confiable y presupuesto, capacidades deportivas/técnicas reales, identidad del ejecutor, pruebas de reinicio y handoff bilateral, interfaz del panel y Dot opcional. No promover main antes de QA triple.
