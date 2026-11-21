import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('navegación principal muestra los cinco espacios acordados',()=>{
  const nav=html.match(/<nav><div class="nav-wrap">([\s\S]*?)<\/div><\/nav>/)?.[1]||'';
  const ids=[...nav.matchAll(/data-v="([^"]+)"/g)].map(x=>x[1]);
  assert.deepEqual(ids,['inicio','plan','rendimiento','competencias','nutricion']);
});

test('todos los módulos anteriores siguen disponibles en navegación secundaria',()=>{
  for(const id of ['inicio','semana','datos','temporada','plan703','analitica','motor','ruta']){
    assert.ok(html.includes(`id="v-${id}"`));
    assert.match(html,new RegExp(`['"]${id}['"]`));
  }
  assert.ok(html.includes('id="v-nutricion"'));
  assert.ok(html.includes('id="sectionSubnav"'));
});

test('la interfaz de nutrición conserva un módulo cargado desde el catálogo compartido',()=>{
  assert.ok(html.includes('src="/nutricion.js?v=1"'));
  const js=readFileSync(new URL('../nutricion.js',import.meta.url),'utf8');
  assert.match(js,/CATALOGO_COMPLETO, calcularConsumos/);
  assert.match(js,/localStorage\.setItem/);
});

test('nutrición prioriza cronograma visual y conserva catálogo completo accesible',()=>{
  const js=readFileSync(new URL('../nutricion.js',import.meta.url),'utf8');
  const inicio=js.slice(js.indexOf('function iniciar()'));
  assert.ok(inicio.indexOf('id="nutritionRace')<inicio.indexOf('id="nutritionCatalog'));
  assert.ok(inicio.indexOf('id="nutritionPlan')<inicio.indexOf('id="nutritionCatalog'));
  assert.match(js,/nutrition-stages/);
  assert.match(js,/nutritionMore/);
  assert.match(js,/generarCronograma\(carrera,eventos\)/);
});

test('planificador mantiene lista persistente y salida a PDF por impresión',()=>{
  const js=readFileSync(new URL('../nutricion.js',import.meta.url),'utf8');
  assert.match(js,/ironman_checklist_carrera_v1/);
  assert.match(js,/localStorage\.setItem\(LSL/);
  assert.match(js,/window\.print\(\)/);
  assert.match(js,/compararEscenarios\(carrera,eventos\)/);
  assert.match(html,/@media print/);
});

test('Ruta agrupa las seis métricas técnicas sin retirar sus destinos',()=>{
  const ruta=html.split('id="v-ruta"')[1]?.split('id="v-nutricion"')[0]||'';
  assert.match(ruta,/class="route-group"/);
  for(const id of ['capBox','fitChart','volChart','zonasBox','effBox','bankBox','trail']){
    assert.match(ruta,new RegExp(`id="${id}"`));
  }
});

test('nutrición solicita perfil editable y permite seleccionar favoritos o existencias',()=>{
  const js=readFileSync(new URL('../nutricion.js',import.meta.url),'utf8');
  assert.match(js,/id="nutritionProfile"/);
  assert.match(js,/ironman_perfil_nutricion_v1/);
  assert.match(js,/ironman_productos_preferidos_v1/);
  assert.match(js,/nutritionProductSelect/);
  assert.match(js,/Mis favoritos/);
  assert.match(js,/Productos que tengo/);
  assert.match(js,/localStorage\.setItem\(LSF/);
});

test('planificador conserva inventario independiente y no presupone mililitros',()=>{
  const js=readFileSync(new URL('../nutricion.js',import.meta.url),'utf8');
  assert.match(js,/ironman_inventario_nutricion_v1/);
  assert.match(js,/nutritionStock/);
  assert.match(js,/liquidoMl/);
  assert.match(js,/revisarInventario\(consumos,inventario,CATALOGO_COMPLETO\)/);
});

test('descarga CSV comparte el mismo cronograma y se puede guardar PDF',()=>{
  const js=readFileSync(new URL('../nutricion.js',import.meta.url),'utf8');
  assert.match(js,/construirFilasPlan\(cronograma,consumos,CATALOGO_COMPLETO,inventario\)/);
  assert.match(js,/exportarPlanCSV\(cronograma,consumos,CATALOGO_COMPLETO,inventario\)/);
  assert.match(js,/IRONMAN_plan_abastecimiento\.csv/);
  assert.match(js,/window\.print\(\)/);
});
