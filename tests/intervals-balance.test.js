import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeBalance} from '../lib/intervals-balance.js';

test('convierte el balance DERECHO de Intervals al IZQUIERDO para dibujar las dos piernas',()=>{
 const rows={time:[0,300,600,900],watts:[180,200,230,240],left_right_balance:[49,51,53,55]};
 const b=summarizeBalance(rows,'Ride');
 assert.equal(b.disponible,true);
 assert.equal(b.derechaPct,52);
 assert.equal(b.izquierdaPct,48);
 assert.equal(b.primeraMitadIzquierdaPct,50);
 assert.equal(b.segundaMitadIzquierdaPct,46);
 assert.equal(b.cambioIzquierdaPuntos,-4);
 assert.equal(b.curva.length,4);
 assert.equal(b.curva[0].watts,180);
});

test('descarta tramos sin potencia, campos inválidos y no inventa balance',()=>{
 const rows={time:[0,1,2],watts:[0,180,200],left_right_balance:[52,null,101]};
 assert.equal(summarizeBalance(rows,'VirtualRide').disponible,false);
 assert.equal(summarizeBalance({time:[0],watts:[200]},'Ride').disponible,false);
 assert.equal(summarizeBalance(rows,'Run').disponible,false);
});
