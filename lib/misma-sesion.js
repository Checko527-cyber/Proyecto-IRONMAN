export const mismaSesion = (a, b) => {
  if (a.date !== b.date || a.sport !== b.sport) return false;
  // La hora de inicio identifica mejor una sesión que el nombre o el volumen:
  // dos rodajes en un mismo día pueden durar y medir prácticamente lo mismo.
  const ta = Date.parse(a.startedAt || '');
  const tb = Date.parse(b.startedAt || '');
  if (Number.isFinite(ta) && Number.isFinite(tb)) {
    return Math.abs(ta - tb) <= 20 * 60 * 1000;
  }
  // Para registros históricos sin hora, exigir dos indicios independientes.
  const nombre = !!(a.name && b.name && a.name.trim().toLowerCase() === b.name.trim().toLowerCase());
  const duracion = a.min != null && b.min != null &&
    Math.abs(a.min - b.min) <= Math.max(3, a.min * 0.08);
  const distancia = a.km != null && b.km != null && a.km > 0 && b.km > 0 &&
    Math.abs(a.km - b.km) <= Math.max(0.15, a.km * 0.04);
  return Number(nombre) + Number(duracion) + Number(distancia) >= 2;
}; 
