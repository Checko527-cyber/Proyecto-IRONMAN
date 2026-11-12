import test from 'node:test';
import assert from 'node:assert/strict';
import {RACES_2027,PHASES_2027,plan2027,daysUntil} from '../lib/temporada2027.js';
test('Berlín y Chicago conservan fecha oficial y nunca se seleccionan juntos',()=>{
 assert.equal(RACES_2027.berlin.date,'2027-09-26');
 assert.equal(RACES_2027.chicago.date,'2027-10-10');
 assert.equal(plan2027('pendiente').marathon,null);
 assert.equal(plan2027('berlin').marathon.id,'berlin');
 assert.equal(plan2027('chicago').marathon.id,'chicago');
});
test('Cartagena se desaconseja cuando Berlín es la maratón A+',()=>{
 assert.equal(plan2027('berlin').cartagena.decision,'desaconsejada');
 assert.equal(plan2027('chicago').cartagena.decision,'condicionada');
});
test('periodización ordenada y sin fechas finales anteriores a inicio',()=>{
 assert.ok(PHASES_2027.length>=8);
 PHASES_2027.forEach(p=>assert.ok(p.from<=p.to));
 assert.ok(PHASES_2027.every((p,i)=>!i||PHASES_2027[i-1].to<p.from));
});
test('cuenta atrás determinista desde 8 noviembre 2026',()=>{
 assert.equal(daysUntil('2027-05-30',new Date('2026-11-08T12:00:00Z')),203);
});

test('MMB 2027 confirmada y separada como objetivo B',()=>{
 assert.equal(RACES_2027.mmb.date,'2027-07-25');
 assert.equal(RACES_2027.mmb.priority,'B');
 assert.equal(plan2027('pendiente').mmb.decision,'objetivo_B');
 assert.ok(PHASES_2027.some(p=>p.from<='2027-07-25'&&p.to>='2027-07-25'&&p.focus==='mmb'));
});
