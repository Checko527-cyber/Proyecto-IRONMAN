import test from 'node:test';
import assert from 'node:assert/strict';
import {revisarInventario} from '../lib/inventario-carrera.js';

test('agrupa cantidades por producto y calcula faltantes sin duplicar',()=>{
  const r=revisarInventario([{productoId:'a',cantidad:2},{productoId:'a',cantidad:3}],
    {a:4},[{id:'a',nombre:'Gel A'}]);
  assert.equal(r.items[0].requerido,5);
  assert.equal(r.items[0].faltante,1);
});
test('stock desconocido no se interpreta como cero ni como suficiente',()=>{
  const r=revisarInventario([{productoId:'a',cantidad:2}],{},[{id:'a'}]);
  assert.equal(r.items[0].disponible,null);
  assert.equal(r.items[0].faltante,null);
  assert.equal(r.productosSinConfirmar,1);
});
test('suma líquido solo si el volumen por porción fue declarado',()=>{
  const r=revisarInventario([
    {productoId:'bebida',cantidad:2,overrides:{liquidoMl:500}},
    {productoId:'gel',cantidad:1,overrides:{liquidoMl:null}}
  ],{bebida:2,gel:1});
  assert.equal(r.liquidoMl,1000);
  assert.equal(r.liquidoCompleto,false);
});
