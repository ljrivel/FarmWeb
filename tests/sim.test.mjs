import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, addAnimal, addCorral, getCorral, capacityOf } from '../src/state.js';
import * as sim from '../src/sim.js';
import { SPECIES, PRODUCTS, MIN, BALANCE, CORRAL_COSTS, CORRAL_TYPES, CORRAL_TYPE_ORDER } from '../src/data.js';

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
  for (let i = 0; i < 600; i++) sim.tick(w, 30_000, { live: true }); // 5 h con el juego abierto
  assert.equal(a.fed, 0);
});

test('sin conexión nadie pasa hambre de más: la saciedad no baja del piso y el ánimo no cae', () => {
  const w = fresh();
  const a = w.animals[0];
  a.fed = 80; a.happy = 70;
  for (let i = 0; i < 960; i++) sim.tick(w, 30_000, { live: false }); // 8 h fuera
  assert.equal(a.fed, BALANCE.offlineFedFloor);
  assert.ok(a.happy >= 70, 'el ánimo no cae sin conexión');
  for (let i = 0; i < 120; i++) sim.tick(w, 30_000, { live: true }); // con el juego abierto sí se vacía
  assert.ok(a.fed < BALANCE.offlineFedFloor);
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
  assert.equal(r.gain, 5 * PRODUCTS.huevo.price);
  assert.equal(w.coins, 100 + 5 * PRODUCTS.huevo.price);
  assert.equal(w.products.huevo, undefined);
  assert.equal(w.stats.sold, 5);
  assert.equal(sim.sell(w, 'huevo').ok, false);
});

test('comprar animal: monedas, desbloqueo, espacio y corral', () => {
  const w = fresh();
  w.coins = 1000;
  assert.equal(sim.buyAnimal(w, 'mapache').ok, false, 'bloqueado');
  assert.equal(sim.buyAnimal(w, 'carnotauro').ok, false, 'no se vende');
  w.unlocked.push('ajolote');
  const sinEstanque = sim.buyAnimal(w, 'ajolote');
  assert.equal(sinEstanque.ok, false, 'sin corral Estanque');
  assert.match(sinEstanque.msg, /Estanque/);
  const r = sim.buyAnimal(w, 'gato');
  assert.ok(r.ok);
  assert.equal(w.coins, 1000 - SPECIES.gato.price);
  assert.equal(r.animal.stage, 'baby');
  assert.equal(r.animal.corral, 'pradera');
  assert.equal(w.stats.bought.gato, 1);
  w.coins = 5;
  assert.equal(sim.buyAnimal(w, 'vaca').ok, false, 'sin monedas');
  w.coins = 1e6;
  while (sim.hasSpace(w, 'pradera')) sim.buyAnimal(w, 'gato');
  assert.equal(w.animals.length, 8);
  const lleno = sim.buyAnimal(w, 'gato');
  assert.equal(lleno.ok, false, 'corral lleno');
  assert.match(lleno.msg, /Pradera/);
});

test('comprar un mapache pide construir el Bosque', () => {
  const w = fresh();
  w.coins = 500; // Bosque 300 + mapache 180
  w.unlocked.push('mapache');
  const antes = sim.canBuyAnimal(w, 'mapache');
  assert.equal(antes.ok, false);
  assert.match(antes.msg, /Bosque/);
  assert.ok(sim.buildCorral(w, 'bosque').ok);
  assert.equal(w.coins, 500 - CORRAL_TYPES.bosque.cost);
  const r = sim.buyAnimal(w, 'mapache');
  assert.ok(r.ok, r.msg);
  assert.equal(r.animal.corral, 'bosque');
});

test('construir corrales: una vez, con monedas y solo los que se compran', () => {
  const w = fresh();
  w.coins = 1000;
  assert.ok(sim.buildCorral(w, 'estanque').ok);
  assert.equal(w.coins, 1000 - CORRAL_TYPES.estanque.cost);
  assert.equal(sim.buildCorral(w, 'estanque').ok, false, 'ya existe');
  const hist = sim.buildCorral(w, 'jurasico');
  assert.equal(hist.ok, false);
  assert.match(hist.msg, /historia/);
  assert.equal(getCorral(w, 'jurasico'), undefined);
  w.coins = 10;
  assert.equal(sim.buildCorral(w, 'bosque').ok, false, 'sin monedas');
  assert.equal(w.coins, 10, 'no descuenta');
  assert.equal(sim.buildCorral(w, 'volcan').ok, false, 'tipo desconocido');
});

