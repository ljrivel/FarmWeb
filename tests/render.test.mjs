import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addAnimal, addCorral } from '../src/state.js';
import { MAP_SPOTS } from '../src/data.js';
import { hitMap, hitTest } from '../src/render.js';

const fresh = () => newWorld('T', 1_700_000_000_000, 5);

test('hitMap devuelve el lugar bajo el dedo (área de 56x56) o null', () => {
  const w = fresh();
  const { x, y } = MAP_SPOTS.bosque;
  assert.equal(hitMap(w, x, y), 'bosque');
  assert.equal(hitMap(w, x + 27, y - 27), 'bosque');
  assert.equal(hitMap(w, x + 29, y), null);
  assert.equal(hitMap(w, 3, 3), null);
  for (const t of Object.keys(MAP_SPOTS)) assert.equal(hitMap(w, MAP_SPOTS[t].x, MAP_SPOTS[t].y), t);
});

test('hitTest solo ve a los animales del corral de la escena', () => {
  const w = fresh();
  addCorral(w, 'bosque');
  const gallina = w.animals[0];
  const mapache = addAnimal(w, 'mapache', 0, 'adult');
  for (const a of [gallina, mapache]) { a.x = 100; a.y = 120; a.ready = 0; }
  assert.equal(hitTest(w, 100, 110, 'bosque').animal, mapache);
  assert.equal(hitTest(w, 100, 110, 'pradera').animal, gallina);
  mapache.ready = 1;
  const burbuja = hitTest(w, 100, 120 - 45, 'bosque');
  assert.deepEqual([burbuja.animal, burbuja.bubble], [mapache, true]);
  assert.equal(hitTest(w, 100, 120 - 45, 'pradera'), null, 'la burbuja del Bosque no se toca desde la Pradera');
});
