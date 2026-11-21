import test from 'node:test';
import assert from 'node:assert/strict';
import {generarCronograma} from '../lib/planificador-carrera.js';
import {construirFilasPlan,exportarPlanCSV} from '../lib/exportacion-plan.js';

const config={tipo:'703',salida:'07:00',tiempos:{swim:45,t1:5,bike:195,t2:5,run:140}};
test('la exportación comparte el mismo horario del cronograma y conserva cantidades',()=>{
  const consumos=[{productoId:'a',cantidad:2,en:'bike',offsetMin:30,overrides:{liquidoMl:500}}];
  const calendario=generarCronograma(config,consumos);
  const filas=construirFilasPlan(calendario,consumos,[{id:'a',nombre:'Bebida',carbohidratosG:30,sodioMg:200,cafeinaMg:0}],{a:3});
  assert.equal(filas.length,1);
  assert.equal(filas[0].hora,calendario.hitos.find(h=>h.id==='consumo-0').hora);
  assert.equal(filas[0].carbohidratosG,60);
  assert.equal(filas[0].liquidoMl,1000);
  assert.equal(filas[0].stockConfirmado,3);
});
test('un dato sin etiqueta se exporta como ausente y no como cero',()=>{
  const items=[{productoId:'a',cantidad:1,en:'run',offsetMin:10}];
  const csv=exportarPlanCSV(generarCronograma(config,items),items,[{id:'a',nombre:'Gel',sodioMg:null}]);
  assert.match(csv,/Sin dato/);
  assert.ok(csv.startsWith('\ufeff'));
});
test('CSV neutraliza nombres que podrían ejecutarse como fórmulas',()=>{
  const items=[{productoId:'a',cantidad:1,en:'run',offsetMin:10}];
  const csv=exportarPlanCSV(generarCronograma(config,items),items,[{id:'a',nombre:'=HYPERLINK("malicioso")'}]);
  assert.match(csv,/"'=HYPERLINK/);
});
