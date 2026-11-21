// Recorre la historia entera: cada misión se puede cumplir y reclamar en orden, y entrega lo prometido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { QUESTS, SIDE_QUESTS, SPECIES, corralTypeOf } from '../src/data.js';
import { newWorld, addAnimal, addCorral, getCorral } from '../src/state.js';
import { claim, claimSide, activeSide, activeQuest, syncSide } from '../src/quests.js';
import { buyAnimal, tick } from '../src/sim.js';

function satisfy(w, g) {
  const st = w.stats;
  switch (g.type) {
    case 'fed': st.fed = Math.max(st.fed, g.n); break;
    case 'petted': st.petted = Math.max(st.petted, g.n); break;
    case 'sold': st.sold = Math.max(st.sold, g.n); break;
    case 'collect': st.collected[g.product] = Math.max(st.collected[g.product] || 0, g.n); break;
    case 'bought': st.bought[g.species] = Math.max(st.bought[g.species] || 0, g.n); break;
    case 'born': if (g.species) st.born[g.species] = Math.max(st.born[g.species] || 0, g.n); else st.bornTotal = Math.max(st.bornTotal, g.n); break;
    case 'cured': st.cured = Math.max(st.cured, g.n); break;
    case 'named': st.named = Math.max(st.named, g.n); break;
    case 'corral': addCorral(w, g.tipo); break;
    case 'hearts': w.animals[0].hearts = g.n; break;
    case 'owncount': while (w.animals.length < g.n) addAnimal(w, 'gallina', 0, 'adult'); break;
    case 'own': {
      addCorral(w, corralTypeOf(g.species));
      let have = w.animals.filter((a) => a.species === g.species && (!g.stage || a.stage === g.stage)).length;
      while (have++ < g.n) addAnimal(w, g.species, 0, g.stage || 'adult');
      break;
    }
    default: throw new Error(`meta desconocida ${g.type}`);
  }
}

test('toda la historia se completa en orden y las misiones entregan lo prometido', () => {
  const w = newWorld('T', 1, 1);
  addAnimal(w, 'gallina', 0, 'adult');
  for (const q of QUESTS) {
    assert.equal(activeQuest(w).id, q.id);
    satisfy(w, q.goal);
    const r = claim(w);
    assert.ok(r.ok, `${q.id}: ${r.msg}`);
    for (const s of q.reward.unlock || []) assert.ok(w.unlocked.includes(s), `${q.id} desbloquea ${s}`);
    if (q.reward.corral) assert.ok(getCorral(w, q.reward.corral), `${q.id} abre ${q.reward.corral}`);
    if (q.reward.gift) assert.ok(r.animal && r.animal.species === q.reward.gift, `${q.id} regala ${q.reward.gift}`);
  }
  assert.equal(activeQuest(w), null);
  assert.ok(getCorral(w, 'valle'), 'el Valle se abre con la historia');
});

test('cada especie con precio nulo llega por historia o por una secundaria', () => {
  const porHistoria = new Set([...QUESTS, ...SIDE_QUESTS].flatMap((q) => [q.reward.gift, ...(q.reward.unlock || [])]).filter(Boolean));
  for (const [id, sp] of Object.entries(SPECIES)) {
    if (sp.price == null) assert.ok(porHistoria.has(id), `${id} no se puede conseguir nunca`);
  }
});

test('las secundarias se pueden cumplir una por una cuando aparecen', () => {
  const w = newWorld('T', 1, 1);
  addAnimal(w, 'gallina', 0, 'adult');
  for (const q of QUESTS) { satisfy(w, q.goal); assert.ok(claim(w).ok); }
  syncSide(w);
  let guard = 0;
  while (activeSide(w).length && guard++ < 60) {
    const x = activeSide(w)[0];
    // las metas de contador cuentan desde la línea base: se suman a lo que ya hay
    const base = w.quests.sideBase[x.id] || 0;
    const g = { ...x.goal };
    if (['fed', 'petted', 'sold', 'collect', 'bought', 'born', 'cured', 'named'].includes(g.type)) {
      const have = { fed: w.stats.fed, petted: w.stats.petted, sold: w.stats.sold, cured: w.stats.cured, named: w.stats.named, bought: w.stats.bought[g.species] || 0, born: g.species ? (w.stats.born[g.species] || 0) : w.stats.bornTotal, collect: w.stats.collected[g.product] || 0 }[g.type];
      g.n = Math.max(have, base) + g.n;
    }
    satisfy(w, g);
    const r = claimSide(w, x.id);
    assert.ok(r.ok, `${x.id}: ${r.msg}`);
    syncSide(w);
  }
  assert.equal(activeSide(w).length, 0, 'ninguna secundaria queda sin poder cumplirse');
});

const ESTACION = ['porg', 'gato_loth', 'tauntaun', 'bantha', 'purrgil', 'dewback', 'ewok', 'grogu', 'bb8'];

test('al terminar la historia las 9 criaturas de la Estación se compran y viven ahí', () => {
  const w = newWorld('T', 1, 1);
  addAnimal(w, 'gallina', 0, 'adult');
  for (const q of QUESTS) { satisfy(w, q.goal); assert.ok(claim(w).ok, q.id); }
  w.coins = 100_000;
  for (const s of ESTACION) {
    assert.ok(w.unlocked.includes(s), `${s} se conoce`);
    const r = buyAnimal(w, s);
    assert.ok(r.ok, `${s}: ${r.msg}`);
    assert.equal(r.animal.corral, 'estacion', s);
  }
});

test('las criaturas de la Estación crían (dos adultos felices ponen un huevo)', () => {
  for (const s of ESTACION) {
    const w = newWorld('T', 1, 1);
    addCorral(w, 'estacion');
    const a = addAnimal(w, s, 0, 'adult'), b = addAnimal(w, s, 0, 'adult');
    a.fed = b.fed = a.happy = b.happy = 100;
    tick(w, 1000);
    assert.equal(w.eggs.filter((e) => e.species === s).length, 1, `${s} no cría`);
  }
});
