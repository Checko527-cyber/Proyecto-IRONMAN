import {validarDestinoQA} from './agent-db-permissions.js';
const REF='hifnimutdifkuchxdkrj';
const ROLES=Object.freeze({worker:'ironman_qa_worker_login',approver:'ironman_qa_approver_login',reader:'ironman_qa_reader_login'});
// Validar y reconstruir opciones: nunca transmitir una URI arbitraria al driver.
export function opcionesPostgresQA({config,funcion,uri}){
 validarDestinoQA(config);
 if(!Object.hasOwn(ROLES,funcion)||typeof uri!=='string'||!uri) throw new Error('Credencial QA no configurada');
 try{
  const u=new URL(uri);
  const pool=/^aws-[0-9]+-us-east-2\.pooler\.supabase\.com$/.test(u.hostname);
  const directo=u.hostname==='db.'+REF+'.supabase.co';
  const usuario=decodeURIComponent(u.username), password=decodeURIComponent(u.password);
  const esperado=ROLES[funcion]+(pool?'.'+REF:'');
  if(!['postgres:','postgresql:'].includes(u.protocol)||(!pool&&!directo)||(u.port&&u.port!=='5432')||u.pathname!=='/postgres'||u.hash||usuario!==esperado||!password||
     [...u.searchParams].some(([k,v])=>k!=='sslmode'||v!=='verify-full')||u.searchParams.getAll('sslmode').length>1) throw new Error('Destino inválido');
  return {host:u.hostname,port:5432,database:'postgres',username:usuario,password,
   ssl:{rejectUnauthorized:true,servername:u.hostname},max:1,prepare:false,connect_timeout:5,idle_timeout:5,max_lifetime:30};
 }catch{throw new Error('URI privada QA rechazada');}
}
export function crearConectorPostgresQA({env,funcion,cargarDriver=async()=> (await import('postgres')).default}){
 if(!Object.hasOwn(ROLES,funcion)||typeof cargarDriver!=='function') throw new TypeError('Conector QA inválido');
 return async config=>{
  const opciones=opcionesPostgresQA({config,funcion,uri:env?.['IRONMAN_QA_'+funcion.toUpperCase()+'_DATABASE_URL']});
  const postgres=await cargarDriver();
  const sql=postgres(opciones);
  let cerrada=false;
  return Object.freeze({supabaseRef:REF,proyectoId:config.proyectoId,
   async query(texto,params=[]){
    if(cerrada||typeof texto!=='string'||!Array.isArray(params)) throw new Error('Consulta QA inválida');
    try{return {rows:Array.from(await sql.unsafe(texto,params))};}catch{throw new Error('Consulta QA no disponible');}
   },
   async cerrar(){if(!cerrada){cerrada=true;await sql.end({timeout:2});}}
  });
 };
}
