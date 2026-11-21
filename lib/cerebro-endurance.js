import { generarCronograma } from './planificador-carrera.js';

// Motor de apoyo a decisiones: metas orientativas, no prescripción médica.
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const num=v=>v===null||v===undefined||v===''?null:Number.isFinite(Number(v))?Number(v):null;
const round=n=>Math.round(n*10)/10;

export function generarPlanAutomatico({carrera,perfil={},catalogo=[],preferencias={},inventario={},opciones={}}){
  const crono=generarCronograma(carrera);
  const tolerancia=perfil.experienciaNutricion==='ensayada'&&!perfil.alertaEstomago?'entrenada':'conservadora';
  const calor=num(carrera?.temperaturaC);
  const liquidosHora=clamp(num(opciones.liquidosMlHora)??(calor>=28?650:calor>=20?550:450),250,900);
  const objetivos={bike:clamp(num(opciones.bikeGHora)??(tolerancia==='entrenada'?75:55),20,100),run:clamp(num(opciones.runGHora)??(tolerancia==='entrenada'?55:40),15,90)};
  const avisos=[];
  if(perfil.pesoKg==null)avisos.push('Confirma el peso actual para personalizar el desayuno previo y la recuperación.');
  if(perfil.sudoracionLh==null)avisos.push('Sin medición de sudoración: los líquidos son un punto de partida, no una pauta individual validada. Evita beber por encima de la sed o forzarte a cumplir volúmenes.');
  if(perfil.alertaEstomago)avisos.push('Antecedente gastrointestinal: se propone una meta conservadora; prueba todo en entrenamientos y consulta a un profesional.');
  if(perfil.experienciaNutricion!=='ensayada')avisos.push('La estrategia requiere entrenamiento digestivo: no estrenes geles, concentraciones ni cantidades el día de carrera.');
  if(calor>=28)avisos.push('Calor elevado: revisa aclimatación, logística de agua y ajuste de intensidad. El sodio no previene por sí solo la hiponatremia.');
  const preferidos=new Set(preferencias.favoritos||[]), disponibles=new Set(preferencias.disponibles||[]);
  const elegibles=catalogo.filter(p=>['gel','bebida','barrita','gominola','carbohidrato','energetico'].includes(p.tipo)&&Number.isFinite(p.carbohidratosG)&&p.carbohidratosG>0&&p.cafeinaMg===0);
  const ordenados=[...elegibles].sort((a,b)=>{
    const score=p=>(disponibles.has(p.id)?100:0)+(preferidos.has(p.id)?30:0)+(Number(inventario[p.id])>0?50:0)+(p.verificadoFabricante?10:0);
    return score(b)-score(a)||Math.abs(a.carbohidratosG-40)-Math.abs(b.carbohidratosG-40);
  });
  const conStock=ordenados.filter(p=>Number(inventario[p.id])>0);
  const solicitado=ordenados.find(p=>p.id===opciones.productoId);
  const geles=ordenados.filter(p=>p.tipo==='gel');
  const bebidas=ordenados.filter(p=>p.tipo==='bebida'&&p.carbohidratosG<=45);
  const elegido=(solicitado?.tipo==='gel'?solicitado:null)||geles.find(p=>Number(inventario[p.id])>0)||geles.find(p=>disponibles.has(p.id))||geles.find(p=>preferidos.has(p.id))||geles.find(p=>p.carbohidratosG>=25&&p.carbohidratosG<=35)||geles[0]||solicitado||conStock[0]||ordenados[0];
  const bebidaElegida=opciones.bebidaId==='ninguna'?null:(bebidas.find(p=>p.id===opciones.bebidaId)||bebidas.find(p=>Number(inventario[p.id])>0)||bebidas.find(p=>disponibles.has(p.id))||bebidas.find(p=>preferidos.has(p.id))||null);
  const consumos=[];
  const resumen=[];
  if(!elegido)avisos.push('No hay producto sin cafeína con carbohidratos cuantificados: elige uno y verifica su etiqueta.');
  if(!solicitado&&!conStock.length&&!ordenados.some(p=>disponibles.has(p.id)))avisos.push('Producto energético provisional tomado del catálogo: el atleta debe confirmar cuál ha ensayado o tiene disponible.');
  const stockUsado={};
  for(const etapa of crono.etapas.filter(e=>['bike','run'].includes(e.id)&&e.duracionMin>=25)){
    const duracion=etapa.duracionMin/60;
    const metaG=objetivos[etapa.id]*duracion;
    const intervalo=etapa.duracionMin>=90?30:25;
    const momentos=Math.max(1,Math.ceil(etapa.duracionMin/intervalo));
    let logrado=0;
    const usarBebida=etapa.id==='bike'&&bebidaElegida&&elegido?.id!==bebidaElegida.id;
    const bebidaPorciones=usarBebida?Math.min(Math.ceil(duracion*2)/2,Math.max(0,round(metaG*.35/bebidaElegida.carbohidratosG))):0;
    const bebidaTotal=bebidaPorciones*(bebidaElegida?.carbohidratosG||0);
    const bebidaMl=usarBebida?Math.min(Math.round(liquidosHora*duracion*.65),Math.round(bebidaPorciones*500)):0;
    if(usarBebida&&bebidaPorciones>0){
      consumos.push({productoId:bebidaElegida.id,cantidad:bebidaPorciones,fase:'durante',en:etapa.id,offsetMin:5,
        overrides:{liquidoMl:bebidaMl},automatico:true,indicacion:'Bidón de bebida energética; repartir en sorbos durante el tramo'});
      stockUsado[bebidaElegida.id]=(stockUsado[bebidaElegida.id]||0)+bebidaPorciones;
      logrado+=bebidaTotal;
    }
    const gelMomentos=Math.max(1,Math.round((metaG-bebidaTotal)/Math.max(1,elegido?.carbohidratosG||30)));
    for(let i=0;i<gelMomentos&&elegido;i++){
      const porciones=1;
      if(porciones<=0)continue;
      const offsetMin=Math.max(5,Math.min(etapa.duracionMin-5,Math.round((i+.5)*etapa.duracionMin/gelMomentos)));
      consumos.push({productoId:elegido.id,cantidad:porciones,fase:'durante',en:etapa.id,offsetMin,overrides:{},automatico:true,
        indicacion:'Gel energético; comprobar si requiere agua según su etiqueta'});
      stockUsado[elegido.id]=(stockUsado[elegido.id]||0)+porciones;
      logrado+=porciones*elegido.carbohidratosG;
    }
    for(let i=0;i<momentos;i++){
      const ml=Math.round(Math.max(0,liquidosHora*duracion-bebidaMl)/momentos);
      consumos.push({productoId:'agua-neutral',cantidad:1,fase:'durante',en:etapa.id,
        offsetMin:Math.min(etapa.duracionMin-3,Math.round((i+.5)*etapa.duracionMin/momentos)),
        overrides:{liquidoMl:ml},automatico:true});
    }
    resumen.push({etapa:etapa.id,duracionMin:etapa.duracionMin,objetivoGHora:objetivos[etapa.id],carbohidratosG:round(logrado),liquidosMl:Math.round(liquidosHora*duracion),intervaloMin:intervalo,
      bebidaMl,aguaMl:Math.round(Math.max(0,liquidosHora*duracion-bebidaMl))});
  }
  for(const [id,usado] of Object.entries(stockUsado)){
    if(inventario[id]===undefined)avisos.push('No se confirmó inventario de los productos programados.');
    else if(Number(inventario[id])<usado)avisos.push(`Stock insuficiente para ${id}: se requieren ${round(usado)} porciones y tienes ${inventario[id]}.`);
  }
  if(elegido&&!elegido.verificadoFabricante)avisos.push(`Confirma en el envase el aporte del producto ${elegido.nombre}; la referencia del catálogo no está verificada por fabricante.`);
  if(elegido)avisos.push('Las porciones fraccionadas representan equivalentes nutricionales: comprueba empaque, concentración, tolerancia y transporte.');
  const peso=num(perfil.pesoKg);
  const previo=[
    {cuando:'D-2 y D-1',accion:'Priorizar comidas conocidas, disponibilidad de carbohidratos y descanso; ensayar en entrenamientos largos antes de aplicarlo.'},
    {cuando:'3–4 h antes',accion:peso?`Desayuno conocido, bajo en fibra y grasa; referencia inicial de ${Math.round(peso*1.5)} g de carbohidratos (1,5 g/kg), ajustable según tolerancia.`:'Desayuno conocido 3–4 horas antes; confirmar peso y tolerancia para estimar carbohidratos.'},
    {cuando:'30–15 min antes',accion:'Última revisión de hidratación y molestias digestivas. No agregar suplementos nuevos automáticamente.'}
  ];
  const post=[
    {cuando:'0–60 min después',accion:peso?`Comida/bebida tolerada con carbohidratos y aprox. ${Math.round(peso*.3)} g de proteína (0,3 g/kg).`:'Comida de recuperación tolerada con carbohidratos y proteínas; confirmar peso para estimar cantidades.'},
    {cuando:'2–4 h después',accion:'Continuar alimentación habitual y rehidratación según sed, pérdidas evaluadas y tolerancia.'}
  ];
  avisos.push('No se añade cafeína ni cápsulas de sal automáticamente: requieren preferencia, tolerancia, condiciones médicas y comprobación de composición.');
  return {consumos,previo,post,resumen,objetivos,liquidosHora,avisos:[...new Set(avisos)],productoElegido:elegido?.id||null,
    bebidaElegida:bebidaElegida?.id||null,desayuno:opciones.desayuno||'avena',cronograma:generarCronograma(carrera,consumos)};
}
