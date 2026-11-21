import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPECIES, CORRAL_TYPES, CORRAL_TYPE_ORDER, MAX_CORRAL_LEVEL, CORRAL_COSTS, MAP_SPOTS, corralTypeOf,
} from '../src/data.js';

test('cada especie pertenece a exactamente un tipo de corral', () => {
  for (const s of Object.keys(SPECIES)) {
    const owners = Object.keys(CORRAL_TYPES).filter((t) => CORRAL_TYPES[t].species.includes(s));
    assert.equal(owners.length, 1, `${s} debe estar en un solo tipo`);
    assert.equal(corralTypeOf(s), owners[0]);
    assert.equal(CORRAL_TYPES[owners[0]].aquatic, SPECIES[s].aquatic, `${s}: acuático coincide con su corral`);
  }
});

test('las áreas caben en el lienzo', () => {
  for (const [t, c] of Object.entries(CORRAL_TYPES)) {
    const a = c.area;
    assert.ok(a.x0 >= 0 && a.x0 < a.x1 && a.x1 <= 320, `${t}: x`);
    assert.ok(a.y0 >= 0 && a.y0 < a.y1 && a.y1 <= 224, `${t}: y`);
    const p = MAP_SPOTS[t];
    assert.ok(p && p.x >= 0 && p.x <= 320 && p.y >= 0 && p.y <= 224, `${t}: punto del mapa`);
  }
});

test('los tipos tienen orden y costos válidos', () => {
  assert.deepEqual([...CORRAL_TYPE_ORDER].sort(), Object.keys(CORRAL_TYPES).sort());
  for (const t of CORRAL_TYPE_ORDER) {
    const c = CORRAL_TYPES[t].cost;
    assert.ok(c === null || (Number.isInteger(c) && c >= 0), `${t}: costo`);
    assert.ok(Number.isInteger(CORRAL_TYPES[t].cap) && CORRAL_TYPES[t].cap > 0, `${t}: capacidad`);
  }
  assert.equal(MAX_CORRAL_LEVEL, CORRAL_COSTS.length);
  assert.equal(CORRAL_TYPES.jurasico.cost, null);
});
