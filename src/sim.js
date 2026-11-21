// Reglas del juego. Todo depende del tiempo transcurrido (dt) y del aleatorio con semilla
// guardado en el mundo, así que el mismo código sirve para el progreso sin conexión
// y para trasladarse a un servidor sin cambios.

import {
  SPECIES, FOODS, PRODUCTS, BALANCE, CORRAL_COSTS, CORRAL_TYPES, CORRAL_TYPE_ORDER, MAX_CORRAL_LEVEL, corralTypeOf,
  COMMON_VARIANTS, VARIANT_TIERS, rarityOf, MAX_HEARTS, DISEASES, SECRETS, QUESTS, VET_LINES,
} from './data.js';
import { rand, randInt, chance } from './rng.js';
import { allowedErrors, grade } from './genetica.js';
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
  if (live && w.vet?.shield > 0) w.vet.shield = Math.max(0, w.vet.shield - dt);
  const crowded = new Set(w.corrales.filter((c) => spaceUsed(w, c.id) > capacityOf(w, c.id)).map((c) => c.id));

  for (const a of w.animals) {
    if (a.away) continue; // en el nido del Criadero: su hambre y su ánimo quedan en pausa
    const sp = SPECIES[a.species];
    a.fed = Math.max(live ? 0 : Math.min(a.fed, B.offlineFedFloor), a.fed - B.fedDecayPerSec * s);
    if (a.fed >= 50) a.happy = Math.min(100, a.happy + B.happyUpPerSec * s);
    else if (live && a.fed < 25) a.happy = Math.max(0, a.happy - B.happyDownPerSec * s);
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
  if (w.vet?.shield > 0) for (const k of Object.keys(B.sickBasePerHour)) delete rates[k]; // vitaminas o tónico
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

// ------------------------------------------------------------ Veterinaria interactiva
/** La doctora de turno: la Dra. Pita hasta que se va de viaje y, desde entonces, Mao Mao. */
export const vetDoctor = (w) => (chapterOf(w) >= BALANCE.vetMaoFromCh ? 'mao' : 'pita');
export const vetTrustLevel = (w, doc = vetDoctor(w)) =>
  Math.min(BALANCE.vetMaxTrustLevel, Math.floor((w.vet.trust[doc] || 0) / BALANCE.vetTrustPerLevel));
const vetPrice = (w, base) => Math.max(1, Math.round(base * (1 - BALANCE.vetDiscountPerLevel * vetTrustLevel(w))));
export const vetCureCost = (w, a) => vetPrice(w, BALANCE.cureCost[a.sick]);
export const vetCheckupPrice = (w) => vetPrice(w, BALANCE.vetCheckupCost);
const addTrust = (w, n = 1) => { const d = vetDoctor(w); w.vet.trust[d] = (w.vet.trust[d] || 0) + n; };
const daySeed = (day) => [...day].reduce((t, c) => t + c.charCodeAt(0), 0);

/** Una frase de la doctora (varía de forma estable con lo que ha pasado, sin tocar el aleatorio del mundo). */
export function vetLine(w, kind, vars = {}) {
  const lines = VET_LINES[vetDoctor(w)][kind];
  const seed = (w.stats.cured || 0) + (w.stats.petted || 0) + w.vet.consultN + w.vet.trust.pita + w.vet.trust.mao;
  return lines[seed % lines.length].replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
export const vetDiag = (w, disease) => VET_LINES[vetDoctor(w)].diag[disease];
/** Lo primero que la doctora te aconsejaría según cómo está la granja. */
export function vetGreeting(w) {
  const home = w.animals.filter((a) => !a.away);
  if (home.some((a) => a.sick)) return vetLine(w, 'enfermos');
  const hungry = home.filter((a) => a.fed < 40).sort((a, b) => a.fed - b.fed)[0];
  if (hungry) return vetLine(w, 'hambre', { nombre: hungry.name });
  const sad = home.filter((a) => a.happy < 40).sort((a, b) => a.happy - b.happy)[0];
  if (sad) return vetLine(w, 'triste', { nombre: sad.name });
  if (w.criadero.built && w.criadero.lanes.length < BALANCE.criaderoSlots[w.criadero.level]
    && Object.keys(SPECIES).some((s) => eligibleParents(w, s).length >= 2)) return vetLine(w, 'criadero');
  return vetLine(w, 'bien');
}
/** «Consulta»: gratis; la doctora te aconseja y, hasta cierto tope al día, sube la confianza. */
export function vetConsult(w, day = dayKey()) {
  const v = w.vet;
  if (v.consultDay !== day) { v.consultDay = day; v.consultN = 0; }
  const gained = v.consultN < BALANCE.vetConsultsPerDay;
  if (gained) { v.consultN++; addTrust(w, 1); }
  v.say = vetGreeting(w);
  return ok(v.say, { gained });
}
/** «Chequeo»: por unas monedas, un informe de un animal (hambre, ánimo, corazones y riesgo de enfermar por hora). */
export function vetCheckup(w, id) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (a.away) return no(`${a.name} está en el Criadero.`);
  const cost = vetCheckupPrice(w);
  if (w.coins < cost) return no('Te faltan monedas para el chequeo.');
  w.coins -= cost;
  const B = BALANCE;
  let total = w.vet.shield > 0 ? 0 : Object.values(B.sickBasePerHour).reduce((t, r) => t + r, 0);
  if (a.happy < 20) total += B.sadSickPerHour;
  if (a.fed <= 0) total += B.hungrySickPerHour;
  const report = { id: a.id, name: a.name, fed: Math.round(a.fed), happy: Math.round(a.happy), hearts: a.hearts, sick: a.sick, risk: a.sick ? null : Math.round((1 - Math.exp(-total)) * 100), cost };
  w.vet.say = report.sick ? vetLine(w, 'enfermos') : report.risk > 30 ? vetLine(w, a.fed < a.happy ? 'hambre' : 'triste', { nombre: a.name }) : vetLine(w, 'bien');
  return ok(`Chequeo de ${a.name}: listo.`, { report });
}
/** Protección contra resfriados y pulgas: Pita con vitaminas (monedas) y Mao Mao con un tónico (productos). */
export function vetShield(w) {
  if (w.vet.shield > 0) return no('La protección todavía dura.');
  if (vetDoctor(w) === 'pita') {
    const cost = vetPrice(w, BALANCE.vetVitaminCost);
    if (w.coins < cost) return no('Te faltan monedas para las vitaminas.');
    w.coins -= cost;
  } else {
    const have = Object.values(w.products).reduce((t, n) => t + n, 0);
    if (have < BALANCE.vetTonicProducts) return no(`Mao Mao necesita ${BALANCE.vetTonicProducts} productos para el tónico.`);
    for (let n = 0; n < BALANCE.vetTonicProducts; n++) {
      const p = Object.keys(w.products).sort((x, y) => w.products[y] - w.products[x])[0];
      if (!--w.products[p]) delete w.products[p];
    }
  }
  w.vet.shield = BALANCE.vetShieldMs;
  w.vet.say = vetLine(w, 'escudo');
  return ok(w.vet.say);
}
/** El pedido de hoy de la doctora (uno por día, con un producto que ya has recogido). */
export function vetRequest(w, day = dayKey()) {
  const v = w.vet;
  if (!v.request || (v.request.done && v.request.day !== day)) {
    const owned = Object.keys(PRODUCTS).filter((p) => (w.stats.collected[p] || 0) > 0);
    const pool = owned.length ? owned : ['huevo'];
    const seed = daySeed(day) + (w.stats.cured || 0);
    const product = pool[seed % pool.length];
    const n = 2 + (seed % 3);
    v.request = { day, product, n, coins: Math.round(n * PRODUCTS[product].price * BALANCE.vetRequestMul), done: false };
  }
  return v.request;
}
export function vetDeliver(w) {
  const r = vetRequest(w);
  if (r.done) return no('Ya entregaste el pedido de hoy.');
  if ((w.products[r.product] || 0) < r.n) return no(`Te faltan ${PRODUCTS[r.product].nombre.toLowerCase()}.`);
  if (!(w.products[r.product] -= r.n)) delete w.products[r.product];
  w.coins += r.coins;
  r.done = true;
  addTrust(w, 1);
  w.vet.say = vetLine(w, 'pedido', { n: r.n, producto: PRODUCTS[r.product].nombre.toLowerCase() });
  return ok(`Entregaste el pedido: +${r.coins} monedas.`);
}
/** «Ayudar a la doctora» (minijuego): el precio de la cura se devuelve en parte según los aciertos; sin aciertos se pierde la consulta. */
export function cureHelping(w, id, wins) {
  const a = find(w, id);
  if (!a) return no('No encuentro a ese animal.');
  if (!a.sick) return no(`${a.name} está sanito.`);
  const cost = vetCureCost(w, a);
  if (w.coins < cost) return no(`Te faltan monedas: la consulta cuesta ${cost}.`);
  const n = Math.max(0, Math.min(BALANCE.vetRounds, Math.floor(wins) || 0));
  if (n === 0) {
    w.coins -= cost;
    w.vet.say = vetLine(w, 'curaMal', { nombre: a.name });
    return no(`Salió mal: pierdes la consulta (−${cost}) y ${a.name} sigue enfermo.`);
  }
  const back = Math.round(cost * BALANCE.vetRefund[n]);
  w.coins -= cost - back;
  const was = DISEASES[a.sick].nombre.toLowerCase();
  a.sick = null; a.sickT = 0; a.sadT = 0; a.hungryT = 0;
  w.stats.cured = (w.stats.cured || 0) + 1;
  if (n >= BALANCE.vetRounds - 1) addTrust(w, 1);
  w.vet.say = vetLine(w, 'curaOk', { nombre: a.name });
  return ok(`¡${a.name} ya no tiene ${was}!${back ? ` Te devuelven ${back} monedas.` : ''}`, { animal: a, cost: cost - back });
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
  const cost = vetCureCost(w, a);
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
  return mutantVariant(w);
}
/** Un color poco común o raro al azar. */
const mutantVariant = (w) => VARIANT_TIERS.indexOf(chance(w, BALANCE.mutantTierOdds.poco) ? 'poco' : 'raro');

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
/** El Criadero se abre con la misión «¡Una gallinita!» (capítulo 1): desde ahí es la única forma de criar. */
export const criaderoOpen = (w) => {
  const i = QUESTS.findIndex((q) => !w.quests.claimed[q.id]);
  return i < 0 || i >= QUESTS.findIndex((q) => q.id === 'c1-cria');
};
/** Gratis en el capítulo 1 (hace falta para la primera cría); después cuesta `criaderoCost`. */
export const criaderoPrice = (w) => (chapterOf(w) <= 1 ? 0 : BALANCE.criaderoCost);
export function criaderoInfo(w) {
  const c = w.criadero, max = BALANCE.criaderoUpgradeCosts.length;
  const slots = BALANCE.criaderoSlots[c.level];
  return { built: c.built, open: criaderoOpen(w), price: criaderoPrice(w), level: c.level, maxLevel: max, slots, used: c.lanes.length, free: slots - c.lanes.length,
    upgradeCost: c.level < max ? BALANCE.criaderoUpgradeCosts[c.level] : null };
}
export function buildCriadero(w) {
  if (w.criadero.built) return no('Ya tienes el Criadero.');
  if (!criaderoOpen(w)) return no('El Criadero se abre con la misión «¡Una gallinita!».');
  const price = criaderoPrice(w);
  if (w.coins < price) return no('Te faltan monedas.');
  w.coins -= price;
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
// ------------------------------------------------------------------ venta de animales
/** Lo que pagan por un animal: depende de su etapa (bebé o adulto) y de la rareza de su color. */
export const sellPrice = (a) => Math.max(1, Math.round(SPECIES[a.species].price * (a.stage === 'baby' ? BALANCE.sellBabyPct : BALANCE.sellAdultPct) * BALANCE.sellRarityMul[rarityOf(a)]));
export function canSellAnimal(w, a) {
  if (!a) return no('Ese animal ya no está.');
  if (a.away) return no(`${a.name} está en el nido del Criadero.`);
  if (a.sick) return no(`${a.name} está enfermo: cúralo primero.`);
  if (w.animals.length <= 1) return no('No puedes vender el último animal de la granja.');
  return ok('');
}
export function sellAnimal(w, id) {
  const a = find(w, id);
  const c = canSellAnimal(w, a);
  if (!c.ok) return c;
  const gain = sellPrice(a);
  w.animals.splice(w.animals.indexOf(a), 1);
  w.coins += gain;
  w.stats.soldAnimals++;
  return ok(`Vendiste a ${a.name} por ${gain} monedas.`, { gain });
}

// ------------------------------------------------------------------ Laboratorio
const labLevel = (w) => w.lab.level;
export function labInfo(w) {
  const max = BALANCE.labUpgradeCosts.length;
  return { built: w.lab.built, level: w.lab.level, maxLevel: max, upgradeCost: w.lab.level < max ? BALANCE.labUpgradeCosts[w.lab.level] : null };
}
export function upgradeLab(w) {
  const info = labInfo(w);
  if (!info.built) return no('El Laboratorio se abre con la historia.');
  if (info.upgradeCost == null) return no('El equipo ya es lo mejor posible.');
  if (w.coins < info.upgradeCost) return no('Te faltan monedas.');
  w.coins -= info.upgradeCost;
  w.lab.level++;
  return ok(`¡Equipo nivel ${w.lab.level + 1}! Cada réplica cuesta menos y perdona más errores.`);
}
/** Dinosaurios con muestra en el Banco de ADN: los que ya conoces por la historia. */
export const labSamples = (w) => Object.keys(SPECIES).filter((s) => SPECIES[s].dna && w.unlocked.includes(s));
export const labCost = (w, species) => Math.round(SPECIES[species].price * (1 - BALANCE.labCostCut * labLevel(w)));
export const labAllowed = (w, species) => allowedErrors(SPECIES[species].dna, BALANCE.labExtraErrors * labLevel(w));
export function canReplicate(w, species) {
  const sp = SPECIES[species];
  if (!w.lab.built) return no('El Laboratorio todavía no está abierto.');
  if (!sp?.dna || !w.unlocked.includes(species)) return no('Todavía no tienes su muestra de ADN.');
  const corral = corralOfSpecies(w, species);
  if (!corral) return no(`Necesita el corral ${CORRAL_TYPES[corralTypeOf(species)].nombre}: llega con la historia.`);
  if (!hasSpace(w, corral.id)) return no(`No hay espacio en ${corral.nombre}: amplíalo.`);
  if (w.coins < labCost(w, species)) return no('Te faltan monedas.');
  return ok('');
}
/**
 * Cierra una réplica con los errores que cometió el jugador (el costo se cobra aquí: salir antes no cuesta nada).
 * perfecta: devuelven el 25 % y hay más probabilidad de color raro; buena: nace la cría; inestable: devuelven el 50 %; fallida: se pierde.
 */
export function replicate(w, species, errors) {
  const c = canReplicate(w, species);
  if (!c.ok) return c;
  const result = grade(errors, labAllowed(w, species));
  const cost = labCost(w, species);
  const refund = result === 'perfecta' ? BALANCE.labRefundPerfect : result === 'inestable' ? BALANCE.labRefundUnstable : 0;
  w.coins -= cost - Math.round(cost * refund);
  if (result === 'inestable') return ok('La réplica quedó inestable y se deshizo. Te devolvemos la mitad.', { result });
  if (result === 'fallida') return ok('La réplica falló y se perdió la muestra.', { result });
  const rare = result === 'perfecta' && chance(w, BALANCE.labPerfectRareBonus);
  const a = addAnimal(w, species, rare ? mutantVariant(w) : randInt(w, COMMON_VARIANTS), 'baby');
  w.stats.bought[species] = (w.stats.bought[species] || 0) + 1;
  return ok(result === 'perfecta' ? `¡Réplica perfecta! ${a.name} nació y te devolvieron monedas.` : `¡${a.name} se unió a la granja!`, { result, animal: a });
}

export function canBuyAnimal(w, species) {
  const sp = SPECIES[species];
  if (!sp) return no('Esa especie no existe.');
  if (!w.unlocked.includes(species)) return no('Todavía no la conoces: avanza en la historia.');
  if (sp.price == null) return no('No se vende: llega por la historia.');
  if (sp.dna) return no('Se replica en el Laboratorio.');
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
