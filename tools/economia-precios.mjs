// Compara tiempo de producción y precio de productos: dinero por hora (inicio, mediana, avanzada) y ritmo de misiones. Uso: node tools/economia-precios.mjs
// Ojo: parte de los precios/tiempos que haya en data.js y los multiplica por cada fila de la tabla.
import { newWorld, addAnimal, addCorral } from '../src/state.js';
import * as sim from '../src/sim.js';
import { SPECIES, PRODUCTS, FOODS, MIN } from '../src/data.js';
const base = { prod: Object.fromEntries(Object.entries(SPECIES).map(([k, v]) => [k, v.prod])), price: Object.fromEntries(Object.entries(PRODUCTS).map(([k, v]) => [k, v.price])) };
const ajustar = (tProd, pPrecio) => { for (const k in SPECIES) SPECIES[k].prod = base.prod[k] * tProd; for (const k in PRODUCTS) PRODUCTS[k].price = Math.max(1, Math.round(base.price[k] * pPrecio)); };
const mk = (animales) => { const w = newWorld('T', 1_700_000_000_000, 3); w.animals.length = 0; w.eggs.length = 0;
  for (const t of ['bosque', 'estanque', 'jurasico', 'valle']) addCorral(w, t); for (const c of w.corrales) c.nivel = 2;
  for (const [s, n] of Object.entries(animales)) for (let i = 0; i < n; i++) addAnimal(w, s, 0, 'adult');
  for (const a of w.animals) { a.fed = 100; a.happy = 100; } w.coins = 0; return w; };
const vender = (w) => { let g = 0; for (const p of Object.keys(w.products)) g += sim.sell(w, p).gain || 0; return g; };
function activo(animales, horas = 2) { const w = mk(animales); let ing = 0;
  for (let m = 0; m < horas * 60; m += 2) { for (let t = 0; t < 2 * MIN; t += 30000) { for (const a of w.animals) a.fed = 100; sim.tick(w, 30000, { live: true }); } sim.collectAll(w); ing += vender(w); }
  return Math.round(ing / horas); }
function minHasta(animales, meta) { const w = mk(animales); let m = 0; while (w.coins < meta && m < 600) { for (let t = 0; t < 30000 * 4; t += 30000) { for (const a of w.animals) a.fed = 100; sim.tick(w, 30000, { live: true }); } m += 2; sim.collectAll(w); w.coins += vender(w); } return m; }
const MEDIA = { gallina: 4, gato: 2, vaca: 2, mapache: 2, pato: 2, chanchito: 2 };
const INICIO = { gallina: 2 };
const TARDE = { gallina: 4, gato: 2, vaca: 2, mapache: 2, pato: 2, chanchito: 2, carnotauro: 2, spinosaurus: 2, triceratops: 2, estegosaurio: 2 };
console.log('tiempoProd × | precio × | inicio (2 gallinas): €/h, min a 80 | media (14): €/h, min a 700 | tarde (24): €/h | misión 4 escamas (1 carnotauro, min)');
for (const [tp, pp] of [[1, 1], [2, 1], [3, 1], [1, 0.5], [1, 0.35], [1.5, 0.5], [2, 0.5]]) {
  ajustar(tp, pp);
  const esc = Math.round(SPECIES.carnotauro.prod / MIN * 4);
  console.log(`${String(tp).padStart(4)} | ${String(pp).padStart(5)} | ${String(activo(INICIO)).padStart(5)} €/h, ${String(minHasta(INICIO, 80)).padStart(3)} min | ${String(activo(MEDIA)).padStart(5)} €/h, ${String(minHasta(MEDIA, 700)).padStart(3)} min | ${String(activo(TARDE)).padStart(5)} €/h | ${esc} min`);
}
