import test from 'node:test';
import assert from 'node:assert/strict';
import { newWorld, cleanName, exportWorldText, importWorldText, validateWorld, addAnimal } from '../src/state.js';
import { renameAnimal } from '../src/sim.js';
import { SPECIES } from '../src/data.js';

const NOW = 1_700_000_000_000;
const world = () => newWorld('t', NOW, 7);

test('renameAnimal limpia espacios y caracteres de control', () => {
  const w = world();
  const a = w.animals[0];
  const r = renameAnimal(w, a.id, '  Pe\u0000pi‮ta   Luna  ');
  assert.ok(r.ok);
  assert.equal(a.name, 'Pepita Luna');
  assert.equal(a.named, true);
  assert.equal(r.msg, 'Ahora se llama Pepita Luna.');
});

test('un nombre vacío o solo espacios se rechaza y conserva el actual', () => {
  const w = world();
  const a = w.animals[0];
  const before = a.name;
  for (const raw of ['', '   ', '\u0000\u0007', '​​', null, undefined, 42, {}]) {
    const r = renameAnimal(w, a.id, raw);
    assert.equal(r.ok, false);
    assert.equal(r.msg, 'Escribe un nombre.');
    assert.equal(a.name, before);
  }
  assert.equal(renameAnimal(w, 99999, 'Luna').msg, 'No encuentro a ese animal.');
});

test('10 000 caracteres se cortan a 24 y un emoji no se parte por la mitad', () => {
  const w = world();
  const a = w.animals[0];
  renameAnimal(w, a.id, 'a'.repeat(10000));
  assert.equal(a.name.length, 24);
  renameAnimal(w, a.id, '🐔'.repeat(30));
  assert.equal(Array.from(a.name).length, 24);
  assert.ok(!/[\uD800-\uDBFF]$/.test(a.name), 'no termina en media pareja sustituta');
  assert.equal(cleanName('x'.repeat(50), 5, ''), 'xxxxx');
});

test('el HTML se guarda como texto: la seguridad está en mostrarlo con textContent', () => {
  const w = world();
  const a = w.animals[0];
  renameAnimal(w, a.id, '<img src=x onerror=1>');
  assert.equal(a.name, '<img src=x onerror=1>');
});

test('cleanName: no-texto usa el valor de reserva', () => {
  assert.equal(cleanName(undefined, 24, 'Pepita'), 'Pepita');
  assert.equal(cleanName(12, 24, 'Pepita'), 'Pepita');
  assert.equal(cleanName('   ', 24, 'Pepita'), 'Pepita');
  assert.equal(cleanName('Ana', 24, 'Pepita'), 'Ana');
});

test('importar un mundo con nombre hostil deja el nombre por defecto de la especie', () => {
  const w = world();
  w.animals[0].name = '\u0007\u0007  ';
  const imported = importWorldText(exportWorldText(w));
  assert.equal(imported.animals[0].name, SPECIES.gallina.names[0]);
  w.animals[1].name = 'x'.repeat(5000);
  assert.equal(importWorldText(exportWorldText(w)).animals[1].name.length, 24);
});

test('una partida sin `named` carga como bautizada y un animal nuevo nace sin bautizar', () => {
  const w = world();
  const raw = JSON.parse(JSON.stringify(w));
  for (const a of raw.animals) delete a.named;
  assert.ok(validateWorld(raw).animals.every((a) => a.named === true));
  const baby = addAnimal(w, 'gallina', 0, 'baby');
  assert.equal(baby.named, false);
  raw.animals[0].named = false;
  assert.equal(validateWorld(raw).animals[0].named, false);
});
