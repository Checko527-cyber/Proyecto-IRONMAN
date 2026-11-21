import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluarMotor } from '../lib/motor-adaptativo.js';

const hoy='2026-10-27';
const base = Array.from({length:17},(_,i)=>({
  date:new Date(Date.UTC(2026,9,27-i)).toISOString().slice(0,10),
  sleep:7.8,hrv:55,restingHR:52,ctl:53,atl:55,rampRate:2
}));

test('mantiene el bloque cuando bienestar y carga están estables',()=>{
  const r=evaluarMotor(base,[],{hoy});
  assert.equal(r.estado,'mantener');
  assert.equal(r.factor,1);
});
test('reduce una sesión intensa tras sueño muy corto',()=>{
  const w=base.map(x=>({...x}));w[0].sleep=5.5;
  const r=evaluarMotor(w,[],{hoy});
  assert.equal(r.estado,'reducir');
  assert.equal(r.intensidad,'Z1 o descanso');
});
test('modera al detectar una sola señal',()=>{
  const w=base.map(x=>({...x}));w[0].sleep=6.5;
  const r=evaluarMotor(w,[],{hoy});
  assert.equal(r.estado,'moderar');
});
test('dos señales de recuperación fuerzan reducción',()=>{
  const w=base.map(x=>({...x}));w[0].hrv=40;w[0].restingHR=62;
  assert.equal(evaluarMotor(w,[],{hoy}).estado,'reducir');
});
test('no presenta datos antiguos como estado de hoy',()=>{
  const r=evaluarMotor(base.slice(5),[],{hoy});
  assert.equal(r.estado,'sin_datos');
});
test('solo CTL, sin señales de recuperación, no autoriza intensidad',()=>{
  const r=evaluarMotor([{date:hoy,ctl:53,atl:58}],[],{hoy});
  assert.equal(r.estado,'sin_datos');
});
test('el motor no inventa zonas ni modifica el plan sin datos',()=>{
  const r=evaluarMotor([],[],{hoy});
  assert.equal(r.factor,1);
  assert.equal(r.evidencia.bienestar,'desactualizados');
});

test('una mediana de sueño próxima a siete horas no fuerza reducción de carga',()=>{
  const w=base.map(x=>({...x})); w[0].sleep=7.6; w[1].sleep=6.37; w[2].sleep=7.6;
  assert.equal(evaluarMotor(w,[],{hoy}).estado,'mantener');
});

test('una gripe declarada activa prevalece sobre métricas normales',()=>{
  const r=evaluarMotor(base,[],{hoy,restricciones:[{
    tipo:'enfermedad',desde:'2026-10-25',hasta:'2026-10-29',estado:'activo'
  }]});
  assert.equal(r.estado,'pausar');
  assert.equal(r.factor,0);
  assert.ok(r.senales.includes('restriccion_salud_declarada'));
});

test('en recuperación no intenta compensar sesiones perdidas',()=>{
  const r=evaluarMotor(base,[],{hoy,restricciones:[{
    tipo:'enfermedad',desde:'2026-10-25',hasta:'2026-10-30',estado:'recuperacion'
  }]});
  assert.equal(r.estado,'recuperar');
  assert.equal(r.factor,0.5);
  assert.match(r.razones[0],/No recuperes las sesiones perdidas/);
});

test('restricción de piscina limita disciplina sin inventar una enfermedad',()=>{
  const r=evaluarMotor(base,[],{hoy,restricciones:[{
    tipo:'disponibilidad',desde:'2026-10-01',hasta:'2026-10-31',disciplinas:['swim']
  }]});
  assert.equal(r.estado,'mantener');
  assert.deepEqual(r.restricciones[0].disciplinas,['swim']);
  assert.ok(r.senales.includes('disponibilidad_limitada'));
});

test('una restricción caducada no altera el motor',()=>{
  const r=evaluarMotor(base,[],{hoy,restricciones:[{
    tipo:'enfermedad',desde:'2026-10-01',hasta:'2026-10-12'
  }]});
  assert.equal(r.estado,'mantener');
});

test('restricciones generan propuestas sin reescribir sesiones del entrenador',()=>{
  const r=evaluarMotor(base,[],{hoy,restricciones:[{
    tipo:'disponibilidad',desde:'2026-10-01',hasta:'2026-10-31',disciplinas:['swim']
  }]});
  assert.equal(r.propuesta.modo,'solo_sugerencia');
  assert.equal(r.propuesta.modificaCalendario,false);
  assert.equal(r.propuesta.sesionesEntrenadorProtegidas,true);
  assert.deepEqual(r.propuesta.disciplinasLimitadas,['swim']);
});
