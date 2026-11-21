import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPECIES, spriteKey } from '../src/data.js';

const json = JSON.parse(readFileSync(new URL('../assets/sprites/animals.json', import.meta.url), 'utf8'));
const png = readFileSync(new URL('../assets/sprites/animals.png', import.meta.url));

test('el atlas tiene una fila para cada especie x color x etapa y para cada brillante', () => {
  const esperadas = [];
  for (const [s, sp] of Object.entries(SPECIES)) {
    for (const stage of ['baby', 'adult']) {
      for (let v = 0; v < sp.variants.length; v++) esperadas.push(spriteKey(s, v, false, stage));
      esperadas.push(spriteKey(s, 0, true, stage));
    }
  }
  assert.equal(esperadas.length, Object.keys(SPECIES).length * 10);
  assert.equal(esperadas.length, 100);
  assert.equal(new Set(esperadas).size, 100, 'sin claves repetidas');
  for (const k of esperadas) assert.ok(k in json.rows, `falta la fila ${k}`);
  assert.equal(Object.keys(json.rows).length, 100, 'ninguna fila de más');
  const idx = Object.values(json.rows).sort((a, b) => a - b);
  assert.deepEqual(idx, idx.map((_, i) => i), 'filas consecutivas desde 0');
});

test('el PNG mide 4 cuadros de ancho y 100 filas de alto', () => {
  assert.equal(png.readUInt32BE(16), 4 * 32);
  assert.equal(png.readUInt32BE(20), 100 * 32);
  for (const [s, n] of Object.entries(json.species)) assert.equal(n, SPECIES[s].variants.length, s);
});
