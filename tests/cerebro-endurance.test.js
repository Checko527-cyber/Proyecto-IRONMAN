import test from 'node:test';
import assert from 'node:assert/strict';
import { generarPlanAutomatico } from '../lib/cerebro-endurance.js';
import { CATALOGO_COMPLETO } from '../lib/catalogo-nutricion.js';

const carrera={tipo:'703',salida:'07:00',temperaturaC:21,humedadPct:60,tiempos:{swim:45,t1:5,bike:195,t2:5,run:140}};
const base={carrera,perfil:{pesoKg:86.8,experienciaNutricion:'parcial',alertaEstomago:false,sudoracionLh:null},catalogo:CATALOGO_COMPLETO,preferencias:{favoritos:['never-c30'],disponibles:['never-c30']},inventario:{'never-c30':20}};

test('genera un plan ordenado para 70.3 sin agregar cafeína ni consumo nadando',()=>{
  const plan=generarPlanAutomatico(base);
  assert.ok(plan.consumos.length>=9);
  assert.ok(plan.consumos.every(x=>['never-c30','agua-neutral'].includes(x.productoId)));
  assert.ok(plan.consumos.some(x=>x.productoId==='agua-neutral'&&x.overrides.liquidoMl>0));
  assert.ok(plan.consumos.every(x=>['bike','run'].includes(x.en)));
  assert.equal(plan.cronograma.alertas.filter(x=>x.includes('fuera de la duración')).length,0);
  assert.equal(plan.previo.length,3);
  assert.equal(plan.post.length,2);
});

test('personaliza el clima, tolerancia y objetivos editados',()=>{
  const p=generarPlanAutomatico({...base,carrera:{...carrera,temperaturaC:32},opciones:{bikeGHora:60,runGHora:35,liquidosMlHora:700}});
  assert.equal(p.liquidosHora,700);
  assert.equal(p.objetivos.bike,60);
  assert.equal(p.objetivos.run,35);
  assert.ok(p.avisos.some(x=>x.includes('Calor elevado')));
});

test('selecciona explícitamente el producto que el atleta tiene a mano',()=>{
  const p=generarPlanAutomatico({...base,opciones:{productoId:'never-c30'}});
  assert.ok(p.consumos.filter(x=>x.productoId!=='agua-neutral').every(x=>x.productoId==='never-c30'));
});

test('marca inventario insuficiente y mantiene explícita la incertidumbre',()=>{
  const p=generarPlanAutomatico({...base,inventario:{'never-c30':1}});
  assert.ok(p.avisos.some(x=>x.includes('Stock insuficiente')));
});

test('adapta plan a distancia corrida sin inventar ciclismo',()=>{
  const p=generarPlanAutomatico({...base,carrera:{...carrera,tipo:'marathon',tiempos:{swim:0,t1:0,bike:0,t2:0,run:240}}});
  assert.ok(p.consumos.length>0);
  assert.ok(p.consumos.every(x=>x.en==='run'));
});

test('combina bebida seleccionada, geles y agua sin duplicar líquido',()=>{
  const p=generarPlanAutomatico({...base,opciones:{productoId:'never-c30',bebidaId:'skratch-hydration'}});
  assert.ok(p.consumos.some(x=>x.productoId==='skratch-hydration'&&x.en==='bike'));
  assert.ok(p.consumos.some(x=>x.productoId==='never-c30'&&x.en==='bike'));
  assert.ok(p.consumos.some(x=>x.productoId==='agua-neutral'&&x.en==='bike'));
  const bici=p.resumen.find(x=>x.etapa==='bike');
  assert.equal(bici.bebidaMl+bici.aguaMl,bici.liquidosMl);
  assert.ok(p.consumos.every(x=>x.productoId!=='skratch-hydration'||x.en==='bike'));
});

test('no agrega bebidas no seleccionadas ni declaradas disponibles',()=>{
  const p=generarPlanAutomatico({...base,preferencias:{favoritos:[],disponibles:['never-c30']},opciones:{productoId:'never-c30'}});
  assert.equal(p.bebidaElegida,null);
});
