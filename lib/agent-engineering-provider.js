// Proveedor de ingeniería de solo lectura. No crea commits ni despliega.
const REPO='Checko527-cyber/Proyecto-IRONMAN';
const BRANCH='qa/ironman-multiagente-fase0';
export function crearProveedorIngenieria({proyectoId,leerEvidencia}){
 if(typeof proyectoId!=='string'||!/^ironman[-_a-z0-9]{0,72}$/i.test(proyectoId)||typeof leerEvidencia!=='function') throw new TypeError('Dependencias técnicas incompletas');
 const verificar=async t=>{
  if(t?.proyectoId!==proyectoId||typeof t.id!=='string'||!t.id)throw new Error('Tarea no autorizada');
  const r=await leerEvidencia({proyectoId,id:t.id,repo:REPO,branch:BRANCH});
  if(r?.repo!==REPO||r.branch!==BRANCH||r.proyectoId!==proyectoId||r.tareaId!==t.id||typeof r.commit!=='string'||!(/^[a-f0-9]{40}$/.test(r.commit))||r.ciCommit!==r.commit||r.ciConclusion!=='success'||r.revisionTecnica!==true)return false;
  return true;
 };
 return Object.freeze({
 async mejoraTecnica(t){return await verificar(t)?{estado:'verificado',devolverRevision:true}:{estado:'insuficiente'};},
 async validacionTecnica(t){return {estado:await verificar(t)?'verificado':'insuficiente'};}
 });
}
