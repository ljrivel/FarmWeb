// Fase 2B: corazones, enfermedades y veterinaria (reglas en Node).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newWorld, addAnimal, addCorral, validateWorld, importWorldText, exportWorldText } from '../src/state.js';
import * as sim from '../src/sim.js';
import { SPECIES, BALANCE, DISEASES, MIN, MAX_HEARTS, CORRAL_TYPES, MAX_CORRAL_LEVEL } from '../src/data.js';

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * MIN;
const fresh = (seed = 5) => newWorld('T', NOW, seed);
const run = (w, ms, opts, step = 30_000) => {
  const ev = [];
  for (let t = 0; t < ms; t += step) ev.push(...sim.tick(w, Math.min(step, ms - t), opts));
  return ev;
};
const LIVE = { live: true };

test('un animal nuevo empieza con 0 corazones y sano', () => {
  const a = fresh().animals[0];
  assert.equal(a.hearts, 0);
  assert.equal(a.sick, null);
  assert.equal(MAX_HEARTS, 5);
});

test('los corazones suben con cariño y quedan acotados entre 0 y 5', () => {
  const w = fresh();
  const a = w.animals[0];
  for (let d = 0; d < 30; d++) {
    w.lastTick = NOW + d * DAY;
    for (let i = 0; i < 20; i++) { a.petCd = 0; sim.pet(w, a.id); }
  }
  assert.equal(a.hearts, 5);
  assert.ok(a.love <= 100);
  // descuidado y con el juego abierto baja muy despacio, pero nunca de 0
  a.fed = 0; a.happy = 0;
  run(w, 3 * DAY, LIVE, 60_000);
  assert.ok(a.hearts >= 0 && a.hearts < 5, `bajó a ${a.hearts}`);
  run(w, 10 * DAY, LIVE, 60_000);
  assert.equal(a.hearts, 0);
  assert.ok(a.love >= 0);
});

test('hay un tope diario de cariño: muchos mimos el mismo día no regalan corazones', () => {
  const w = fresh();
  const a = w.animals[0];
  for (let i = 0; i < 200; i++) { a.petCd = 0; sim.pet(w, a.id); }
  assert.ok(a.hearts * 100 + a.love <= BALANCE.loveDailyCap, `ganó ${a.hearts * 100 + a.love}`);
  w.lastTick += DAY;
  a.petCd = 0;
  const before = a.hearts * 100 + a.love;
  sim.pet(w, a.id);
  assert.ok(a.hearts * 100 + a.love > before, 'al día siguiente vuelve a sumar');
});

test('la comida favorita da cariño; otra comida no', () => {
  const w = fresh();
  const a = w.animals[0];
  w.foods = { grano: 5, heno: 5 };
  a.fed = 10;
  sim.feed(w, a.id, 'heno');
  assert.equal(a.love, 0);
  a.fed = 10;
  sim.feed(w, a.id, 'grano');
  assert.equal(a.love, BALANCE.lovePerFav);
});

test('sin conexión nadie enferma ni pierde corazones, y el enfermo sigue igual', () => {
  const w = fresh();
  for (let i = 0; i < 6; i++) addAnimal(w, 'gallina', 0, 'adult');
  for (const a of w.animals) { a.hearts = 3; a.fed = 0; a.happy = 0; }
  const sick = w.animals[0];
  sim.makeSick(w, sick.id, 'resfriado');
  run(w, 8 * 60 * MIN); // sin { live } = puesta al día
  assert.equal(w.animals.filter((a) => a.sick).length, 1, 'solo el que ya estaba');
  assert.equal(sick.sick, 'resfriado');
  assert.ok(w.animals.every((a) => a.hearts === 3), 'nadie pierde corazones');
});

test('con el juego abierto y mucha hambre, termina enfermando (determinista con la semilla)', () => {
  const runOnce = () => {
    const w = fresh(11);
    for (const a of w.animals) a.cool = 1e12;
    for (const a of w.animals) a.fed = 0;
    run(w, 12 * 60 * MIN, LIVE);
    return w;
  };
  const w = runOnce();
  assert.ok(w.animals.some((a) => a.sick), 'alguno enfermó');
  assert.ok(w.animals.every((a) => a.sick === null || DISEASES[a.sick]));
  assert.deepEqual(w.animals.map((a) => a.sick), runOnce().animals.map((a) => a.sick), 'mismo resultado con la misma semilla');
});

test('enfermar no gasta el aleatorio de la cría (w.rng queda igual)', () => {
  const a = fresh(3), b = fresh(3);
  run(a, 60 * MIN, LIVE);
  run(b, 60 * MIN);
  assert.equal(a.rng, b.rng);
});

