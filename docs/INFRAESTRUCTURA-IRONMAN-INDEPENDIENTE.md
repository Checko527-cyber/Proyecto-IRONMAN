# Guardas para infraestructura privada IRONMAN

**Estado:** módulo de prearranque y pruebas listo en QA. La ausencia de una base privada aprobada bloquea el arranque. No se crea ni consulta ninguna infraestructura externa con este módulo.

## Invariantes
- ATLAS-GIU es el sistema primario. Está prohibido usar sus servicios, credenciales, proyectos, trabajos, bases y capacidad.
- Ejecutar `prepararArranqueSeguro(process.env)` en el **proceso servidor** antes de iniciar conexiones, colas, cron o workers.
- No basta con una etiqueta IRONMAN: la URL de Supabase, su referencia y la referencia separada aprobada deben coincidir.
- Requiere declaración explícita de independencia y un proyecto de IRONMAN confirmado. Si falta cualquiera, **fallar cerrado**.
- Aportar `ATLAS_SUPABASE_PROJECT_REF` al guard como denegación explícita desde configuración del despliegue, sin consultar la plataforma ATLAS. No almacenar este valor en frontend ni publicarlo en GitHub. La validación de valor declarado no verifica propiedad de proyectos ni aislamiento físico: cotejarlo con el inventario autorizado antes de habilitar el entorno.
- El guard es una primera barrera de seguridad, no sustituye verificaciones de permisos, autenticación, RLS, control de costos y controles reales de conectividad.
- No registrar variables completas del entorno: pueden contener secretos. No incluir datos deportivos sensibles en logs ni issues públicos.

## Variables exclusivas servidor IRONMAN
```text
IRONMAN_PROJECT_ID=<identificador exclusivo del proyecto>
IRONMAN_ENVIRONMENT=qa
IRONMAN_SUPABASE_URL=<url propia del proyecto>
IRONMAN_SUPABASE_REF=<ref propia del proyecto>
IRONMAN_SUPABASE_REF_APROBADA=<referencia validada por propietario>
IRONMAN_INFRA_INDEPENDIENTE=true
ATLAS_SUPABASE_PROJECT_REF=<referencia expresamente prohibida, opcional pero recomendada>
```

No crear estas variables ni configuraciones para ATLAS. El proyecto IRONMAN actualmente **no tiene una BD privada confirmada**, así que estos valores no deben inventarse para el arranque.

## Pruebas de aceptación futuras
1. Inventario y propiedad del proyecto de base IRONMAN comprobados.
2. Entorno QA dispone de credenciales propias y con permisos mínimos.
3. Guard rechaza referencias distintas y servicios prohibidos.
4. PostgreSQL ejecuta migración en base exclusiva IRONMAN; verificación de RLS entre identidades.
5. Dos procesos reales intercambian tareas tras reinicio sin duplicarlas; auditoría y evidencias comprobadas.
6. No habilitar producción antes de revisión técnica, deportiva y visual.
