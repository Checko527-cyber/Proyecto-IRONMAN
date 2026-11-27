import test from 'node:test';
import assert from 'node:assert/strict';
import { ingresarEvento } from '../lib/agent-orchestration.js';
test('replay de evento restaurado con campos reordenados conserva estado y auditoría', () => {
 const e = {id:'replay',proyectoId:'ironman',origen:'rendimiento',destino:'ingenieria',tipo:'mejora.tecnica',resumen:'Revisión sintética'};
 const {estado} = ingresarEvento(null,e);
 const restaurado = {...estado,eventos:[Object.fromEntries(Object.entries(estado.eventos[0]).reverse())]};
 const replay = ingresarEvento(restaurado,e);
 assert.equal(replay.duplicado,true);
 assert.equal(replay.estado,restaurado);
 assert.throws(()=>ingresarEvento(restaurado,{...e,resumen:'Otro contenido'}),/Conflicto de idempotencia/);
});
