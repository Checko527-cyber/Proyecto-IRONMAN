import test from 'node:test';
import assert from 'node:assert/strict';
import {TARGET,WEEKS,ZONES,weekOf,weekStatus,bikeSession,raceSplit} from '../lib/victoria-plan.js';
test('29 semanas contiguas entre 9 noviembre y 30 mayo',()=>{
 assert.equal(WEEKS.length,29);
 assert.equal(WEEKS[0].start,'2026-11-09');
 assert.equal(WEEKS.at(-1).end,'2027-05-30');
 for(let i=1;i<WEEKS.length;i++)assert.equal(Date.parse(WEEKS[i].start)-Date.parse(WEEKS[i-1].start),7*86400000);
 assert.equal(weekOf('2027-05-30')?.number,29);
});
test('tiempos de 6h30 exactamente',()=>{
 assert.equal(TARGET.seconds,6.5*3600);
 assert.equal(raceSplit().reduce((s,a)=>s+a.minutes,0),390);
 assert.deepEqual(raceSplit().map(x=>x.minutes),[43,7,190,8,142]);
});
test('semanas de descarga identificadas sin ocultar deporte',()=>{
 assert.deepEqual(WEEKS.filter(w=>w.phase==='descarga').map(w=>w.number),[4,8,12,16,20,24]);
 for(const w of WEEKS)for(const n of ['swim','bike','run','strength'])assert.ok(w[n]>=0);
});
test('no atribuye cumplimiento sin entrenamientos observados',()=>{
 const w=WEEKS[6];const st=weekStatus(w,[]);
 assert.equal(st.totalHours,0);
 assert.equal(st.plannedHours,w.total);
 assert.equal(st.bike.sessions,0);
 assert.ok(st.ratio===0);
});
test('compara horas reales del deporte y conserva carga original',()=>{
 const w=WEEKS[6],rows=[
 {date:w.start,sport:'bike',min:60,km:28.5,carga:42},
 {date:w.start,sport:'run',min:35,km:5.1,carga:30},
 {date:'2025-01-01',sport:'swim',min:40,carga:13}
 ];
 const st=weekStatus(w,rows);
 assert.equal(st.bike.hours,1);
 assert.equal(st.bike.load,42);
 assert.equal(st.run.km,5.1);
 assert.equal(st.swim.sessions,0);
});
test('no inventa vatios al prescribir bici',()=>{
 assert.deepEqual(ZONES.bike[1],{name:'Z2',min:133,max:139});
 const b=bikeSession(WEEKS[20]);
 assert.equal(b.reduce((s,x)=>s+x.minutes,0),WEEKS[20].mainBikeMinutes);
 assert.ok(b.every(s=>!s.hr.includes('W')));
});
