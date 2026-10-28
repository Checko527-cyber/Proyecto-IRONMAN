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
