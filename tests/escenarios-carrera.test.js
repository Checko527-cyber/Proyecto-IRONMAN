import test from 'node:test';
import assert from 'node:assert/strict';
import {compararEscenarios} from '../lib/escenarios-carrera.js';

test('escenarios conservan transiciones, desplazan la meta y no modifican entradas',()=>{
  const original={tipo:'703',salida:'07:00',tiempos:{swim:45,t1:5,bike:195,t2:5,run:140}};
  const copia=JSON.stringify(original);
  const r=compararEscenarios(original);
  assert.equal(r.length,3);
  assert.equal(r[0].totalMin,390);
  assert.ok(r[2].totalMin>r[1].totalMin&&r[1].totalMin>r[0].totalMin);
  assert.equal(r[2].etapas.find(x=>x.id==='t1').duracionMin,5);
  assert.equal(JSON.stringify(original),copia);
});

test('una prueba de carrera sin natación ni bici conserva solo la disciplina aplicable',()=>{
  const r=compararEscenarios({tipo:'half',salida:'06:00',tiempos:{run:120}});
  assert.deepEqual(r[2].etapas.map(x=>x.id),['run']);
  assert.equal(r[2].totalMin,132);
});
