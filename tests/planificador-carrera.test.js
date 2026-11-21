import test from 'node:test';
import assert from 'node:assert/strict';
import {generarCronograma,DISTANCIAS} from '../lib/planificador-carrera.js';

const tiempos={swim:45,t1:5,bike:195,t2:5,run:140};

test('Victoria 70.3 usa las tres distancias y el objetivo 6h30 sin inventar ritmos',()=>{
  const r=generarCronograma({tipo:'703',salida:'07:00',tiempos});
  assert.deepEqual([r.distancia.swimKm,r.distancia.bikeKm,r.distancia.runKm],[1.9,90,21.1]);
  assert.equal(r.totalMin,390);
  assert.equal(r.llegada,'13:30');
  assert.equal(r.etapas.length,5);
});

test('recalcular salida desplaza hitos sin alterar distancias ni duraciones',()=>{
  const a=generarCronograma({tipo:'703',salida:'07:00',tiempos});
  const b=generarCronograma({tipo:'703',salida:'08:15',tiempos});
  assert.equal(b.totalMin,a.totalMin);
  assert.equal(b.llegada,'14:45');
  assert.equal(b.hitos[0].minuto-a.hitos[0].minuto,75);
});

test('consumo por etapa se recalcula al cambiar la duración de la bici',()=>{
  const items=[{productoId:'226-drink',nombre:'226ERS Drink',cantidad:1,en:'run',offsetMin:10}];
  const a=generarCronograma({tipo:'703',salida:'07:00',tiempos},items);
  const b=generarCronograma({tipo:'703',salida:'07:00',tiempos:{...tiempos,bike:215}},items);
  const t=r=>r.hitos.find(h=>h.id==='consumo-0').minuto;
  assert.equal(t(b)-t(a),20);
});

test('maratón omite natación, bici y transiciones',()=>{
  const r=generarCronograma({tipo:'marathon',salida:'06:00',tiempos:{run:240}});
  assert.deepEqual(r.etapas.map(x=>x.id),['run']);
  assert.equal(r.llegada,'10:00');
  assert.equal(DISTANCIAS.marathon.runKm,42.195);
});

test('alerta ante entrada incompleta y consumo fuera de segmento',()=>{
  const a=generarCronograma({tipo:'703',salida:'invalida',tiempos:{bike:180}});
  assert.ok(a.alertas.some(x=>x.includes('Hora de salida inválida')));
  const b=generarCronograma({tipo:'703',salida:'07:00',tiempos},[
    {productoId:'maurten-100',en:'swim',offsetMin:70}
  ]);
  assert.ok(b.alertas.some(x=>x.includes('fuera de la duración')));
});

test('temperatura bajo cero es válida y datos climáticos vacíos no se convierten en medición',()=>{
  const frio=generarCronograma({tipo:'703',salida:'07:00',tiempos,temperaturaC:-3});
  assert.ok(!frio.alertas.some(x=>x.includes('Temperatura inválida')));
  const vacio=generarCronograma({tipo:'703',salida:'07:00',tiempos,temperaturaC:null,humedadPct:null});
  assert.ok(!vacio.alertas.some(x=>x.includes('Calor elevado')));
  const error=generarCronograma({tipo:'703',salida:'07:00',tiempos,temperaturaC:80});
  assert.ok(error.alertas.some(x=>x.includes('Temperatura inválida')));
});
