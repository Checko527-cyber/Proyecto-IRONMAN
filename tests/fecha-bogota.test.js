import test from 'node:test';import assert from 'node:assert/strict';
import {fechaBogota,fechaActividad,desplazarFecha,enRango,diasEntre} from '../lib/fecha-bogota.js';
test('corte de Bogotá antes y después de medianoche UTC y local',()=>{assert.equal(fechaBogota(new Date('2026-11-28T02:28:00Z')),'2026-11-27');assert.equal(fechaBogota(new Date('2026-11-28T05:00:00Z')),'2026-11-28');});
test('fecha de actividad con UTC y con hora local',()=>{assert.equal(fechaActividad({start_date:'2026-11-28T02:28:00Z'}),'2026-11-27');assert.equal(fechaActividad({start_date_local:'2026-11-27T21:28:00'}),'2026-11-27');});
test('rango excluye fechas futuras y calcula desfase cero en mismo día',()=>{assert.equal(enRango('2026-11-28','2026-11-20','2026-11-27'),false);assert.equal(diasEntre('2026-11-27','2026-11-27'),0);assert.equal(desplazarFecha('2027-01-01',-1),'2026-12-31');});
