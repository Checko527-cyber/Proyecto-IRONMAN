// Convierte el motor determinista a las cuatro hojas operativas del plan Cartagena.
const hora=(total)=>{
  const v=((Math.round(total)%1440)+1440)%1440;
  return `${String(Math.floor(v/60)).padStart(2,'0')}:${String(v%60).padStart(2,'0')}`;
};
const inicio=h=>{const [a,b]=String(h||'07:00').split(':').map(Number);return a*60+b;};

export function construirDocumentoCarrera({carrera,perfil={},plan,consumos=[],catalogo=[]}){
  const salida=inicio(carrera.salida),peso=Number(perfil.pesoKg)>0?Number(perfil.pesoKg):null;
  const mapa=new Map(catalogo.map(x=>[x.id,x]));
  const eventos=[
    {dia:'D-2',hora:'Durante el día',etapa:'Preparación',accion:'Confirmar avituallamientos, ropa y bicicleta; priorizar comidas habituales y descanso',detalle:'Evitar experimentar con comidas o suplementos nuevos'},
    {dia:'D-1',hora:'Mañana',etapa:'Preparación',accion:'Revisar circuito, horarios, material y realizar ensayo de logística',detalle:'Ajustar a las reglas oficiales del evento'},
    {dia:'D-1',hora:'Tarde',etapa:'Preparación',accion:'Preparar y rotular cada ración, bidón y bolsa de transición',detalle:'Hacer inventario físico y comprobar caducidades'},
    {dia:'Carrera',hora:hora(salida-210),etapa:'Previa',accion:'Despertar y revisar estado general',detalle:'Dejar margen para higiene, traslado y digestión'},
    {dia:'Carrera',hora:hora(salida-180),etapa:'Previa',accion:'Desayuno familiar y tolerado',detalle:peso?`Referencia inicial: ${Math.round(peso*1.5)} g CH (1,5 g/kg); adaptar según experiencia y tolerancia`:'Confirmar peso y tolerancia antes de determinar cantidad'},
    {dia:'Carrera',hora:hora(salida-75),etapa:'Logística',accion:'Revisar transición, casco, dorsal, bidones y material',detalle:'Comprobar horario oficial de cierre de transición'},
    {dia:'Carrera',hora:hora(salida-20),etapa:'Previa',accion:'Comprobar hidratación y calentamiento autorizado',detalle:'No introducir productos o dosis nuevas'}
  ];
  for(const e of plan.cronograma.etapas){
    eventos.push({dia:'Carrera',hora:e.inicio,etapa:e.nombre,accion:`Inicio · ${e.nombre}`,detalle:e.km?`${e.km} km · ${e.duracionMin} min previstos`:`${e.duracionMin} min previstos`});
    for(const c of consumos.filter(c=>c.en===e.id)){
      const p=mapa.get(c.productoId);
      eventos.push({dia:'Carrera',hora:hora(e.inicioMin+c.offsetMin),etapa:e.nombre,
        accion:`${c.productoId==='agua-neutral'?'Agua orientativa':p?.nombre||'Producto'} · ${c.productoId==='agua-neutral'?`${Math.round(c.overrides?.liquidoMl||0)} ml`:`${c.cantidad} porción(es)`}`,
        detalle:c.productoId==='agua-neutral'?'Volumen de planificación; ajustar a sed y avituallamiento disponible':`${Math.round((p?.carbohidratosG||0)*c.cantidad)} g CH · comprobar formato de transporte`});
    }
    eventos.push({dia:'Carrera',hora:e.fin,etapa:e.nombre,accion:`Fin · ${e.nombre}`,detalle:'Transición o siguiente tramo'});
  }
  const ultimo=plan.cronograma.etapas.at(-1)?.finMin??salida;
  eventos.push({dia:'Carrera',hora:hora(ultimo+20),etapa:'Recuperación',accion:'Alimentación e hidratación post-meta',detalle:peso?`Referencia: ~${Math.round(peso*.3)} g de proteína, carbohidratos y líquidos según tolerancia`:'Comida con proteínas y carbohidratos; personalizar según peso y tolerancia'});
  const grupos=['D-2','D-1','Carrera'];
  const relativo=h=>{let d=inicio(h)-salida;if(d>720)d-=1440;if(d< -720)d+=1440;return d;};
  eventos.sort((a,b)=>grupos.indexOf(a.dia)-grupos.indexOf(b.dia)||(a.dia==='Carrera'?relativo(a.hora)-relativo(b.hora):0));
  const materiales=[
    ['Natación',['Gafas principales y repuesto','Gorro oficial y trisuit probado','Antivaho y material autorizado']],
    ['Bicicleta',['Bicicleta revisada y fotografías del ajuste','Casco, zapatillas y gafas','Bidones rotulados y herramientas','Kit antipinchazos y repuestos']],
    ['Carrera',['Zapatillas probadas','Dorsal y cinturón','Gorra, calcetines y protección solar']],
    ['Nutrición',['Geles o alimento dosificados','Bebidas y agua según puntos de abastecimiento','Plan impreso o guardado sin conexión','Ración de reserva tolerada']],
    ['Logística',['Documento y registro','Horarios y mapa de transiciones','Bolsa de ropa posterior','Cargadores y dispositivos deportivos']]
  ];
  const cantidades=new Map();for(const c of consumos){if(c.productoId==='agua-neutral')continue;cantidades.set(c.productoId,(cantidades.get(c.productoId)||0)+c.cantidad);}
  return {eventos,materiales,productos:[...cantidades].map(([id,cantidad])=>({...mapa.get(id),id,cantidad:Math.ceil(cantidad*10)/10})),
    inicio:hora(salida),meta:plan.cronograma.llegada,distancia:plan.cronograma.distancia,
    puntosPendientes:[...new Set(plan.avisos||[])]};
}
