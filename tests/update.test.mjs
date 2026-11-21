// Actualización automática: lectura de version.json, comparación y que la compilación lo publique.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fetchVersion, isNewer } from '../src/update.js';

const resp = (ok, body) => async () => ({ ok, json: async () => { if (body instanceof Error) throw body; return body; } });

test('fetchVersion devuelve el id publicado y null ante cualquier problema', async () => {
  assert.equal(await fetchVersion(resp(true, { v: 'abc123' })), 'abc123');
  assert.equal(await fetchVersion(resp(false, {})), null, 'archivo que no existe (jugando en local)');
  assert.equal(await fetchVersion(resp(true, { v: 5 })), null, 'id que no es texto');
  assert.equal(await fetchVersion(resp(true, { v: '' })), null);
  assert.equal(await fetchVersion(resp(true, new Error('json roto'))), null);
  assert.equal(await fetchVersion(async () => { throw new Error('sin red'); }), null);
});

test('solo hay versión nueva cuando ambas se conocen y son distintas', () => {
  assert.equal(isNewer('a', 'b'), true);
  assert.equal(isNewer('a', 'a'), false);
  assert.equal(isNewer(null, 'b'), false, 'si no se pudo leer al abrir, no se recarga a ciegas');
  assert.equal(isNewer('a', null), false, 'sin red no se recarga');
});

test('la compilación publica version.json con un id distinto en cada build', () => {
  const build = (sha) => {
    execFileSync('node', ['tools/build-web.mjs'], { env: { ...process.env, CF_PAGES_COMMIT_SHA: sha }, stdio: 'ignore' });
    assert.ok(existsSync('dist/version.json'));
    return JSON.parse(readFileSync('dist/version.json', 'utf8')).v;
  };
  assert.equal(build('0123456789abcdef'), '0123456789ab');
  assert.notEqual(build('fedcba9876543210'), '0123456789ab');
  assert.match(readFileSync('_headers', 'utf8'), /\/version\.json\n\s+Cache-Control: no-cache/);
});
