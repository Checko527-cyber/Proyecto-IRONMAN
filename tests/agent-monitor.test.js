import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumirAgentes} from '../lib/agent-monitor.js';
test('agrega estados propios sin mostrar contenido de tareas',()=>{
 const proyectoId='ironman-qa',ahora='2026-11-27T10:00:00Z';
 const r=resumirAgentes({proyectoId,ahora,tareas:[
  {proyectoId,agente:'rendimiento',estado:'en_progreso',actualizadaEn:'2026-11-27T09:00:00Z',leaseHasta:'2026-11-27T09:05:00Z',resumen:'NO PUBLICAR'},
  {proyectoId,agente:'rendimiento',estado:'completada',actualizadaEn:'2026-11-27T09:30:00Z'},
  {proyectoId:'otro',agente:'ingenieria',estado:'completada'}
 ]});
 assert.equal(r.agentes.rendimiento.estados.en_progreso,1);
 assert.equal(r.agentes.rendimiento.leasesVencidos,1);
 assert.equal(r.agentes.rendimiento.ultimaActualizacion,'2026-11-27T09:30:00.000Z');
 assert.equal(r.agentes.ingenieria.estados.completada,0);
 assert.ok(!JSON.stringify(r).includes('NO PUBLICAR'));
});
test('rechaza estado desconocido del proyecto',()=>{
 assert.throws(()=>resumirAgentes({proyectoId:'ironman-qa',ahora:'2026-11-27T10:00:00Z',tareas:[{proyectoId:'ironman-qa',agente:'ingenieria',estado:'inventado'}]}));
});
