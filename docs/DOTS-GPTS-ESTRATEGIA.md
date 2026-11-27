# IRONMAN · Evaluación de Dots, GPTs y agentes independientes
Fecha de revisión: 26 de noviembre de 2026. Fuente de decisiones: issue #13.

## Decisión de producto
Recomendación: **Dot como coordinador de alto nivel, si está disponible en la cuenta**, más dos procesos especializados independientes con identidad y tareas diferenciadas. La **memoria de verdad** será una base de datos propia de IRONMAN, no la memoria conversacional de Dot.

### Alternativas y límites
| Alternativa | Beneficio | Limitación / decisión |
| --- | --- | --- |
| GPT personalizado | Instrucciones y archivos de referencia | Retirada estándar anunciada para 11/12/2026. No usar como dependencia nueva. |
| Dot | Trabajo continuo, memoria, apps conectadas, delegación a Codex/Work y tareas recurrentes | Acceso sujeto a disponibilidad en la cuenta y controles de aprobación. No sustituye DB privada ni ofrece comunicación permanente garantizada entre dos Dots. |
| Dos workers de aplicación | Control completo de coordinación, idempotencia, ejecución y auditoría | Requieren DB propia, autenticación de servidor, hosting/ejecución y posible costo adicional de inferencia; aún no activados. |
| Tareas ChatGPT actuales | 5 a. m., 2 p. m. y 8 p. m. ya programadas | Cada ejecución aislada no es por sí misma un agente independiente, y no debe inventar memoria compartida. |
| Work / Codex | Trabajo delegado sobre GitHub, pruebas y revisiones | Su ejecución y controles dependen de permisos, disponibilidad y límites del plan. |

Fuentes oficiales: https://help.openai.com/en/articles/20001530-getting-started-with-your-dot ; https://help.openai.com/en/articles/20001519-custom-gpt-retirement-and-migration-faq ; https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt .

## Contratos sugeridos para dos Dots o un Dot + delegación

### Coordinador IRONMAN
Objetivo: enlazar el comité de decisiones y los análisis deportivos con tareas de desarrollo versionadas. Antes de dar por aprobada una modificación, verificar commit, CI y estado del deployment. No copiar datos sensibles a GitHub ni asumir que una automatización accedió a TrainingPeaks. Pedir solo una pregunta de opción múltiple a la vez en el comité de 2 p. m. y registrar la decisión no sensible en issue #13 o sucesor.

### Agente deportivo
Analizar actividad, objetivos, carga y recuperación con fuentes disponibles y fecha; separar prescripción de entrenador, datos medidos, datos declarados y estimaciones. No hacer diagnósticos, prescribir fármacos ni modificar sesiones protegidas. Emitir tareas técnicas únicamente con resúmenes anonimizados (por ejemplo: "verificar unidad del balance de potencia"), sin valores personales, HRV, peso, nombre, identificadores o registros clínicos.

### Agente de ingeniería
Recibir tareas anonimizadas y verificables. Priorizar seguridad, integridad, rendimiento y visualizaciones sobre cambios decorativos. Implementar en rama QA; ejecutar CI, pruebas deportivas y revisión visual. No escribir claves en navegador, no utilizar Supabase de ATLAS-GIU, no publicar cambios de datos o permisos sin revisión.

## Integración progresiva
1. Mantener las tareas ChatGPT existentes sin duplicarlas en Dots hasta confirmar disponibilidad.
2. Si aparece "Create your dot" en ChatGPT, crear **un Dot coordinador**, conectar exclusivamente GitHub y herramientas aprobadas. Configurar reglas de aprobación para escritura pública, permisos y cambios sensibles. Revisar costos y límites del plan.
3. Delegar ingeniería a Codex/Work solo cuando exista el acceso. La ejecución no se considera exitosa sin evidencia externa.
4. Crear o conectar base Supabase **dedicada a IRONMAN**, nunca reutilizar ATLAS-GIU; migrar `db/ironman_agents_schema.sql`, comprobar RLS y restricciones, establecer credenciales privadas de servidor.
5. Desplegar dos workers aislados y probar un circuito de evento/ACK/reintento con reinicio real. Solo después anunciar "agentes independientes con memoria compartida".
6. Integrar panel de auditoría, comité de 2 p. m. y los informes 5 a. m. / 8 p. m. contra la base persistente.

## Estado exacto
- Contratos, adaptador SQL, trabajadores como código y pruebas unitarias: **implementados en QA**.
- Prueba de transferencia entre dos workers **con un almacén simulado de laboratorio**: añadida; demuestra la lógica, **no la persistencia real**.
- Base IRONMAN, RLS en servidor, trabajadores encendidos, dot creado, delegaciones Dot→Codex: **NO verificados / NO activados**.
- Despliegue a producción: **sin modificar**.

## Riesgos específicos
- **Datos sensibles:** el repositorio actual es público; los issues solo contienen especificaciones y referencias sin valores privados.
- **Aislamiento:** cada atleta y entrenador debe tener permisos comprobados, no basta autenticación general.
- **Costos:** inferencia API, bases, entornos y ejecución continua pueden implicar cobros no autorizados; no activarlos automáticamente.
- **Seguridad de publicación:** las comprobaciones de código no sustituyen pruebas de RLS, cumplimiento deportivo, verificación visual y regresión.
