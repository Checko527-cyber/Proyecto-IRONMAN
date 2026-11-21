import { CATALOGO_COMPLETO } from '../lib/catalogo-nutricion.js';

// Catálogo solo lectura para la futura interfaz Nutrición.
// Las fichas se presentan con fuentes y estados de verificación, sin inventar stock.
export default function handler(req,res) {
  res.setHeader('Cache-Control','public, max-age=300');
  if(req.method!=='GET') return res.status(405).json({error:'Método no permitido.'});
  const q=String(req.query?.q||'').trim().toLocaleLowerCase('es').slice(0,80);
  const tipo=String(req.query?.tipo||'').trim().toLowerCase();
  const productos=CATALOGO_COMPLETO.filter(p=>(!q||p.nombre.toLocaleLowerCase('es').includes(q)) && (!tipo||p.tipo===tipo));
  return res.status(200).json({
    actualizado:'2026-11-21',total:productos.length,
    aviso:'Disponibilidad colombiana orientativa; confirmar variante, etiqueta y existencias antes de calcular la estrategia definitiva.',
    productos
  });
}
