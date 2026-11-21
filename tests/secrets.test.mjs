// Easter eggs (etapa c).
import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addAnimal, addCorral, validateWorld, exportWorldText } from '../src/state.js';
import * as sim from '../src/sim.js';

const fresh = () => newWorld('T', 1_700_000_000_000, 9);

test('discover solo cuenta la primera vez y no inventa secretos', () => {
  const w = fresh();
  assert.equal(sim.discover(w, 'cosi'), true);
  assert.equal(sim.discover(w, 'cosi'), false);
  assert.equal(sim.discover(w, 'inventado'), false);
  assert.deepEqual(w.secrets, { cosi: true });
});

test('nombres secretos', () => {
  const w = fresh();
  addCorral(w, 'estanque');
  const spino = addAnimal(w, 'spinosaurus', 0, 'baby');
  spino.name = ' NéSSie ';
  assert.deepEqual(sim.secretsByName(spino), ['nessie']);
  w.animals[0].name = 'Nessie';
  assert.deepEqual(sim.secretsByName(w.animals[0]), [], 'Nessie solo cuenta para un spinosaurus');
  w.animals[0].name = 'Cosí';
  assert.deepEqual(sim.secretsByName(w.animals[0]), ['cosi']);
});

test('secretos por estado: 5 corazones, brillante y los 4 colores', () => {
  const w = fresh();
  assert.deepEqual(sim.secretsByState(w), []);
  w.animals[0].hearts = 5;
  addAnimal(w, 'gato', 0, 'baby', { shiny: true });
  for (const v of [0, 1, 2, 3]) addAnimal(w, 'vaca', v, 'baby');
  assert.deepEqual(sim.secretsByState(w).sort(), ['amigo', 'arcoiris', 'brillo']);
  sim.discover(w, 'brillo');
  assert.ok(!sim.secretsByState(w).includes('brillo'), 'lo ya descubierto no se repite');
});

test('los secretos se guardan y se validan', () => {
  const w = fresh();
  sim.discover(w, 'buho');
  const raw = JSON.parse(exportWorldText(w)).world;
  assert.deepEqual(validateWorld(raw, 1).secrets, { buho: true });
  assert.deepEqual(validateWorld({ ...raw, secrets: { buho: 'si', falso: true } }, 1).secrets, {});
  delete raw.secrets;
  assert.deepEqual(validateWorld(raw, 1).secrets, {});
});
