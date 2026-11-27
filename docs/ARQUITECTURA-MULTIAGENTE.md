# IRONMAN · Sistema multiagente (fase 0 / contrato de coordinación)

Decisiones autorizadas: [comité #13](https://github.com/Checko527-cyber/Proyecto-IRONMAN/issues/13).

## Estado verificable
- **Implementado en esta rama QA:** contrato de eventos entre `rendimiento` e `ingenieria`, validación, deduplicación por `proyectoId + id`, tareas con ciclo de vida, auditoría estructural y compuerta triple QA (técnica, deportiva, visual). Funciones puras comprobables con `node --test`.
- **NO implementado aún:** agentes ejecutándose por separado, workers programados, base de datos privada, autenticación/RLS, almacenamiento durable, mensajería de eventos, interfaz de auditoría, sincronización entre dispositivos o despliegue a producción. El estado en memoria de las funciones NO es memoria compartida duradera.
- **Actual:** frontend estático con API Vercel y conectores Intervals.icu; las sesiones del entrenador son protegidas. El repositorio GitHub es **público**: no escribir identificadores, secretos, HRV, sueño ni datos de salud en issues.

## Arquitectura prevista
```text
Intervals.icu/Garmin -> servidor de ingestión autenticado -> BD privada/RLS
                                                       |
                                            decisiones/tareas/eventos
                                              /                 \
                                  Worker rendimiento       Worker ingeniería
                                     (solo propone)           (rama QA)
                                              \                 /
                                            cola de revisión y auditoría
                                                     |
                                     QA técnico + deportivo + visual
                                                     |
                                     publicación de bajo riesgo verificada
```

## Paquetes próximos y pruebas de aceptación
1. **Almacenamiento privado**: modelo proyectos/actores/decisiones/eventos/tareas/bitácora, migración idempotente, transacciones e índices de idempotencia; aislamiento por atleta, controles de RLS y acceso servidor verificados. No usar service-role en navegador.
2. **Workers reales**: dos procesos con identidad separada, adquisición de tareas, lease, reintentos acotados, acuses, detección de eventos duplicados y dead-letter. Prueba de evento rendimiento → ingeniería → rendimiento con reinicio de worker sin duplicados.
3. **QA y seguridad**: revisión de cálculos y fuentes deportivas; pruebas de permisos entre atletas y entrenadores; mobile viewport; resultados de CI, despliegue QA, captura y rollback. No cambiar prescripción.
4. **Panel**: mostrar origen, responsable, estado, fecha, criterio de aceptación, evidencia de pruebas y relación con decisiones; cinco preguntas de comité 2 p. m. se guardan individualmente, sin inventar respuestas.
5. **Fuentes deportivas**: Garmin/Intervals.icu y TrainingPeaks solo si accesibles; jamás convertir datos de ejemplo en prescripción actual. Los briefings de 5 a. m. y 8 p. m. distinguen reales, declarados y estimados.

## Seguridad y límites
Sin costos nuevos no aprobados; conservación de histórico y desarrollos previos. La independencia real depende de credenciales/autenticación servidor y persistencia, aún no comprobadas. No conectar una API pública sin autorización. Ningún estado `completada` implica que un despliegue a producción ocurriera; ese es otro control que debe validarse fuera de este contrato.
