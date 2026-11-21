# Proyecto IRONMAN · plataforma unificada

Estado: **decisiones aprobadas; migración funcional parcial en desarrollo local, sin despliegue verificado**.
Documento de continuidad para no confundir decisiones, código existente y funcionalidades verificadas.

## Decisiones 1–15

1. Navegación en cinco espacios: Inicio, Plan, Rendimiento, Competencias y Nutrición (B).
2. Motor inteligente supervisado (C): no alterar sesiones protegidas sin aprobación.
3. Diseño adaptativo por niveles, móvil y escritorio (D).
4. Inicio como centro de decisiones diario (D).
5. Calendario colaborativo con el entrenador (C). La importación semanal de TrainingPeaks **no está verificada**.
6. Restricciones temporales y enfermedades con adaptación autónoma de propuestas complementarias (C ampliada).
7. Sistema integral de recuperación sin diagnóstico clínico automático (D).
8. Nutrición personalizada integrada a planificador de carrera (D ampliada).
9. Tablero interactivo, versión móvil y PDF, con un solo cálculo (D).
10. Proyección de tiempos, potencia, ritmos y escenarios con incertidumbre visible (D).
11. Catálogo de alimentos y productos, inventario y alternativas (D).
12. Valores nutricionales medidos, estimados o declarados, editables y recalculables (D).
13. Cronograma visual inteligente desde los días previos hasta la recuperación (D).
14. Aprendizaje de diferencias planificado/real, sin inferir causalidad injustificada (D).
15. Ecosistema para atletas y entrenadores, con datos y permisos separados (D).

## Inventario y destino de las ocho vistas actuales

| Actual | Nueva ubicación | Tratamiento previsto |
| --- | --- | --- |
| Inicio | Inicio | Reducir duplicaciones; estado, sesión, objetivo, decisión |
| Semana | Plan | Conservar calendario, sesiones y cumplimiento |
| Datos | Rendimiento | Integrar sincronización, historial y métricas |
| 2027 | Competencias / Plan | Centralizar calendario y periodización |
| Victoria | Competencias / Plan | Retener planificación 29 semanas y objetivo 6:30 |
| Análisis | Rendimiento | Análisis técnico desplegable |
| Motor | Transversal | Reutilizar radiografía y recomendaciones, no duplicar indicadores |
| Ruta | Rendimiento / Competencias | Convertir textos extensos a gráficos y recorrido de objetivos |

## Hallazgos verificables en el repositorio

- `index.html` contiene ocho botones de navegación y vistas con métricas superpuestas.
- `renderMotor()` reúne radiografía histórica y un panel de recomendaciones `/api/recomendacion`.
- `lib/motor-adaptativo.js` evalúa sueño, HRV, FC de reposo y carga con reglas heurísticas; actualmente **no recibe síntomas, lesiones ni restricciones temporales**.
- `api/actividades.js` fusiona Intervals.icu con Strava como respaldo; se debe probar la clasificación, deduplicación y asociación con el plan.
- `index.html` conserva fases posteriores a IRONMAN hacia Ultraman: tratarlas como horizontes opcionales, nunca como meta confirmada.
- La fase activa se encontraba fijada en la fase 3 aunque su período terminó el 8/11/2026.
- `TP_SEED` contiene ejemplos de entrenamientos históricos. No confundirlos con la planificación vigente del entrenador.

## Primer ajuste realizado (local, sin publicación)

- Fase activa derivada de `FASE_CAL` y fecha actual para `renderTrail`, `renderMission` y la lista de fases.
- Encabezado de Semana actualizado dinámicamente según la fase vigente.
- Encabezado de Ruta prioriza IRONMAN 2028 sin borrar los horizontes antiguos.
- Motor: acepta restricciones declaradas con fechas y distingue enfermedad/lesión activa,
  recuperación y disponibilidad; se guardan localmente desde su panel y llegan al servidor
  solo para evaluación. No existe todavía replanificación autónoma del calendario.
  La respuesta del motor incluye una propuesta explícitamente no ejecutable,
  con disciplinas limitadas y sesiones del entrenador protegidas.
- Nutrición: existe catálogo semilla histórico de Cartagena y cálculo único por fase,
  con valores desconocidos señalados (sin confundir electrolitos con sodio). Todavía no
  tiene interfaz de planificador, base verificada de etiquetas ni exportación PDF.
- Catálogo Colombia: ampliado con fichas oficiales de Maurten, SiS, Neversecond,
  Precision, Skratch y 226ERS, más referencias de GU, Hammer, Huma y SaltStick.
  Las fuentes URL por producto se mantienen en `lib/catalogo-colombia.js`.
  La presencia de una marca en distribuidores colombianos no confirma inventario
  ni la disponibilidad de cada sabor o presentación. Actualización: 21/11/2026.
  Hallazgo: gel Cherry 76 g del fabricante informa 50 g CH frente a 55 g del Excel;
  se conservan como registros distintos hasta contrastar empaque y formato.
