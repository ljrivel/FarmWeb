// Reglas del juego. Todo depende del tiempo transcurrido (dt) y del aleatorio con semilla
// guardado en el mundo, así que el mismo código sirve para el progreso sin conexión
// y para trasladarse a un servidor sin cambios.

import {
  SPECIES, FOODS, PRODUCTS, BALANCE, CORRAL_COSTS, CORRAL_TYPES, CORRAL_TYPE_ORDER, MAX_CORRAL_LEVEL, corralTypeOf,
  COMMON_VARIANTS, VARIANT_TIERS, rarityOf, MAX_HEARTS, DISEASES, SECRETS, QUESTS,
} from './data.js';
import { rand, randInt, chance } from './rng.js';
import { addAnimal, addCorral, capacityOf, getCorral, corralOfSpecies, cleanName, randomSpot } from './state.js';

const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const no = (msg) => ({ ok: false, msg });

/** Animales, huevos y cupos del Criadero (cada uno reserva el lugar de su futura cría) que ocupan lugar en un corral. */
export const spaceUsed = (w, corralId) =>
  w.animals.filter((a) => a.corral === corralId).length + w.eggs.filter((e) => e.corral === corralId).length
  + (w.criadero?.lanes || []).filter((l) => l.corral === corralId).length;
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

const DAY_MS = 24 * 60 * 60 * 1000;
/** Aleatorio de cuidados (enfermedades): usa `w.careRng` para no alterar la secuencia de la cría en `w.rng`. */
function careRand(w) {
  const o = { rng: w.careRng >>> 0 };
  const r = rand(o);
  w.careRng = o.rng;
  return r;
}

/**
 * Avanza la simulación dt milisegundos. Devuelve eventos para mostrar avisos.
 * `opts.live`: el jugador tiene el juego abierto. Solo entonces se puede enfermar, curarse solo o perder
 * corazones; en la puesta al día (sin `live`) los enfermos quedan igual y nadie empeora.
 */
