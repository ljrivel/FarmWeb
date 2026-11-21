import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { importWorldText } from '../src/state.js';

const FIXTURE = new URL('./fixtures/mundo-v1.farmweb.json', import.meta.url);

test('el mundo v1 de prueba se importa', () => {
  const w = importWorldText(readFileSync(FIXTURE, 'utf8'), 1_700_000_000_001);
  assert.equal(w.animals.length, 8);
  assert.equal(w.eggs.length, 1);
  assert.equal(w.coins, 777);
});
