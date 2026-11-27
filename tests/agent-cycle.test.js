import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ejecutarCiclo} from '../lib/agent-cycle.js';
const ok={habilitado:true,infraIndependiente:true,riesgoAtlas:false,costoAdicional:false};
test('veto y política ausente no reclaman tareas',async()=>{
 let n=0;const worker={agente:'rendimiento',ejecutarUna:async()=>{n++;}};
 for(const p of [null,{...ok,riesgoAtlas:true},{...ok,costoAdicional:true},{...ok,infraIndependiente:false}]){
  assert.equal((await ejecutarCiclo({worker,consultarPolitica:async()=>p})).motivo,'suspendido');
 }
 assert.equal((await ejecutarCiclo({worker,consultarPolitica:async()=>{throw Error('privado');}})).motivo,'politica_no_disponible');
 assert.equal(n,0);
});
test('revalida política entre tareas',async()=>{
 let n=0;const worker={agente:'ingenieria',ejecutarUna:async()=>{n++;return {estado:'validacion'};}};
 const r=await ejecutarCiclo({worker,maxTareas:3,consultarPolitica:async()=>({...ok,habilitado:n===0})});
 assert.equal(n,1);assert.equal(r.motivo,'suspendido');assert.equal(r.procesadas,1);
});
test('limita lote y termina ante error',async()=>{
 const worker={agente:'ingenieria',ejecutarUna:async()=>({estado:'validacion'})};
 assert.equal((await ejecutarCiclo({worker,maxTareas:2,consultarPolitica:async()=>ok})).procesadas,2);
 const r=await ejecutarCiclo({worker:{...worker,ejecutarUna:async()=>({estado:'error'})},maxTareas:3,consultarPolitica:async()=>ok});
 assert.equal(r.motivo,'requiere_revision');assert.equal(r.procesadas,1);
});
test('revisa tiempo después de política',async()=>{
 let t=0,n=0;
 const r=await ejecutarCiclo({worker:{agente:'ingenieria',ejecutarUna:async()=>{n++;}},reloj:()=>t,limiteMs:10,consultarPolitica:async()=>{t=11;return ok;}});
 assert.equal(r.motivo,'limite_tiempo');assert.equal(n,0);
});
