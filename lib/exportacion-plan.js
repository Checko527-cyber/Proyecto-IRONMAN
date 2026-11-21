// Fuente única para reportes descargables del plan. No introduce dosis automáticas.
const legible=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0?n:null;
const csv=v=>{
  const raw=String(v??'');
  // Evitar interpretación como fórmula al abrir el CSV en una hoja de cálculo.
  const seguro=/^[\s]*[=+\-@]/.test(raw)?"'"+raw:raw;
  return '"'+seguro.replace(/"/g,'""')+'"';
};
export function construirFilasPlan(cronograma,consumos,productos=[],inventario={}){
  const mapa=new Map(productos.map(p=>[p.id,p]));
  return (cronograma.hitos||[]).filter(x=>/^consumo-\d+$/.test(x.id)).map(h=>{
    const indice=Number(h.id.slice('consumo-'.length));
    const c=consumos[indice]||{};
    const p=mapa.get(c.productoId)||{};
    const cantidad=legible(c.cantidad);
    const cantidadPorPorcion=nombre=>{
      const v=Object.hasOwn(c.overrides||{},nombre)?c.overrides[nombre]:p[nombre];
      return legible(v);
    };
    const total=nombre=>{
      const v=cantidadPorPorcion(nombre);
      return v===null||cantidad===null?null:+(v*cantidad).toFixed(2);
    };
    const stock=legible(inventario[c.productoId]);
    return {hora:h.hora,etapa:h.etapa,producto:p.nombre||c.productoId||'Desconocido',
      porciones:cantidad,carbohidratosG:total('carbohidratosG'),sodioMg:total('sodioMg'),
      cafeinaMg:total('cafeinaMg'),liquidoMl:total('liquidoMl'),
      stockConfirmado:stock};
  });
}

export function exportarPlanCSV(cronograma,consumos,productos=[],inventario={}){
  const campos=['hora','etapa','producto','porciones','carbohidratosG','sodioMg','cafeinaMg','liquidoMl','stockConfirmado'];
  const filas=construirFilasPlan(cronograma,consumos,productos,inventario);
  const encabezados=['Hora','Etapa','Producto','Porciones','Carbohidratos (g)','Sodio (mg)','Cafeína (mg)','Líquido (ml)','Stock declarado'];
  return '\ufeff'+[encabezados.map(csv).join(';'),...filas.map(f=>campos.map(c=>csv(f[c]===null?'Sin dato':f[c])).join(';'))].join('\r\n');
}
