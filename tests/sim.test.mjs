import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addAnimal } from '../src/state.js';
import * as sim from '../src/sim.js';
import { SPECIES, MIN, BALANCE, CORRAL_COSTS, POND_COST } from '../src/data.js';

const NOW = 1_700_000_000_000;
const fresh = (seed = 5) => newWorld('T', NOW, seed);

function run(w, ms, step = 5000) {
  const events = [];
  for (let t = 0; t < ms; t += step) events.push(...sim.tick(w, Math.min(step, ms - t)));
  return events;
}

test('el hambre baja con el tiempo y nunca pasa de 0', () => {
  const w = fresh();
  const a = w.animals[0];
  run(w, 3 * 60 * MIN);
  assert.equal(a.fed, 0);
});

test('un bebé crece solo si come, y se vuelve adulto', () => {
  const w = fresh();
  const b = addAnimal(w, 'gallina', 0, 'baby');
  b.fed = 0;
  run(w, SPECIES.gallina.grow + MIN);
  assert.equal(b.stage, 'baby', 'sin comer no crece');
  b.fed = 100;
  run(w, SPECIES.gallina.grow + MIN);
  assert.equal(b.stage, 'adult');
});

test('un adulto contento produce y la burbuja se acumula hasta el máximo', () => {
  const w = fresh();
  const a = w.animals[0];
  a.fed = 100; a.happy = 100;
  a.cool = 1e12; // sin cría en esta prueba
  w.animals[1].cool = 1e12;
  for (let i = 0; i < 40; i++) { a.fed = 100; sim.tick(w, 30_000); }
  assert.equal(a.ready, BALANCE.maxReady);
});

test('un animal con hambre no produce', () => {
  const w = fresh();
  const a = w.animals[0];
  a.fed = 0; a.happy = 100;
  run(w, 10 * MIN);
  assert.equal(a.ready, 0);
});

test('recolectar suma el producto; el brillante da doble', () => {
  const w = fresh();
  const a = w.animals[0];
  a.ready = 2;
  assert.equal(sim.collect(w, a.id).ok, true);
  assert.equal(w.products.huevo, 1);
  a.shiny = true;
  sim.collect(w, a.id);
  assert.equal(w.products.huevo, 3);
  assert.equal(sim.collect(w, a.id).ok, false);
  assert.equal(w.stats.collected.huevo, 3);
});

test('alimentar: favorita rellena más, gasta comida y cuenta estadística', () => {
  const w = fresh();
  const a = w.animals[0];
  a.fed = 10; w.foods = { grano: 2, heno: 1 };
  const r = sim.feed(w, a.id, 'grano');
  assert.ok(r.ok && r.fav);
  assert.equal(a.fed, 10 + BALANCE.favFeed);
  assert.equal(w.foods.grano, 1);
  a.fed = 10;
  sim.feed(w, a.id, 'heno');
  assert.equal(a.fed, 10 + BALANCE.otherFeed);
  assert.equal(w.foods.heno, undefined);
  assert.equal(sim.feed(w, a.id, 'heno').ok, false, 'sin existencias');
  a.fed = 99;
  assert.equal(sim.feed(w, a.id, 'grano').ok, false, 'llenito');
  assert.equal(w.stats.fed, 2);
});

test('acariciar tiene enfriamiento', () => {
  const w = fresh();
  const a = w.animals[0];
  a.happy = 50;
  assert.ok(sim.pet(w, a.id).ok);
  assert.equal(a.happy, 50 + BALANCE.petHappy);
  assert.equal(sim.pet(w, a.id).ok, false);
  run(w, BALANCE.petCooldown + 1000, 1000);
  assert.ok(sim.pet(w, a.id).ok);
});

test('vender convierte productos en monedas', () => {
  const w = fresh();
  w.products = { huevo: 5, leche: 1 };
  const r = sim.sell(w, 'huevo');
  assert.equal(r.gain, 40);
  assert.equal(w.coins, 140);
  assert.equal(w.products.huevo, undefined);
  assert.equal(w.stats.sold, 5);
  assert.equal(sim.sell(w, 'huevo').ok, false);
});

