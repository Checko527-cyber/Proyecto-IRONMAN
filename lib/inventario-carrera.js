// Recuento de porciones y líquido declarado. Cero stock es distinto de stock desconocido.
const valido=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;
export function revisarInventario(consumos=[],inventario={},productos=[]){
  const mapa=new Map(productos.map(p=>[p.id,p]));
  const agrupado=new Map();
  let liquidoMl=0,liquidoCompleto=true;
  for(const c of consumos){
    if(!c||!valido(c.cantidad)||c.cantidad===0)continue;
    const existente=agrupado.get(c.productoId)||0;
    agrupado.set(c.productoId,existente+c.cantidad);
    // Solo se suma un líquido si el atleta declara mililitros por porción.
    const ml=c.overrides?.liquidoMl;
    if(valido(ml))liquidoMl+=ml*c.cantidad;
    else liquidoCompleto=false;
  }
  const items=[...agrupado].map(([id,requerido])=>{
    const stock=inventario[id];
    const disponible=valido(stock)?stock:null;
    return {productoId:id,nombre:mapa.get(id)?.nombre||id,requerido,
      disponible,faltante:disponible===null?null:Math.max(0,requerido-disponible)};
  });
  return {items,liquidoMl,liquidoCompleto,
    productosSinStock:items.filter(i=>i.faltante!==null&&i.faltante>0).length,
    productosSinConfirmar:items.filter(i=>i.disponible===null).length};
}
