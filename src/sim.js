// Reglas del juego. Todo depende del tiempo transcurrido (dt) y del aleatorio con semilla
// guardado en el mundo, así que el mismo código sirve para el progreso sin conexión
// y para trasladarse a un servidor sin cambios.

import { SPECIES, FOODS, PRODUCTS, BALANCE, AREA, CORRAL_COSTS, POND_COST, POND } from './data.js';
import { rand, randInt, chance } from './rng.js';
import { addAnimal, capacityFor, inPond } from './state.js';

const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });

export const spaceUsed = (w) => w.animals.length + w.eggs.length;
export const hasSpace = (w) => spaceUsed(w) < w.capacity;
export const find = (w, id) => w.animals.find((a) => a.id === id);

/** Avanza la simulación dt milisegundos. Devuelve eventos para mostrar avisos. */
export function tick(w, dt) {
  const events = [];
  const s = dt / 1000;
  const B = BALANCE;
  const crowded = spaceUsed(w) > w.capacity;

  for (const a of w.animals) {
    const sp = SPECIES[a.species];
    a.fed = Math.max(0, a.fed - B.fedDecayPerSec * s);
    if (a.fed >= 50) a.happy = Math.min(100, a.happy + B.happyUpPerSec * s);
    else if (a.fed < 25) a.happy = Math.max(0, a.happy - B.happyDownPerSec * s);
    if (crowded) a.happy = Math.max(0, a.happy - B.crowdPenaltyPerSec * s);
    if (a.petCd > 0) a.petCd = Math.max(0, a.petCd - dt);
    if (a.cool > 0) a.cool = Math.max(0, a.cool - dt);

    if (a.stage === 'baby') {
      if (a.fed > 0) a.growth += dt;
      if (a.growth >= sp.grow) {
        a.stage = 'adult';
        a.growth = 0;
        events.push({ type: 'grown', animal: a });
      }
    } else if (a.ready < B.maxReady && a.fed > 0 && a.happy >= 30) {
      a.prod += dt * (a.happy >= 60 ? 1 : 0.5);
      while (a.prod >= sp.prod && a.ready < B.maxReady) {
        a.prod -= sp.prod;
        a.ready++;
        events.push({ type: 'ready', animal: a });
      }
      if (a.ready >= B.maxReady) a.prod = 0;
    }
  }

  // eclosión
  for (let i = w.eggs.length - 1; i >= 0; i--) {
    const e = w.eggs[i];
    e.left -= dt;
    if (e.left <= 0) {
      w.eggs.splice(i, 1);
      const baby = addAnimal(w, e.species, e.variant, 'baby', { shiny: e.shiny, pos: { x: e.x, y: e.y } });
      w.stats.born[e.species] = (w.stats.born[e.species] || 0) + 1;
      w.stats.bornTotal++;
      events.push({ type: 'hatch', animal: baby });
    }
  }

  // cría: parejas de la misma especie, felices y comidas
  for (const species of Object.keys(SPECIES)) {
    const ready = w.animals.filter((a) =>
      a.species === species && a.stage === 'adult' && a.cool <= 0 &&
      a.fed >= B.minFedToBreed && a.happy >= B.minHappyToBreed);
    while (ready.length >= 2 && hasSpace(w)) {
      const a = ready.shift();
      const b = ready.shift();
      const sp = SPECIES[species];
      const parent = chance(w, 0.5) ? a : b;
      let variant = parent.variant;
      if (sp.variants.length > 1 && chance(w, B.mutationChance)) variant = (variant + 1) % sp.variants.length;
      const shiny = chance(w, a.shiny || b.shiny ? B.shinyChanceParent : B.shinyChance);
      w.eggs.push({
        id: w.nextId++, species, variant, shiny, left: sp.breed,
        x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      });
      a.cool = b.cool = sp.breed * 2;
      w.stats.breedStarted++;
      events.push({ type: 'egg', species });
    }
  }
  return events;
}

// ------------------------------------------------------------------ acciones
export function feed(w, id, food) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (!FOODS[food]) return no('Esa comida no existe.');
  if (!(w.foods[food] > 0)) return no(`No te queda ${FOODS[food].nombre.toLowerCase()}.`);
  if (a.fed >= 95) return no(`${a.name} está llenito.`);
  const fav = SPECIES[a.species].food === food;
  w.foods[food]--;
  if (!w.foods[food]) delete w.foods[food];
  a.fed = Math.min(100, a.fed + (fav ? BALANCE.favFeed : BALANCE.otherFeed));
  a.happy = Math.min(100, a.happy + (fav ? BALANCE.favHappy : BALANCE.otherHappy));
  w.stats.fed++;
  return ok(fav ? `¡${a.name} amó ${FOODS[food].nombre.toLowerCase()}!` : `${a.name} comió ${FOODS[food].nombre.toLowerCase()}.`, { fav });
}

export function pet(w, id) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (a.petCd > 0) return no(`${a.name} ya recibió mimos hace un ratito.`);
  a.happy = Math.min(100, a.happy + BALANCE.petHappy);
  a.petCd = BALANCE.petCooldown;
  w.stats.petted++;
  return ok(`${a.name} está feliz.`);
}

