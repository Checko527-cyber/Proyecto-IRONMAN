import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearRegistroActividad,estadoActividad} from '../lib/agent-heartbeat.js';
test('registro acotado sin texto libre ni rol ajeno',async()=>{
 const calls=[];const r=crearRegistroActividad({proyectoId:'ironman-qa',query:async(...args)=>calls.push(args)});
 await assert.rejects(r.registrar('ingenieria',{agente:'rendimiento',motivo:'cola_vacia',procesadas:0}));
 await r.registrar('rendimiento',{agente:'rendimiento',motivo:'cola_vacia',procesadas:0,secreto:'NO PUBLICAR'});
 assert.equal(calls.length,1);
 assert.deepEqual(calls[0][1],['ironman-qa','rendimiento','cola_vacia',0]);
 assert.ok(!JSON.stringify(calls).includes('NO PUBLICAR'));
});
test('distingue ausencia de evidencia, reporte vencido y suspensión',()=>{
 const ahora='2026-11-27T10:00:00Z';
 assert.equal(estadoActividad({ahora}),'sin_evidencia');
 assert.equal(estadoActividad({ahora,registro:{actualizadaEn:'2026-11-27T09:00:00Z',motivo:'cola_vacia'}}),'sin_reporte_reciente');
 assert.equal(estadoActividad({ahora,registro:{actualizadaEn:ahora,motivo:'suspendido'}}),'suspendido');
 assert.equal(estadoActividad({ahora,registro:{actualizadaEn:ahora,motivo:'cola_vacia'}}),'reporte_reciente');
 assert.equal(estadoActividad({ahora,registro:{actualizadaEn:'2026-11-27T11:00:00Z',motivo:'cola_vacia'}}),'sin_evidencia');
});
