// Reglas del juego. Todo depende del tiempo transcurrido (dt) y del aleatorio con semilla
// guardado en el mundo, así que el mismo código sirve para el progreso sin conexión
// y para trasladarse a un servidor sin cambios.

import {
  SPECIES, FOODS, PRODUCTS, BALANCE, CORRAL_COSTS, CORRAL_TYPES, CORRAL_TYPE_ORDER, MAX_CORRAL_LEVEL, corralTypeOf,
  COMMON_VARIANTS, VARIANT_TIERS, rarityOf,
} from './data.js';
import { rand, randInt, chance } from './rng.js';
import { addAnimal, addCorral, capacityOf, getCorral, corralOfSpecies, cleanName } from './state.js';

const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });

/** Animales y huevos que ocupan lugar en un corral. */
export const spaceUsed = (w, corralId) =>
  w.animals.filter((a) => a.corral === corralId).length + w.eggs.filter((e) => e.corral === corralId).length;
export const hasSpace = (w, corralId) => spaceUsed(w, corralId) < capacityOf(w, corralId);
export const find = (w, id) => w.animals.find((a) => a.id === id);
/** El animal sigue siendo este mismo objeto del mundo (si se cargó otro mundo, ya no). */
export const isCurrent = (w, a) => !!a && find(w, a.id) === a;

/** Texto del aviso de nacimiento: una cría con su nombre y rareza, o varias en un solo aviso. */
export function hatchToast(babies) {
  if (babies.length > 1) return `¡Nacieron ${babies.length} crías! Toca para ver la primera.`;
  const a = babies[0];
  const kind = { poco: 'poco común', raro: 'rara', brillante: 'brillante' }[rarityOf(a)];
  return kind ? `¡Nació ${a.name}, una cría ${kind}!` : `¡Nació ${a.name}! Toca para ponerle nombre.`;
}

/** Avanza la simulación dt milisegundos. Devuelve eventos para mostrar avisos. */
export function tick(w, dt) {
  const events = [];
  const s = dt / 1000;
  const B = BALANCE;
  const crowded = new Set(w.corrales.filter((c) => spaceUsed(w, c.id) > capacityOf(w, c.id)).map((c) => c.id));

  for (const a of w.animals) {
    const sp = SPECIES[a.species];
    a.fed = Math.max(0, a.fed - B.fedDecayPerSec * s);
    if (a.fed >= 50) a.happy = Math.min(100, a.happy + B.happyUpPerSec * s);
    else if (a.fed < 25) a.happy = Math.max(0, a.happy - B.happyDownPerSec * s);
    if (crowded.has(a.corral)) a.happy = Math.max(0, a.happy - B.crowdPenaltyPerSec * s);
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
    const corral = corralOfSpecies(w, species);
    if (!corral) continue;
    const ready = w.animals.filter((a) =>
      a.species === species && a.stage === 'adult' && a.cool <= 0 &&
      a.fed >= B.minFedToBreed && a.happy >= B.minHappyToBreed);
    while (ready.length >= 2 && hasSpace(w, corral.id)) {
      const a = ready.shift();
      const b = ready.shift();
      const sp = SPECIES[species];
      const variant = pickBabyVariant(w, a, b);
      const shiny = chance(w, a.shiny || b.shiny ? B.shinyChanceParent : B.shinyChance);
      w.eggs.push({
        id: w.nextId++, species, corral: corral.id, variant, shiny, left: sp.breed,
        x: (a.x + b.x) / 2, y: (a.y + b.y) / 2,
      });
      a.cool = b.cool = sp.breed * 2;
      w.stats.breedStarted++;
      events.push({ type: 'egg', species });
    }
  }
  return events;
}

/**
 * Color de una cría: hereda el de un padre al azar; con probabilidad `mutationChance` muta
 * a un color poco común o raro (las probabilidades están en BALANCE, en data.js).
 */
