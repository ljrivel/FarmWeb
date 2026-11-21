// Misiones secundarias en paralelo (etapa b).
import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, validateWorld, exportWorldText } from '../src/state.js';
import * as sim from '../src/sim.js';
import { syncSide, activeSide, claimSide, sideProgress, activeQuest } from '../src/quests.js';
import { SIDE_QUESTS, QUESTS, SPECIES, FOODS, PRODUCTS, CHARACTERS } from '../src/data.js';

const fresh = () => newWorld('T', 1_700_000_000_000, 9);

test('datos de secundarias consistentes', () => {
  const ids = new Set(QUESTS.map((q) => q.id));
  assert.ok(SIDE_QUESTS.length >= 12);
  for (const q of SIDE_QUESTS) {
    assert.ok(!ids.has(q.id), `id repetido ${q.id}`);
    ids.add(q.id);
    assert.ok(CHARACTERS[q.who], q.id);
    assert.ok(q.minCh >= 1, q.id);
    if (q.needs) assert.ok(SPECIES[q.needs], q.id);
    if (q.goal.product) assert.ok(PRODUCTS[q.goal.product], q.id);
    for (const f of Object.keys(q.reward.foods || {})) assert.ok(FOODS[f], q.id);
    for (const s of q.reward.unlock || []) assert.ok(SPECIES[s], q.id);
  }
});

test('varias secundarias activas a la vez y cuentan desde que aparecen', () => {
  const w = fresh();
  w.stats.petted = 50; // lo hecho antes de que aparezca no cuenta
  syncSide(w);
  const act = activeSide(w);
  assert.ok(act.length >= 3, `activas: ${act.length}`);
  const mimos = SIDE_QUESTS.find((q) => q.goal.type === 'petted' && q.minCh === 1);
  assert.equal(sideProgress(w, mimos).current, 0);
  w.stats.petted += mimos.goal.n;
  assert.equal(sideProgress(w, mimos).done, true);
  assert.equal(activeQuest(w).id, 'c1-carta', 'la historia no se mueve');
});

test('reclamar da el premio una sola vez y pasa al historial', () => {
  const w = fresh();
  syncSide(w);
  const q = activeSide(w).find((x) => x.goal.type === 'petted');
  assert.equal(claimSide(w, q.id).ok, false, 'aún no');
  w.stats.petted += q.goal.n;
  const coins = w.coins;
  const r = claimSide(w, q.id);
  assert.ok(r.ok, r.msg);
  assert.equal(w.coins, coins + (q.reward.coins || 0));
  assert.equal(claimSide(w, q.id).ok, false, 'no se cobra dos veces');
  assert.ok(!activeSide(w).some((x) => x.id === q.id));
  assert.equal(w.quests.side[q.id], true);
});

test('las de capítulos posteriores o de especies no conocidas no aparecen', () => {
  const w = fresh();
  syncSide(w);
  for (const q of activeSide(w)) {
    assert.equal(q.minCh, 1);
    assert.ok(!q.needs || w.unlocked.includes(q.needs));
  }
  for (const q of QUESTS) w.quests.claimed[q.id] = true; // historia terminada
  w.unlocked = Object.keys(SPECIES);
  syncSide(w);
  assert.equal(activeSide(w).length, SIDE_QUESTS.length, 'con la historia completa están todas');
});

test('el estado de las secundarias se guarda y se valida al cargar', () => {
  const w = fresh();
  syncSide(w);
  const [q, q2] = activeSide(w);
  w.stats.petted = 7; w.quests.sideBase[q2.id] = 7;
  w.quests.side[q.id] = true;
  const back = validateWorld(JSON.parse(exportWorldText(w)).world, 1_700_000_000_001);
  assert.equal(back.quests.side[q.id], true);
  assert.equal(back.quests.sideBase[q2.id], 7, 'la línea base se conserva');
  const raro = validateWorld({ ...JSON.parse(exportWorldText(w)).world, quests: { claimed: {}, side: { inventada: true, [q.id]: 'si' }, sideBase: { inventada: 4, [q.id]: -3 } } }, 1);
  assert.deepEqual(raro.quests.side, {});
  assert.equal(raro.quests.sideBase.inventada, undefined);
  assert.equal(raro.quests.sideBase[q.id], 0);
  const viejo = validateWorld({ ...JSON.parse(exportWorldText(w)).world, quests: { claimed: {} } }, 1);
  assert.deepEqual([viejo.quests.side, viejo.quests.sideBase], [{}, {}], 'mundos anteriores abren limpios');
});

test('renombrar cuenta para la meta named', () => {
  const w = fresh();
  sim.renameAnimal(w, w.animals[0].id, 'Kiki');
  assert.equal(w.stats.named, 1);
});
