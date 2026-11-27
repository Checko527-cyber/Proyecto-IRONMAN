import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearManejadores} from '../lib/agent-handlers.js';
const proyectoId='ironman-qa', tarea={id:'t1',proyectoId,resumen:'texto no confiable'};
test('transferencia deportiva determinista y sin texto libre',async()=>{
 const proveedores={revisionDeportiva:async entrada=>{assert.deepEqual(entrada,{id:'t1',proyectoId});return {estado:'propuesta',solicitud:'indicador',secreto:'NO PUBLICAR'};},validacionDeportiva:async()=>({estado:'verificado'})};
 const h=crearManejadores({agente:'rendimiento',proyectoId,proveedores});
 const a=await h['revision.deportiva'](tarea);
 assert.deepEqual(a,await h['revision.deportiva'](tarea));
 assert.equal(a.evento.destino,'ingenieria');
 assert.equal(a.evento.tipo,'mejora.tecnica');
 assert.ok(!JSON.stringify(a).includes('NO PUBLICAR'));
 assert.ok(!JSON.stringify(a).includes(tarea.resumen));
});
test('rechaza proyecto ajeno antes de invocar proveedor',async()=>{
 let n=0;const h=crearManejadores({agente:'ingenieria',proyectoId,proveedores:{mejoraTecnica:async()=>{n++;},validacionTecnica:async()=>{n++;}}});
 await assert.rejects(h['mejora.tecnica']({...tarea,proyectoId:'otro'}));
 assert.equal(n,0);
});
test('no permite transferencias arbitrarias ni ciclos',async()=>{
 const h=crearManejadores({agente:'ingenieria',proyectoId,proveedores:{mejoraTecnica:async()=>({estado:'propuesta',solicitud:'indicador'}),validacionTecnica:async()=>({estado:'verificado'})}});
 await assert.rejects(h['mejora.tecnica'](tarea));
 const d=crearManejadores({agente:'rendimiento',proyectoId,proveedores:{revisionDeportiva:async()=>({estado:'propuesta',solicitud:'texto privado'}),validacionDeportiva:async()=>({estado:'verificado'})}});
 await assert.rejects(d['revision.deportiva'](tarea));
});
