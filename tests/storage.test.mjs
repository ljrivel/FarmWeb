import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localStore } from '../src/storage.js';

const FIXTURE = readFileSync(new URL('./fixtures/mundo-v1.farmweb.json', import.meta.url), 'utf8');
const KEY = 'farmweb:world:v1';
const BACKUP = `${KEY}:respaldo-v1`;

function fakeStorage({ failBackup = false } = {}) {
  const m = new Map();
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => {
      if (failBackup && k === BACKUP) throw new Error('sin espacio');
      m.set(k, String(v));
    },
  };
  return m;
}

test('un guardado v1 se migra al cargar y el original queda en el respaldo', async () => {
  const m = fakeStorage();
  m.set(KEY, FIXTURE);
  const w = await localStore.load();
  assert.equal(w.v, 2);
  assert.equal(m.get(BACKUP), FIXTURE, 'el respaldo es el texto original exacto');
  assert.equal(await localStore.save(w), true);
  assert.equal(JSON.parse(m.get(KEY)).version, 2);
  assert.equal(m.get(BACKUP), FIXTURE, 'guardar no toca el respaldo');
});

test('si el respaldo falla por falta de espacio, el mundo igual carga', async () => {
  const m = fakeStorage({ failBackup: true });
  m.set(KEY, FIXTURE);
  const w = await localStore.load();
  assert.equal(w.v, 2);
  assert.equal(w.animals.length, 8);
});

test('un guardado ya en v2 no crea respaldo', async () => {
  const m = fakeStorage();
  m.set(KEY, FIXTURE);
  const w = await localStore.load();
  m.delete(BACKUP);
  await localStore.save(w);
  await localStore.load();
  assert.equal(m.has(BACKUP), false);
});