- Navegación: incorporadas las cinco entradas principales; las ocho vistas
  originales siguen accesibles mediante subnavegación contextual. No se ha borrado
  ninguna vista o método de cálculo anterior. Se añadió aviso de navegación a
  Análisis para regenerar gráficas al abrirlo desde subpestañas.
- Nutrición: vista funcional local con búsqueda, filtros, catálogo compacto y
  composición editable por porción; registra etapa y minuto del abastecimiento,
  calcula totales y señala etiquetas incompletas. Las entradas se conservan en
  el almacenamiento local del navegador, sin sincronización entre dispositivos.
  Perfil adicional de edad, peso, sudoración medida, tolerancia ensayada y
  antecedentes digestivos, todos opcionales y editables. Los productos pueden
  marcarse como favoritos o disponibles y seleccionarse desde desplegables
  filtrados; ninguna marca significa inventario comercial confirmado.
  La revisión de preparación identifica datos y productos por confirmar.
  Si existe una tasa de sudoración declarada como medida, muestra su proyección
  aritmética a la duración total: no equivale a una pauta de reposición hídrica.
  El inventario permite porciones disponibles por producto, detecta faltantes
  respecto del plan y conserva stock desconocido como desconocido. Los mililitros
  por porción se declaran individualmente: no se atribuye volumen a geles ni
  bebidas cuando no se especificó.
  El cronograma de abastecimiento comparte una fuente única de filas con la
  descarga CSV por hora, etapa, producto, porciones, nutrientes, líquido y stock.
  Se protege el archivo contra interpretación de nombres como fórmulas al abrirlo.
- Cronograma: `lib/planificador-carrera.js` construye de forma determinista
  salidas, tiempos y etapas para triatlón olímpico, 70.3, completo, media
  maratón, maratón y ciclismo. Duraciones, hora de salida, temperatura y humedad
  son editables; al recalcular, reubica hitos y productos. La interfaz incluye
  barras proporcionales por disciplina y una lista compacta de abastecimiento.
  No hay todavía prescripción nutricional individualizada, corrección por clima
  basada en tasa de sudor, exportación PDF directa desde el servidor
  ni cronograma de días previos. La impresión del navegador permite guardar PDF,
  pero su apariencia en móvil y papel aún necesita verificación visual.
- Auditoría de abastecimiento: `lib/evaluacion-abastecimiento.js` compara
  carbohidratos por hora de cada disciplina con objetivos opcionales introducidos
  por el atleta; los productos sin etiqueta conservan su estado incompleto.
  Incluye una lista interactiva de preparación y recuperación persistida en el
  mismo navegador, sin
  convertirla en prescripción clínica ni rellenar datos de sudoración ausentes.
- Escenarios: simulación matemática del plan base y ampliaciones del 5 % y 10 %
  para la duración de las etapas deportivas (sin cambiar transiciones), con
  metas y horarios recalculados. No se presenta como probabilidad ni pronóstico.
- Pruebas: 92 casos automatizados superados (incluidos seis para cronograma) y
  comprobaciones de presencia de cinco espacios; revisadas sintaxis de JS y diferencias.
  El navegador Chromium local no pudo iniciar por restricciones de socket del
  entorno. **QA visual de escritorio/móvil pendiente, publicación bloqueada**.

## Próximos paquetes y criterios de cierre

1. **Calidad de datos**: probar deporte, zonas, fecha, duplicidad, ausencia de datos y sincronización con las tres fuentes. No declarar TrainingPeaks disponible sin lectura de sesiones planificadas verificable.
2. **Navegación / diseño**: cinco vistas con un solo dueño por métrica; probar render móvil y escritorio.
3. **Motor**: restricciones con fechas, síntomas declarados y retorno gradual; modo de solo propuesta para sesiones del entrenador; evaluación de seguridad y pruebas.
4. **Nutrición y competencia**: catálogo inicial de `plan_carrera_5150_cartagena.xlsx` (cuatro hojas), entradas editables, cálculo único, escenarios, cronograma, checklist y PDF. Validar etiquetas antes de presentar cantidades como verificadas.
5. **Comercialización**: separación de cuentas, consentimiento, permisos de entrenador, privacidad y pruebas de regresión.

### Principios de control

- Nunca borrar desarrollos existentes ni historial de entrenamiento.
- No sobreescribir datos del entrenador ni inventar planificación ausente.
- No publicar o afirmar que funciona sin pruebas visuales y funcionales.
- Mantener trazabilidad y respaldos; acumular cambios en paquetes.
- Distinguir dato **medido**, **declarado**, **estimado** y **no disponible**.
