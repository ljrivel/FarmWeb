import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addCorral } from '../src/state.js';
import * as sim from '../src/sim.js';
import { claim } from '../src/quests.js';
import { QUESTS, BALANCE } from '../src/data.js';

const frac = (n, total) => n / total;

test('comprar 2000 veces nunca da un color poco común ni raro', () => {
  const w = newWorld('t', 1700000000000, 11);
  w.coins = 1e12;
  for (let i = 0; i < 2000; i++) {
    const r = sim.buyAnimal(w, i % 2 ? 'gato' : 'gallina');
    assert.ok(r.ok, r.msg);
    assert.ok(r.animal.variant <= 1, `color ${r.animal.variant} en la compra ${i}`);
    w.animals.pop(); // se quita para que siempre haya espacio
  }
});

test('pickBabyVariant con padres 0 y 1, 40 000 veces: hereda 85 %, poco 10,5 %, raro 4,5 %', () => {
  const w = newWorld('t', 1700000000000, 5);
  const N = 40000;
  const n = { comun: 0, poco: 0, raro: 0 };
  for (let i = 0; i < N; i++) {
    const v = sim.pickBabyVariant(w, { variant: 0 }, { variant: 1 });
    assert.ok(Number.isInteger(v) && v >= 0 && v <= 3);
    n[v <= 1 ? 'comun' : v === 2 ? 'poco' : 'raro']++;
  }
  assert.ok(Math.abs(frac(n.comun, N) - 0.85) < 0.01, `comunes ${frac(n.comun, N)}`);
  assert.ok(Math.abs(frac(n.poco, N) - 0.105) < 0.008, `poco comunes ${frac(n.poco, N)}`);
  assert.ok(Math.abs(frac(n.raro, N) - 0.045) < 0.006, `raros ${frac(n.raro, N)}`);
});

test('dos padres raros mantienen su línea: más del 85 % sale raro', () => {
  const w = newWorld('t', 1700000000000, 9);
  let raros = 0;
  for (let i = 0; i < 2000; i++) if (sim.pickBabyVariant(w, { variant: 3 }, { variant: 3 }) === 3) raros++;
  assert.ok(raros / 2000 > 0.85, `raros ${raros / 2000}`);
  assert.ok(BALANCE.mutationChance < 0.5);
});

test('el regalo de historia nunca da un color poco común ni raro (200 mundos)', () => {
  const quest = QUESTS.find((q) => q.reward?.gift === 'spinosaurus');
  assert.ok(quest, 'existe la misión con regalo de spinosaurus');
  for (let seed = 1; seed <= 200; seed++) {
    const w = newWorld('t', 1700000000000, seed);
    w.coins = 1e9;
    for (const q of QUESTS) {
      if (q.id === quest.id) break;
      w.quests.claimed[q.id] = true;
      for (const s of q.reward?.unlock || []) if (!w.unlocked.includes(s)) w.unlocked.push(s);
      if (q.reward?.corral) addCorral(w, q.reward.corral);
    }
    assert.ok(sim.buildCorral(w, 'estanque').ok || w.corrales.some((c) => c.tipo === 'estanque'));
    w.stats.sold = 99;
    const r = claim(w);
    assert.ok(r.ok, r.msg);
    assert.ok(r.animal.variant <= 1, `color ${r.animal.variant} con semilla ${seed}`);
  }
});