test('ampliar un corral: cuesta por nivel, suma 4 y tiene tope', () => {
  const w = fresh();
  w.coins = 1e6;
  assert.equal(capacityOf(w, 'pradera'), 8);
  assert.ok(sim.upgradeCorral(w, 'pradera').ok);
  assert.equal(w.coins, 1e6 - CORRAL_COSTS[0]);
  assert.equal(capacityOf(w, 'pradera'), 12);
  for (let i = 0; i < 3; i++) assert.ok(sim.upgradeCorral(w, 'pradera').ok);
  assert.equal(capacityOf(w, 'pradera'), 24);
  assert.equal(sim.upgradeCorral(w, 'pradera').ok, false, 'nivel máximo');
  assert.equal(sim.upgradeCorral(w, 'bosque').ok, false, 'no construido');
  w.coins = 1;
  assert.equal(sim.upgradeCorral(w, 'pradera').ok, false);
});

test('corralInfo describe cada tipo en orden', () => {
  const w = fresh();
  const info = sim.corralInfo(w);
  assert.deepEqual(info.map((c) => c.tipo), CORRAL_TYPE_ORDER);
  const [pradera, bosque, , jurasico] = info;
  assert.deepEqual(
    { built: pradera.built, id: pradera.id, nivel: pradera.nivel, capacity: pradera.capacity, used: pradera.used, upgradeCost: pradera.upgradeCost, buildCost: pradera.buildCost },
    { built: true, id: 'pradera', nivel: 0, capacity: 8, used: 2, upgradeCost: CORRAL_COSTS[0], buildCost: null });
  assert.deepEqual(
    { built: bosque.built, id: bosque.id, capacity: bosque.capacity, used: bosque.used, buildCost: bosque.buildCost, upgradeCost: bosque.upgradeCost },
    { built: false, id: null, capacity: CORRAL_TYPES.bosque.cap, used: 0, buildCost: 300, upgradeCost: null });
  assert.equal(jurasico.buildCost, null, 'llega con la historia');
});

test('el espacio es por corral', () => {
  const w = fresh();
  w.coins = 1e6;
  w.unlocked.push('mapache');
  while (sim.hasSpace(w, 'pradera')) sim.buyAnimal(w, 'gato');
  assert.equal(sim.canBuyAnimal(w, 'gallina').ok, false, 'Pradera llena');
  sim.buildCorral(w, 'bosque');
  assert.ok(sim.canBuyAnimal(w, 'mapache').ok, 'el Bosque tiene espacio propio');
  assert.equal(sim.spaceUsed(w, 'pradera'), 8);
  assert.equal(sim.spaceUsed(w, 'bosque'), 0);
});

test('corralStatus cuenta listos y hambrientos', () => {
  const w = fresh();
  w.animals[0].ready = 2;
  w.animals[1].fed = 10;
  assert.deepEqual(sim.corralStatus(w, 'pradera'), { used: 2, capacity: 8, ready: 2, hungry: 1 });
});

test('los animales no crían solos: dos adultas felices no ponen huevo (toda cría pasa por el Criadero)', () => {
  const w = fresh(11);
  for (const a of w.animals) { a.fed = 100; a.happy = 100; a.cool = 0; }
  sim.tick(w, 60_000);
  assert.equal(w.eggs.length, 0);
  assert.equal(w.stats.breedStarted, 0);
});

test('no se cría sin espacio, ni con hambre, ni con una sola', () => {
  const lleno = fresh(3);
  for (const a of lleno.animals) { a.fed = 100; a.happy = 100; }
  for (let i = 0; i < 6; i++) addAnimal(lleno, 'gato', 0, 'baby');
  assert.equal(sim.hasSpace(lleno, 'pradera'), false);
  sim.tick(lleno, 1000);
  assert.equal(lleno.eggs.length, 0, 'sin espacio');
  const w = fresh(3);
  for (const a of w.animals) { a.fed = 10; a.happy = 100; }
  sim.tick(w, 1000);
  assert.equal(w.eggs.length, 0, 'con hambre');
  const solo = fresh(3);
  solo.animals.pop();
  solo.animals[0].fed = 100; solo.animals[0].happy = 100;
  sim.tick(solo, 1000);
  assert.equal(solo.eggs.length, 0, 'una sola');
});