test('un animal enfermo no produce, no crece ni cría', () => {
  const w = fresh();
  const [g1, g2] = w.animals;
  const baby = addAnimal(w, 'gallina', 0, 'baby');
  for (const a of [g1, g2, baby]) { sim.makeSick(w, a.id, 'pulgas'); a.fed = 100; a.happy = 100; }
  for (let i = 0; i < 20; i++) { for (const a of w.animals) a.fed = 100; sim.tick(w, 30_000); }
  assert.equal(g1.ready, 0);
  assert.equal(g1.prod, 0);
  assert.equal(baby.stage, 'baby');
  assert.equal(baby.growth, 0);
  assert.equal(w.eggs.length, 0, 'no puso huevos');
});

test('curar en la veterinaria cuesta, descuenta monedas y deja sano', () => {
  const w = fresh();
  const a = w.animals[0];
  sim.makeSick(w, a.id, 'pancita');
  w.coins = 1;
  const pobre = sim.cure(w, a.id);
  assert.equal(pobre.ok, false);
  assert.equal(a.sick, 'pancita');
  assert.equal(w.coins, 1);
  w.coins = 100;
  const r = sim.cure(w, a.id);
  assert.equal(r.ok, true);
  assert.equal(w.coins, 100 - BALANCE.cureCost.pancita);
  assert.equal(a.sick, null);
  assert.equal(w.stats.cured, 1);
  assert.equal(sim.cure(w, a.id).ok, false, 'uno sano no se cura');
  for (const d of Object.keys(DISEASES)) assert.ok(BALANCE.cureCost[d] > 0, d);
  assert.equal(new Set(Object.values(BALANCE.cureCost)).size, Object.keys(DISEASES).length, 'costos distintos');
});

test('con cuidados en casa la enfermedad se cura sola (despacio)', () => {
  const w = fresh();
  const a = w.animals[0];
  sim.makeSick(w, a.id, 'tristeza');
  for (let i = 0; i < 10; i++) { a.fed = 100; a.happy = 100; sim.tick(w, 30_000, LIVE); }
  assert.equal(a.sick, 'tristeza', 'no en 5 minutos');
  let healed = false;
  for (let i = 0; i < 200 && a.sick; i++) {
    a.fed = 100; a.happy = 100;
    healed = sim.tick(w, 30_000, LIVE).some((e) => e.type === 'healed') || healed;
  }
  assert.equal(a.sick, null);
  assert.ok(healed, 'avisa que se curó');
});

test('los corazones aceleran algo la producción, hasta un máximo moderado', () => {
  const prodAfter = (hearts) => {
    const w = fresh();
    const a = w.animals[0];
    for (const x of w.animals) x.cool = 1e12;
    a.hearts = hearts; a.fed = 100; a.happy = 100;
    sim.tick(w, 10_000);
    return a.prod;
  };
  const base = prodAfter(0), max = prodAfter(5);
  assert.ok(max > base);
  assert.ok(max <= base * 1.25, `bonus moderado (${max / base})`);
});

test('mundos antiguos (v1 y 2A) abren limpios con los campos nuevos por defecto', () => {
  const v1 = importWorldText(readFileSync(new URL('./fixtures/mundo-v1.farmweb.json', import.meta.url), 'utf8'), NOW + 1);
  assert.ok(v1.animals.every((a) => a.hearts === 0 && a.love === 0 && a.sick === null && a.sickT === 0));
  assert.equal(v1.stats.cured, 0);
  const old = JSON.parse(exportWorldText(fresh()));
  for (const a of old.world.animals) { delete a.hearts; delete a.love; delete a.sick; delete a.sickT; delete a.loveDay; delete a.loveToday; }
  delete old.world.careRng;
  const w = validateWorld(old.world, NOW + 1);
  assert.ok(w.animals.every((a) => a.hearts === 0 && a.sick === null));
  assert.ok(Number.isInteger(w.careRng));
  const raro = validateWorld({ ...old.world, animals: [{ species: 'gato', hearts: 99, love: -5, sick: 'peste', sickT: 'x' }] }, NOW + 1);
  assert.deepEqual([raro.animals[0].hearts, raro.animals[0].love, raro.animals[0].sick, raro.animals[0].sickT], [5, 0, null, 0]);
  const ok = validateWorld({ ...old.world, animals: [{ species: 'gato', hearts: 2.7, sick: 'pulgas' }] }, NOW + 1);
  assert.deepEqual([ok.animals[0].hearts, ok.animals[0].sick], [2, 'pulgas']);
});

test('cada especie puede enfermar y curarse', () => {
  const w = fresh();
  for (const t of Object.keys(CORRAL_TYPES)) addCorral(w, t, MAX_CORRAL_LEVEL);
  for (const s of Object.keys(SPECIES)) {
    w.coins = 1000;
    const a = addAnimal(w, s, 0, 'adult');
    for (const d of Object.keys(DISEASES)) {
      sim.makeSick(w, a.id, d);
      assert.equal(a.sick, d);
      assert.equal(sim.cure(w, a.id).ok, true, `${s} ${d}`);
    }
  }
});
