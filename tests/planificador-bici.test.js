import test from 'node:test';
import assert from 'node:assert/strict';
import {proponerBicicleta} from '../lib/planificador-bici.js';
test('no pisa bicicleta que ya programó el entrenador',()=>{
const r=proponerBicicleta([{fecha:'2026-11-05',deporte:'Ride',nombre:'Bici prescrita'}],{fechaInicio:'2026-11-02'});
assert.ok(!r.some(x=>x.fecha==='2026-11-05'&&x.decision==='bicicleta'));
});
test('respeta día de carrera intensa',()=>{
const r=proponerBicicleta([{fecha:'2026-11-05',deporte:'Run',nombre:'Intervalos de carrera',minutos:60}],{fechaInicio:'2026-11-02'});
assert.equal(r.find(x=>x.fecha==='2026-11-05')?.decision,'omitir');
});
test('no prescribe alta intensidad y modera si hay fatiga',()=>{
const r=proponerBicicleta([],{fechaInicio:'2026-11-02',recuperacion:'moderar'});
assert.ok(r.every(x=>x.decision!=='bicicleta'||x.zona.includes('Z2')));
assert.ok(r.find(x=>x.fecha==='2026-11-07')?.minutos<=70);
});
test('reduce a recuperación cuando motor lo indica',()=>{
const r=proponerBicicleta([],{fechaInicio:'2026-11-02',recuperacion:'reducir'});
assert.ok(r.every(x=>x.decision!=='recuperación'||x.zona==='Z1'));
});