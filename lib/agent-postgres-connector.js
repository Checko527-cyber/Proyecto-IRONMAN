import {validarDestinoQA} from './agent-db-permissions.js';
import {cargarRaizSupabaseQA} from './agent-supabase-ca.js';
const REF='hifnimutdifkuchxdkrj';
const codigosPermitidos=new Set(['28P01','28000','42501','3D000','53300','57P03','XX000','ECONNREFUSED','ECONNRESET','ETIMEDOUT','ENOTFOUND','EHOSTUNREACH','ENETUNREACH','CONNECT_TIMEOUT','CONNECTION_CLOSED','CONNECTION_DESTROYED','SELF_SIGNED_CERT_IN_CHAIN','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNABLE_TO_GET_ISSUER_CERT_LOCALLY','CERT_HAS_EXPIRED','ERR_TLS_CERT_ALTNAME_INVALID','DEPTH_ZERO_SELF_SIGNED_CERT','ERR_SSL_WRONG_VERSION_NUMBER','08P01','08006']);
export const codigoSeguroQA=e=>codigosPermitidos.has(e?.code)?e.code:'NO_CLASIFICADO';
const ROLES=Object.freeze({worker:'ironman_qa_worker_login',approver:'ironman_qa_approver_login',reader:'ironman_qa_reader_login'});
// Validar y reconstruir opciones: nunca transmitir una URI arbitraria al driver.
export function opcionesPostgresQA({config,funcion,uri}){
 validarDestinoQA(config);
 if(!Object.hasOwn(ROLES,funcion)||typeof uri!=='string'||!uri) throw new Error('Credencial QA no configurada');
 try{
  const u=new URL(uri);
  const pool=u.hostname==='aws-0-us-east-2.pooler.supabase.com';
  const directo=u.hostname==='db.'+REF+'.supabase.co';
  const usuario=decodeURIComponent(u.username), password=decodeURIComponent(u.password);
  const esperado=ROLES[funcion]+(pool?'.'+REF:'');
  if(!['postgres:','postgresql:'].includes(u.protocol)||(!pool&&!directo)||(u.port&&u.port!=='5432')||u.pathname!=='/postgres'||u.hash||usuario!==esperado||!password||
     [...u.searchParams].some(([k,v])=>k!=='sslmode'||v!=='verify-full')||u.searchParams.getAll('sslmode').length>1) throw new Error('Destino inválido');
  return {host:u.hostname,port:5432,database:'postgres',username:usuario,password,
   ssl:{rejectUnauthorized:true,servername:u.hostname},max:1,prepare:false,connect_timeout:5,idle_timeout:5,max_lifetime:30};
 }catch{throw new Error('URI privada QA rechazada');}
}
export function crearConectorPostgresQA({env,funcion,cargarDriver=async()=> (await import('postgres')).default,cargarCA=cargarRaizSupabaseQA}){
 if(!Object.hasOwn(ROLES,funcion)||typeof cargarDriver!=='function') throw new TypeError('Conector QA inválido');
 return async config=>{
  const opciones=opcionesPostgresQA({config,funcion,uri:env?.['IRONMAN_QA_'+funcion.toUpperCase()+'_DATABASE_URL']});
  const ca=await cargarCA();
  if(typeof ca!=='string'||!ca.includes('-----BEGIN CERTIFICATE-----')) throw new Error('CA oficial no disponible');
  opciones.ssl.ca=ca;
  const postgres=await cargarDriver();
  const sql=postgres(opciones);
  let cerrada=false;
  const ejecutar=cliente=>async(texto,params=[])=>{
   if(cerrada||typeof texto!=='string'||!Array.isArray(params)) throw new Error('Consulta QA inválida');
   try{return {rows:Array.from(await cliente.unsafe(texto,params))};}catch(e){throw Object.assign(new Error('Consulta QA no disponible'),{code:codigoSeguroQA(e)});}
  };
  return Object.freeze({supabaseRef:REF,proyectoId:config.proyectoId,query:ejecutar(sql),
   async transaccion(fn){
    if(cerrada||typeof fn!=='function') throw new Error('Transacción QA inválida');
    try{return await sql.begin(async tx=>fn(Object.freeze({query:ejecutar(tx)})));}catch{throw new Error('Transacción QA no disponible');}
   },
   async cerrar(){if(!cerrada){cerrada=true;await sql.end({timeout:2});}}
  });
 };
}
