// Simulación de economía: cuánto dinero da jugar activo frente a dejarlo ausente (AFK). Uso: node tools/economia.mjs
// Sirve para ajustar BALANCE (maxReady, afkMaxReady, precios) mirando números en vez de a ojo.
import { newWorld, addAnimal, addCorral } from '../src/state.js';
import * as sim from '../src/sim.js';
import { SPECIES, FOODS, BALANCE, MIN } from '../src/data.js';
const GRANJA = { gallina: 4, gato: 2, vaca: 2, mapache: 2, pato: 2, chanchito: 2 };
function granja(seed = 3) {
  const w = newWorld('T', 1_700_000_000_000, seed);
  w.animals.length = 0; w.eggs.length = 0;
  for (const t of ['bosque', 'estanque']) addCorral(w, t);
  for (const t of ['pradera', 'bosque', 'estanque']) w.corrales.find((c) => c.tipo === t).nivel = 2;
  for (const [s, n] of Object.entries(GRANJA)) for (let i = 0; i < n; i++) addAnimal(w, s, 0, 'adult');
  for (const a of w.animals) { a.fed = 100; a.happy = 100; }
  w.coins = 0; w.foods = {};
  return w;
}
const vender = (w) => { let g = 0; for (const p of Object.keys(w.products)) g += sim.sell(w, p).gain || 0; return g; };
function alimentar(w) { let gasto = 0; for (const a of w.animals) if (a.fed < 50) { const f = SPECIES[a.species].food; gasto += FOODS[f].price; w.foods[f] = (w.foods[f] || 0) + 1; sim.feed(w, a.id, f); } return gasto; }
// A) activo: cada `cada` min recoge, vende y alimenta, durante `horas`
function activo(cada, horas) {
  const w = granja(); let ingreso = 0, gasto = 0;
  for (let m = 0; m < horas * 60; m += cada) {
    for (let t = 0; t < cada * MIN; t += 30000) sim.tick(w, 30000, { live: true });
    sim.collectAll(w); ingreso += vender(w); gasto += alimentar(w);
  }
  return { ingreso, gasto, neto: ingreso - gasto, porHora: Math.round((ingreso - gasto) / horas) };
}
// B) ausente: nadie toca nada `horas` horas (sin conexión o con la pestaña abierta) y al volver recoge y vende
function ausente(horas, live) {
  const w = granja();
  for (let t = 0; t < horas * 60 * MIN; t += 30000) sim.tick(w, 30000, { live });
  sim.collectAll(w);
  const productos = Object.values(w.products).reduce((a, b) => a + b, 0);
  return { productos, monedas: vender(w) };
}
console.log('maxReady =', BALANCE.maxReady, '| animales:', Object.values(GRANJA).reduce((a, b) => a + b));
for (const c of [1, 2, 5, 15, 30]) console.log(`activo, recoge cada ${c} min (3 h):`, JSON.stringify(activo(c, 3)));
for (const h of [0.25, 1, 8]) console.log(`ausente ${h} h sin conexión:`, JSON.stringify(ausente(h, false)), '| con pestaña abierta:', JSON.stringify(ausente(h, true)));

// ---- escenarios de un día con tope de productos distinto cuando el jugador está ausente
function dia(capAusente, escenario) {
  const w = granja(); let ingreso = 0, gasto = 0;
  const avanzar = (min, presente) => {
    for (let t = 0; t < min * MIN; t += 30000) {
      const afk = !presente;
      BALANCE.afkMaxReady = capAusente;
      sim.tick(w, 30000, { live: presente, afk });
    }
  };
  const sesion = (min) => { // juega `min` minutos recogiendo cada 2
    for (let m = 0; m < min; m += 2) { avanzar(2, true); sim.collectAll(w); ingreso += vender(w); gasto += alimentar(w); }
  };
  for (const [tipo, min] of escenario) { if (tipo === 'juega') sesion(min); else { avanzar(min, false); sim.collectAll(w); ingreso += vender(w); gasto += alimentar(w); } }
  return Math.round(ingreso - gasto);
}
const horas = (h) => ['ausente', h * 60];
const ESC = {
  'activo 2 h + ausente 22 h': [['juega', 120], horas(22)],
  '6 visitas de 5 min cada 3 h': Array.from({ length: 6 }, () => [['juega', 6], horas(3)]).flat(),
  'solo mira: 1 visita de 1 min cada hora (24)': Array.from({ length: 24 }, () => [['juega', 2], horas(1)]).flat(),
  'AFK total 24 h con 1 sola visita': [horas(24)],
};
for (const [n, e] of Object.entries(ESC)) console.log(n.padEnd(46), 'tope 3 ausente:', String(dia(3, e)).padStart(6), '| tope 1 ausente:', String(dia(1, e)).padStart(6));
