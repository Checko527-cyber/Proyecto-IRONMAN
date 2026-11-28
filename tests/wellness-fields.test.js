import test from 'node:test';import assert from 'node:assert/strict';
import {campoWellness,numeroWellness,pesoWellness} from '../lib/wellness-fields.js';
test('tempWeight no es peso corporal y battery genérica no es Body Battery',()=>{assert.equal(campoWellness({tempWeight:1},'weight','bodyweight','weightkg'),null);assert.equal(campoWellness({deviceBattery:80},'bodybattery','battery'),null);});
test('variaciones exactas de nombres conservan métricas válidas',()=>{assert.equal(campoWellness({resting_HR:57},'restinghr'),'resting_HR');assert.equal(campoWellness({body_weight:86},'bodyweight'),'body_weight');});
test('peso y números no confunden flags ni datos faltantes con mediciones',()=>{for(const x of [0,1,true,false,null,'',Infinity])assert.equal(pesoWellness(x),null);assert.equal(pesoWellness('86.8'),86.8);assert.equal(numeroWellness(0),0);assert.equal(numeroWellness(true),null);});
