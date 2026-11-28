import test from 'node:test';import assert from 'node:assert/strict';import {validarEstadoQA,ejecutarCicloPanelQA} from '../agent-qa-ui.js';
test('solo muestra ceros si hay lectura real declarada y estados completos',()=>{
 assert.throws(()=>validarEstadoQA({disponible:false}),/no disponible/);
 const a={estados:{pendiente:0,en_progreso:0,validacion:0,completadas:0,bloqueada:0},leasesVencidos:0,actividad:'sin_evidencia',ultimaActividad:null};
 const d={disponible:true,corte:'2026-11-27T14:00:00Z',agentes:{rendimiento:a,ingenieria:a}};
 assert.throws(()=>validarEstadoQA(d),/incompleto/);
 a.estados.completada=0;assert.equal(validarEstadoQA(d).rendimiento.completada,0);
});

const fixture=(r,i)=>({disponible:true,corte:'2026-11-27T14:00:00Z',agentes:Object.fromEntries([['rendimiento',r],['ingenieria',i]].map(([a,n])=>[a,{estados:{pendiente:n,en_progreso:0,validacion:0,completada:0,bloqueada:0},leasesVencidos:0,actividad:'sin_evidencia',ultimaActividad:null}]))});
for(const [nombre,semillas,r,i,esperadas] of [
 ['nuevo ciclo',{rendimiento:true,ingenieria:true},1,1,['seed','status','concurrencia','rendimiento','ingenieria','status']],
 ['reintento de cola histórica',{rendimiento:false,ingenieria:false},1,1,['seed','status','rendimiento','ingenieria','status']],
 ['ciclo parcial',{rendimiento:false,ingenieria:true},0,1,['seed','status','ingenieria','status']],
 ['ciclo agotado',{rendimiento:false,ingenieria:false},0,0,['seed','status']]
])test(nombre,async()=>{const llamadas=[];await ejecutarCicloPanelQA({pedir:async a=>{llamadas.push(a);return a==='seed'?{semillas}:a==='status'?fixture(r,i):a==='concurrencia'?{concurrente:true}:{procesadas:1};}});assert.deepEqual(llamadas,esperadas);});
test('no ejecuta tareas si el estado o semilla no es verificable',async()=>{const llamadas=[];await assert.rejects(ejecutarCicloPanelQA({pedir:async a=>{llamadas.push(a);return a==='seed'?{semillas:{rendimiento:true,ingenieria:true}}:{disponible:false};}}));assert.deepEqual(llamadas,['seed','status']);});
