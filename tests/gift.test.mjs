// Cesta diaria de Bruno y datos de cada especie para la Guía.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SPECIES, BALANCE, FOODS } from '../src/data.js';
import { newWorld, addAnimal, validateWorld } from '../src/state.js';
import { claimGift, giftReady, giftReward, dayKey } from '../src/sim.js';

test('cada especie tiene un dato curioso para la Guía', () => {
  for (const [id, sp] of Object.entries(SPECIES)) assert.ok(sp.dato && sp.dato.length > 10, id);
});

test('la cesta se recoge una vez al día y el ciclo es de 7 días', () => {
  const w = newWorld('T', 1, 1);
  assert.ok(giftReady(w, '2026-01-01'));
  const r = claimGift(w, '2026-01-01');
  assert.ok(r.ok);
  assert.equal(w.coins, 100 + BALANCE.giftCoins[0]);
  assert.ok(!giftReady(w, '2026-01-01'));
  assert.equal(claimGift(w, '2026-01-01').ok, false, 'no se repite el mismo día');
  assert.equal(w.coins, 100 + BALANCE.giftCoins[0], 'y no cobra');
  for (let d = 2; d <= 7; d++) assert.ok(claimGift(w, `2026-01-0${d}`).ok);
  assert.equal(w.coins, 100 + BALANCE.giftCoins.reduce((t, c) => t + c, 0));
  assert.ok(giftReward(w).coins === BALANCE.giftCoins[0], 'el día 8 vuelve a empezar el ciclo');
});

test('el día 7 se avisa como cesta grande y faltar un día no castiga', () => {
  const w = newWorld('T', 1, 1);
  w.gift.n = 6;
  assert.equal(claimGift(w, '2026-02-01').msg, '¡Cesta grande de Bruno!');
  w.gift.day = '2026-02-01';
  assert.ok(claimGift(w, '2026-02-20').ok, 'tras 19 días sin entrar, la cesta sigue ahí');
  assert.equal(w.gift.n, 8);
});

test('trae la comida favorita de lo que tienes, con tope, o grano si no tienes nada', () => {
  const w = newWorld('T', 1, 1);
  assert.deepEqual(giftReward(w).foods, { grano: BALANCE.giftFoodEach });
  addAnimal(w, 'gato', 0, 'adult');
  addAnimal(w, 'vaca', 0, 'adult');
  addAnimal(w, 'gallina', 0, 'adult');
  addAnimal(w, 'chanchito', 0, 'adult');
  const foods = giftReward(w).foods;
  assert.equal(Object.keys(foods).length, BALANCE.giftMaxFoods);
  for (const [f, n] of Object.entries(foods)) assert.ok(FOODS[f] && n === BALANCE.giftFoodEach);
  const antes = { ...w.foods };
  claimGift(w, '2026-03-01');
  for (const [f, n] of Object.entries(foods)) assert.equal(w.foods[f], (antes[f] || 0) + n);
});

test('el día de la cesta sobrevive a guardar y cargar y un valor raro se limpia', () => {
  const w = newWorld('T', 1, 1);
  addAnimal(w, 'gallina', 0, 'adult');
  claimGift(w, '2026-04-05');
  assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w)), 0).gift, { day: '2026-04-05', n: 1 });
  const raro = JSON.parse(JSON.stringify(w));
  raro.gift = { day: '<b>hoy</b>', n: -5 };
  assert.deepEqual(validateWorld(raro, 0).gift, { day: '', n: 0 });
  assert.match(dayKey(new Date(2026, 0, 9)), /^2026-01-09$/);
});
