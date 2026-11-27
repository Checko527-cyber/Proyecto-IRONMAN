import test from 'node:test';import assert from 'node:assert/strict';import {validarEstadoQA} from '../agent-qa-ui.js';
test('solo muestra ceros si hay lectura real declarada y estados completos',()=>{
 assert.throws(()=>validarEstadoQA({disponible:false}),/no disponible/);
 const a={estados:{pendiente:0,en_progreso:0,validacion:0,completadas:0,bloqueada:0},leasesVencidos:0,actividad:'sin_evidencia',ultimaActividad:null};
 const d={disponible:true,corte:'2026-11-27T14:00:00Z',agentes:{rendimiento:a,ingenieria:a}};
 assert.throws(()=>validarEstadoQA(d),/incompleto/);
 a.estados.completada=0;assert.equal(validarEstadoQA(d).rendimiento.completada,0);
});
