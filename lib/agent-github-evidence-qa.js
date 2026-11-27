import {validarDestinoQA} from './agent-db-permissions.js';
const REPO='Checko527-cyber/Proyecto-IRONMAN', BRANCH='qa/ironman-multiagente-fase0';
const BASE='https://api.github.com/repos/'+REPO;
// Validación técnica limitada a la tarea explícita de verificar CI de la rama QA.
// No confunde una CI verde con revisión de producto, deportiva ni visual.
export function crearEvidenciaCIQA({config,fetcher=fetch}){
 validarDestinoQA(config);
 return async ({proyectoId,id,repo,branch})=>{
  if(proyectoId!==config.proyectoId||repo!==REPO||branch!==BRANCH||!/^qa-ci-\d{4}-\d{2}-\d{2}$/.test(id||'')) return null;
  const leer=async url=>{
   const r=await fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000),headers:{Accept:'application/vnd.github+json','User-Agent':'IRONMAN-QA'}});
   if(!r.ok) throw new Error('Evidencia no disponible');
   return r.json();
  };
  try{
   const pr=await leer(BASE+'/pulls/14'),sha=pr?.head?.sha;
   if(pr?.state!=='open'||pr?.head?.ref!==BRANCH||pr?.head?.repo?.full_name?.toLowerCase()!==REPO.toLowerCase()||!(/^[a-f0-9]{40}$/.test(sha||''))) return null;
   const runs=await leer(BASE+'/actions/runs?head_sha='+sha+'&event=pull_request&per_page=20');
   const v=(runs.workflow_runs||[]).filter(x=>x.head_sha===sha&&x.name==='Pruebas Proyecto IRONMAN').sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at))[0];
   if(v?.status!=='completed'||v.conclusion!=='success') return null;
   return {repo:REPO,branch:BRANCH,proyectoId,tareaId:id,commit:sha,ciCommit:sha,ciConclusion:'success',revisionTecnica:true};
  }catch{return null;}
 };
}
