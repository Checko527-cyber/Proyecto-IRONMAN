import test from 'node:test';
import assert from 'node:assert/strict';
import {PRODUCTOS_CARTAGENA,CATALOGO_COMPLETO,calcularConsumos} from '../lib/catalogo-nutricion.js';

test('el catálogo conserva productos de Cartagena y su procedencia histórica',()=>{
  assert.ok(PRODUCTOS_CARTAGENA.length>=14);
  assert.ok(PRODUCTOS_CARTAGENA.every(p=>p.verificadoFabricante===false));
  assert.equal(PRODUCTOS_CARTAGENA.find(p=>p.id==='basic-hydration').sodioMg,null);
});

test('sumas por fase y globales utilizan el mismo cálculo, sin duplicar productos',()=>{
  const p=calcularConsumos([
    {productoId:'going-boost',cantidad:1,fase:'pre',hora:'03:45'},
    {productoId:'226-drink',cantidad:1,fase:'durante',hora:'07:00'},
    {productoId:'226-cherry',cantidad:1,fase:'durante',hora:'08:30'}
  ]);
  assert.equal(p.totales.pre.carbohidratosG.total,80);
  assert.equal(p.totales.durante.carbohidratosG.total,141);
  assert.equal(p.totales.general.carbohidratosG.total,221);
  assert.equal(p.totales.general.cafeinaMg.total,260);
  assert.equal(p.fases.durante.length,2);
});

test('un sodio desconocido sigue marcado incompleto, nunca se transforma en cero real',()=>{
  const p=calcularConsumos([{productoId:'basic-hydration',cantidad:1,fase:'pre'}]);
  assert.equal(p.totales.pre.sodioMg.total,0);
  assert.equal(p.totales.pre.sodioMg.completo,false);
  assert.ok(p.alertas.some(x=>x.includes('verificar sodioMg')));
});

test('un dato de etiqueta introducido por el atleta recalcula los totales sin modificar el catálogo',()=>{
  const p=calcularConsumos([{productoId:'basic-hydration',cantidad:2,fase:'pre',overrides:{sodioMg:450}}]);
  assert.equal(p.totales.pre.sodioMg.total,900);
  assert.equal(p.totales.pre.sodioMg.completo,true);
  assert.equal(PRODUCTOS_CARTAGENA.find(x=>x.id==='basic-hydration').sodioMg,null);
});

test('rechaza cantidades inválidas o productos inexistentes',()=>{
  const p=calcularConsumos([{productoId:'226-drink',cantidad:-1},{productoId:'inventado',cantidad:1}]);
  assert.equal(p.totales.general.carbohidratosG.total,0);
  assert.equal(p.fases.durante.length,0);
  assert.equal(p.alertas.length,2);
});

test('amplía catálogo sin borrar los productos históricos de Cartagena',()=>{
  assert.ok(CATALOGO_COMPLETO.length>PRODUCTOS_CARTAGENA.length+10);
  assert.ok(PRODUCTOS_CARTAGENA.every(p=>CATALOGO_COMPLETO.some(x=>x.id===p.id)));
  assert.equal(new Set(CATALOGO_COMPLETO.map(x=>x.id)).size,CATALOGO_COMPLETO.length);
});

test('marca correctamente la unidad PH 1000 sin confundir mg por litro con mg por tableta',()=>{
  const ph=CATALOGO_COMPLETO.find(x=>x.id==='precision-ph1000');
  assert.equal(ph.sodioMg,500);
  assert.match(ph.nota,/1.000 mg de sodio POR LITRO/);
});

test('la variante oficial 226ERS Cherry conserva discrepancia con el Excel histórico',()=>{
  const antiguo=CATALOGO_COMPLETO.find(x=>x.id==='226-cherry');
  const ficha=CATALOGO_COMPLETO.find(x=>x.id==='226-cherry-official');
  assert.equal(antiguo.carbohidratosG,55);
  assert.equal(ficha.carbohidratosG,50);
  assert.match(ficha.nota,/Excel de Cartagena/);
});

test('la formulación GU sin sabor definido no se convierte en un valor nutricional inventado',()=>{
  const p=calcularConsumos([{productoId:'gu-original',cantidad:1,fase:'durante'}]);
  assert.equal(p.totales.durante.carbohidratosG.completo,false);
  assert.equal(p.totales.durante.sodioMg.completo,false);
});
