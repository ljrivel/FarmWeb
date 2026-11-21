import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newWorld, addAnimal } from '../src/state.js';
import * as sim from '../src/sim.js';

const fresh = () => newWorld('T', 1_700_000_000_000, 5);

test('isCurrent: solo es verdadero para el mismo objeto animal del mundo actual', () => {
  const w = fresh();
  const a = w.animals[0];
  assert.equal(sim.isCurrent(w, a), true);
  const otro = fresh(); // mismo id, otro mundo cargado
  assert.equal(sim.isCurrent(otro, a), false);
  assert.equal(sim.isCurrent(w, null), false);
});

test('hatchToast: una cría con nombre y rareza; varias en un solo aviso', () => {
  const w = fresh();
  const b1 = addAnimal(w, 'gallina', 0, 'baby');
  assert.match(sim.hatchToast([b1]), new RegExp(`Nació ${b1.name}`));
  const b2 = addAnimal(w, 'gallina', 3, 'baby');
  assert.match(sim.hatchToast([b2]), /rara/);
  const b3 = addAnimal(w, 'gallina', 0, 'baby', { shiny: true });
  assert.equal(sim.hatchToast([b1, b2, b3]), '¡Nacieron 3 crías! Toca para ver la primera.');
});

test('el atlas lleva una versión para no mezclar caché vieja', () => {
  const json = JSON.parse(readFileSync(new URL('../assets/sprites/animals.json', import.meta.url), 'utf8'));
  assert.match(json.version, /^[0-9a-f]{8,}$/);
});
