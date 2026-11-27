import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararArranqueSeguro, validarInfraestructuraIronman } from '../lib/ironman-infra-guard.js';

const ref = 'aaaaaaaaaaaaaaaaaaaa';
const ok = Object.freeze({
  proyectoId: 'proyecto-ironman',
  supabaseUrl: 'https://' + ref + '.supabase.co',
  supabaseRef: ref,
  refAprobada: ref,
  esProyectoIndependiente: true,
  entorno: 'qa'
});

test('sólo admite infraestructura IRONMAN explícitamente aprobada', () => {
  const resultado = validarInfraestructuraIronman(ok);
  assert.deepEqual(resultado, {
    proyectoId: 'proyecto-ironman',
    supabaseRef: ref,
    entorno: 'qa',
    infraestructura: 'independiente'
  });
  assert.equal(Object.isFrozen(resultado), true);
});
test('bloquea cualquier dependencia declarada de ATLAS', () => {
  assert.throws(() => validarInfraestructuraIronman({ ...ok, proyectoId: 'ATLAS-GIU' }), /IRONMAN|ATLAS/);
  assert.throws(() => validarInfraestructuraIronman({ ...ok, atlasRefProhibida: ref }), /ATLAS/);
  assert.throws(() => validarInfraestructuraIronman({ ...ok, supabaseUrl: 'https://atlas.supabase.co' }), /URL/);
});
test('bloquea por defecto sin referencia aprobada o identidad coherente', () => {
  assert.throws(() => validarInfraestructuraIronman({ ...ok, refAprobada: 'bbbbbbbbbbbbbbbbbbbb' }), /no coincide/);
  assert.throws(() => validarInfraestructuraIronman({ ...ok, esProyectoIndependiente: false }), /independiente/);
  assert.throws(() => validarInfraestructuraIronman({ ...ok, entorno: 'testing' }), /Entorno/);
  assert.throws(() => validarInfraestructuraIronman({ ...ok, supabaseUrl: 'http://' + ref + '.supabase.co' }), /URL/);
  assert.throws(() => validarInfraestructuraIronman({ ...ok, supabaseUrl: 'https://' + ref + '.supabase.co.attacker.invalid' }), /URL/);
  assert.throws(() => validarInfraestructuraIronman({ ...ok, supabaseRef: 'no-existe' }), /inválida/);
});
test('sin configuración de servidor la preparación no arranca ni consulta recursos', () => {
  assert.throws(() => prepararArranqueSeguro({}), /referencia privada aprobada/);
  const env = {
    IRONMAN_PROJECT_ID: 'proyecto-ironman',
    IRONMAN_SUPABASE_REF: ref,
    IRONMAN_SUPABASE_URL: 'https://' + ref + '.supabase.co',
    IRONMAN_SUPABASE_REF_APROBADA: ref,
    IRONMAN_INFRA_INDEPENDIENTE: 'true',
    IRONMAN_ENVIRONMENT: 'qa'
  };
  assert.equal(prepararArranqueSeguro(env).infraestructura, 'independiente');
  assert.throws(() => prepararArranqueSeguro({ ...env, IRONMAN_INFRA_INDEPENDIENTE: 'false' }), /independiente/);
  assert.throws(() => prepararArranqueSeguro({ ...env, ATLAS_SUPABASE_PROJECT_REF: ref }), /ATLAS/);
});
