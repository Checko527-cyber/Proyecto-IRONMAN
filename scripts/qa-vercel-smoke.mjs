// Prueba de activación explícita, solo Preview QA y fecha aprobada. No publica secretos.
import {prepararArranqueSeguro} from '../lib/ironman-infra-guard.js';
import {protegerConexionQA,validarDestinoQA} from '../lib/agent-db-permissions.js';
import {crearConectorPostgresQA,codigoSeguroQA} from '../lib/agent-postgres-connector.js';
import {crearAlmacenPostgres} from '../lib/agent-store-pg.js';
import {comprobarConcurrenciaQA} from '../lib/agent-concurrency-qa.js';
import {crearLecturaIntervalsQA} from '../lib/agent-intervals-qa.js';
import {crearProveedorDeportivo} from '../lib/agent-sport-provider.js';
import {crearProveedorIngenieria} from '../lib/agent-engineering-provider.js';
import {crearEvidenciaCIQA} from '../lib/agent-github-evidence-qa.js';
import {ejecutarAgente} from '../lib/agent-runner.js';
import {consultarEstadoAgentes} from '../lib/agent-status-service.js';
const env=process.env, dia=new Date(Date.now()-5*3600000).toISOString().slice(0,10);
if(env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='qa/ironman-multiagente-fase0'&&env.IRONMAN_QA_BOOTSTRAP_CHECK===dia){
 const marca=(etapa,resultado)=>console.log('[IRONMAN-QA-SMOKE] '+etapa+' '+resultado);
 let etapa='config',bd;
 try{
  const config=prepararArranqueSeguro(env);validarDestinoQA(config);
  const conectar=crearConectorPostgresQA({env,funcion:'worker'});
  const worker=protegerConexionQA({conectar,funcion:'worker'});
  const reader=protegerConexionQA({conectar:crearConectorPostgresQA({env,funcion:'reader'}),funcion:'reader'});
  const policy=async()=>({habilitado:true,infraIndependiente:true,riesgoAtlas:false,costoAdicional:false});
  const status=()=>consultarEstadoAgentes({env,credencial:'build-interno',autorizar:async()=>({autorizado:true,proyectoId:config.proyectoId}),conectar:reader,consultarPolitica:policy});
  etapa='reader_config';marca(etapa,typeof env.IRONMAN_QA_READER_DATABASE_URL==='string'&&env.IRONMAN_QA_READER_DATABASE_URL.length>0?'PRESENTE':'AUSENTE');
  etapa='reader_login';
  bd=await crearConectorPostgresQA({env,funcion:'reader'})(config);
  const identidad=(await bd.query("SELECT current_user='ironman_qa_reader_login' AS rol_ok,session_user=current_user AS sesion_ok")).rows[0];
  marca(etapa,JSON.stringify({rol_ok:identidad?.rol_ok===true,sesion_ok:identidad?.sesion_ok===true}));
  await bd.cerrar();bd=null;
  etapa='reader';await status();marca(etapa,'PASS');
  etapa='worker';bd=await worker(config);marca(etapa,'PASS');
  const a='qa-sport-'+dia,b='qa-ci-'+dia;
  const rows=(await bd.query('SELECT id,estado FROM ironman_agents.tareas WHERE proyecto_id=$1',[config.proyectoId])).rows;
  if(rows.some(t=>![a,b].includes(t.id))){marca('cola','OMITIDA_CON_TAREAS_EXISTENTES');await bd.cerrar();bd=null;}
  else{
   etapa='intervals';
   let datos;
   try{datos=await crearLecturaIntervalsQA({config,env})({proyectoId:config.proyectoId,dias:7});marca(etapa,datos.completa===true?'PASS':'INCOMPLETA');}catch{marca(etapa,'NO_VERIFICADA');}
   etapa='semilla';
   const store=crearAlmacenPostgres({query:bd.query,proyectoId:config.proyectoId});
   const base={proyectoId:config.proyectoId};
   await store.publicar({...base,id:a,origen:'ingenieria',destino:'rendimiento',tipo:'revision.deportiva',resumen:'Verificar consistencia de la fuente deportiva de siete días'});
   await store.publicar({...base,id:b,origen:'rendimiento',destino:'ingenieria',tipo:'validacion.tecnica',resumen:'Verificar CI del commit actual de QA'});
   await bd.cerrar();bd=null;marca(etapa,'PASS');
   if(rows.every(t=>t.estado==='pendiente')){
    etapa='concurrencia';const c=await comprobarConcurrenciaQA({config,conectar:worker,dia});marca(etapa,c.concurrente===true?'PASS':'NO_VERIFICADA');
   }else marca('concurrencia','OMITIDA_POR_REEJECUCION');
   etapa='rendimiento';
   let sport='insuficiente';
   const sp=crearProveedorDeportivo({proyectoId:config.proyectoId,leerActividades:async()=>datos??{completa:false,actividades:[]},revisarEvidencia:async()=>({verificada:false})});
   const rp=await ejecutarAgente({env,agente:'rendimiento',conectar,proveedores:{...sp,revisionDeportiva:async t=>{const r=await sp.revisionDeportiva(t);sport=r.estado;return r;}},consultarPolitica:policy,maxTareas:1});
   marca(etapa,JSON.stringify({procesadas:rp.procesadas,validacion:rp.conteo?.validacion??0,registro:rp.registro,fuente:sport}));
   etapa='ingenieria';
   let tech='insuficiente';
   const ep=crearProveedorIngenieria({proyectoId:config.proyectoId,leerEvidencia:crearEvidenciaCIQA({config})});
   const re=await ejecutarAgente({env,agente:'ingenieria',conectar,proveedores:{...ep,validacionTecnica:async t=>{const r=await ep.validacionTecnica(t);tech=r.estado;return r;}},consultarPolitica:policy,maxTareas:1});
   marca(etapa,JSON.stringify({procesadas:re.procesadas,validacion:re.conteo?.validacion??0,registro:re.registro,fuente:tech}));
   etapa='estado';const s=await status();marca(etapa,JSON.stringify(Object.fromEntries(Object.entries(s.agentes).map(([k,v])=>[k,{estados:v.estados,actividad:v.actividad}]))));
  }
 }catch(e){marca(etapa,'NO_VERIFICADA '+(e?.code==='QA_PERMISOS'?'QA_PERMISOS':codigoSeguroQA(e)));process.exitCode=1;}finally{try{await bd?.cerrar?.();}catch{process.exitCode=1;}}
}else console.log('[IRONMAN-QA-SMOKE] OMITIDA: entorno o fecha no autorizados');
