import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newWorld, exportWorldText, importWorldText, checksum } from '../src/state.js';
import { corralTypeOf } from '../src/data.js';

const NOW = 1_700_000_000_001;
const FIXTURE = readFileSync(new URL('./fixtures/mundo-v1.farmweb.json', import.meta.url), 'utf8');

/** Copia del mundo v1 de prueba, modificado y con la suma de verificación recalculada. */
function v1Text(mutate) {
  const obj = JSON.parse(FIXTURE);
  mutate(obj.world);
  obj.checksum = checksum(JSON.stringify(obj.world));
  return JSON.stringify(obj);
}
const tipos = (w) => w.corrales.map((c) => c.tipo).sort();

test('migrar v1: cada animal va a su corral y las mejoras pasan a niveles', () => {
  const w = importWorldText(FIXTURE, NOW);
  assert.equal(w.v, 2);
  assert.deepEqual(tipos(w), ['bosque', 'estanque', 'jurasico', 'pradera']);
  assert.equal(w.corrales.find((c) => c.tipo === 'pradera').nivel, 2);
  assert.equal(w.animals.length, 8);
  assert.equal(w.eggs.length, 1);
  assert.equal(w.coins, 777);
  for (const a of w.animals) assert.equal(a.corral, corralTypeOf(a.species), a.species);
  assert.equal(w.eggs[0].corral, 'pradera');
  assert.equal(Object.keys(w.quests.claimed).length, 11);
  assert.equal('upgrades' in w, false);
  assert.equal('capacity' in w, false);
});

test('migrar v1: sube el nivel del corral si los animales no caben', () => {
  const text = v1Text((w) => {
    const base = w.animals.find((a) => a.species === 'mapache');
    for (let i = 0; i < 5; i++) w.animals.push({ ...base, id: 100 + i });
  });
  const w = importWorldText(text, NOW);
  assert.equal(w.animals.filter((a) => a.species === 'mapache').length, 7);
  assert.ok(w.corrales.find((c) => c.tipo === 'bosque').nivel >= 1, 'el Bosque (cap 6) sube de nivel');
});

test('migrar v1: crea los corrales que la historia ya entregó', () => {
  const text = v1Text((w) => {
    w.animals = w.animals.filter((a) => ['gallina', 'gato'].includes(a.species));
    w.upgrades = { estanque: false, corral: 0 };
  });
  const w = importWorldText(text, NOW);
  assert.deepEqual(tipos(w), ['estanque', 'jurasico', 'pradera']);
});

test('ida y vuelta v2 conserva corrales, animales y monedas', () => {
  const w = newWorld('V2', NOW, 5);
  w.coins = 321;
  const back = importWorldText(exportWorldText(w, NOW), NOW);
  assert.equal(back.v, 2);
  assert.deepEqual(tipos(back), ['pradera']);
  assert.equal(back.animals.length, 2);
  assert.equal(back.coins, 321);
});

test('una versión futura (3) se rechaza', () => {
  const obj = JSON.parse(exportWorldText(newWorld('X', NOW, 1), NOW));
  obj.version = 3;
  assert.throws(() => importWorldText(JSON.stringify(obj), NOW), /más nueva/);
});
