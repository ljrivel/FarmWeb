// Venta de animales: precio por etapa y rareza, y lo que no se puede vender.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, SPECIES } from '../src/data.js';
import { newWorld, addAnimal, validateWorld } from '../src/state.js';
import * as sim from '../src/sim.js';

const granja = () => { const w = newWorld('T', 1, 1); w.coins = 0; return w; };

test('un bebé vale el 25 % y un adulto el 50 %, y la rareza multiplica', () => {
  const w = granja();
  const precio = SPECIES.vaca.price;
  const bebe = addAnimal(w, 'vaca', 0, 'baby'), adulto = addAnimal(w, 'vaca', 0, 'adult');
  assert.equal(sim.sellPrice(bebe), Math.round(precio * 0.25));
  assert.equal(sim.sellPrice(adulto), Math.round(precio * 0.5));
  const raro = addAnimal(w, 'vaca', 3, 'adult');
  assert.equal(sim.sellPrice(raro), Math.round(precio * 0.5 * BALANCE.sellRarityMul.raro));
  const brillante = addAnimal(w, 'vaca', 0, 'adult', { shiny: true });
  assert.ok(sim.sellPrice(brillante) > sim.sellPrice(raro));
  for (const sp of Object.values(SPECIES)) assert.ok(Math.round(sp.price * 0.5 * BALANCE.sellRarityMul.brillante) <= sp.price * 2, 'vender nunca supera con mucho a comprar');
});

test('vender quita al animal, paga y cuenta; no se vende lo enfermo, lo del nido ni el último', () => {
  const w = granja();
  const a = addAnimal(w, 'gallina', 0, 'adult');
  const n = w.animals.length;
  const r = sim.sellAnimal(w, a.id);
  assert.ok(r.ok);
  assert.equal(w.animals.length, n - 1);
  assert.equal(w.coins, r.gain);
  assert.equal(w.stats.soldAnimals, 1);
  assert.equal(sim.sellAnimal(w, a.id).ok, false, 'ya no está');
  const enfermo = addAnimal(w, 'gallina', 0, 'adult');
  enfermo.sick = 'resfriado';
  assert.match(sim.sellAnimal(w, enfermo.id).msg, /enfermo/);
  const nido = addAnimal(w, 'gallina', 0, 'adult');
  nido.away = true;
  assert.match(sim.sellAnimal(w, nido.id).msg, /nido/);
  w.animals = [w.animals[0]];
  w.animals[0].sick = undefined;
  assert.match(sim.sellAnimal(w, w.animals[0].id).msg, /último/);
  assert.equal(w.animals.length, 1);
});

test('el contador de animales vendidos tiene valor por defecto en partidas viejas', () => {
  const raw = JSON.parse(JSON.stringify(newWorld('T', 1, 1)));
  delete raw.stats.soldAnimals;
  assert.equal(validateWorld(raw, 0).stats.soldAnimals, 0);
});

test('tras vender, el corral no cría solo por un rato y el lugar libre se queda libre', () => {
  const w = granja();
  while (sim.hasSpace(w, 'pradera')) addAnimal(w, 'gallina', 0, 'adult');
  for (const a of w.animals) { a.fed = 100; a.happy = 100; a.cool = 0; }
  sim.sellAnimal(w, w.animals[0].id);
  const libre = sim.spaceUsed(w, 'pradera');
  sim.tick(w, 1000);
  assert.equal(sim.spaceUsed(w, 'pradera'), libre, 'sin huevo nuevo durante la pausa');
  sim.tick(w, BALANCE.sellBreedPauseMs);
  for (const a of w.animals) { a.fed = 100; a.happy = 100; a.cool = 0; }
  sim.tick(w, 1000);
  assert.equal(sim.spaceUsed(w, 'pradera'), libre + 1, 'pasada la pausa vuelve a criar');
});