test('el hacinamiento solo afecta al corral lleno', () => {
  const w = fresh(6);
  addCorral(w, 'bosque');
  for (let i = 0; i < 7; i++) addAnimal(w, 'gato', 0, 'baby'); // Pradera: 9 de 8
  const mapache = addAnimal(w, 'mapache', 0, 'adult');
  for (const a of w.animals) { a.fed = 100; a.happy = 50; a.cool = 1e12; }
  sim.tick(w, 60_000);
  const gato = w.animals.find((a) => a.species === 'gato');
  assert.ok(mapache.happy > gato.happy, `Bosque ${mapache.happy} vs Pradera ${gato.happy}`);
  assert.ok(Math.abs(mapache.happy - (50 + BALANCE.happyUpPerSec * 60)) < 1e-6, 'el Bosque no pierde por hacinamiento');
});

test('simulación de 8 h con todos los corrales: sin NaN y dentro de los topes', () => {
  const w = fresh(8);
  for (const t of CORRAL_TYPE_ORDER.slice(1)) addCorral(w, t);
  for (const s of Object.keys(SPECIES)) {
    addAnimal(w, s, 0, 'adult'); addAnimal(w, s, 1, 'adult');
  }
  for (let t = 0; t < 8 * 60 * MIN; t += 30_000) {
    for (const a of w.animals) a.fed = Math.max(a.fed, 60);
    sim.tick(w, 30_000);
  }
  for (const a of w.animals) {
    for (const k of ['fed', 'happy', 'growth', 'prod', 'ready', 'cool']) assert.ok(Number.isFinite(a[k]), `${a.species}.${k}`);
    assert.ok(a.fed >= 0 && a.fed <= 100 && a.happy >= 0 && a.happy <= 100);
    assert.equal(a.corral, CORRAL_TYPE_ORDER.find((t) => CORRAL_TYPES[t].species.includes(a.species)));
  }
  assert.ok(w.eggs.length <= 30);
});

test('la cría hereda color de un padre: con distintas semillas salen ambos colores comunes', () => {
  const seen = new Set();
  for (let seed = 1; seed < 60; seed++) {
    const w = fresh(seed);
    seen.add(sim.pickBabyVariant(w, { variant: 0 }, { variant: 1 }));
  }
  assert.ok(seen.has(0) && seen.has(1), 'salen ambos colores comunes con distintas semillas');
  assert.ok([...seen].every((v) => v >= 0 && v <= 3), 'siempre un color válido');
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

test('wander mantiene a cada animal dentro del área de su corral', () => {
  const w = fresh();
  for (const t of CORRAL_TYPE_ORDER.slice(1)) addCorral(w, t);
  for (const sp of Object.keys(SPECIES)) addAnimal(w, sp, 0, 'adult');
  for (let i = 0; i < 4000; i++) sim.wander(w, 100);
  for (const a of w.animals) {
    const { area } = CORRAL_TYPES[getCorral(w, a.corral).tipo];
    assert.ok(a.x >= area.x0 - 1e-6 && a.x <= area.x1 + 1e-6 && a.y >= area.y0 - 1e-6 && a.y <= area.y1 + 1e-6,
      `${a.species} fuera de ${a.corral}: ${a.x},${a.y}`);
  }
});

test('ausente (afk) cada animal guarda solo 1 producto; presente, hasta el máximo', () => {
  const lleno = (opts) => {
    const w = fresh(2);
    for (let i = 0; i < 60; i++) { for (const a of w.animals) { a.fed = 100; a.happy = 100; } sim.tick(w, 30_000, opts); }
    return Math.max(...w.animals.map((a) => a.ready));
  };
  assert.equal(lleno({ afk: true }), BALANCE.afkMaxReady);
  assert.equal(lleno({}), BALANCE.maxReady);
});
