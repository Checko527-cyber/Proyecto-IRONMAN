// api/auth.js — Conecta tu Strava SIN terminal.
// Requiere en Vercel: STRAVA_CLIENT_ID y STRAVA_CLIENT_SECRET.
// Uso: abre  https://TU-DOMINIO/api/auth  y sigue los pasos en pantalla.

export default async function handler(req, res) {
  const { STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET } = process.env;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirect = `${proto}://${host}/api/auth`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const page = (body) => `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar Strava · La Ruta</title>
<style>body{margin:0;font-family:system-ui,-apple-system,sans-serif;background:#0E1119;color:#ECEFF6;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
.box{max-width:560px;width:100%;background:#171C28;border:1px solid #2A3242;border-radius:18px;padding:26px;box-shadow:0 10px 30px rgba(0,0,0,.4)}
h1{font-size:20px;margin:0 0 8px}.muted{color:#A7B0C4;font-size:14px;line-height:1.55}
a.btn,button.btn{display:inline-block;margin-top:18px;background:linear-gradient(135deg,#FC4C02,#F2641F);color:#fff;font-weight:700;text-decoration:none;padding:13px 18px;border-radius:12px;border:none;font-size:15px;cursor:pointer}
code{display:block;background:#0E1119;border:1px solid #3A4458;border-radius:10px;padding:14px;margin-top:14px;color:#FFB23E;font-size:15px;word-break:break-all;font-family:ui-monospace,Menlo,monospace}
b{color:#ECEFF6}</style></head><body><div class="box">${body}</div></body></html>`;

  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    return res.status(500).send(page(`<h1>Faltan credenciales</h1><p class="muted">Configura primero <b>STRAVA_CLIENT_ID</b> y <b>STRAVA_CLIENT_SECRET</b> en Vercel (Settings → Environment Variables), haz Redeploy y vuelve a abrir esta página.</p>`));
  }

  const code = req.query && req.query.code;
  if (!code) {
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${STRAVA_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirect)}&approval_prompt=force&scope=activity:read_all`;
    return res.status(200).send(page(`<h1>Conectar con Strava</h1><p class="muted">Pulsa el botón, autoriza el acceso a tus actividades y te traemos de vuelta aquí con tu <b>refresh token</b> listo para copiar.</p><a class="btn" href="${authUrl}">Autorizar Strava →</a><p class="muted" style="margin-top:16px">Si Strava muestra un error de dominio, ve a strava.com/settings/api y pon <b>${host}</b> como "Authorization Callback Domain".</p>`));
  }

  try {
    const r = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: STRAVA_CLIENT_ID, client_secret: STRAVA_CLIENT_SECRET, grant_type: 'authorization_code', code })
    });
    const t = await r.json();
    if (!t.refresh_token) {
      return res.status(502).send(page(`<h1>No se pudo obtener el token</h1><p class="muted">Respuesta de Strava:</p><code>${JSON.stringify(t)}</code>`));
    }
    return res.status(200).send(page(`<h1>✓ ¡Listo! Tu refresh token</h1><p class="muted">Cópialo y pégalo en Vercel como variable <b>STRAVA_REFRESH_TOKEN</b>; luego haz <b>Redeploy</b>.</p><code>${t.refresh_token}</code><p class="muted" style="margin-top:16px">Después abre tu app y pulsa <b>Live</b>. ¡Strava quedará conectado!</p>`));
  } catch (e) {
    return res.status(500).send(page(`<h1>Error</h1><code>${String(e)}</code>`));
  }
}
