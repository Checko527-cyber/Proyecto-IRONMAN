import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeFit,timeSeries} from '../lib/garmin-fit.js';

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
 assert.equal(new Date(rows[0].time).toISOString(),'2026-11-02T00:00:00.000Z');
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
