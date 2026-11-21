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
  const elegido=conStock[0]||ordenados[0];
  const consumos=[];
  const resumen=[];
  if(!elegido)avisos.push('No hay producto sin cafeína con carbohidratos cuantificados: elige uno y verifica su etiqueta.');
  const stockUsado={};
  for(const etapa of crono.etapas.filter(e=>['bike','run'].includes(e.id)&&e.duracionMin>=25)){
    const duracion=etapa.duracionMin/60;
    const metaG=objetivos[etapa.id]*duracion;
    const intervalo=etapa.duracionMin>=90?30:25;
    const momentos=Math.max(1,Math.ceil(etapa.duracionMin/intervalo));
    let logrado=0;
    for(let i=0;i<momentos&&elegido;i++){
      // Permite porciones fraccionadas solo como volumen/ración planificada; ajustar empaque real.
      const porciones=round(metaG/momentos/elegido.carbohidratosG);
      if(porciones<=0)continue;
      const offsetMin=Math.min(etapa.duracionMin-5,Math.round((i+.5)*etapa.duracionMin/momentos));
      consumos.push({productoId:elegido.id,cantidad:porciones,fase:'durante',en:etapa.id,offsetMin,overrides:{},automatico:true});
      stockUsado[elegido.id]=(stockUsado[elegido.id]||0)+porciones;
      logrado+=porciones*elegido.carbohidratosG;
    }
    for(let i=0;i<momentos;i++){
      const ml=Math.round(liquidosHora*duracion/momentos);
      consumos.push({productoId:'agua-neutral',cantidad:1,fase:'durante',en:etapa.id,
        offsetMin:Math.min(etapa.duracionMin-3,Math.round((i+.5)*etapa.duracionMin/momentos)),
        overrides:{liquidoMl:ml},automatico:true});
    }
    resumen.push({etapa:etapa.id,duracionMin:etapa.duracionMin,objetivoGHora:objetivos[etapa.id],carbohidratosG:round(logrado),liquidosMl:Math.round(liquidosHora*duracion),intervaloMin:intervalo});
  }
  for(const [id,usado] of Object.entries(stockUsado)){
    if(inventario[id]===undefined)avisos.push('No se confirmó inventario de los productos programados.');
    else if(Number(inventario[id])<usado)avisos.push(`Stock insuficiente para ${id}: se requieren ${round(usado)} porciones y tienes ${inventario[id]}.`);
  }
  if(elegido&&!elegido.verificadoFabricante)avisos.push(`Confirma en el envase el aporte del producto ${elegido.nombre}; la referencia del catálogo no está verificada por fabricante.`);
  if(elegido)avisos.push('Las porciones fraccionadas representan cantidades equivalentes de carbohidrato: comprueba si pueden medirse/transportarse y cómo se acompañan de agua.');
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
  return {consumos,previo,post,resumen,objetivos,liquidosHora,avisos:[...new Set(avisos)],productoElegido:elegido?.id||null,cronograma:generarCronograma(carrera,consumos)};
}
