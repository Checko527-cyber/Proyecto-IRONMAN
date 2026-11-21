import test from 'node:test';
import assert from 'node:assert/strict';
import {revisarPreparacion} from '../lib/preparacion-carrera.js';

test('sin tasa de sudoración no inventa pérdidas ni dosis de bebida',()=>{
  const r=revisarPreparacion({pesoKg:86.8,sudoracionLh:null,experienciaNutricion:'ensayada'},
    {totalMin:390},[],[],{});
  assert.equal(r.perdidaTeoricaLitros,null);
  assert.ok(r.avisos.some(x=>x.includes('tasa de sudoración')));
});

test('tasa medida permite proyectar pérdida teórica sin prescribir reposición',()=>{
  const r=revisarPreparacion({pesoKg:86.8,sudoracionLh:0.8,experienciaNutricion:'ensayada'},
    {totalMin:390},[{productoId:'gel'}],[{id:'gel',nombre:'Gel'}],{disponibles:['gel']});
  assert.equal(r.perdidaTeoricaLitros,5.2);
  assert.equal(r.avisos.length,0);
  assert.equal(r.esEstimacion,true);
});

test('avisa si el plan usa productos no marcados como disponibles',()=>{
  const r=revisarPreparacion({}, {totalMin:180},[{productoId:'gel'}],
    [{id:'gel',nombre:'Gel favorito'}],{favoritos:['gel'],disponibles:[]});
  assert.ok(r.avisos.some(x=>x.includes('Confirmar disponibilidad')));
});
