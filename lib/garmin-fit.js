import { inflateRawSync } from 'node:zlib';

export function extractFitFromZip(input) {
 const zip=Buffer.from(input);
 let eocd=-1;
 for(let i=zip.length-22;i>=Math.max(0,zip.length-65557);i--)
  if(zip.readUInt32LE(i)===0x06054b50){eocd=i;break;}
 if(eocd<0)throw Error('ZIP sin directorio central');
 const n=zip.readUInt16LE(eocd+10),offset=zip.readUInt32LE(eocd+16);
 let p=offset;
 for(let i=0;i<n;i++){
  if(zip.readUInt32LE(p)!==0x02014b50)throw Error('Directorio ZIP incorrecto');
  const method=zip.readUInt16LE(p+10),size=zip.readUInt32LE(p+20);
  const fileLen=zip.readUInt16LE(p+28),extra=zip.readUInt16LE(p+30),comment=zip.readUInt16LE(p+32);
  const local=zip.readUInt32LE(p+42),name=zip.toString('utf8',p+46,p+46+fileLen);
  p+=46+fileLen+extra+comment;
  if(!name.toLowerCase().endsWith('.fit')||name.includes('..')||name.startsWith('/'))continue;
  if(size>32*1024*1024)throw Error('FIT demasiado grande');
  if(zip.readUInt32LE(local)!==0x04034b50)throw Error('Entrada ZIP inválida');
  const start=local+30+zip.readUInt16LE(local+26)+zip.readUInt16LE(local+28);
  if(start+size>zip.length)throw Error('Entrada ZIP incompleta');
  const compressed=zip.subarray(start,start+size);
  const fit=method===0?compressed:method===8?inflateRawSync(compressed,{maxOutputLength:32*1024*1024}):null;
  if(!fit||fit.length<14||fit.toString('ascii',8,12)!=='.FIT')throw Error('FIT no válido');
  return fit;
 }
 throw Error('ZIP sin actividad FIT');
}

const EPOCH=Date.UTC(1989,11,31,0,0,0);
function read(buf,pos,size,type,little){
 if(pos+size>buf.length)throw Error('FIT truncado');
 if(type===7)return buf.toString('utf8',pos,pos+size).split('\\0')[0];
 const v=new DataView(buf.buffer,buf.byteOffset+pos,size);
 const signed=[1,3,5,14].includes(type);
 if(size===1)return signed?v.getInt8(0):v.getUint8(0);
 if(size===2)return signed?v.getInt16(0,little):v.getUint16(0,little);
 if(size===4)return type===8?v.getFloat32(0,little):signed?v.getInt32(0,little):v.getUint32(0,little);
 return null;
}
export function decodeFit(input){
 const buf=Buffer.from(input);
 if(buf.length<14||buf.toString('ascii',8,12)!=='.FIT')throw Error('Cabecera FIT inválida');
 const header=buf[0],end=header+buf.readUInt32LE(4);
 if(end>buf.length||end<12)throw Error('Longitud FIT inválida');
 let p=header,lastTimestamp=null;const definitions=new Map(),records=[];
 while(p<end){
  const h=buf[p++],local=h&15;
  if(h&0x80){
   const def=definitions.get((h>>5)&3);
   if(!def)throw Error('Definición FIT ausente');
   const val=consume(def);
   if(def.message===20)records.push(toRecord(val));
   continue;
  }
  if(h&0x40){
   if(p+5>end)throw Error('Definición FIT incompleta');
   p++;const little=buf[p++]===0, message=little?buf.readUInt16LE(p):buf.readUInt16BE(p);p+=2;
   const count=buf[p++],fields=[];
   for(let i=0;i<count;i++){fields.push({num:buf[p],size:buf[p+1],type:buf[p+2]&31});p+=3;}
   if(h&0x20){const dev=buf[p++];p+=dev*3;}
   definitions.set(local,{message,little,fields});
  }else{
   const def=definitions.get(local);if(!def)throw Error('Definición FIT ausente');
   const values=consume(def);if(def.message===20)records.push(toRecord(values));
  }
 }
 return records.filter(x=>Number.isFinite(x.time)).sort((a,b)=>a.time-b.time);
 function consume(def){const o={};for(const f of def.fields){if(p+f.size>end)throw Error('Registro FIT incompleto');if(f.size===1||f.size===2||f.size===4||f.type===7)o[f.num]=read(buf,p,f.size,f.type,def.little);p+=f.size;}return o;}
 function toRecord(v){
  const time=typeof v[253]==='number'?EPOCH+v[253]*1000:null;
  if(time!==null)lastTimestamp=time;
  return {time,hr:v[3]===255?null:v[3]??null,cadence:v[4]===255?null:v[4]??null,
   speed:v[6]==null?null:v[6]/1000,distance:v[5]==null?null:v[5]/100,
   altitude:v[2]==null?null:v[2]/5-500};
 }
}
export function timeSeries(records,{windowSeconds=60,threshold=148}={}){
 const start=records[0]?.time;
 if(!start)return {samples:[],blocks:[]};
 const samples=[];let bin=-1,sumHR=0,sumCad=0,sumSpeed=0,nh=0,nc=0,ns=0;
 function push(){if(bin<0)return;samples.push({minute:Math.round(bin*windowSeconds/60*10)/10,hr:nh?Math.round(sumHR/nh):null,
  cadence:nc?Math.round(sumCad/nc):null,speed:ns?Math.round(sumSpeed/ns*3.6*10)/10:null});}
 for(const r of records){const next=Math.floor((r.time-start)/1000/windowSeconds);
  if(next!==bin){push();for(let missing=bin+1;missing<next;missing++)samples.push({minute:Math.round(missing*windowSeconds/60*10)/10,hr:null,cadence:null,speed:null});bin=next;sumHR=sumCad=sumSpeed=nh=nc=ns=0;}
  if(r.hr!=null){sumHR+=r.hr;nh++}if(r.cadence!=null){sumCad+=r.cadence;nc++}
  if(r.speed!=null){sumSpeed+=r.speed;ns++}
 }push();
 const blocks=[];let current=null;
 for(const s of samples){
  const label=s.hr==null?'sin datos':s.hr>=threshold?'esfuerzo':'recuperación';
  if(!current||current.tipo!==label){if(current)blocks.push(current);current={tipo:label,inicioMin:s.minute,finMin:s.minute+windowSeconds/60,fcMedia:s.hr,puntos:1};}
  else{current.finMin=s.minute+windowSeconds/60;current.puntos++;if(s.hr!=null)current.fcMedia=Math.round((current.fcMedia*(current.puntos-1)+s.hr)/current.puntos);}
 }if(current)blocks.push(current);
 return {samples,blocks};
}
