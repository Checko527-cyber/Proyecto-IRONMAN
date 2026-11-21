# Proyecto IRONMAN · sistema visual unificado

Referencia de producción: https://proyecto-ironman.vercel.app/ (captura de 21/11/2026).
La extracción automática identificó tema oscuro, tipografías Archivo e IBM Plex Mono,
y fondo azul noche `#071528`; no fue posible inspeccionar los píxeles de su captura
completa en este entorno. **Estos valores son lectura de metadatos**, no auditoría
visual comprobada. La rama local utiliza además colores por disciplina en CSS.

## Principios para el rediseño

1. Una pregunta por gráfico: título corto, leyenda en gráficos multiserie,
   procedencia y fecha de actualización visibles.
2. Pantalla inicial: estado actual, decisión del día, próxima sesión y meta;
   módulos técnicos bajo demanda.
3. Cinco destinos: Inicio, Plan, Rendimiento, Competencias y Nutrición;
   conservar subrutas y funciones anteriores mientras se migran.
4. Natación `--swim`, ciclismo `--bike`, carrera `--run`; usar consistentemente
   en cronogramas, barras y zonas, no como decoración indiscriminada.
5. Texto en capas: KPI y gráfico al primer nivel, interpretación de una frase,
   metodología dentro de desplegable. Evitar paneles que repitan el mismo dato.
6. Valores medidos, declarados, estimados y faltantes deben ser distinguibles;
   cero nunca sustituye ausencia de datos.
7. Diseño responsive: tarjetas fluidas, gráficos con etiquetas legibles,
   controles sin solapamiento y sin desplazamiento lateral de toda la página.

## Componentes y propiedad funcional

| Componente | Dueño primario | Presentación |
| --- | --- | --- |
| Recuperación del día | Inicio | Semáforo y causas, fecha del dato |
| Entrenamiento previsto/observado | Plan | Sesiones y diferencia, entrenador protegido |
| Tendencia CTL/ATL/forma | Rendimiento | Gráfico multiserie con leyenda |
| Objetivos y fases | Competencias | Hitos y progreso real o declarado |
| Sesión técnica (potencia, piernas) | Rendimiento | Gráfico por etapa y comparación |
| Abastecimiento por disciplina | Nutrición | CH/h, horario y estado de etiqueta |
| Ruta histórica de objetivos | Competencias | Navegación por etapas, textos secundarios plegables |

## Estado de aplicación

- [x] Navegación principal agrupada y subnavegación conservada.
- [x] Cronograma proporcional y escenarios de nutrición.
- [x] Ruta con agrupación progresiva de métricas secundarias.
- [ ] Capturas comparables de escritorio (1366 px) y móvil (390 px).
- [ ] Inspección visual del PDF generado mediante impresión.
- [ ] Contraste, teclado y accesibilidad en dispositivo real.
- [ ] Validación de indicadores con datos reales de todos los conectores.

La implementación local y el despliegue público pueden diferir hasta publicar
un paquete aprobado. No confundir los metadatos de producción con pruebas del
rediseño local.
