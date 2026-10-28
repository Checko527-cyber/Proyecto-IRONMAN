import test from 'node:test';
import assert from 'node:assert/strict';
import { mismaSesion } from '../lib/misma-sesion.js';

const base = {
  date: '2026-10-27', sport: 'run', name: 'Rodaje',
  min: 45, km: 8, startedAt: '2026-10-27T11:00:00Z'
};

test('une la misma actividad importada con diferencia de tres minutos', () => {
  assert.equal(mismaSesion(base, { ...base, startedAt: '2026-10-27T11:03:00Z' }), true);
});

test('mantiene dos sesiones similares del mismo día como distintas', () => {
  assert.equal(mismaSesion(base, { ...base, startedAt: '2026-10-27T23:00:00Z' }), false);
});

test('no une actividades de deportes diferentes', () => {
  assert.equal(mismaSesion(base, { ...base, sport: 'bike' }), false);
});

test('registros antiguos sin hora requieren dos señales', () => {
  const sinHora = { ...base, startedAt: null };
  assert.equal(mismaSesion(sinHora, { ...sinHora, km: 8.1 }), true);
  assert.equal(mismaSesion(sinHora, { ...sinHora, name: 'Series', min: 60, km: 11 }), false);
});

test('no usa únicamente el nombre para unir dos sesiones', () => {
  const sinHora = { ...base, startedAt: null };
  assert.equal(mismaSesion(sinHora, { ...sinHora, min: 80, km: 15 }), false);
});

test('diferencias de fecha no pueden ser la misma sesión', () => {
  assert.equal(mismaSesion(base, { ...base, date: '2026-10-28' }), false);
});
