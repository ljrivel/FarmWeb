import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addAnimal } from '../src/state.js';
import * as sim from '../src/sim.js';
import { activeQuest, progress, claim } from '../src/quests.js';
import { QUESTS, SPECIES, FOODS, PRODUCTS } from '../src/data.js';

const fresh = () => newWorld('T', 1_700_000_000_000, 9);

test('datos de misiones consistentes', () => {
  const ids = new Set();
  for (const q of QUESTS) {
    assert.ok(!ids.has(q.id), `id repetido ${q.id}`);
    ids.add(q.id);
    const g = q.goal;
    if (g.species) assert.ok(SPECIES[g.species], q.id);
    if (g.product) assert.ok(PRODUCTS[g.product], q.id);
    for (const f of Object.keys(q.reward?.foods || {})) assert.ok(FOODS[f], q.id);
    for (const s of q.reward?.unlock || []) assert.ok(SPECIES[s], q.id);
    if (q.reward?.gift) assert.ok(SPECIES[q.reward.gift], q.id);
  }
});

test('la primera misión es alimentar y se reclama al terminar', () => {
  const w = fresh();
  assert.equal(activeQuest(w).id, 'c1-carta');
  assert.equal(claim(w).ok, false, 'aún no');
  const a = w.animals[0];
  for (let i = 0; i < 3; i++) { a.fed = 0; sim.feed(w, a.id, 'grano'); }
  assert.deepEqual(progress(w, activeQuest(w)), { current: 3, target: 3, done: true });
  const coins = w.coins;
  const r = claim(w);
  assert.ok(r.ok);
  assert.equal(w.coins, coins + 20);
  assert.equal(activeQuest(w).id, 'c1-huevos');
});

test('desbloqueos y regalos de misión', () => {
  const w = fresh();
  for (const q of QUESTS.slice(0, 5)) w.quests.claimed[q.id] = true;
  w.stats.petted = 5;
  const r = claim(w);
  assert.ok(r.ok);
  assert.ok(w.unlocked.includes('mapache') && w.unlocked.includes('chanchito'));

  // misión con regalo: necesita espacio
  const g = fresh();
  const upTo = QUESTS.findIndex((q) => q.id === 'c3-tormenta');
  g.quests.claimed = Object.fromEntries(QUESTS.slice(0, upTo).map((q) => [q.id, true]));
  g.capacity = 6;
  while (g.animals.length < 6) addAnimal(g, 'gato', 0, 'baby');
  assert.equal(activeQuest(g).id, 'c3-tormenta');
  assert.equal(claim(g).ok, false, 'sin espacio para el regalo');
  g.capacity = 8;
  const rr = claim(g);
  assert.ok(rr.ok);
  assert.equal(rr.animal.species, 'carnotauro');
  assert.equal(rr.animal.stage, 'baby');
  assert.ok(g.unlocked.includes('carnotauro'));
});

test('al terminar todas las misiones no hay activa', () => {
  const w = fresh();
  for (const q of QUESTS) w.quests.claimed[q.id] = true;
  assert.equal(activeQuest(w), null);
  assert.equal(claim(w).ok, false);
});

test('el progreso nunca supera la meta', () => {
  const w = fresh();
  w.stats.fed = 500;
  const p = progress(w, QUESTS[0]);
  assert.equal(p.current, 3);
});
