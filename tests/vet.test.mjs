// Veterinaria interactiva: doctora de turno, confianza, «Ayudar a la doctora», consulta, chequeo, protección y pedido.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BALANCE, QUESTS, VET_LINES, PRODUCTS, DISEASES } from '../src/data.js';
import { newWorld, addAnimal, validateWorld } from '../src/state.js';
import * as sim from '../src/sim.js';
import { latidoPos, latidoHit, herbRound, herbOk, HERBS, LATIDO } from '../src/vetgames.js';

const enCap = (hasta) => {
  const w = newWorld('T', 1, 1);
  for (const q of QUESTS) { if (q.id === hasta) break; w.quests.claimed[q.id] = true; }
  w.coins = 1000;
  return w;
};
const enfermo = (w, d = 'resfriado') => { const a = w.animals[0]; a.sick = d; return a; };

test('la doctora de turno es Pita hasta el capítulo 5 y Mao Mao desde el 6', () => {
  assert.equal(sim.vetDoctor(enCap('c1-carta')), 'pita');
  assert.equal(sim.vetDoctor(enCap('c5-festival')), 'pita');
  assert.equal(sim.vetDoctor(enCap('c6-camino')), 'mao');
});

test('cada doctora tiene todas sus frases, con los datos reemplazados', () => {
  for (const doc of ['pita', 'mao']) {
    for (const k of ['saludo', 'enfermos', 'hambre', 'triste', 'criadero', 'bien', 'curaOk', 'curaMal', 'escudo', 'pedido']) {
      assert.ok(VET_LINES[doc][k].length >= 1, `${doc}.${k}`);
    }
    for (const d of Object.keys(DISEASES)) assert.ok(VET_LINES[doc].diag[d], `${doc} diagnostica ${d}`);
  }
  const w = enCap('c1-carta');
  assert.match(sim.vetLine(w, 'hambre', { nombre: 'Pepita' }), /Pepita/);
  assert.doesNotMatch(sim.vetLine(w, 'pedido', { n: 3, producto: 'huevos' }), /\{/);
});

test('curar cuesta menos con más confianza (5 % por nivel, tope en 4)', () => {
  const w = enCap('c1-carta');
  const a = enfermo(w);
  const base = BALANCE.cureCost.resfriado;
  assert.equal(sim.vetCureCost(w, a), base);
  w.vet.trust.pita = BALANCE.vetTrustPerLevel * 2;
  assert.equal(sim.vetCureCost(w, a), Math.round(base * 0.9));
  w.vet.trust.pita = 9999;
  assert.equal(sim.vetCureCost(w, a), Math.round(base * 0.8));
  w.coins = 1000;
  assert.ok(sim.cure(w, a.id).ok);
  assert.equal(w.coins, 1000 - Math.round(base * 0.8), 'curar directo también usa el descuento');
});

test('Ayudar a la doctora: sin aciertos se pierde la consulta; con más aciertos, más reembolso y confianza', () => {
  const costo = BALANCE.cureCost.resfriado;
  const prueba = (wins) => { const w = enCap('c1-carta'); const a = enfermo(w); const r = sim.cureHelping(w, a.id, wins); return { w, a, r, gasto: 1000 - w.coins }; };
  const cero = prueba(0);
  assert.equal(cero.r.ok, false);
  assert.equal(cero.a.sick, 'resfriado', 'no se cura');
  assert.equal(cero.gasto, costo, 'y se pierde lo de la consulta');
  const uno = prueba(1);
  assert.ok(uno.r.ok && uno.a.sick === null);
  assert.equal(uno.gasto, costo, 'se cura sin reembolso');
  assert.equal(prueba(2).gasto, costo - Math.round(costo * 0.25));
  const tres = prueba(3);
  assert.equal(tres.gasto, costo - Math.round(costo * 0.5));
  assert.equal(tres.w.vet.trust.pita, 1, 'ganar sube la confianza');
  assert.equal(prueba(1).w.vet.trust.pita, 0, 'con un solo acierto no');
  assert.equal(prueba(99).gasto, tres.gasto, 'los aciertos se acotan a las rondas');
  const sinMonedas = enCap('c1-carta'); sinMonedas.coins = 1; enfermo(sinMonedas);
  assert.equal(sim.cureHelping(sinMonedas, sinMonedas.animals[0].id, 3).ok, false);
  assert.equal(sim.cureHelping(enCap('c1-carta'), 99999, 3).ok, false);
});

test('Consulta: gratis, aconseja según la granja y la confianza sube hasta el tope diario', () => {
  const w = enCap('c1-carta');
  w.animals.forEach((a) => { a.fed = 90; a.happy = 90; });
  const monedas = w.coins;
  assert.ok(sim.vetConsult(w, '2026-05-01').ok);
  assert.ok(sim.vetConsult(w, '2026-05-01').ok);
  assert.equal(sim.vetConsult(w, '2026-05-01').gained, false, 'tope diario');
  assert.equal(w.vet.trust.pita, BALANCE.vetConsultsPerDay);
  assert.equal(w.coins, monedas, 'no cuesta');
  assert.equal(sim.vetConsult(w, '2026-05-02').gained, true, 'al día siguiente vuelve a sumar');
  w.animals[0].fed = 5;
  assert.match(sim.vetGreeting(w), new RegExp(w.animals[0].name), 'avisa del que tiene hambre');
  w.animals[1].sick = 'pulgas';
  assert.equal(sim.vetGreeting(w), sim.vetLine(w, 'enfermos'), 'si hay enfermos, lo primero son ellos');
});

test('Chequeo: cobra, informa y calcula el riesgo (la protección lo baja a cero)', () => {
  const w = enCap('c1-carta');
  const a = w.animals[0]; a.fed = 80; a.happy = 80;
  const r = sim.vetCheckup(w, a.id);
  assert.ok(r.ok);
  assert.equal(w.coins, 1000 - BALANCE.vetCheckupCost);
  const base = Object.values(BALANCE.sickBasePerHour).reduce((t, x) => t + x, 0);
  assert.equal(r.report.risk, Math.round((1 - Math.exp(-base)) * 100));
  w.vet.shield = 1000;
  assert.equal(sim.vetCheckup(w, a.id).report.risk, 0);
  a.happy = 5;
  w.vet.shield = 0;
  assert.ok(sim.vetCheckup(w, a.id).report.risk > 60, 'muy triste: riesgo altísimo');
  a.sick = 'pancita';
  assert.equal(sim.vetCheckup(w, a.id).report.risk, null, 'si ya está enfermo no hay riesgo que medir');
  w.coins = 0;
  assert.equal(sim.vetCheckup(w, a.id).ok, false);
});

test('Protección: Pita con monedas, Mao Mao con productos; frena resfriados y pulgas solo con el juego abierto', () => {
  const p = enCap('c1-carta');
  assert.ok(sim.vetShield(p).ok);
  assert.equal(p.coins, 1000 - BALANCE.vetVitaminCost);
  assert.equal(p.vet.shield, BALANCE.vetShieldMs);
  assert.equal(sim.vetShield(p).ok, false, 'ya está protegido');
  const m = enCap('c6-camino');
  assert.equal(sim.vetShield(m).ok, false, 'sin productos no hay tónico');
  m.products = { huevo: 3, lana: 2 };
  assert.ok(sim.vetShield(m).ok);
  assert.equal(Object.values(m.products).reduce((t, n) => t + n, 0), 1, 'gasta 4 productos');
  assert.equal(m.coins, 1000, 'sin gastar monedas');
  sim.tick(p, 60_000, { live: true });
  assert.equal(p.vet.shield, BALANCE.vetShieldMs - 60_000);
  sim.tick(p, 60_000);
  assert.equal(p.vet.shield, BALANCE.vetShieldMs - 60_000, 'sin conexión no corre el tiempo');
  const g = enCap('c1-carta');
  g.vet.shield = BALANCE.vetShieldMs * 1000;
  g.animals = [];
  for (let i = 0; i < 40; i++) { const a = addAnimal(g, 'gallina', 0, 'adult'); a.fed = 100; a.happy = 100; }
  for (let t = 0; t < 20 * 60 * 60 * 1000; t += 60_000) { for (const a of g.animals) { a.fed = 100; a.happy = 100; } sim.tick(g, 60_000, { live: true }); }
  assert.equal(g.animals.filter((a) => a.sick).length, 0, 'con protección nadie se resfría ni tiene pulgas');
});

test('Pedido: uno por día, con un producto que ya recogiste, y entregarlo paga y sube la confianza', () => {
  const w = enCap('c1-carta');
  w.stats.collected = { huevo: 5, leche: 2 };
  const r = sim.vetRequest(w, '2026-06-01');
  assert.ok(['huevo', 'leche'].includes(r.product));
  assert.equal(r.coins, Math.round(r.n * PRODUCTS[r.product].price * BALANCE.vetRequestMul));
  assert.equal(sim.vetRequest(w, '2026-06-01'), r, 'mismo pedido todo el día');
  assert.equal(sim.vetDeliver(w).ok, false, 'sin el producto');
  w.products[r.product] = r.n + 1;
  const antes = w.coins;
  assert.ok(sim.vetDeliver(w).ok);
  assert.equal(w.coins, antes + r.coins);
  assert.equal(w.products[r.product], 1);
  assert.equal(w.vet.trust.pita, 1);
  assert.equal(sim.vetDeliver(w).ok, false, 'solo una vez por día');
  assert.notEqual(sim.vetRequest(w, '2026-06-02'), r, 'al día siguiente, otro pedido');
});

test('minijuegos: el ritmo va y viene y las rondas de hierbas siempre se pueden resolver', () => {
  assert.equal(latidoPos(0), 0);
  assert.ok(Math.abs(latidoPos(LATIDO.period) - 1) < 1e-9);
  assert.ok(Math.abs(latidoPos(LATIDO.period * 2) - 0) < 1e-9, 'vuelve al inicio');
  for (let t = 0; t < 10_000; t += 37) { const p = latidoPos(t); assert.ok(p >= 0 && p <= 1); }
  assert.ok(latidoHit(0.5) && !latidoHit(0.1) && !latidoHit(0.9));
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const rnd = (() => { let s = i * 7919 + 13; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();
    const ronda = herbRound(rnd);
    assert.equal(new Set(ronda.need).size, 2, 'pide dos propiedades distintas');
    const pares = HERBS.flatMap((a, x) => HERBS.slice(x + 1).map((b) => [a.id, b.id]));
    if (pares.some((par) => herbOk(ronda, par))) n++;
  }
  assert.equal(n, 400, 'siempre hay al menos un par que lo resuelve');
  const r = { need: ['dulce', 'seca'] };
  assert.ok(herbOk(r, ['zanahoria', 'grano']) || herbOk(r, ['bayas', 'grano']));
  assert.equal(herbOk(r, ['bayas', 'bayas']), false);
  assert.equal(herbOk(r, ['bayas']), false);
});

test('guardar y cargar conserva la Veterinaria y limpia lo raro', () => {
  const w = enCap('c1-carta');
  w.vet.trust.mao = 7; w.vet.shield = 1234; w.vet.say = 'Hola';
  sim.vetRequest(w, '2026-07-01');
  const v = validateWorld(JSON.parse(JSON.stringify(w)), 0);
  assert.equal(v.vet.trust.mao, 7);
  assert.equal(v.vet.shield, 1234);
  assert.equal(v.vet.request.day, '2026-07-01');
  const raro = JSON.parse(JSON.stringify(w));
  raro.vet = { trust: { pita: -5, mao: 'x' }, shield: 1e12, say: 'x'.repeat(999), request: { product: 'dinero', n: 99 } };
  const limpio = validateWorld(raro, 0);
  assert.deepEqual(limpio.vet.trust, { pita: 0, mao: 0 });
  assert.equal(limpio.vet.shield, BALANCE.vetShieldMs);
  assert.equal(limpio.vet.say.length, 200);
  assert.equal(limpio.vet.request, null);
  assert.equal(validateWorld(JSON.parse(JSON.stringify({ ...w, vet: undefined })), 0).vet.say, '', 'una partida vieja no tiene Veterinaria');
});
