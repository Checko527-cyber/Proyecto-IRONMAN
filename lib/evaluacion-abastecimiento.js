// Auditoría aritmética del plan: no genera prescripciones nutricionales.
const medible=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0;

export function evaluarAbastecimiento(cronograma,consumos,productos,objetivos={}){
  const mapa=new Map(productos.map(p=>[p.id,p]));
  const tramos=(cronograma?.etapas||[]).filter(e=>['bike','run','swim'].includes(e.id));
  const detalle=tramos.map(tramo=>{
    const items=consumos.filter(c=>c.en===tramo.id);
    const horas=tramo.duracionMin/60;
    const totales={};
    for(const campo of ['carbohidratosG','sodioMg','cafeinaMg']){
      let total=0,completo=true;
      for(const item of items){
        const p=mapa.get(item.productoId);
        const dato=Object.hasOwn(item.overrides||{},campo)?item.overrides[campo]:p?.[campo];
        if(!medible(dato)||!medible(Number(item.cantidad))){completo=false;continue;}
        total+=dato*Number(item.cantidad);
      }
      totales[campo]={total,porHora:horas>0?total/horas:null,completo};
    }
    const meta=objetivos[tramo.id];
    const objetivo=medible(meta)?meta:null;
    const diferencia=objetivo!==null&&totales.carbohidratosG.completo&&horas>0?
      totales.carbohidratosG.porHora-objetivo:null;
    return {id:tramo.id,nombre:tramo.nombre,duracionMin:tramo.duracionMin,items:items.length,
      totales,objetivoCarbohidratosHora:objetivo,diferenciaCarbohidratosHora:diferencia};
  });
  const alertas=[];
  for(const t of detalle){
    if(t.duracionMin===0)alertas.push(`${t.nombre}: duración cero; no se calcula consumo por hora.`);
    for(const [campo,dato] of Object.entries(t.totales)){
      if(!dato.completo)alertas.push(`${t.nombre}: faltan etiquetas para ${campo}.`);
    }
    if(t.objetivoCarbohidratosHora!==null&&t.diferenciaCarbohidratosHora!==null&&Math.abs(t.diferenciaCarbohidratosHora)>0.5){
      alertas.push(`${t.nombre}: el plan difiere del objetivo de carbohidratos declarado.`);
    }
  }
  return {detalle,alertas};
}
