import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/catalogo-nutricion.js';

function request(query={},method='GET'){
  let estado,datos;
  const res={setHeader(){},status(n){estado=n;return this;},json(x){datos=x;return this;}};
  handler({method,query},res);
  return {estado,datos};
}

test('API expone catálogo con procedencia y sin asumir stock colombiano',()=>{
  const r=request();
  assert.equal(r.estado,200);
  assert.ok(r.datos.total>25);
  assert.ok(r.datos.productos.some(p=>p.fuenteFabricante&&p.fuenteColombia));
  assert.match(r.datos.aviso,/confirmar variante/);
});

test('busca marcas y filtra geles, preservando datos desconocidos',()=>{
  const r=request({q:'GU',tipo:'gel'});
  assert.equal(r.estado,200);
  assert.ok(r.datos.productos.some(p=>p.id==='gu-original'));
  assert.ok(r.datos.productos.every(p=>p.tipo==='gel'));
});

test('catálogo es solo lectura',()=>assert.equal(request({},'POST').estado,405));
