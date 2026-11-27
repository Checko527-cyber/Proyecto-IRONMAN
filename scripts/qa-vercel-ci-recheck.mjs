import {prepararArranqueSeguro} from '../lib/ironman-infra-guard.js';
import {protegerConexionQA,validarDestinoQA} from '../lib/agent-db-permissions.js';
import {crearConectorPostgresQA} from '../lib/agent-postgres-connector.js';
import {crearAlmacenPostgres} from '../lib/agent-store-pg.js';
import {crearProveedorIngenieria} from '../lib/agent-engineering-provider.js';
import {crearEvidenciaCIQA} from '../lib/agent-github-evidence-qa.js';
import {ejecutarAgente} from '../lib/agent-runner.js';
const env=process.env,dia=new Date(Date.now()-5*3600000).toISOString().slice(0,10);
const sha='23422523c8cc03d8d9c5388a4fe06a1db932d962';
if(env.VERCEL_ENV==='preview'&&env.VERCEL_GIT_COMMIT_REF==='qa/ironman-multiagente-fase0'&&env.IRONMAN_QA_BOOTSTRAP_CHECK===dia+'-ci'){
 let bd;
 try{
  const config=prepararArranqueSeguro(env);validarDestinoQA(config);
  const conectar=crearConectorPostgresQA({env,funcion:'worker'});
  bd=await protegerConexionQA({conectar,funcion:'worker'})(config);
  const id='qa-ci-'+dia+'-'+sha;
  const filas=(await bd.query("SELECT id FROM ironman_agents.tareas WHERE proyecto_id=$1 AND agente='ingenieria' AND estado IN ('pendiente','en_progreso')",[config.proyectoId])).rows;
  if(filas.some(t=>t.id!==id))throw Error('Cola ocupada');
  const store=crearAlmacenPostgres({query:bd.query,proyectoId:config.proyectoId});
  await store.publicar({id,proyectoId:config.proyectoId,origen:'rendimiento',destino:'ingenieria',tipo:'validacion.tecnica',resumen:'Verificar CI del commit QA previamente probado'});
  await bd.cerrar();bd=null;
  const ep=crearProveedorIngenieria({proyectoId:config.proyectoId,leerEvidencia:crearEvidenciaCIQA({config})});
  let fuente='insuficiente';
  const res=await ejecutarAgente({env,agente:'ingenieria',conectar,proveedores:{...ep,validacionTecnica:async t=>{const r=await ep.validacionTecnica(t);fuente=r.estado;return r;}},consultarPolitica:async()=>({habilitado:true,infraIndependiente:true,riesgoAtlas:false,costoAdicional:false}),maxTareas:1});
  console.log('[IRONMAN-QA-CI] '+JSON.stringify({procesadas:res.procesadas,validacion:res.conteo?.validacion??0,registro:res.registro,fuente}));
 }catch{console.log('[IRONMAN-QA-CI] NO_VERIFICADA');process.exitCode=1;}finally{try{await bd?.cerrar?.();}catch{process.exitCode=1;}}
}
