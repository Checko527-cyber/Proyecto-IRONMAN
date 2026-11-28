// Solo equivalencias exactas tras normalizar separadores: tempWeight no es peso corporal.
const normalizar=s=>s.toLowerCase().replace(/[_\s-]/g,'');
export function campoWellness(obj,...alias){
 const keys=Object.keys(obj||{});
 for(const a of alias){const k=keys.find(k=>normalizar(k)===normalizar(a));if(k)return k;}
 return null;
}
export function numeroWellness(v){
 if(typeof v!=='number'&&(typeof v!=='string'||!v.trim()))return null;
 const n=Number(v);return Number.isFinite(n)?n:null;
}
export function pesoWellness(v){
 const n=numeroWellness(v);return n!==null&&n>=20&&n<=350?n:null;
}
