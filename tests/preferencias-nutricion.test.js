import test from 'node:test';
import assert from 'node:assert/strict';
import {productosPreferidos,validarPerfil} from '../lib/preferencias-nutricion.js';

const catalogo=[{id:'a'},{id:'b'},{id:'c'}];
test('filtro de favoritos y disponibles conserva el catálogo sin sobrescribirlo',()=>{
  const p={favoritos:['b'],disponibles:['b','c']};
  assert.deepEqual(productosPreferidos(catalogo,p,'favoritos').map(x=>x.id),['b']);
  assert.deepEqual(productosPreferidos(catalogo,p,'disponibles').map(x=>x.id),['b','c']);
  assert.equal(productosPreferidos(catalogo,p).length,3);
});
test('perfil opcional conserva desconocidos y rechaza mediciones imposibles',()=>{
  assert.equal(validarPerfil({}).pesoKg,null);
  assert.equal(validarPerfil({pesoKg:86.8,sudoracionLh:0.8}).pesoKg,86.8);
  assert.equal(validarPerfil({sudoracionLh:10}).sudoracionLh,null);
});
