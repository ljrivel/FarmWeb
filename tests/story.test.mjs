// Escenas con diálogo: datos bien formados y cuál toca en cada momento.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCENES, QUESTS, CHARACTERS, VISITS, LETTERS } from '../src/data.js';
import { newWorld, addAnimal, validateWorld } from '../src/state.js';
import { nextScene, pickVisit, chapterNow } from '../src/story.js';
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

test('las visitas y las cartas están bien formadas', () => {
  assert.equal(new Set(VISITS.map((v) => v.id)).size, VISITS.length);
  for (const v of VISITS) {
    assert.ok(CHARACTERS[v.who] && v.minCh >= 1 && v.minCh <= Math.max(...QUESTS.map((q) => q.ch)) + 1, v.id);
    assert.ok([undefined, 'enfermo', 'sano'].includes(v.cond), v.id);
    assert.ok(v.lines.length >= 1 && v.lines.length <= 3, v.id);
    for (const [who, mood, text] of v.lines) assert.ok(CHARACTERS[who] && [0, 1, 2].includes(mood) && text, v.id);
  }
  for (const id of LETTERS) assert.ok(QUESTS.some((q) => q.id === id), id);
});

const world = (claimedUpTo) => {
  const w = newWorld('T', 1, 1);
  for (const q of QUESTS) { if (q.id === claimedUpTo) break; w.quests.claimed[q.id] = true; }
  return w;
};

test('las visitas respetan el capítulo: al empezar solo vienen Tomás, Don Ramón y Bruno', () => {
  const w = world('c1-carta');
  assert.equal(chapterNow(w), 1);
  const quienes = new Set();
  for (let i = 0; i < 60; i++) { delete w.story.talked['x']; quienes.add(pickVisit(w, null, () => i / 60).who); }
  assert.deepEqual([...quienes].sort(), ['bruno', 'ramon', 'tomas']);
});

test('Lía llega desde el capítulo 4 y Cosi solo después del final', () => {
  const quienes = (w) => new Set(Array.from({ length: 80 }, (_, i) => pickVisit(w, null, () => i / 80).who));
  assert.ok(!quienes(world('c3-tormenta')).has('lia'));
  assert.ok(quienes(world('c4-pista')).has('lia'));
  assert.ok(!quienes(world('c5-festival')).has('abuela'));
  const fin = world('nada-despues'); // todo reclamado
  assert.equal(chapterNow(fin), Math.max(...QUESTS.map((q) => q.ch)) + 1);
  assert.ok(quienes(fin).has('abuela'));
});

test('Pita comenta según haya o no un animal enfermo', () => {
  const w = world('c4-pista');
  addAnimal(w, 'gallina', 0, 'adult');
  const pita = (rnd) => pickVisit(w, null, rnd);
  const ids = () => new Set(Array.from({ length: 80 }, (_, i) => pickVisit(w, null, () => i / 80).id));
  assert.ok(!ids().has('v-pita-1') && ids().has('v-pita-2'));
  makeSick(w, w.animals[0].id, 'resfriado');
  assert.ok(ids().has('v-pita-1') && !ids().has('v-pita-2'));
  assert.ok(pita(() => 0));
});

test('no repite al personaje anterior ni una charla hasta agotarlas', () => {
  const w = world('c1-carta');
  assert.notEqual(pickVisit(w, 'tomas', () => 0).who, 'tomas');
  const hechas = new Set();
  for (let i = 0; i < 3; i++) { // en el capítulo 1 hay 3 charlas elegibles
    const v = pickVisit(w, null, () => 0);
    assert.ok(!hechas.has(v.id), `repite ${v.id} antes de agotar`);
    hechas.add(v.id);
    w.story.talked[v.id] = true;
  }
  const otra = pickVisit(w, null, () => 0); // las 3 elegibles de este capítulo ya se contaron: vuelve a empezar
  assert.ok(otra && !w.story.talked[otra.id]);
});

test('las charlas contadas sobreviven a guardar y cargar', () => {
  const w = newWorld('T', 1, 1);
  addAnimal(w, 'gallina', 0, 'adult');
  w.story.talked['v-tomas-1'] = true;
  w.story.talked['inventada'] = true;
  const v = validateWorld(JSON.parse(JSON.stringify(w)), 0);
  assert.deepEqual(v.story.talked, { 'v-tomas-1': true });
});
