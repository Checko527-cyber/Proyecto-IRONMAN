import test from 'node:test';
import assert from 'node:assert/strict';
import {opcionesPostgresQA,crearConectorPostgresQA} from '../lib/agent-postgres-connector.js';
const config={proyectoId:'ironman-qa',supabaseRef:'hifnimutdifkuchxdkrj',entorno:'qa',infraestructura:'independiente'};
const uri='postgresql://ironman_qa_worker_login.hifnimutdifkuchxdkrj:synthetic%40secret@aws-0-us-east-2.pooler.supabase.com:5432/postgres';
test('conexión fija, TLS y un cliente',()=>{
 const o=opcionesPostgresQA({config,funcion:'worker',uri});assert.equal(o.password,'synthetic@secret');assert.equal(o.ssl.rejectUnauthorized,true);assert.equal(o.ssl.servername,o.host);assert.equal(o.max,1);assert.equal(o.prepare,false);
});
test('rechaza usuario privilegiado, otra ref, otro host, ssl inseguro y puerto inesperado',()=>{
 for(const u of [uri.replace('ironman_qa_worker_login','postgres'),uri.replace('hifnimutdifkuchxdkrj','aaaaaaaaaaaaaaaaaaaa'),uri.replace('aws-0-us-east-2.pooler.supabase.com','evil.example'),uri.replace('aws-0-','aws-1-'),uri+'?sslmode=disable',uri.replace(':5432',':6543'),uri+'?host=evil.example'])
  assert.throws(()=>opcionesPostgresQA({config,funcion:'worker',uri:u}),/URI privada QA rechazada/);
});
test('parámetros separados y cierre una sola vez',async()=>{
 let llamada,fin=0;
 const conectar=crearConectorPostgresQA({env:{IRONMAN_QA_WORKER_DATABASE_URL:uri},funcion:'worker',cargarCA:async()=> '-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----',cargarDriver:async()=>()=>({unsafe:async(q,p)=>{llamada=[q,p];return [{x:1}]},end:async()=>{fin++}})});
 const bd=await conectar(config);assert.deepEqual(await bd.query('SELECT $1',['dato']),{rows:[{x:1}]});assert.deepEqual(llamada,['SELECT $1',['dato']]);
 await bd.cerrar();await bd.cerrar();assert.equal(fin,1);await assert.rejects(bd.query('SELECT 1'));
});
