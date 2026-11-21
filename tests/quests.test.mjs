import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addAnimal, addCorral, getCorral } from '../src/state.js';
import * as sim from '../src/sim.js';
import { activeQuest, progress, claim } from '../src/quests.js';
import { QUESTS, SPECIES, FOODS, PRODUCTS, CORRAL_TYPES, CHARACTERS, CHAPTERS } from '../src/data.js';

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
    if (q.reward?.corral) assert.ok(CORRAL_TYPES[q.reward.corral], q.id);
    if (g.type === 'corral') assert.ok(CORRAL_TYPES[g.tipo], q.id);
    if (q.reward?.gift) {
      const home = q.reward.corral || Object.keys(CORRAL_TYPES).find((t) => CORRAL_TYPES[t].species.includes(q.reward.gift));
      assert.ok(CORRAL_TYPES[home].species.includes(q.reward.gift), `${q.id}: el regalo cabe en su corral`);
    }
  }
});

test('la meta de corral se cumple al construirlo', () => {
  const w = fresh();
  w.coins = 1000;
  const q = QUESTS.find((x) => x.id === 'c2-estanque');
  assert.deepEqual(progress(w, q), { current: 0, target: 1, done: false });
  sim.buildCorral(w, 'estanque');
  assert.deepEqual(progress(w, q), { current: 1, target: 1, done: true });
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

  // misión con regalo: abre el Jurásico y entrega el carnotauro bebé ahí
  const g = fresh();
  const upTo = QUESTS.findIndex((q) => q.id === 'c3-tormenta');
  g.quests.claimed = Object.fromEntries(QUESTS.slice(0, upTo).map((q) => [q.id, true]));
  while (g.animals.length < 6) addAnimal(g, 'gato', 0, 'baby');
  assert.equal(activeQuest(g).id, 'c3-tormenta');
  assert.equal(getCorral(g, 'jurasico'), undefined);
  const rr = claim(g);
  assert.ok(rr.ok, rr.msg);
  assert.ok(getCorral(g, 'jurasico'), 'la misión construye el Jurásico');
  assert.equal(rr.animal.species, 'carnotauro');
  assert.equal(rr.animal.stage, 'baby');
  assert.equal(rr.animal.corral, 'jurasico');
  assert.ok(g.unlocked.includes('carnotauro'));
});

test('un regalo sin espacio no se reclama y la misión sigue pendiente', () => {
  const g = fresh();
  const upTo = QUESTS.findIndex((q) => q.id === 'c3-tormenta');
  g.quests.claimed = Object.fromEntries(QUESTS.slice(0, upTo).map((q) => [q.id, true]));
  addCorral(g, 'jurasico');
  while (sim.hasSpace(g, 'jurasico')) addAnimal(g, 'carnotauro', 0, 'baby');
  while (g.animals.length < 6) addAnimal(g, 'gato', 0, 'baby');
  const r = claim(g);
  assert.equal(r.ok, false);
  assert.match(r.msg, /espacio/);
  assert.equal(g.quests.claimed['c3-tormenta'], undefined);
});

test('un regalo cuyo corral no existe y la misión no abre se rechaza', () => {
  const g = fresh();
  const spino = QUESTS.findIndex((q) => q.id === 'c4-expedicion');
  g.quests.claimed = Object.fromEntries(QUESTS.slice(0, spino).map((q) => [q.id, true]));
  g.stats.sold = 15;
  assert.equal(activeQuest(g).id, 'c4-expedicion');
  const r = claim(g);
  assert.equal(r.ok, false);
  assert.match(r.msg, /Estanque/);
  addCorral(g, 'estanque');
  assert.ok(claim(g).ok);
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

test('historia: personajes válidos, capítulo 5 al final y meta de corazones', () => {
  for (const q of QUESTS) assert.ok(CHARACTERS[q.who], `${q.id}: personaje ${q.who}`);
  for (const q of QUESTS) assert.ok(CHAPTERS[q.ch], `${q.id}: capítulo`);
  const chs = QUESTS.map((q) => q.ch);
  assert.deepEqual(chs, [...chs].sort((a, b) => a - b), 'capítulos en orden');
  // los ids de la v1 siguen en el mismo orden (los guardados dependen de ellos)
  const v1 = ['c1-carta', 'c1-huevos', 'c1-vender', 'c1-gato', 'c1-cria', 'c1-cuaderno', 'c2-mapache', 'c2-trufa', 'c2-estanque', 'c2-burbuja', 'c3-tormenta', 'c3-carnotauro', 'c4-pista', 'c4-expedicion', 'c4-spino'];
  assert.deepEqual(QUESTS.slice(0, v1.length).map((q) => q.id), v1);
  const w = fresh();
  const q = QUESTS.find((x) => x.goal.type === 'hearts');
  assert.equal(progress(w, q).done, false);
  w.animals[1].hearts = q.goal.n;
  assert.equal(progress(w, q).done, true);
});
