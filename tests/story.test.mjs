// Escenas con diálogo: datos bien formados y cuál toca en cada momento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, QUESTS, CHARACTERS } from '../src/data.js';
import { newWorld, addAnimal, validateWorld } from '../src/state.js';
import { nextScene } from '../src/story.js';
import { claim } from '../src/quests.js';
import { makeSick } from '../src/sim.js';

test('cada escena tiene id único, disparador válido, 3 a 6 líneas y personajes con retrato', () => {
  assert.equal(new Set(SCENES.map((s) => s.id)).size, SCENES.length);
  for (const s of SCENES) {
    const [kind, id] = s.when.split(':');
    assert.ok(kind === 'evento' ? id === 'primera-enfermedad' : ['inicio', 'fin'].includes(kind) && QUESTS.some((q) => q.id === id), s.id);
    assert.ok(s.lines.length >= 3 && s.lines.length <= 6, `${s.id}: ${s.lines.length} líneas`);
    for (const [who, mood, text] of s.lines) {
      assert.ok(CHARACTERS[who], `${s.id}: ${who}`);
      assert.ok([0, 1, 2].includes(mood) && text.length > 0, s.id);
    }
  }
});

test('una partida nueva empieza con la escena de Bruno y no la repite', () => {
  const w = newWorld('T', 1, 1);
  assert.equal(nextScene(w).id, 'sobre-mojado');
  w.story.seen['sobre-mojado'] = true;
  assert.equal(nextScene(w), null);
});

test('al reclamar una misión salen primero su cierre y luego el inicio de la siguiente', () => {
  const w = newWorld('T', 1, 1);
  for (const s of SCENES) w.story.seen[s.id] = true;
  w.story.seen['vecino'] = false;
  w.stats.fed = 3;
  assert.ok(claim(w).ok);
  assert.equal(nextScene(w).id, 'vecino'); // inicio de c1-huevos
});

test('la primera enfermedad dispara su escena', () => {
  const w = newWorld('T', 1, 1);
  for (const s of SCENES) if (s.id !== 'primer-estornudo') w.story.seen[s.id] = true;
  assert.equal(nextScene(w), null);
  w.animals.push({ id: 1, species: 'gallina', sick: null });
  makeSick(w, 1, 'resfriado');
  assert.equal(nextScene(w).id, 'primer-estornudo');
});

test('una partida de antes de las escenas no repite lo que ya pasó, pero sí la misión activa', () => {
  const old = newWorld('T', 1, 1);
  addAnimal(old, 'gallina', 0, 'adult');
  const raw = JSON.parse(JSON.stringify(old));
  delete raw.story; // así guardaban antes de las escenas
  raw.quests = { claimed: { 'c1-carta': true, 'c1-huevos': true } };
  const w = validateWorld(raw, 0);
  assert.ok(w.story.seen['vecino'], 'inicio de c1-huevos ya pasó');
  assert.ok(!w.story.seen['cuentas-claras'], 'c1-vender aún no se reclama');
  assert.equal(nextScene(w), null, 'c1-vender es la activa pero no tiene escena de inicio');
  assert.deepEqual(validateWorld(JSON.parse(JSON.stringify(w)), 0).story.seen, w.story.seen, 'sobrevive a guardar y cargar');
});
