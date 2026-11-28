const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Bogota',year:'numeric',month:'2-digit',day:'2-digit'});
export function fechaBogota(date=new Date()){
 const parts=Object.fromEntries(formatter.formatToParts(date).map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
export function desplazarFecha(fecha,dias){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha)||!Number.isInteger(dias))throw Error('Fecha inválida');
 const d=new Date(fecha+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+dias);return d.toISOString().slice(0,10);
}
export function fechaActividad(a){
 const stamp=a?.start_date;
 if(typeof stamp==='string'&&/(Z|[+-]\d{2}:?\d{2})$/i.test(stamp)&&Number.isFinite(Date.parse(stamp)))return fechaBogota(new Date(stamp));
 const local=a?.start_date_local||stamp||'';
 return /^\d{4}-\d{2}-\d{2}/.test(local)?local.slice(0,10):null;
}
export function enRango(fecha,desde,hasta){return typeof fecha==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(fecha)&&fecha>=desde&&fecha<=hasta;}
export function diasEntre(a,b){return Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);}
