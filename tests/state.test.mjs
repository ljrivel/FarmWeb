import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, exportWorldText, importWorldText, validateWorld, checksum } from '../src/state.js';
import { SPECIES } from '../src/data.js';

const NOW = 1_700_000_000_000;

test('mundo nuevo: 2 gallinas adultas, 100 monedas y 3 especies desbloqueadas', () => {
  const w = newWorld('Prueba', NOW, 42);
  assert.equal(w.animals.length, 2);
  assert.ok(w.animals.every((a) => a.species === 'gallina' && a.stage === 'adult'));
  assert.equal(w.coins, 100);
  assert.deepEqual(w.unlocked, ['gallina', 'gato', 'vaca']);
  assert.equal(w.maxPlayers, 4);
});

test('misma semilla, mismo mundo (determinista)', () => {
  assert.deepEqual(newWorld('A', NOW, 7), newWorld('A', NOW, 7));
});

test('exportar e importar conserva el mundo', () => {
  const w = newWorld('Granja ñandú', NOW, 99);
  w.coins = 777;
  w.foods.heno = 4;
  const back = importWorldText(exportWorldText(w, NOW), NOW);
  assert.equal(back.name, 'Granja ñandú');
  assert.equal(back.coins, 777);
  assert.equal(back.foods.heno, 4);
  assert.equal(back.animals.length, 2);
  assert.equal(back.animals[0].name, w.animals[0].name);
});

test('un archivo modificado a mano se rechaza por la suma de verificación', () => {
  const text = exportWorldText(newWorld('X', NOW, 1), NOW);
  const obj = JSON.parse(text);
  obj.world.coins = 999999;
  assert.throws(() => importWorldText(JSON.stringify(obj), NOW), /dañado o fue modificado/);
});

test('rechaza JSON inválido, otro formato y versión futura', () => {
  assert.throws(() => importWorldText('no es json'), /JSON inválido/);
  assert.throws(() => importWorldText('{"format":"otro"}'), /no es un mundo/);
  const obj = JSON.parse(exportWorldText(newWorld('X', NOW, 1), NOW));
  obj.version = 99;
  assert.throws(() => importWorldText(JSON.stringify(obj)), /más nueva/);
});

test('validateWorld sanea datos hostiles', () => {
  const w = validateWorld({
    name: '<img src=x onerror=alert(1)>'.repeat(10),
    coins: -50, rng: 'abc',
    foods: { grano: 1e12, veneno: 5 },
    unlocked: ['gallina', 'dragon', 'ajolote'],
    upgrades: { corral: 99, estanque: 'sí' },
    animals: [
      { id: 1, species: 'gallina', variant: 99, stage: 'zombi', fed: 5000, happy: -3, x: 1e9, y: NaN, name: 'x'.repeat(500) },
      { id: 1, species: 'dragon' },
      { id: 1, species: 'gato', ready: 50 },
      null, 'basura',
    ],
  }, NOW);
  assert.ok(w.name.length <= 40);
  assert.equal(w.coins, 0);
  assert.ok(Number.isInteger(w.rng));
  assert.equal(w.foods.grano, 99999);
  assert.equal(w.foods.veneno, undefined);
  assert.ok(w.unlocked.includes('ajolote') && !w.unlocked.includes('dragon'));
  assert.equal(w.upgrades.corral, 4);
  assert.equal(w.upgrades.estanque, false);
  assert.equal(w.capacity, 24);
  assert.equal(w.animals.length, 2);
  const [a, b] = w.animals;
  assert.equal(a.variant, SPECIES.gallina.variants.length - 1);
  assert.equal(a.stage, 'baby');
  assert.equal(a.fed, 100);
  assert.equal(a.happy, 0);
  assert.ok(a.x <= 320 && Number.isFinite(a.y));
  assert.ok(a.name.length <= 24);
  assert.notEqual(a.id, b.id, 'ids duplicados se reasignan');
  assert.equal(b.ready, 3);
});

test('un mundo sin animales ni huevos se rechaza', () => {
  assert.throws(() => validateWorld({ animals: [] }, NOW), /no tiene animales/);
});

test('checksum cambia con cualquier cambio', () => {
  assert.notEqual(checksum('a'), checksum('b'));
  assert.equal(checksum('hola'), checksum('hola'));
});
