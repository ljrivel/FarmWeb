// Tutorial guiado: pasos bien formados, qué paso toca y que cada cosa que ilumina existe de verdad.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TUTORIAL_STEPS, stepSkipped, nextIndex, stepDone } from '../src/tutorial.js';
import { newWorld, addAnimal } from '../src/state.js';

const fresh = () => { const w = newWorld('T', 1, 1); addAnimal(w, 'gallina', 0, 'adult'); return w; };

test('los pasos tienen id único, texto corto y acciones válidas', () => {
  assert.equal(new Set(TUTORIAL_STEPS.map((s) => s.id)).size, TUTORIAL_STEPS.length);
  for (const s of TUTORIAL_STEPS) {
    assert.ok(s.text.length > 10 && s.text.length <= 200, `${s.id}: ${s.text.length} letras`);
    assert.ok([undefined, 'select', 'feed', 'pet'].includes(s.act), s.id);
    assert.ok([undefined, 0, 1, 2].includes(s.mood), s.id);
    if (s.act === 'select') assert.equal(s.target, 'animal');
  }
});

test('lo que ilumina el tutorial existe en index.html o en la interfaz', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  for (const s of TUTORIAL_STEPS.filter((x) => x.target && x.target !== 'animal')) {
    const [raíz, ...resto] = s.target.split(' ');
    if (raíz === '#selected') { // dentro de la tarjeta: se busca la clase o el data-key en ui.js
      const parte = resto.join(' ');
      const clave = parte.startsWith('.') ? `'${parte.slice(1)}'` : parte.match(/data-key="(\w+)"/)[1];
      assert.ok(ui.includes(clave), `${s.id}: ${parte} no está en ui.js`);
      assert.ok(html.includes('id="selected"'), s.id);
    } else if (raíz.startsWith('#')) assert.ok(html.includes(`id="${raíz.slice(1)}"`), `${s.id}: ${raíz}`);
    else assert.ok(html.includes(raíz.slice(1, -1).replace(/"/g, '"')), `${s.id}: ${raíz}`);
  }
});

test('los pasos con panel abren un panel que existe', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  const paneles = TUTORIAL_STEPS.filter((x) => x.panel);
  assert.deepEqual(paneles.map((x) => x.panel), ['pack', 'shop', 'quests', 'vet', 'world']);
  for (const x of paneles) assert.ok(ui.includes(`${x.panel}: [`), `${x.id}: el panel ${x.panel} no existe`);
  assert.deepEqual(TUTORIAL_STEPS.filter((x) => x.scene).map((x) => x.scene), ['mapa']);
});

test('sin animales se saltan los pasos de la tarjeta; sin comida, el de comer', () => {
  const vacio = newWorld('T', 1, 1);
  vacio.animals = []; // una partida nueva ya trae animales
  const sinAnimales = TUTORIAL_STEPS.filter((s) => stepSkipped(s, vacio)).map((s) => s.id);
  assert.deepEqual(sinAnimales, ['tocar', 'tarjeta', 'comer', 'acariciar', 'corazones']);
  const w = fresh();
  assert.ok(!stepSkipped(TUTORIAL_STEPS.find((s) => s.id === 'comer'), w), 'con grano sí se enseña');
  w.foods = {};
  assert.ok(stepSkipped(TUTORIAL_STEPS.find((s) => s.id === 'comer'), w));
});

test('nextIndex avanza saltando lo que no toca y termina al final', () => {
  const w = fresh();
  w.foods = {};
  const idx = (id) => TUTORIAL_STEPS.findIndex((s) => s.id === id);
  assert.equal(nextIndex(idx('tarjeta'), w), idx('acariciar'), 'se salta comer');
  assert.equal(nextIndex(TUTORIAL_STEPS.length - 1, w), TUTORIAL_STEPS.length);
  let i = 0, vistos = 1;
  while ((i = nextIndex(i, w)) < TUTORIAL_STEPS.length) vistos++;
  assert.equal(vistos, TUTORIAL_STEPS.length - 1);
});

test('cada acción se da por hecha solo cuando el jugador la hace', () => {
  const w = fresh();
  const base = { fed: w.stats.fed, petted: w.stats.petted };
  const paso = (id) => TUTORIAL_STEPS.find((s) => s.id === id);
  assert.equal(stepDone(paso('tocar'), { w, selectedId: null, base }), false);
  assert.equal(stepDone(paso('tocar'), { w, selectedId: 1, base }), true);
  assert.equal(stepDone(paso('comer'), { w, selectedId: 1, base }), false);
  w.stats.fed++;
  assert.equal(stepDone(paso('comer'), { w, selectedId: 1, base }), true);
  assert.equal(stepDone(paso('acariciar'), { w, selectedId: 1, base }), false);
  w.stats.petted++;
  assert.equal(stepDone(paso('acariciar'), { w, selectedId: 1, base }), true);
  assert.equal(stepDone(paso('hola'), { w, selectedId: 1, base }), false, 'un paso sin acción nunca avanza solo');
});

// ---- mini lecciones por mecánica nueva
import { LESSONS, lessonDue, pastLessons, lessonOpen } from '../src/tutorial.js';
import { CHARACTERS } from '../src/data.js';

test('las lecciones están bien formadas: narrador existente, ids únicos y textos cortos', () => {
  assert.equal(new Set(LESSONS.map((l) => l.id)).size, LESSONS.length);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  for (const l of LESSONS) {
    assert.ok(CHARACTERS[l.who], `${l.id}: narrador`);
    assert.ok(l.steps.length >= 2 && l.title, l.id);
    for (const s of l.steps) {
      assert.ok(s.text.length > 10 && s.text.length <= 200, `${l.id}/${s.id}: ${s.text.length} letras`);
      if (s.target && s.target !== 'animal') {
        const [raíz] = s.target.split(' ');
        if (raíz === '#selected') assert.ok(ui.includes(s.target.match(/data-key="(\w+)"/)?.[1] ?? s.target.split('.')[1]), `${l.id}/${s.id}`);
        else assert.ok(html.includes(`id="${raíz.slice(1)}"`), `${l.id}/${s.id}`);
      }
    }
  }
});

test('cada lección sale en su capítulo (o al abrir el Laboratorio), una vez y en orden', () => {
  const w = fresh();
  assert.equal(lessonDue(w, {}, 1), null, 'en el capítulo 1 solo está el tutorial');
  assert.equal(lessonDue(w, {}, 2).id, 'vender');
  assert.equal(lessonDue(w, { vender: true }, 2).id, 'criadero');
  assert.equal(lessonDue(w, { vender: true, criadero: true }, 3).id, 'salud');
  const hasta3 = { vender: true, criadero: true, salud: true };
  assert.equal(lessonDue(w, hasta3, 5), null, 'el laboratorio espera a abrirse');
  w.lab.built = true;
  assert.equal(lessonDue(w, hasta3, 5).id, 'lab');
  assert.equal(lessonDue(w, { ...hasta3, lab: true }, 6).id, 'mao');
  assert.equal(lessonDue(w, { ...hasta3, lab: true, mao: true }, 8).id, 'estacion');
});

test('una partida avanzada no repite las lecciones de capítulos anteriores, pero puede verlas desde Mundo', () => {
  assert.deepEqual(Object.keys(pastLessons(3)).sort(), ['criadero', 'vender']);
  assert.deepEqual(pastLessons(1), {});
  const w = fresh();
  assert.equal(lessonOpen(w, LESSONS.find((l) => l.id === 'mao'), 5), false);
  assert.equal(lessonOpen(w, LESSONS.find((l) => l.id === 'mao'), 6), true);
  assert.equal(lessonOpen(w, LESSONS.find((l) => l.id === 'lab'), 9), false);
});
