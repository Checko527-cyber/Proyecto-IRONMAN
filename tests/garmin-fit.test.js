import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeFit,timeSeries,bilateralSummary} from '../lib/garmin-fit.js';

function sampleFit(){
 const message=Buffer.from([0x40,0,0,20,0,4,253,4,0x86,3,1,2,4,1,2,6,2,0x84]);
 const record=Buffer.alloc(9);record[0]=0;record.writeUInt32LE(1162387200,1);record[5]=155;record[6]=81;record.writeUInt16LE(7800,7);
 const data=Buffer.concat([message,record]);
 const header=Buffer.alloc(14);header[0]=14;header[1]=0x10;header.writeUInt16LE(100,2);header.writeUInt32LE(data.length,4);header.write('.FIT',8);
 return Buffer.concat([header,data,Buffer.alloc(2)]);
}
test('decodifica muestra FIT original y convierte velocidad',()=>{
 const rows=decodeFit(sampleFit());
 assert.equal(rows.length,1);
 assert.equal(rows[0].hr,155);
 assert.equal(rows[0].cadence,81);
 assert.equal(rows[0].speed,7.8);
 assert.equal(new Date(rows[0].time).toISOString(),'2026-10-31T13:20:00.000Z');
});
test('calcula ventanas temporales y bloque de esfuerzo',()=>{
 const base=Date.UTC(2026,10,1,12);
 const rows=[{time:base,hr:140,cadence:70,speed:6},{time:base+60000,hr:155,cadence:90,speed:8},{time:base+120000,hr:160,cadence:88,speed:8}];
 const out=timeSeries(rows,{threshold:148});
 assert.equal(out.samples.length,3);
 assert.equal(out.blocks.length,2);
 assert.equal(out.blocks[1].tipo,'esfuerzo');
 assert.equal(out.blocks[1].inicioMin,1);
});

function powerFit(){
 const definition=Buffer.from([0x40,0,0,20,0,4,253,4,0x86,7,2,0x84,30,1,2,43,1,2]);
 const make=(seconds,power,balance,torque)=>{
  const rec=Buffer.alloc(9);rec[0]=0;rec.writeUInt32LE(1162387200+seconds,1);
  rec.writeUInt16LE(power,5);rec[7]=balance;rec[8]=torque;return rec;
 };
 const data=Buffer.concat([definition,make(0,180,0x80|49,142),make(60,200,0x80|52,140)]);
 const header=Buffer.alloc(14);header[0]=14;header[1]=0x10;header.writeUInt16LE(100,2);
 header.writeUInt32LE(data.length,4);header.write('.FIT',8);
 return Buffer.concat([header,data,Buffer.alloc(2)]);
}
test('interpreta potencia y porcentaje bilateral del FIT real, incluido indicador derecha',()=>{
 const rows=decodeFit(powerFit());
 assert.equal(rows[0].power,180);
 assert.equal(rows[0].leftBalance,51);
 assert.equal(rows[0].leftTorqueEffectiveness,71);
 assert.equal(rows[1].leftBalance,48);
 const b=bilateralSummary(rows);
 assert.equal(b.disponible,true);
 assert.equal(b.izquierdaPct,49.5);
 assert.equal(b.derechaPct,50.5);
 assert.equal(b.primeraMitadIzquierdaPct,51);
 assert.equal(b.segundaMitadIzquierdaPct,48);
 assert.equal(b.cambioIzquierdaPuntos,-3);
 assert.equal(b.potenciaMediaPedaleandoW,190);
 const series=timeSeries(rows);
 assert.equal(series.samples[0].watts,180);
 assert.equal(series.samples[1].balanceIzq,48);
});
test('no inventa balance cuando no lo reporta el sensor',()=>{
 const rows=[{time:1000,power:200,leftBalance:null},{time:2000,power:0,leftBalance:50}];
 assert.equal(bilateralSummary(rows).disponible,false);
});
