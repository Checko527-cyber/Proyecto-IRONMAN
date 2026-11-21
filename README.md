# La Ruta · Camino al IRONMAN — GitHub + Vercel + Strava

## Estado actual de las conexiones (noviembre de 2026)

La aplicación existente conserva tres conexiones de solo lectura configuradas en Vercel:

| Fuente | Endpoint | Variables privadas |
|---|---|---|
| Intervals.icu | `/api/actividades`, `/api/actividad`, `/api/wellness` | `INTERVALS_API_KEY`, `INTERVALS_ATHLETE_ID` |
| Strava | `/api/strava`, respaldo de actividades | `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REFRESH_TOKEN` |
| Garmin Connect Personal API | `/api/garmin` | `GARMIN_PERSONAL_API_KEY`, `COACH_TOKEN` |

**Análisis bilateral de Garmin:** el endpoint protegido
`GET /api/garmin?activityId=ID&analysis=series` extrae el FIT oficial y devuelve
`balance` (izquierda/derecha, comparación de mitades, efectividad de torque y
suavidad si están disponibles) junto con muestras de 60 segundos (`watts`,
`balanceIzq`, `hr`, `cadence`). Requiere `Authorization: Bearer <COACH_TOKEN>`;
**nunca incluir este token en código cliente, URL, capturas o conversaciones**.
Si no hay datos bilaterales en el FIT, `balance.disponible=false`: no se inventa
un 50/50 ni se utiliza el resultado para prescribir cambios de entrenamiento.

La ausencia de datos puede significar que el archivo no incluye el campo FIT
`left_right_balance`, que Garmin no lo transfirió o que el sensor no lo registró.
La integración no modifica sesiones planificadas ni el calendario del entrenador.

En **Datos → Sesiones recientes**, las sesiones de ciclismo que tengan ID de
Intervals.icu consultan `/api/actividad?id=...` al desplegarse. Si Intervals
entrega `left_right_balance`, se muestran reparto izquierdo/derecho, variación
entre mitades y curva por bloques de cinco minutos. Si no lo entrega se indica
explícitamente, sin sustituirlo por valores inventados. El botón **Sync** vuelve
a cargar el listado integrado después de Strava.

> Las instrucciones históricas que siguen describen el alta inicial de Strava.
> El repositorio actual ya contiene más módulos y no requiere repetir esa alta.

App de seguimiento con botón **Live** conectado a tu Strava real (6 meses).

## Archivos
```
la-ruta/
├── index.html         ← la app
├── package.json       ← habilita las funciones del backend
├── api/
│   ├── strava.js       ← trae tus actividades de Strava (6 meses)
│   └── auth.js         ← conecta Strava SIN terminal (genera tu refresh token)
└── README.md
```

---

## Paso 1 · Subir a GitHub (web, sin instalar nada)
1. En **github.com** crea un repositorio nuevo (p. ej. `la-ruta`), privado o público.
2. En el repo: **Add file → Upload files**. Arrastra **todos** los archivos respetando la carpeta `api/` (sube `index.html`, `package.json`, `README.md` y la carpeta `api` con sus dos archivos).
3. **Commit changes**.

## Paso 2 · Conectar a Vercel (URL única y estable)
1. En **vercel.com** → **Add New… → Project** → importa tu repo de GitHub.
2. Deja todo por defecto y pulsa **Deploy**.
3. Obtendrás una URL fija, p. ej. `la-ruta.vercel.app`. Cada vez que actualices el repo, se redepliega solo.

## Paso 3 · Variables de entorno (tus credenciales de Strava)
En el proyecto de Vercel → **Settings → Environment Variables**, añade (Production):
- `STRAVA_CLIENT_ID` = `261715`
- `STRAVA_CLIENT_SECRET` = *(tu Client Secret de strava.com/settings/api — pégalo solo aquí, es privado)*

Luego **Deployments → Redeploy** para que tomen efecto.

## Paso 4 · Conectar Strava SIN terminal
1. En **strava.com/settings/api**, pon como **Authorization Callback Domain** tu dominio de Vercel (p. ej. `la-ruta.vercel.app`, sin `https://`).
2. Abre en el navegador: `https://TU-DOMINIO/api/auth`
3. Pulsa **Autorizar Strava** y acepta. Volverás a una página que muestra tu **refresh token**.
4. Copia ese token y añádelo en Vercel como variable `STRAVA_REFRESH_TOKEN`.
5. **Redeploy** una última vez.

## Paso 5 · ¡Listo!
Abre tu app, pulsa **Live** y verás tus 6 meses de Strava: sesiones, volumen y la **calibración** del plan a tu carga real.
En el móvil: abre la URL → **Compartir → Añadir a pantalla de inicio** (queda como app).

---

### Notas
- El **sueño, HRV y Body Battery** vienen de Garmin → se registran a mano en Progreso.
- Tu Client Secret y tokens viven solo en las variables de Vercel (privadas), nunca en el navegador.
- Si Live falla: revisa que las tres variables estén bien y que hiciste Redeploy después de cada cambio.
