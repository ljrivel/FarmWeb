import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPECIES, BALANCE, COMMON_VARIANTS, VARIANT_TIERS, TIER_LABEL, rarityOf, rarityLabel, spriteKey,
} from '../src/data.js';

const ACTUALES = {
  gallina: ['Blanca', 'Marrón'], gato: ['Naranja', 'Gris'], vaca: ['Blanquinegra', 'Marrón'],
  mapache: ['Gris', 'Canela'], chanchito: ['Rosa', 'Lunares'], ajolote: ['Rosa', 'Dorado'],
  carnotauro: ['Coral', 'Menta'], spinosaurus: ['Azul', 'Verde'],
  conejo: ['Blanco', 'Gris'], pato: ['Amarillo', 'Blanco'], // especies nuevas de la etapa d
};

test('cada especie tiene 4 colores con nombres distintos y los 2 primeros son los actuales', () => {
  for (const [s, sp] of Object.entries(SPECIES)) {
    assert.equal(sp.variants.length, 4, `${s} tiene 4 colores`);
    assert.equal(new Set(sp.variants).size, 4, `${s}: nombres distintos`);
    assert.deepEqual(sp.variants.slice(0, 2), ACTUALES[s], `${s}: los 2 primeros no cambian`);
  }
  assert.equal(COMMON_VARIANTS, 2);
  assert.deepEqual(VARIANT_TIERS, ['comun', 'comun', 'poco', 'raro']);
});

test('rarityOf: 0 y 1 comun, 2 poco, 3 raro, y shiny gana siempre', () => {
  assert.equal(rarityOf({ variant: 0, shiny: false }), 'comun');
  assert.equal(rarityOf({ variant: 1, shiny: false }), 'comun');
  assert.equal(rarityOf({ variant: 2, shiny: false }), 'poco');
  assert.equal(rarityOf({ variant: 3, shiny: false }), 'raro');
  assert.equal(rarityOf({ variant: 3, shiny: true }), 'brillante');
  assert.equal(rarityOf({ variant: 0, shiny: true }), 'brillante');
  assert.equal(rarityLabel({ variant: 2, shiny: false }), TIER_LABEL.poco);
  assert.equal(TIER_LABEL.poco, 'Poco común');
  assert.equal(TIER_LABEL.brillante, 'Brillante');
});

test('spriteKey usa shiny en vez del número de color', () => {
  assert.equal(spriteKey('gallina', 2, false, 'adult'), 'gallina:2:adult');
  assert.equal(spriteKey('gallina', 2, true, 'adult'), 'gallina:shiny:adult');
  assert.equal(spriteKey('ajolote', 0, true, 'baby'), 'ajolote:shiny:baby');
});

test('las mutaciones suman 15 %: 10,5 % poco común y 4,5 % raro', () => {
  assert.ok(Math.abs(BALANCE.mutationChance * BALANCE.mutantTierOdds.poco - 0.105) < 1e-9);
  assert.ok(Math.abs(BALANCE.mutationChance * BALANCE.mutantTierOdds.raro - 0.045) < 1e-9);
  assert.equal(BALANCE.shinyChance, 0.02);
  assert.equal(BALANCE.shinyChanceParent, 0.15);
});
