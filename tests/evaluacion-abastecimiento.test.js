import test from 'node:test';
import assert from 'node:assert/strict';
import {generarCronograma} from '../lib/planificador-carrera.js';
import {evaluarAbastecimiento} from '../lib/evaluacion-abastecimiento.js';

const cronograma=generarCronograma({tipo:'703',salida:'07:00',tiempos:{swim:40,t1:5,bike:180,t2:5,run:120}});
const catalogo=[{id:'gel',carbohidratosG:30,sodioMg:100,cafeinaMg:0},{id:'desconocido',carbohidratosG:20,sodioMg:null,cafeinaMg:0}];

test('calcula nutrientes por hora según la duración real de cada etapa',()=>{
  const result=evaluarAbastecimiento(cronograma,[
    {productoId:'gel',en:'bike',cantidad:6},
    {productoId:'gel',en:'run',cantidad:2}
  ],catalogo,{bike:60,run:30});
  assert.equal(result.detalle.find(x=>x.id==='bike').totales.carbohidratosG.porHora,60);
  assert.equal(result.detalle.find(x=>x.id==='run').totales.carbohidratosG.porHora,30);
  assert.equal(result.detalle.find(x=>x.id==='bike').diferenciaCarbohidratosHora,0);
});

test('conserva datos ausentes sin transformarlos en un cero medido',()=>{
  const r=evaluarAbastecimiento(cronograma,[{productoId:'desconocido',en:'bike',cantidad:2}],catalogo);
  assert.equal(r.detalle.find(x=>x.id==='bike').totales.sodioMg.completo,false);
  assert.ok(r.alertas.some(x=>x.includes('faltan etiquetas')));
});

test('los objetivos son editables, opcionales y no se prescriben automáticamente',()=>{
  const items=[{productoId:'gel',en:'bike',cantidad:3}];
  const sin=evaluarAbastecimiento(cronograma,items,catalogo);
  const con=evaluarAbastecimiento(cronograma,items,catalogo,{bike:60});
  assert.equal(sin.detalle.find(x=>x.id==='bike').objetivoCarbohidratosHora,null);
  assert.equal(con.detalle.find(x=>x.id==='bike').diferenciaCarbohidratosHora,-30);
  assert.ok(con.alertas.some(x=>x.includes('difiere')));
});
