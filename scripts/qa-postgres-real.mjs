import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import postgres from 'postgres';
import {prepararArranqueSeguro} from '../lib/ironman-infra-guard.js';
import {protegerConexionQA} from '../lib/agent-db-permissions.js';
import {crearAlmacenPostgres} from '../lib/agent-store-pg.js';
import {comprobarConcurrenciaQA} from '../lib/agent-concurrency-qa.js';
import {ejecutarAgente} from '../lib/agent-runner.js';
import {consultarEstadoAgentes} from '../lib/agent-status-service.js';
const ref='hifnimutdifkuchxdkrj', proyectoId='ironman-qa', dia='2026-11-27';
const env={IRONMAN_PROJECT_ID:proyectoId,IRONMAN_ENVIRONMENT:'qa',IRONMAN_SUPABASE_URL:'https://'+ref+'.supabase.co',IRONMAN_SUPABASE_REF:ref,IRONMAN_SUPABASE_REF_APROBADA:ref,IRONMAN_INFRA_INDEPENDIENTE:'true'};
const config=prepararArranqueSeguro(env);
const policy=async()=>({habilitado:true,infraIndependiente:true,riesgoAtlas:false,costoAdicional:false});
const opts={host:'127.0.0.1',port:5432,database:'postgres',max:1,prepare:false,connect_timeout:5,idle_timeout:3,ssl:false};
if(process.env.GITHUB_ACTIONS!=='true') throw Error('Solo para PostgreSQL efímero del runner CI');
const admin=postgres({...opts,username:'postgres',password:'synthetic-ci-only'});
const connect=role=>async c=>{
 assert.equal(c.proyectoId,proyectoId);
 const db=postgres({...opts,username:'ironman_qa_'+role+'_login',password:'synthetic-role-ci-only'});
 const query=client=>async(q,p=[])=>({rows:Array.from(await client.unsafe(q,p))});
 return {supabaseRef:ref,proyectoId,query:query(db),transaccion:f=>db.begin(tx=>f({query:query(tx)})),cerrar:()=>db.end({timeout:2})};
};
try{
 await admin.unsafe("CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger LANGUAGE plpgsql AS $$ BEGIN NULL; END $$;");
 for(const f of ['ironman_agents_schema.sql','ironman_agents_activity.sql','ironman_qa_backend_roles.sql','ironman_qa_reader_login.sql','ironman_qa_transitions.sql']){
  await admin.unsafe(await readFile(new URL('../db/'+f,import.meta.url),'utf8'));
 }
 for(const role of ['worker','reader','approver']){
  await admin.unsafe("ALTER ROLE ironman_qa_"+role+"_login LOGIN PASSWORD 'synthetic-role-ci-only'");
 }
 const worker=protegerConexionQA({conectar:connect('worker'),funcion:'worker'});
 const w=await worker(config);
 const store=crearAlmacenPostgres({query:w.query,proyectoId});
 const sport={id:'qa-sport-'+dia,proyectoId,origen:'ingenieria',destino:'rendimiento',tipo:'revision.deportiva',resumen:'synthetic sport'};
 const eng={id:'qa-ci-'+dia,proyectoId,origen:'rendimiento',destino:'ingenieria',tipo:'validacion.tecnica',resumen:'synthetic engineering'};
 assert.deepEqual(await store.publicar(sport),{creado:true});
 assert.deepEqual(await store.publicar(sport),{creado:false});
 assert.deepEqual(await store.publicar(eng),{creado:true});
 await assert.rejects(w.query("UPDATE ironman_agents.tareas SET estado='validacion' WHERE id=$1",[sport.id]));
 await assert.rejects(w.query("DELETE FROM ironman_agents.tareas WHERE id=$1",[sport.id]));
 await w.cerrar();
 const concurrente=await comprobarConcurrenciaQA({config,conectar:worker,dia});
 assert.deepEqual(concurrente,{concurrente:true,sesiones:2,estadosModificados:0});
 console.log('PASS real PostgreSQL: two concurrent sessions, SKIP LOCKED, independent backend PIDs');
 const resultA=await ejecutarAgente({env,agente:'rendimiento',conectar:connect('worker'),proveedores:{revisionDeportiva:async()=>({estado:'propuesta',solicitud:'indicador'}),validacionDeportiva:async()=>({estado:'insuficiente'})},consultarPolitica:policy});
 assert.equal(resultA.procesadas,1);assert.equal(resultA.registro,'guardado');assert.equal(resultA.conteo.validacion,1);
 const resultB=await ejecutarAgente({env,agente:'ingenieria',conectar:connect('worker'),proveedores:{mejoraTecnica:async()=>({estado:'insuficiente'}),validacionTecnica:async()=>({estado:'verificado'})},consultarPolitica:policy,maxTareas:2});
 assert.equal(resultB.procesadas,2);assert.equal(resultB.registro,'guardado');assert.equal(resultB.conteo.validacion,2);
 const reader=protegerConexionQA({conectar:connect('reader'),funcion:'reader'});
 const status=await consultarEstadoAgentes({env,credencial:'synthetic',autorizar:async()=>({autorizado:true,proyectoId}),conectar:reader,consultarPolitica:policy});
 assert.equal(status.agentes.rendimiento.procesadasUltimoCiclo,1);assert.equal(status.agentes.ingenieria.procesadasUltimoCiclo,2);
 assert.equal(status.agentes.rendimiento.estados.validacion,1);assert.equal(status.agentes.ingenieria.estados.validacion,2);
 const ro=await reader(config);await assert.rejects(ro.query('SELECT resumen FROM ironman_agents.tareas'));await ro.cerrar();
 const ap=await protegerConexionQA({conectar:connect('approver'),funcion:'approver'})(config);
 const aprobar=crearAlmacenPostgres({query:ap.query,proyectoId});
 await assert.rejects(aprobar.aprobarTarea(eng.id,{}));
 const revisiones=Object.fromEntries(['tecnica','deportiva','visual'].map(k=>[k,{aprobada:true,evidencia:'synthetic/'+k}]));
 assert.equal((await aprobar.aprobarTarea(eng.id,revisiones)).completada,true);
 await ap.cerrar();
 console.log('PASS real PostgreSQL: role login, worker cycles, handoff, heartbeat, status, persistence across connections, independent approval (synthetic providers)');
}finally{await admin.end({timeout:2});}
