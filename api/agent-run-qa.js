import {createHash,timingSafeEqual} from 'node:crypto';
import {prepararArranqueSeguro} from '../lib/ironman-infra-guard.js';
import {validarDestinoQA,protegerConexionQA} from '../lib/agent-db-permissions.js';
import {crearConectorPostgresQA} from '../lib/agent-postgres-connector.js';
import {crearAlmacenPostgres} from '../lib/agent-store-pg.js';
import {ejecutarAgente} from '../lib/agent-runner.js';
import {crearProveedorDeportivo} from '../lib/agent-sport-provider.js';
import {crearProveedorIngenieria} from '../lib/agent-engineering-provider.js';
import {crearLecturaIntervalsQA} from '../lib/agent-intervals-qa.js';
import {comprobarConcurrenciaQA} from '../lib/agent-concurrency-qa.js';
import {crearEvidenciaCIQA} from '../lib/agent-github-evidence-qa.js';
const hash=s=>createHash('sha256').update(s).digest();
const preview=e=>e.VERCEL_ENV==='preview'&&e.VERCEL_GIT_COMMIT_REF==='qa/ironman-multiagente-fase0';
const autorizado=(h,t)=>typeof t==='string'&&t.length>=32&&typeof h==='string'&&h.startsWith('Bearer ')&&timingSafeEqual(hash(h.slice(7)),hash(t));
// Ejecución manual acotada. No cron, no modelos de pago, no cambios al entrenador.
export function crearHandlerRunQA({env=process.env,conector=crearConectorPostgresQA,ejecutar=ejecutarAgente,fetcher=fetch,reloj=()=>new Date()}={}){
 return async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!preview(env)) return res.status(404).json({error:'no_disponible'});
  if(req.method!=='POST') return res.status(405).json({error:'metodo_no_permitido'});
  if(!autorizado(req.headers?.authorization,env.IRONMAN_QA_RUN_TOKEN)) return res.status(401).json({error:'no_autorizado'});
  if(env.IRONMAN_QA_AGENTS_ENABLED!=='true') return res.status(503).json({error:'ejecucion_suspendida'});
  const a=req.body?.action;
  if(!req.body||typeof req.body!=='object'||Array.isArray(req.body)||Object.keys(req.body).length!==1||!['seed','concurrencia','rendimiento','ingenieria'].includes(a)) return res.status(400).json({error:'accion_invalida'});
  try{
   const config=prepararArranqueSeguro(env);validarDestinoQA(config);
   const conectar=conector({env,funcion:'worker'});
   const politica=async()=>({habilitado:preview(env)&&env.IRONMAN_QA_AGENTS_ENABLED==='true',infraIndependiente:true,riesgoAtlas:false,costoAdicional:false});
   const dia=new Date(reloj().getTime()-5*3600000).toISOString().slice(0,10);
   if(a==='concurrencia'){
    const r=await comprobarConcurrenciaQA({config,conectar:protegerConexionQA({conectar,funcion:'worker'}),dia});
    return res.status(200).json(r);
   }
   if(a==='seed'){
    const bd=await protegerConexionQA({conectar,funcion:'worker'})(config);
    try{
     const almacen=crearAlmacenPostgres({query:bd.query.bind(bd),proyectoId:config.proyectoId});
     const base={proyectoId:config.proyectoId};
     const deporte=await almacen.publicar({...base,id:'qa-sport-'+dia,origen:'ingenieria',destino:'rendimiento',tipo:'revision.deportiva',resumen:'Verificar consistencia de la fuente deportiva de siete días'});
     const ci=await almacen.publicar({...base,id:'qa-ci-'+dia,origen:'rendimiento',destino:'ingenieria',tipo:'validacion.tecnica',resumen:'Verificar CI del commit actual de QA'});
     return res.status(200).json({semillas:{rendimiento:deporte.creado,ingenieria:ci.creado},dia});
    }finally{await bd.cerrar?.();}
   }
   const proveedores=a==='rendimiento'?crearProveedorDeportivo({proyectoId:config.proyectoId,leerActividades:crearLecturaIntervalsQA({config,env,fetcher,reloj}),revisarEvidencia:async()=>({verificada:false})}):crearProveedorIngenieria({proyectoId:config.proyectoId,leerEvidencia:crearEvidenciaCIQA({config,fetcher})});
   const resultado=await ejecutar({env,agente:a,conectar,proveedores,consultarPolitica:politica,maxTareas:1});
   return res.status(200).json({agente:resultado.agente,motivo:resultado.motivo,procesadas:resultado.procesadas,conteo:resultado.conteo,registro:resultado.registro});
  }catch{return res.status(503).json({error:'ejecucion_no_verificada'});}
 };
}
export default crearHandlerRunQA();