test('comprar animal: monedas, desbloqueo, espacio y estanque', () => {
  const w = fresh();
  w.coins = 1000;
  assert.equal(sim.buyAnimal(w, 'mapache').ok, false, 'bloqueado');
  assert.equal(sim.buyAnimal(w, 'carnotauro').ok, false, 'no se vende');
  w.unlocked.push('ajolote');
  assert.equal(sim.buyAnimal(w, 'ajolote').ok, false, 'sin estanque');
  const r = sim.buyAnimal(w, 'gato');
  assert.ok(r.ok);
  assert.equal(w.coins, 1000 - SPECIES.gato.price);
  assert.equal(r.animal.stage, 'baby');
  assert.equal(w.stats.bought.gato, 1);
  w.coins = 5;
  assert.equal(sim.buyAnimal(w, 'vaca').ok, false, 'sin monedas');
  w.coins = 1e6;
  while (sim.hasSpace(w)) sim.buyAnimal(w, 'gato');
  assert.equal(w.animals.length, 8);
  assert.equal(sim.buyAnimal(w, 'gato').ok, false, 'corral lleno');
});

test('mejoras: corral y estanque', () => {
  const w = fresh();
  w.coins = 5000;
  assert.ok(sim.buyUpgrade(w, 'corral').ok);
  assert.equal(w.capacity, 12);
  assert.equal(w.coins, 5000 - CORRAL_COSTS[0]);
  assert.ok(sim.buyUpgrade(w, 'estanque').ok);
  assert.equal(w.coins, 5000 - CORRAL_COSTS[0] - POND_COST);
  assert.equal(sim.buyUpgrade(w, 'estanque').ok, false);
  for (let i = 0; i < 6; i++) sim.buyUpgrade(w, 'corral');
  assert.equal(w.capacity, 24);
  assert.equal(sim.buyUpgrade(w, 'corral').ok, false);
});

test('cría: dos adultas felices ponen un huevo y nace una cría', () => {
  const w = fresh(11);
  for (const a of w.animals) { a.fed = 100; a.happy = 100; }
  const ev = sim.tick(w, 1000);
  assert.ok(ev.some((e) => e.type === 'egg'));
  assert.equal(w.eggs.length, 1);
  assert.equal(w.stats.breedStarted, 1);
  const hatched = [];
  for (let t = 0; t < SPECIES.gallina.breed + 10_000; t += 5000) {
    for (const a of w.animals) a.fed = 100;
    hatched.push(...sim.tick(w, 5000).filter((e) => e.type === 'hatch'));
  }
  assert.equal(hatched.length, 1);
  assert.equal(hatched[0].animal.stage, 'baby');
  assert.equal(w.animals.length, 3);
  assert.equal(w.stats.born.gallina, 1);
});

test('no se cría sin espacio, ni con hambre, ni con una sola', () => {
  const w = fresh(3);
  for (const a of w.animals) { a.fed = 100; a.happy = 100; }
  w.capacity = 2;
  sim.tick(w, 1000);
  assert.equal(w.eggs.length, 0, 'sin espacio');
  w.capacity = 8;
  for (const a of w.animals) a.fed = 10;
  sim.tick(w, 1000);
  assert.equal(w.eggs.length, 0, 'con hambre');
  const solo = fresh(3);
  solo.animals.pop();
  solo.animals[0].fed = 100; solo.animals[0].happy = 100;
  sim.tick(solo, 1000);
  assert.equal(solo.eggs.length, 0, 'una sola');
});

test('la cría hereda color de un padre (sin mutar, 2 variantes)', () => {
  let seen = new Set();
  for (let seed = 1; seed < 60; seed++) {
    const w = fresh(seed);
    for (const a of w.animals) { a.fed = 100; a.happy = 100; }
    sim.tick(w, 1000);
    seen.add(w.eggs[0].variant);
  }
  assert.deepEqual([...seen].sort(), [0, 1], 'salen ambos colores con distintas semillas');
});

test('la simulación es determinista con la misma semilla', () => {
  const play = () => {
    const w = fresh(21);
    for (let i = 0; i < 200; i++) {
      for (const a of w.animals) { a.fed = 100; a.happy = 100; }
      sim.tick(w, 10_000);
    }
    return JSON.stringify(w);
  };
  assert.equal(play(), play());
});

test('wander nunca produce NaN (dt negativo, cero o enorme)', () => {
  const w = fresh();
  for (const dt of [-16, 0, NaN, 0.0001, 16, 100, 1e9]) {
    sim.wander(w, dt);
    for (const a of w.animals) {
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y), `NaN con dt=${dt}`);
    }
  }
});

test('wander mantiene a los animales dentro del área', () => {
  const w = fresh();
  w.upgrades.estanque = true;
  for (let i = 0; i < 4000; i++) sim.wander(w, 100);
  for (const a of w.animals) {
    assert.ok(a.x >= 20 && a.x <= 300 && a.y >= 40 && a.y <= 210, `fuera: ${a.x},${a.y}`);
  }
});
