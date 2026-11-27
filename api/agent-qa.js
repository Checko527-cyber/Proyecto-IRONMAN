import {createHash,timingSafeEqual} from 'node:crypto';
import {prepararArranqueSeguro} from '../lib/ironman-infra-guard.js';
import {validarDestinoQA,protegerConexionQA} from '../lib/agent-db-permissions.js';
import {crearConectorPostgresQA} from '../lib/agent-postgres-connector.js';
import {consultarEstadoAgentes} from '../lib/agent-status-service.js';
import {crearLecturaIntervalsQA} from '../lib/agent-intervals-qa.js';
const hash=s=>createHash('sha256').update(s).digest();
const permitido=(header,token)=>typeof token==='string'&&token.length>=24&&typeof header==='string'&&header.startsWith('Bearer ')&&timingSafeEqual(hash(header.slice(7)),hash(token));
// Diagnóstico privado solo Preview. No procesa tareas, no acepta secretos por URL.
export function crearHandlerQA({env=process.env,conector=crearConectorPostgresQA,lectura=crearLecturaIntervalsQA}={}){
 return async (req,res)=>{
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(env.VERCEL_ENV!=='preview'||env.VERCEL_GIT_COMMIT_REF!=='qa/ironman-multiagente-fase0') return res.status(404).json({error:'no_disponible'});
  if(req.method!=='GET') return res.status(405).json({error:'metodo_no_permitido'});
  if(!permitido(req.headers?.authorization,env.COACH_TOKEN)) return res.status(401).json({error:'no_autorizado'});
  const prueba=req.query?.check??'status';
  if(!['status','intervals'].includes(prueba)) return res.status(400).json({error:'prueba_invalida'});
  try{
   const config=prepararArranqueSeguro(env);validarDestinoQA(config);
   if(prueba==='intervals'){
    const r=await lectura({config,env})({proyectoId:config.proyectoId,dias:7});
    if(r.completa!==true||!Array.isArray(r.actividades)) throw new Error('Fuente incompleta');
    return res.status(200).json({fuente:'intervals',disponible:true,corte:r.corte});
   }
   const conectar=protegerConexionQA({conectar:conector({env,funcion:'reader'}),funcion:'reader'});
   const r=await consultarEstadoAgentes({env,credencial:req.headers.authorization,
    autorizar:async c=>({autorizado:permitido(c,env.COACH_TOKEN),proyectoId:config.proyectoId}),
    conectar,consultarPolitica:async()=>({infraIndependiente:true,riesgoAtlas:false,costoAdicional:false})});
   return res.status(200).json(r);
  }catch{return res.status(503).json({error:'integracion_no_verificada'});}
 };
}
export default crearHandlerQA();
