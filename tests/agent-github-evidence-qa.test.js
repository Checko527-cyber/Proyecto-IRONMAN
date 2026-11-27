import test from 'node:test';import assert from 'node:assert/strict';
import {crearEvidenciaCIQA} from '../lib/agent-github-evidence-qa.js';
const config={proyectoId:'ironman-qa',supabaseRef:'hifnimutdifkuchxdkrj',entorno:'qa',infraestructura:'independiente'};
const repo='Checko527-cyber/Proyecto-IRONMAN',branch='qa/ironman-multiagente-fase0',sha='a'.repeat(40),args={proyectoId:'ironman-qa',id:'qa-ci-2026-11-27',repo,branch};
test('verifica solo evidencia de CI del commit exacto para tarea autorizada',async()=>{
 let n=0;const leer=crearEvidenciaCIQA({config,fetcher:async(u,o)=>{n++;assert.ok(u.startsWith('https://api.github.com/repos/'+repo+'/'));assert.equal(o.redirect,'error');return {ok:true,json:async()=>n===1?{state:'open',head:{ref:branch,sha,repo:{full_name:repo}}}:{workflow_runs:[{head_sha:sha,name:'Pruebas Proyecto IRONMAN',status:'completed',conclusion:'success'}]}}}});
 assert.equal(await leer({...args,id:'other'}),null);assert.equal(n,0);assert.equal((await leer(args)).ciCommit,sha);assert.equal(n,2);
});
test('CI fallida o pendiente no constituye evidencia',async()=>{
 let n=0;const leer=crearEvidenciaCIQA({config,fetcher:async()=>({ok:true,json:async()=>++n===1?{state:'open',head:{ref:branch,sha,repo:{full_name:repo}}}:{workflow_runs:[{head_sha:sha,name:'Pruebas Proyecto IRONMAN',status:'completed',conclusion:'failure'}]}})});
 assert.equal(await leer(args),null);
});

test('un commit anterior solo se acepta si pertenece al PR y su CI exacta pasó',async()=>{const anterior='b'.repeat(40);let n=0;const leer=crearEvidenciaCIQA({config,fetcher:async()=>({ok:true,json:async()=>++n===1?{state:'open',head:{ref:branch,sha,repo:{full_name:repo}}}:n===2?[{sha:anterior}]:{workflow_runs:[{head_sha:anterior,name:'Pruebas Proyecto IRONMAN',status:'completed',conclusion:'success'}]}})});assert.equal((await leer({...args,id:args.id+'-'+anterior})).ciCommit,anterior);});