export function tick(w, dt, opts = {}) {
  const live = opts.live === true;
  const events = [];
  const s = dt / 1000;
  const B = BALANCE;
  const crowded = new Set(w.corrales.filter((c) => spaceUsed(w, c.id) > capacityOf(w, c.id)).map((c) => c.id));

  for (const a of w.animals) {
    if (a.away) continue; // en el nido del Criadero: su hambre y su ánimo quedan en pausa
    const sp = SPECIES[a.species];
    a.fed = Math.max(0, a.fed - B.fedDecayPerSec * s);
    if (a.fed >= 50) a.happy = Math.min(100, a.happy + B.happyUpPerSec * s);
    else if (a.fed < 25) a.happy = Math.max(0, a.happy - B.happyDownPerSec * s);
    if (crowded.has(a.corral)) a.happy = Math.max(0, a.happy - B.crowdPenaltyPerSec * s);
    if (a.petCd > 0) a.petCd = Math.max(0, a.petCd - dt);
    if (a.cool > 0) a.cool = Math.max(0, a.cool - dt);
    if (live) care(w, a, dt, events);
    if (a.sick) continue; // enfermo: no crece ni produce hasta curarse

    if (a.stage === 'baby') {
      if (a.fed > 0) a.growth += dt;
      if (a.growth >= sp.grow) {
        a.stage = 'adult';
        a.growth = 0;
        events.push({ type: 'grown', animal: a });
      }
    } else if (a.ready < B.maxReady && a.fed > 0 && a.happy >= 30) {
      a.prod += dt * (a.happy >= 60 ? 1 : 0.5) * heartBonus(a);
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

  // Criadero: nido → huevo en incubadora → eclosión (el tiempo que sobra pasa a la fase siguiente)
  const lanes = w.criadero?.lanes || [];
  for (let i = lanes.length - 1; i >= 0; i--) {
    const l = lanes[i];
    if (l.heatCd > 0) l.heatCd = Math.max(0, l.heatCd - dt);
    l.left -= dt;
    while (l.left <= 0 && lanes.includes(l)) {
      const sp = SPECIES[l.species];
      if (l.phase === 'nest') {
        const A = find(w, l.a), Bb = find(w, l.b);
        if (A) A.away = false;
        if (Bb) Bb.away = false;
        if (!A || !Bb) { lanes.splice(lanes.indexOf(l), 1); break; }
        l.variant = pickBabyVariant(w, A, Bb, B.criaderoMutationBonus * w.criadero.level);
        l.shiny = chance(w, A.shiny || Bb.shiny ? B.shinyChanceParent : B.shinyChance);
        for (const x of [A, Bb]) { x.cool = sp.breed * 2; Object.assign(x, randomSpot(w, l.species)); x.tx = x.x; x.ty = x.y; }
        const total = Math.max(15000, sp.breed * B.criaderoEggMul * cutOf(w));
        Object.assign(l, { phase: 'egg', a: 0, b: 0, total, left: total + l.left, heat: 0, heatCd: 0 });
        w.stats.breedStarted++;
        events.push({ type: 'egg', species: l.species });
      } else {
        lanes.splice(lanes.indexOf(l), 1);
        const baby = addAnimal(w, l.species, l.variant, 'baby', { shiny: l.shiny });
        w.stats.born[l.species] = (w.stats.born[l.species] || 0) + 1;
        w.stats.bornTotal++;
        events.push({ type: 'hatch', animal: baby });
      }
    }
  }

  // cría: parejas de la misma especie, felices y comidas
  for (const species of Object.keys(SPECIES)) {
    const corral = corralOfSpecies(w, species);
    if (!corral || corral.breed === 'manual') continue; // en manual solo se cría en el Criadero
    const ready = w.animals.filter((a) =>
      a.species === species && a.stage === 'adult' && a.cool <= 0 && !a.sick && !a.away &&
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

/** Multiplicador de producción por corazones (1 a 1 + 5 × heartProdBonus). */
export const heartBonus = (a) => 1 + Math.min(MAX_HEARTS, a.hearts || 0) * BALANCE.heartProdBonus;

/** Cuidados en vivo de un animal: perder cariño si está descuidado, enfermar o curarse solo. */
function care(w, a, dt, events) {
  const B = BALANCE;
  const s = dt / 1000;
  // corazones: bajan muy despacio solo si está descuidado
  if (a.fed < 25 || a.happy < 30) {
    a.love -= B.loveDecayPerSec * s;
    while (a.love < 0 && a.hearts > 0) { a.hearts--; a.love += 100; }
    if (a.love < 0) a.love = 0;
  }
  a.sadT = a.happy < 20 ? a.sadT + dt : 0;
  a.hungryT = a.fed <= 0 ? a.hungryT + dt : 0;
  if (a.sick) {
    if (a.fed >= B.cureCareFed && a.happy >= B.cureCareHappy) a.sickT += dt;
    if (a.sickT >= DISEASES[a.sick].selfCure) {
      const was = a.sick;
      a.sick = null; a.sickT = 0;
      events.push({ type: 'healed', animal: a, disease: was });
    }
    return;
  }
  // riesgo por hora de cada enfermedad en este momento
  const rates = { ...B.sickBasePerHour };
  if (a.sadT >= B.sadAfter) rates.tristeza = B.sadSickPerHour;
  if (a.hungryT >= B.hungryAfter) rates.pancita = B.hungrySickPerHour;
  const total = Object.values(rates).reduce((t, r) => t + r, 0);
  if (!(total > 0)) return;
  if (careRand(w) >= 1 - Math.exp(-total * s / 3600)) return;
  let pick = careRand(w) * total;
  const disease = Object.keys(rates).find((d) => (pick -= rates[d]) < 0) || Object.keys(rates)[0];
  makeSick(w, a.id, disease);
  events.push({ type: 'sick', animal: a, disease });
}

/** Enferma a un animal (lo usan las reglas y el modo ?debug). Devuelve el animal o null. */
export function makeSick(w, id, disease) {
  const a = find(w, id);
  if (!a || !Object.hasOwn(DISEASES, disease)) return null;
  a.sick = disease;
  a.sickT = 0;
  return a;
}

/** Día local del dispositivo como AAAA-MM-DD (la cesta es una por día). */
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const giftReady = (w, day = dayKey()) => w.gift.day !== day;

/** Qué trae la cesta del próximo día del ciclo: monedas y la comida favorita de lo que tienes (o grano si no tienes nada). */
export function giftReward(w) {
  const B = BALANCE;
  const foods = {};
  for (const a of w.animals) {
    const f = SPECIES[a.species].food;
    if (!foods[f] && Object.keys(foods).length < B.giftMaxFoods) foods[f] = B.giftFoodEach;
  }
  if (!Object.keys(foods).length) foods.grano = B.giftFoodEach;
  return { coins: B.giftCoins[w.gift.n % B.giftCoins.length], foods, big: w.gift.n % B.giftCoins.length === B.giftCoins.length - 1 };
}

export function claimGift(w, day = dayKey()) {
  if (!giftReady(w, day)) return no('Ya recogiste la cesta de hoy. ¡Bruno vuelve mañana!');
  const reward = giftReward(w);
  w.coins += reward.coins;
  for (const [f, n] of Object.entries(reward.foods)) w.foods[f] = (w.foods[f] || 0) + n;
  w.gift = { day, n: w.gift.n + 1 };
  return ok(reward.big ? '¡Cesta grande de Bruno!' : 'Cesta de Bruno', { reward });
}

/** Suma cariño con tope diario. Devuelve true si ganó un corazón. */
function addLove(w, a, n) {
  const day = Math.floor(w.lastTick / DAY_MS);
  if (a.loveDay !== day) { a.loveDay = day; a.loveToday = 0; }
  if (a.hearts >= MAX_HEARTS) return false;
  const gain = Math.min(n, BALANCE.loveDailyCap - a.loveToday);
  if (gain <= 0) return false;
  a.loveToday += gain;
  a.love += gain;
  let up = false;
  while (a.love >= 100 && a.hearts < MAX_HEARTS) { a.love -= 100; a.hearts++; up = true; }
  if (a.hearts >= MAX_HEARTS) a.love = 0;
  return up;
}

/** Cura a un animal en la Veterinaria, por monedas. */
export function cure(w, id) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (!a.sick) return no(`${a.name} está sanito.`);
  const cost = BALANCE.cureCost[a.sick];
  if (w.coins < cost) return no(`Te faltan monedas: curar cuesta ${cost}. También se cura solo si lo cuidas en casa.`);
  const was = DISEASES[a.sick].nombre.toLowerCase();
  w.coins -= cost;
  a.sick = null; a.sickT = 0; a.sadT = 0; a.hungryT = 0;
  w.stats.cured = (w.stats.cured || 0) + 1;
  return ok(`¡${a.name} ya no tiene ${was}!`, { animal: a, cost });
}

/**
 * Color de una cría: hereda el de un padre al azar; con probabilidad `mutationChance` muta
 * a un color poco común o raro (las probabilidades están en BALANCE, en data.js).
 */
export function pickBabyVariant(w, a, b, bonus = 0) {
  const inherited = chance(w, 0.5) ? a.variant : b.variant;
  if (!chance(w, BALANCE.mutationChance + bonus)) return inherited;
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
  w.stats.named = (w.stats.named || 0) + 1;
  return ok(`Ahora se llama ${name}.`, { animal: a });
}

export function feed(w, id, food) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (a.away) return no(`${a.name} está en el Criadero.`);
  if (!FOODS[food]) return no('Esa comida no existe.');
  if (!(w.foods[food] > 0)) return no(`No te queda ${FOODS[food].nombre.toLowerCase()}.`);
  if (a.fed >= 95) return no(`${a.name} está llenito.`);
  const fav = SPECIES[a.species].food === food;
  w.foods[food]--;
  if (!w.foods[food]) delete w.foods[food];
  a.fed = Math.min(100, a.fed + (fav ? BALANCE.favFeed : BALANCE.otherFeed));
  a.happy = Math.min(100, a.happy + (fav ? BALANCE.favHappy : BALANCE.otherHappy));
  w.stats.fed++;
  const heartUp = fav && addLove(w, a, BALANCE.lovePerFav);
  return ok(fav ? `¡${a.name} amó ${FOODS[food].nombre.toLowerCase()}!${heartUp ? ` ¡Ya tiene ${a.hearts} ${a.hearts === 1 ? 'corazón' : 'corazones'}!` : ''}`
    : `${a.name} comió ${FOODS[food].nombre.toLowerCase()}.`, { fav, heartUp });
}

export function pet(w, id) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (a.away) return no(`${a.name} está en el Criadero.`);
  if (a.petCd > 0) return no(`${a.name} ya recibió mimos hace un ratito.`);
  a.happy = Math.min(100, a.happy + BALANCE.petHappy);
  a.petCd = BALANCE.petCooldown;
  w.stats.petted++;
  const heartUp = addLove(w, a, BALANCE.lovePerPet);
  return ok(heartUp ? `¡${a.name} te quiere más! Ya tiene ${a.hearts} ${a.hearts === 1 ? 'corazón' : 'corazones'}.` : `${a.name} está feliz.`, { heartUp });
}

export function collect(w, id) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (a.away) return no(`${a.name} está en el Criadero.`);
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
  for (const a of w.animals) while (!a.away && a.ready > 0) { collect(w, a.id); total++; }
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

// ------------------------------------------------------------------ Criadero
const chapterOf = (w) => QUESTS.find((q) => !w.quests.claimed[q.id])?.ch ?? Infinity;
const cutOf = (w) => Math.max(0.3, 1 - BALANCE.criaderoTimeCut * w.criadero.level);
export const criaderoOpen = (w) => chapterOf(w) >= BALANCE.criaderoMinCh;
export function criaderoInfo(w) {
  const c = w.criadero, max = BALANCE.criaderoUpgradeCosts.length;
  const slots = BALANCE.criaderoSlots[c.level];
  return { built: c.built, open: criaderoOpen(w), level: c.level, maxLevel: max, slots, used: c.lanes.length, free: slots - c.lanes.length,
    upgradeCost: c.level < max ? BALANCE.criaderoUpgradeCosts[c.level] : null };
}
export function buildCriadero(w) {
  if (w.criadero.built) return no('Ya tienes el Criadero.');
  if (!criaderoOpen(w)) return no('El Criadero se abre cuando la historia llegue al capítulo 2.');
  if (w.coins < BALANCE.criaderoCost) return no('Te faltan monedas.');
  w.coins -= BALANCE.criaderoCost;
  w.criadero.built = true;
  return ok('¡Construiste el Criadero! Ahora puedes elegir las parejas.');
}
export function upgradeCriadero(w) {
  const info = criaderoInfo(w);
  if (!info.built) return no('Primero construye el Criadero.');
  if (info.upgradeCost == null) return no('El Criadero ya está al máximo.');
  if (w.coins < info.upgradeCost) return no('Te faltan monedas.');
  w.coins -= info.upgradeCost;
  w.criadero.level++;
  return ok(`¡Criadero al nivel ${w.criadero.level + 1}! Más cupos y menos espera.`);
}
/** ¿Este animal puede ir a un nido? Adulto, sano, comido, contento, sin descanso y que no esté ya en el Criadero. */
export const canNest = (a) => a.stage === 'adult' && !a.sick && !a.away && a.cool <= 0
  && a.fed >= BALANCE.minFedToBreed && a.happy >= BALANCE.minHappyToBreed;
export const eligibleParents = (w, species) => w.animals.filter((a) => a.species === species && canNest(a));
export function pairAnimals(w, idA, idB) {
  const c = w.criadero;
  if (!c.built) return no('Primero construye el Criadero.');
  const A = find(w, idA), Bb = find(w, idB);
  if (!A || !Bb || A === Bb) return no('Elige dos animales distintos.');
  if (A.species !== Bb.species) return no('Tienen que ser de la misma especie.');
  for (const x of [A, Bb]) {
    if (x.away) return no(`${x.name} ya está en el Criadero.`);
    if (x.sick) return no(`${x.name} está enfermo.`);
    if (x.stage !== 'adult') return no(`${x.name} todavía es una cría.`);
    if (x.cool > 0) return no(`${x.name} está descansando de su última cría.`);
    if (x.fed < BALANCE.minFedToBreed || x.happy < BALANCE.minHappyToBreed) return no(`${x.name} necesita estar bien comido y contento.`);
  }
  if (c.lanes.length >= BALANCE.criaderoSlots[c.level]) return no('No quedan cupos libres: espera o mejora el Criadero.');
  const corral = corralOfSpecies(w, A.species);
  if (!corral || !hasSpace(w, corral.id)) return no(`No hay espacio en ${corral?.nombre || 'su corral'} para la cría: amplíalo.`);
  const total = Math.max(15000, SPECIES[A.species].breed * BALANCE.criaderoNestMul * cutOf(w));
  c.lanes.push({ id: w.nextId++, phase: 'nest', species: A.species, corral: corral.id, a: A.id, b: Bb.id, left: total, total, variant: 0, shiny: false, heat: 0, heatCd: 0 });
  A.away = Bb.away = true;
  return ok(`${A.name} y ${Bb.name} se fueron al nido.`);
}
/** «Darle calor» a un huevo del Criadero: adelanta parte del tiempo, con tope y enfriamiento. */
export function heatEgg(w, laneId) {
  const l = w.criadero.lanes.find((x) => x.id === laneId);
  if (!l || l.phase !== 'egg') return no('Ese huevo no está en la incubadora.');
  if (l.heat >= BALANCE.heatMax) return no('Ya recibió todo el calor que aguanta.');
  if (l.heatCd > 0) return no('Dale un ratito: todavía está calentito.');
  l.left = Math.max(0, l.left - l.total * BALANCE.heatCut);
  l.heat++;
  l.heatCd = BALANCE.heatCooldown;
  return ok('¡Calorcito para el huevo!');
}
/** Cría «automática» (por defecto) o «manual» (solo en el Criadero) para un corral. */
export function setCorralBreed(w, corralId, mode) {
  const c = getCorral(w, corralId);
  if (!c) return no('Ese corral no existe.');
  if (mode !== 'auto' && mode !== 'manual') return no('Modo desconocido.');
  c.breed = mode;
  return ok(mode === 'manual' ? `En ${c.nombre} ahora solo se cría en el Criadero.` : `En ${c.nombre} la cría vuelve a ser automática.`);
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

// ------------------------------------------------------------------ secretos
/** Marca un secreto como descubierto. Devuelve true solo la primera vez. */
export function discover(w, id) {
  if (!Object.hasOwn(SECRETS, id) || w.secrets[id]) return false;
  w.secrets[id] = true;
  return true;
}

/** Texto comparable: sin tildes, en minúsculas y sin espacios de más. */
const plain = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Secretos que se cumplen por un nombre recién puesto. */
export function secretsByName(a) {
  const n = plain(a.name);
  const out = [];
  if (n === 'cosi' || n === 'abuela cosi') out.push('cosi');
  if (n === 'nessie' && a.species === 'spinosaurus') out.push('nessie');
  return out;
}

/** Secretos que se cumplen por el estado del mundo (se revisan cada segundo). */
export function secretsByState(w) {
  const out = [];
  if (w.animals.some((a) => a.hearts >= MAX_HEARTS)) out.push('amigo');
  if (w.animals.some((a) => a.shiny)) out.push('brillo');
  const colors = {};
  for (const a of w.animals) if (!a.shiny) (colors[a.species] ||= new Set()).add(a.variant);
  if (Object.entries(colors).some(([s, set]) => set.size >= SPECIES[s].variants.length)) out.push('arcoiris');
  return out.filter((id) => !w.secrets[id]);
}

// ------------------------------------------------------------------ paseo
/** Movimiento visual; no afecta a la economía y no se simula sin conexión. */
export function wander(w, dt) {
  if (!(dt > 0)) return;
  for (const a of w.animals) {
    if (a.away) continue;
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