export function pickBabyVariant(w, a, b) {
  const inherited = chance(w, 0.5) ? a.variant : b.variant;
  if (!chance(w, BALANCE.mutationChance)) return inherited;
  const tier = chance(w, BALANCE.mutantTierOdds.poco) ? 'poco' : 'raro';
  return VARIANT_TIERS.indexOf(tier);
}

// ------------------------------------------------------------------ acciones
/** Cambia el nombre de un animal. Siempre deja `named` en true. */
export function renameAnimal(w, id, raw) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  const name = cleanName(raw, 24, '');
  if (!name) return no('Escribe un nombre.');
  a.name = name;
  a.named = true;
  return ok(`Ahora se llama ${name}.`, { animal: a });
}

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
  const corral = corralOfSpecies(w, species);
  if (!corral) return no(`Necesita el corral ${CORRAL_TYPES[corralTypeOf(species)].nombre}: constrúyelo en el mapa.`);
  if (!hasSpace(w, corral.id)) return no(`No hay espacio en ${corral.nombre}: amplíalo.`);
  if (w.coins < sp.price) return no('Te faltan monedas.');
  return ok('');
}

export function buyAnimal(w, species) {
  const c = canBuyAnimal(w, species);
  if (!c.ok) return c;
  const sp = SPECIES[species];
  w.coins -= sp.price;
  const a = addAnimal(w, species, randInt(w, COMMON_VARIANTS), 'baby');
  w.stats.bought[species] = (w.stats.bought[species] || 0) + 1;
  return ok(`¡${a.name} se unió a la granja!`, { animal: a });
}

/** Un resumen por tipo de corral, en orden, para la tienda y el mapa. */
export function corralInfo(w) {
  return CORRAL_TYPE_ORDER.map((tipo) => {
    const t = CORRAL_TYPES[tipo];
    const c = getCorral(w, tipo);
    return {
      tipo, nombre: t.nombre, id: c ? c.id : null, built: !!c,
      nivel: c ? c.nivel : 0,
      capacity: c ? capacityOf(w, c.id) : t.cap,
      used: c ? spaceUsed(w, c.id) : 0,
      buildCost: c ? null : t.cost,
      upgradeCost: c && c.nivel < MAX_CORRAL_LEVEL ? CORRAL_COSTS[c.nivel] : null,
    };
  });
}

export function buildCorral(w, tipo) {
  const t = CORRAL_TYPES[tipo];
  if (!t) return no('Ese corral no existe.');
  if (getCorral(w, tipo)) return no(`Ya tienes el corral ${t.nombre}.`);
  if (t.cost == null) return no(`El corral ${t.nombre} llega con la historia.`);
  if (w.coins < t.cost) return no('Te faltan monedas.');
  w.coins -= t.cost;
  const corral = addCorral(w, tipo);
  return ok(`¡Construiste el corral ${t.nombre}!`, { corral });
}

export function upgradeCorral(w, corralId) {
  const c = getCorral(w, corralId);
  if (!c) return no('Ese corral no está construido.');
  if (c.nivel >= MAX_CORRAL_LEVEL) return no('El corral ya es lo más grande posible.');
  const cost = CORRAL_COSTS[c.nivel];
  if (w.coins < cost) return no('Te faltan monedas.');
  w.coins -= cost;
  c.nivel++;
  return ok(`${c.nombre} ampliado: ahora caben ${capacityOf(w, c.id)}.`);
}

/** Cifras de un corral para el mapa y el encabezado. */
export function corralStatus(w, corralId) {
  const here = w.animals.filter((a) => a.corral === corralId);
  return {
    used: spaceUsed(w, corralId), capacity: capacityOf(w, corralId),
    ready: here.reduce((n, a) => n + a.ready, 0),
    hungry: here.filter((a) => a.fed < 30).length,
  };
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
  const { area } = CORRAL_TYPES[getCorral(w, a.corral)?.tipo ?? 'pradera'];
  a.tx = area.x0 + Math.random() * (area.x1 - area.x0);
  a.ty = area.y0 + Math.random() * (area.y1 - area.y0);
}

export { rand };
