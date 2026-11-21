// Cronograma determinista de competencia. No prescribe dosis, ritmos ni potencia.
// Las estimaciones se introducen por el atleta/entrenador y se pueden recalcular.
export const DISTANCIAS = Object.freeze({
  '5150':{nombre:'Triatlón olímpico · 51.50',swimKm:1.5,bikeKm:40,runKm:10},
  '703':{nombre:'IRONMAN 70.3',swimKm:1.9,bikeKm:90,runKm:21.1},
  '1406':{nombre:'IRONMAN completo',swimKm:3.8,bikeKm:180,runKm:42.2},
  'half':{nombre:'Media maratón',swimKm:0,bikeKm:0,runKm:21.0975},
  'marathon':{nombre:'Maratón',swimKm:0,bikeKm:0,runKm:42.195},
  'bike':{nombre:'Ciclismo de ruta',swimKm:0,bikeKm:100,runKm:0}
});

const orden=['swim','t1','bike','t2','run'];
const nombres={swim:'Natación',t1:'Transición 1',bike:'Ciclismo',t2:'Transición 2',run:'Carrera'};
const positivo=(v)=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
const hora=(min)=>`${String(Math.floor(((min%1440)+1440)%1440/60)).padStart(2,'0')}:${String(Math.round(((min%1440)+1440)%1440%60)).padStart(2,'0')}`;
const parseHora=h=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(h||''));return m?Number(m[1])*60+Number(m[2]):null;};

export function generarCronograma(config={},items=[]){
  const tipo=Object.hasOwn(DISTANCIAS,config.tipo)?config.tipo:'703';
  const dist=DISTANCIAS[tipo];
  const base=parseHora(config.salida||'07:00');
  const alertas=[];
  if(base===null)alertas.push('Hora de salida inválida.');
  const etapas=[];
  let cursor=base??420;
  for(const key of orden){
    const km=key==='swim'?dist.swimKm:key==='bike'?dist.bikeKm:key==='run'?dist.runKm:0;
    if(!km && !['t1','t2'].includes(key))continue;
    if(!dist.swimKm && (key==='t1'||key==='t2'))continue;
    const minutos=positivo(config.tiempos?.[key]);
    if(minutos===null){alertas.push(`Falta duración estimada de ${nombres[key]}.`);continue;}
    etapas.push({id:key,nombre:nombres[key],km,inicioMin:cursor,finMin:cursor+minutos,
      inicio:hora(cursor),fin:hora(cursor+minutos),duracionMin:minutos});
    cursor+=minutos;
  }
  const primera=etapas[0]?.inicioMin??(base??420);
  const ultima=etapas.at(-1)?.finMin??primera;
  const hitos=[
    {id:'despertar',nombre:'Despertar y preparación',minuto:primera-180,etapa:'pre'},
    {id:'preparacion',nombre:'Preparación de salida',minuto:primera-60,etapa:'pre'},
    ...etapas.flatMap(e=>[
      {id:e.id+'-inicio',nombre:e.nombre+' · inicio',minuto:e.inicioMin,etapa:e.id},
      {id:e.id+'-fin',nombre:e.nombre+' · fin',minuto:e.finMin,etapa:e.id}
    ]),
    {id:'meta',nombre:'Meta y recuperación',minuto:ultima,etapa:'post'}
  ];
  for(const [i,x] of (Array.isArray(items)?items:[]).entries()){
    const etapa=x.en||(x.fase==='durante'?(etapas.find(e=>e.id==='bike'||e.id==='run')?.id||'run'):x.fase)||'run';
    const ref=etapa==='pre'?primera:etapa==='post'?ultima:etapas.find(e=>e.id===etapa)?.inicioMin;
    const offset=Number(x.offsetMin??0);
    if(ref==null||!Number.isFinite(offset)){
      alertas.push(`Consumo ${i+1}: etapa o minuto no válido.`);continue;
    }
    const minuto=ref+offset;
    const rango=etapas.find(e=>e.id===etapa);
    if(rango&&(minuto<rango.inicioMin||minuto>rango.finMin))alertas.push(`Consumo ${i+1}: fuera de la duración de ${rango.nombre}.`);
    hitos.push({id:'consumo-'+i,nombre:'Nutrición: '+String(x.nombre||x.productoId||'producto'),minuto,etapa,
      productoId:x.productoId,cantidad:x.cantidad});
  }
  hitos.sort((a,b)=>a.minuto-b.minuto);
  const temp=config.temperaturaC===null||config.temperaturaC===undefined||config.temperaturaC===''?null:Number(config.temperaturaC);
  const hum=positivo(config.humedadPct);
  if(temp!==null&&(!Number.isFinite(temp)||temp < -20||temp>55))alertas.push('Temperatura inválida: introducir un valor entre -20 y 55 °C.');
  if(temp!==null&&temp>=28)alertas.push('Calor elevado: revisar hidratación, intensidad y aclimatación con datos individuales.');
  if(hum!==null&&hum>100)alertas.push('Humedad inválida: debe estar entre 0 y 100 %.');
  return {tipo,distancia:dist,salida:base===null?null:hora(base),
    totalMin:etapas.reduce((s,e)=>s+e.duracionMin,0),llegada:hora(ultima),
    etapas,hitos:hitos.map(h=>({...h,hora:hora(h.minuto),diaRelativo:Math.floor(h.minuto/1440)})),
    alertas};
}
