// Laboratorio Hélice y minijuego «Completa la hebra»: reglas, costos, resultados, historia y partidas viejas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, QUESTS, SPECIES, SCENES } from '../src/data.js';
import { newWorld, addCorral, validateWorld } from '../src/state.js';
import { claim } from '../src/quests.js';
import * as sim from '../src/sim.js';
import { PAIR, makeStrand, allowedErrors, grade } from '../src/genetica.js';

const lab = (species = 'carnotauro') => {
  const w = newWorld('T', 1, 1);
  w.coins = 5000;
  w.lab.built = true;
  addCorral(w, 'jurasico');
  w.unlocked.push(species);
  return w;
};

test('la hebra siempre se puede completar con las parejas fijas', () => {
  for (const n of [6, 8]) {
    const top = makeStrand(n, Math.random);
    assert.equal(top.length, n);
    assert.ok(top.every((b) => PAIR[PAIR[b]] === b), 'cada base tiene una pareja que a su vez vuelve a ella');
  }
  assert.deepEqual(makeStrand(4, () => 0), ['A', 'A', 'A', 'A']);
});

test('errores permitidos y nota: perfecta, buena, inestable, fallida', () => {
  assert.equal(allowedErrors(6), 2);
  assert.equal(allowedErrors(8, 2), 4);
  assert.deepEqual([0, 1, 2, 3, 4].map((e) => grade(e, 2)), ['perfecta', 'buena', 'buena', 'inestable', 'fallida']);
});

test('replicar: cada resultado cobra y entrega lo que dice el guion', () => {
  const costo = SPECIES.carnotauro.price;
  let w = lab();
  const buena = sim.replicate(w, 'carnotauro', 1);
  assert.equal(buena.result, 'buena');
  assert.equal(w.coins, 5000 - costo);
  assert.equal(buena.animal.stage, 'baby');
  assert.equal(w.stats.bought.carnotauro, 1, 'cuenta como réplica para la misión');
  w = lab();
  const perfecta = sim.replicate(w, 'carnotauro', 0);
  assert.equal(perfecta.result, 'perfecta');
  assert.equal(w.coins, 5000 - costo + Math.round(costo * BALANCE.labRefundPerfect));
  w = lab();
  const inestable = sim.replicate(w, 'carnotauro', 3);
  assert.equal(inestable.result, 'inestable');
  assert.ok(!inestable.animal);
  assert.equal(w.coins, 5000 - costo + Math.round(costo * BALANCE.labRefundUnstable));
  w = lab();
  const fallida = sim.replicate(w, 'carnotauro', 9);
  assert.equal(fallida.result, 'fallida');
  assert.equal(w.coins, 5000 - costo);
  assert.equal(w.animals.filter((a) => a.species === 'carnotauro').length, 0);
});

test('replicar exige laboratorio, muestra, corral, espacio y monedas', () => {
  const w = lab();
  w.lab.built = false;
  assert.equal(sim.canReplicate(w, 'carnotauro').ok, false);
  w.lab.built = true;
  assert.equal(sim.canReplicate(w, 'triceratops').ok, false, 'sin muestra');
  w.coins = 10;
  assert.match(sim.canReplicate(w, 'carnotauro').msg, /monedas/);
  const sinCorral = lab();
  sinCorral.corrales = sinCorral.corrales.filter((c) => c.tipo !== 'jurasico');
  assert.match(sim.canReplicate(sinCorral, 'carnotauro').msg, /Jurásico/);
  const antes = w.coins;
  assert.equal(sim.replicate(w, 'carnotauro', 0).ok, false);
  assert.equal(w.coins, antes);
});

test('el equipo del laboratorio baja el costo y perdona un error más por nivel', () => {
  const w = lab();
  const base = sim.labCost(w, 'carnotauro');
  w.coins = 99_999;
  const up = sim.upgradeLab(w);
  assert.ok(up.ok);
  assert.equal(w.lab.level, 1);
  assert.equal(sim.labCost(w, 'carnotauro'), Math.round(base * 0.9));
  assert.equal(sim.labAllowed(w, 'carnotauro'), 3);
  while (sim.labInfo(w).upgradeCost != null) assert.ok(sim.upgradeLab(w).ok);
  assert.equal(sim.upgradeLab(w).ok, false);
});

test('el viaje: siete misiones nuevas del capítulo 4, el Laboratorio y las muestras llegan por la historia', () => {
  const ids = ['c4-grieta', 'c4-fondos', 'c4-estabilizador', 'c4-viaje', 'c4-cierre', 'c4-laboratorio', 'c4-primera-replica'];
  const i = QUESTS.findIndex((q) => q.id === 'c4-spino');
  assert.deepEqual(QUESTS.slice(i + 1, i + 8).map((q) => q.id), ids);
  assert.ok(QUESTS.slice(i + 1, i + 8).every((q) => q.ch === 4));
  const viaje = QUESTS.find((q) => q.id === 'c4-viaje');
  assert.deepEqual(viaje.reward.unlock.sort(), ['estegosaurio', 'plesiosaurio', 'triceratops']);
  assert.ok(QUESTS.find((q) => q.id === 'c4-laboratorio').reward.lab);
  assert.ok(!QUESTS.find((q) => q.id === 'c6-camino').reward.unlock, 'en el capítulo 6 solo llega el regalo');
  assert.deepEqual(QUESTS.find((q) => q.id === 'c7-cielo').reward.unlock, ['pterodactilo']);
  for (const id of ids) {
    assert.ok(SCENES.some((s) => s.when.endsWith(`:${id}`)), `${id} tiene escena`);
  }
  const w = newWorld('T', 1, 1);
  for (const q of QUESTS.slice(0, QUESTS.findIndex((x) => x.id === 'c4-laboratorio'))) w.quests.claimed[q.id] = true;
  w.stats.sold = 99;
  assert.equal(w.lab.built, false);
  assert.ok(claim(w).ok);
  assert.equal(w.lab.built, true);
});

test('una partida de antes de la grieta que ya pasó el capítulo 4 recibe las misiones hechas y el Laboratorio abierto', () => {
  const w = newWorld('T', 1, 1);
  for (const q of QUESTS) { if (q.id === 'c5-invitacion') break; if (!q.id.startsWith('c4-g') && !['c4-fondos', 'c4-estabilizador', 'c4-viaje', 'c4-cierre', 'c4-laboratorio', 'c4-primera-replica'].includes(q.id)) w.quests.claimed[q.id] = true; }
  w.quests.claimed['c5-invitacion'] = true;
  const raw = JSON.parse(JSON.stringify(w));
  delete raw.lab;
  const v = validateWorld(raw, 0);
  assert.equal(v.lab.built, true);
  assert.ok(['c4-grieta', 'c4-primera-replica'].every((id) => v.quests.claimed[id]));
  assert.ok(v.unlocked.includes('triceratops') && v.unlocked.includes('plesiosaurio'));
  // una que aún no pasó el capítulo 4 las verá en su momento
  const temprano = newWorld('T', 1, 1);
  for (const q of QUESTS) { if (q.id === 'c4-grieta') break; temprano.quests.claimed[q.id] = true; }
  const t = JSON.parse(JSON.stringify(temprano));
  delete t.lab;
  const vt = validateWorld(t, 0);
  assert.equal(vt.lab.built, false);
  assert.ok(!vt.quests.claimed['c4-grieta']);
  assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(newWorld('T', 1, 1))), 0).lab, { built: false, level: 0 });
});
