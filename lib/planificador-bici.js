const keySport=t=>String(t||'').toLowerCase();
export function proponerBicicleta(entrenamientos,{fechaInicio=new Date().toISOString().slice(0,10),recuperacion='mantener'}={}){
 const byDate=new Map();
 for(const e of entrenamientos||[]){
  if(!e.fecha)continue;const k=e.fecha;const arr=byDate.get(k)||[];arr.push(e);byDate.set(k,arr);
 }
 const resultado=[];
 const start=new Date(fechaInicio+'T12:00:00Z');
 for(let i=0;i<7;i++){
  const d=new Date(start.getTime()+i*86400000),fecha=d.toISOString().slice(0,10),day=d.getUTCDay(),events=byDate.get(fecha)||[];
  const bike=events.some(e=>/ride|cycling|bik|cicl/.test(keySport(e.deporte)));
  const impact=events.some(e=>/run|weight|strength|correr|fuerza/.test(keySport(e.deporte)) && (/interval|serie|tempo|umbral|largo|long|fartlek/i.test(e.nombre+' '+(e.descripcion||''))||Number(e.minutos||0)>=65));
  if(bike||day===1||day===0)continue;
  if(day!==4&&day!==6&&day!==3)continue;
  if(impact){resultado.push({fecha,decision:'omitir',motivo:'Sesión exigente de carrera o fuerza en el mismo día',estado:'propuesta'});continue;}
  if(recuperacion==='reducir'){resultado.push({fecha,decision:'recuperación',minutos:25,zona:'Z1',motivo:'Señales de recuperación desfavorables',estado:'propuesta'});continue;}
  const long=day===6,conservative=recuperacion==='moderar';
  resultado.push({fecha,decision:'bicicleta',minutos:long?(conservative?70:110):(conservative?35:55),
   zona:long?'Z2':'Z1-Z2',motivo:long?'Fondo aeróbico sin intensidad adicional':'Complemento aeróbico, sin competir con el plan del entrenador',
   estado:'propuesta',requiereAprobacion:true});
 }
 return resultado;
}