export function collect(w, id) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (a.ready < 1) return no(`${a.name} todavía no tiene nada.`);
  const product = SPECIES[a.species].product;
  const n = a.shiny ? 2 : 1;
  a.ready--;
  w.products[product] = (w.products[product] || 0) + n;
  w.stats.collected[product] = (w.stats.collected[product] || 0) + n;
  return ok(`+${n} ${PRODUCTS[product].nombre.toLowerCase()}`, { product, n });
}

export function collectAll(w) {
  let total = 0;
  for (const a of w.animals) while (a.ready > 0) { collect(w, a.id); total++; }
  return total ? ok(`Recogiste ${total} producto${total > 1 ? 's' : ''}.`) : no('Nada listo para recoger.');
}

export function sell(w, product, n = Infinity) {
  if (!PRODUCTS[product]) return no('Ese producto no existe.');
  const have = w.products[product] || 0;
  const qty = Math.min(have, n);
  if (qty < 1) return no('No tienes de eso.');
  const gain = qty * PRODUCTS[product].price;
  w.products[product] = have - qty;
  if (!w.products[product]) delete w.products[product];
  w.coins += gain;
  w.stats.sold += qty;
  return ok(`Vendiste ${qty} por ${gain} monedas.`, { gain, qty });
}

export function buyFood(w, food, n = 1) {
  if (!FOODS[food]) return no('Esa comida no existe.');
  const cost = FOODS[food].price * n;
  if (w.coins < cost) return no('Te faltan monedas.');
  w.coins -= cost;
  w.foods[food] = (w.foods[food] || 0) + n;
  return ok(`Compraste ${n} de ${FOODS[food].nombre.toLowerCase()}.`);
}

export function canBuyAnimal(w, species) {
  const sp = SPECIES[species];
  if (!sp) return no('Esa especie no existe.');
  if (!w.unlocked.includes(species)) return no('Todavía no la conoces: avanza en la historia.');
  if (sp.price == null) return no('No se vende: llega por la historia.');
  if (sp.aquatic && !w.upgrades.estanque) return no('Necesita un estanque.');
  if (!hasSpace(w)) return no('No hay espacio: amplía el corral.');
  if (w.coins < sp.price) return no('Te faltan monedas.');
  return ok('');
}

export function buyAnimal(w, species) {
  const c = canBuyAnimal(w, species);
  if (!c.ok) return c;
  const sp = SPECIES[species];
  w.coins -= sp.price;
  const a = addAnimal(w, species, randInt(w, sp.variants.length), 'baby');
  w.stats.bought[species] = (w.stats.bought[species] || 0) + 1;
  return ok(`¡${a.name} se unió a la granja!`, { animal: a });
}

export function upgradeInfo(w) {
  const lvl = w.upgrades.corral;
  return {
    corralCost: lvl < CORRAL_COSTS.length ? CORRAL_COSTS[lvl] : null,
    corralLevel: lvl,
    pondCost: w.upgrades.estanque ? null : POND_COST,
  };
}

export function buyUpgrade(w, key) {
  if (key === 'corral') {
    const cost = upgradeInfo(w).corralCost;
    if (cost == null) return no('El corral ya es lo más grande posible.');
    if (w.coins < cost) return no('Te faltan monedas.');
    w.coins -= cost;
    w.upgrades.corral++;
    w.capacity = capacityFor(w.upgrades.corral);
    return ok(`Corral ampliado: ahora caben ${w.capacity}.`);
  }
  if (key === 'estanque') {
    if (w.upgrades.estanque) return no('Ya tienes estanque.');
    if (w.coins < POND_COST) return no('Te faltan monedas.');
    w.coins -= POND_COST;
    w.upgrades.estanque = true;
    // los animales de tierra que estaban en esa zona salen del agua
    for (const a of w.animals) {
      if (!SPECIES[a.species].aquatic && inPond(a.x, a.y)) { a.x = POND.x0 - 16; a.tx = a.x; }
    }
    return ok('¡Estanque construido!');
  }
  return no('Mejora desconocida.');
}

// ------------------------------------------------------------------ paseo
/** Movimiento visual; no afecta a la economía y no se simula sin conexión. */
export function wander(w, dt) {
  if (!(dt > 0)) return;
  for (const a of w.animals) {
    if (a.wait > 0) { a.wait -= dt; continue; }
    const dx = a.tx - a.x, dy = a.ty - a.y;
    const dist = Math.hypot(dx, dy);
    const step = (a.stage === 'baby' ? 18 : 13) * dt / 1000;
    if (dist < 0.001 || dist <= step) {
      a.x = a.tx; a.y = a.ty;
      a.wait = 800 + Math.random() * 3500;
      pickTarget(w, a);
    } else {
      a.x += (dx / dist) * step;
      a.y += (dy / dist) * step;
    }
  }
}

function pickTarget(w, a) {
  const aquatic = SPECIES[a.species].aquatic && w.upgrades.estanque;
  for (let i = 0; i < 8; i++) {
    let x, y;
    if (aquatic && Math.random() < 0.8) {
      x = POND.x0 + 16 + Math.random() * (POND.x1 - POND.x0 - 32);
      y = POND.y0 + 24 + Math.random() * (POND.y1 - POND.y0 - 28);
    } else {
      x = AREA.x0 + Math.random() * (AREA.x1 - AREA.x0);
      y = AREA.y0 + Math.random() * (AREA.y1 - AREA.y0);
    }
    if (aquatic || !(w.upgrades.estanque && inPond(x, y))) {
      a.tx = x; a.ty = y;
      return;
    }
  }
}

export { rand };
