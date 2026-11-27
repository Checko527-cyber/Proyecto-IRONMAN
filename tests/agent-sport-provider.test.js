import {test} from 'node:test';
import assert from 'node:assert/strict';
import {crearProveedorDeportivo} from '../lib/agent-sport-provider.js';
const proyectoId='ironman-qa',t={id:'t1',proyectoId},ahora='2026-11-27T10:00:00Z';
const a={id:'a1',sport:'bike',min:60,km:30};
const crear=(datos,evidencia={})=>crearProveedorDeportivo({proyectoId,reloj:()=>ahora,leerActividades:async()=>datos,revisarEvidencia:async()=>evidencia});
test('no inventa actividad ni interpreta fuente vencida como válida',async()=>{
 for(const datos of [null,{completa:true,corte:ahora,actividades:[]},{completa:true,corte:'2026-11-25T10:00:00Z',actividades:[a]}]) assert.deepEqual(await crear(datos).revisionDeportiva(t),{estado:'insuficiente'});
});
test('detecta duplicados y unidades inválidas sin divulgar métricas',async()=>{
 for(const actividades of [[a,a],[{...a,min:-1}],[{...a,km:'30'}]]) assert.deepEqual(await crear({completa:true,corte:ahora,actividades}).revisionDeportiva(t),{estado:'propuesta',solicitud:'indicador'});
 assert.deepEqual(await crear({completa:true,corte:ahora,actividades:[a]}).revisionDeportiva(t),{estado:'verificado'});
});
test('validación exige evidencia y respeto de prescripción',async()=>{
 assert.deepEqual(await crear(null,{verificada:true,unidadesCorrectas:true}).validacionDeportiva(t),{estado:'insuficiente'});
 assert.deepEqual(await crear(null,{verificada:true,unidadesCorrectas:true,respetaPrescripcion:true}).validacionDeportiva(t),{estado:'verificado'});
 await assert.rejects(crear(null).revisionDeportiva({...t,proyectoId:'otro'}));
});
