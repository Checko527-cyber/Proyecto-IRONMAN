import test from 'node:test';
import assert from 'node:assert/strict';
import { generarPlanAutomatico } from '../lib/cerebro-endurance.js';
import { construirDocumentoCarrera } from '../lib/plan-carrera-documento.js';
import { CATALOGO_COMPLETO } from '../lib/catalogo-nutricion.js';

test('produce cuatro ejes Cartagena con eventos de D-2 a recuperación y cantidades',()=>{
  const carrera={tipo:'5150',salida:'06:15',temperaturaC:28,tiempos:{swim:35,t1:5,bike:80,t2:5,run:58}};
  const perfil={pesoKg:86,experienciaNutricion:'parcial',alertaEstomago:false};
  const plan=generarPlanAutomatico({carrera,perfil,catalogo:CATALOGO_COMPLETO,opciones:{productoId:'never-c30'}});
  const doc=construirDocumentoCarrera({carrera,perfil,plan,consumos:plan.consumos,catalogo:CATALOGO_COMPLETO});
  assert.equal(doc.eventos[0].dia,'D-2');
  assert.ok(doc.eventos.some(e=>e.accion.includes('Desayuno')&&e.hora==='03:15'));
  assert.ok(doc.eventos.some(e=>e.accion.includes('Neversecond C30')));
  assert.ok(doc.eventos.some(e=>e.accion.includes('recuperación')||e.accion.includes('post-meta')));
  assert.ok(doc.materiales.length>=4);
  assert.ok(doc.productos.some(p=>p.id==='never-c30'&&p.cantidad>0));
  assert.ok(doc.eventos.findIndex(e=>e.accion.includes('Desayuno'))<doc.eventos.findIndex(e=>e.accion.includes('Inicio · Natación')));
  assert.deepEqual(doc.secciones.map(x=>x.id),['pre','swim','t1','bike','t2','run','post']);
  assert.ok(doc.secciones.find(x=>x.id==='pre').filas.some(x=>x.accion.includes('Avena')));
  assert.ok(doc.secciones.find(x=>x.id==='bike').filas.some(x=>x.accion.includes('Neversecond')));
  assert.ok(doc.secciones.find(x=>x.id==='t2').filas.some(x=>x.accion.includes('casco')));
  assert.ok(doc.secciones.find(x=>x.id==='swim').filas.some(x=>x.accion.includes('2:20 min/100 m')));
});
