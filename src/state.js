// Estado del mundo: creación, validación (los archivos importados no son de fiar),
// exportación/importación con suma de verificación.

import {
  VERSION, SPECIES, FOODS, PRODUCTS, QUESTS, SIDE_QUESTS, SECRETS, SCENES, VISITS, CORRAL_TYPES, MAX_CORRAL_LEVEL, corralTypeOf,
  MAX_ANIMALS_IMPORT, MAX_OFFLINE_MS, MAX_HEARTS, DISEASES, BALANCE,
} from './data.js';
import { rand, randInt } from './rng.js';
import { migrateWorld } from './migrate.js';
import { markPastScenes } from './story.js';

export const FORMAT = 'farmweb-world';
const INITIAL_UNLOCKED = ['gallina', 'gato', 'vaca'];
const MAX_EGGS = 30;

// ------------------------------------------------------------------ corrales
export const getCorral = (w, id) => w.corrales.find((c) => c.id === id);
export const capacityOf = (w, id) => {
  const c = getCorral(w, id);
  return c ? CORRAL_TYPES[c.tipo].cap + 4 * c.nivel : 0;
};
/** El corral (construido) donde vive esta especie. */
export const corralOfSpecies = (w, species) => w.corrales.find((c) => CORRAL_TYPES[c.tipo].species.includes(species));

export function addCorral(w, tipo, nivel = 0) {
  if (!CORRAL_TYPES[tipo]) throw new Error(`Tipo de corral desconocido: ${tipo}`);
  const have = getCorral(w, tipo);
  if (have) return have;
  const c = { id: tipo, tipo, nombre: CORRAL_TYPES[tipo].nombre, nivel, breed: 'auto' };
  w.corrales.push(c);
  return c;
}

/** La escena a mostrar: el mapa o un corral que exista; si no, la Pradera. */
export const resolveScene = (w, scene) => (scene === 'mapa' || (typeof scene === 'string' && getCorral(w, scene)) ? scene : 'pradera');

export function randomSpot(w, species) {
  const { area } = CORRAL_TYPES[corralTypeOf(species)];
  return {
    x: area.x0 + rand(w) * (area.x1 - area.x0),
    y: area.y0 + rand(w) * (area.y1 - area.y0),
  };
}

/** Campos de cuidado de la fase 2B (corazones y enfermedad) con su valor por defecto. */
export const CARE_DEFAULTS = Object.freeze({ hearts: 0, love: 0, loveDay: 0, loveToday: 0, sick: null, sickT: 0, sadT: 0, hungryT: 0, away: false });
/** Segundo aleatorio con semilla, solo para enfermedades: así no cambia la secuencia de la cría. */
const careSeed = (seed) => (seed ^ 0xa5a5a5a5) >>> 0;

export function addAnimal(w, species, variant, stage = 'baby', opts = {}) {
  const sp = SPECIES[species];
  const corral = corralOfSpecies(w, species);
  if (!corral) throw new Error(`No hay corral para ${sp.nombre}.`);
  const pos = opts.pos || randomSpot(w, species);
  const a = {
    id: w.nextId++, species, variant, shiny: !!opts.shiny, stage, corral: corral.id,
    name: sp.names[randInt(w, sp.names.length)], named: false,
    fed: 80, happy: 70, growth: 0, prod: 0, ready: 0, cool: 0, petCd: 0,
    ...CARE_DEFAULTS,
    x: pos.x, y: pos.y, tx: pos.x, ty: pos.y, wait: 0,
  };
  w.animals.push(a);
  return a;
}

export function newWorld(name = 'Granja de la familia', now = Date.now(), seed = (now ^ 0x9e3779b9) >>> 0) {
  const w = {
    v: VERSION,
    id: 'w' + now.toString(36) + (seed % 1296).toString(36),
    name, createdAt: now, lastTick: now, rng: seed >>> 0, careRng: careSeed(seed),
    coins: 100,
    foods: { grano: 10 }, products: {},
    corrales: [{ id: 'pradera', tipo: 'pradera', nombre: CORRAL_TYPES.pradera.nombre, nivel: 0, breed: 'auto' }],
    animals: [], eggs: [], nextId: 1,
    stats: { fed: 0, petted: 0, sold: 0, collected: {}, born: {}, bornTotal: 0, bought: {}, breedStarted: 0, cured: 0, named: 0 },
    quests: { claimed: {}, side: {}, sideBase: {} },
    secrets: {},
    story: { seen: {}, talked: {} },
    gift: { day: '', n: 0 },
    criadero: { built: false, level: 0, lanes: [] },
    unlocked: [...INITIAL_UNLOCKED],
    players: [{ id: 'local', name: 'Jugador 1' }],
    maxPlayers: 4,
  };
  addAnimal(w, 'gallina', 0, 'adult');
  addAnimal(w, 'gallina', 1, 'adult');
  return w;
}

// ---------------------------------------------------------------- validación
const int = (v, min, max, d) => {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.trunc(v))) : d;
};
const num = (v, min, max, d) => {
  v = Number(v);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
};
/**
 * Nombre limpio para un animal: sin caracteres de control ni de formato, espacios colapsados,
 * recortado a `max` caracteres (sin partir un emoji). Si no queda nada devuelve `fallback`.
 * Nunca se inserta como HTML: la interfaz lo muestra siempre con textContent.
 */
export function cleanName(raw, max = 24, fallback = '') {
  if (typeof raw !== 'string') return fallback;
  const s = raw.normalize('NFC').replace(/[\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/gu, '').replace(/\s+/gu, ' ').trim();
  return Array.from(s).slice(0, max).join('').trim() || fallback;
}
const text = (v, max, d) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : d);
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function countMap(raw, allowed, max = 99999) {
  const out = {};
  if (!isObj(raw)) return out;
  for (const k of Object.keys(allowed)) {
    const n = int(raw[k], 0, max, 0);
    if (n > 0) out[k] = n;
  }
  return out;
}

/** Reconstruye un mundo desde datos no confiables, copiando solo campos conocidos. */
export function validateWorld(raw, now = Date.now()) {
  if (!isObj(raw)) throw new Error('El archivo no contiene un mundo válido.');
  const w = {
    v: VERSION,
    id: text(raw.id, 40, 'w' + now.toString(36)),
    name: text(raw.name, 40, 'Granja de la familia'),
    createdAt: num(raw.createdAt, 0, now, now),
    lastTick: num(raw.lastTick, now - MAX_OFFLINE_MS * 1000, now, now),
    rng: int(raw.rng, 0, 4294967295, 12345) >>> 0,
    careRng: 0,
    coins: int(raw.coins, 0, 1e9, 0),
    foods: countMap(raw.foods, FOODS),
    products: countMap(raw.products, PRODUCTS),
    corrales: [], animals: [], eggs: [], nextId: 1,
    stats: {
      fed: int(raw.stats?.fed, 0, 1e9, 0),
      petted: int(raw.stats?.petted, 0, 1e9, 0),
      sold: int(raw.stats?.sold, 0, 1e9, 0),
      collected: countMap(raw.stats?.collected, PRODUCTS, 1e9),
      born: countMap(raw.stats?.born, SPECIES, 1e9),
      bornTotal: int(raw.stats?.bornTotal, 0, 1e9, 0),
      bought: countMap(raw.stats?.bought, SPECIES, 1e9),
      breedStarted: int(raw.stats?.breedStarted, 0, 1e9, 0),
      cured: int(raw.stats?.cured, 0, 1e9, 0),
      named: int(raw.stats?.named, 0, 1e9, 0),
    },
    quests: { claimed: {}, side: {}, sideBase: {} },
    secrets: {},
    story: { seen: {}, talked: {} },
    gift: { day: '', n: 0 },
    unlocked: [...INITIAL_UNLOCKED],
    players: [{ id: 'local', name: text(raw.players?.[0]?.name, 24, 'Jugador 1') }],
    maxPlayers: 4,
  };
  w.careRng = int(raw.careRng, 0, 4294967295, careSeed(w.rng)) >>> 0;
  // Un corral por tipo (gana el primero); la Pradera siempre existe.
  for (const c of (Array.isArray(raw.corrales) ? raw.corrales : [])) {
    if (!isObj(c) || !CORRAL_TYPES[c.tipo] || getCorral(w, c.tipo)) continue;
    const cor = addCorral(w, c.tipo, int(c.nivel, 0, MAX_CORRAL_LEVEL, 0));
    cor.nombre = text(c.nombre, 24, CORRAL_TYPES[c.tipo].nombre);
    cor.breed = c.breed === 'manual' ? 'manual' : 'auto';
  }
  if (!getCorral(w, 'pradera')) w.corrales.unshift({ id: 'pradera', tipo: 'pradera', nombre: CORRAL_TYPES.pradera.nombre, nivel: 0, breed: 'auto' });
  if (Array.isArray(raw.unlocked)) {
    for (const s of raw.unlocked) {
      if (SPECIES[s] && !w.unlocked.includes(s)) w.unlocked.push(s);
    }
  }
  if (isObj(raw.quests?.claimed)) {
    for (const q of QUESTS) if (raw.quests.claimed[q.id] === true) w.quests.claimed[q.id] = true;
  }
  for (const id of Object.keys(SECRETS)) if (raw.secrets?.[id] === true) w.secrets[id] = true;
  if (isObj(raw.gift)) w.gift = { day: /^\d{4}-\d{2}-\d{2}$/.test(raw.gift.day) ? raw.gift.day : '', n: int(raw.gift.n, 0, 1e6, 0) };
  if (isObj(raw.story)) {
    for (const sc of SCENES) if (raw.story.seen?.[sc.id] === true) w.story.seen[sc.id] = true;
    for (const v of VISITS) if (raw.story.talked?.[v.id] === true) w.story.talked[v.id] = true;
  }
  else markPastScenes(w); // partida sin escenas: lo ya ocurrido no se vuelve a contar
  for (const q of SIDE_QUESTS) {
    if (raw.quests?.side?.[q.id] === true) w.quests.side[q.id] = true;
    else if (isObj(raw.quests?.sideBase) && Object.hasOwn(raw.quests.sideBase, q.id)) w.quests.sideBase[q.id] = int(raw.quests.sideBase[q.id], 0, 1e9, 0);
  }

  const usedIds = new Set();
  const newId = (wanted) => {
    let id = int(wanted, 1, 1e9, 0);
    if (!id || usedIds.has(id)) id = Math.max(w.nextId, ...usedIds, 0) + 1;
    usedIds.add(id);
    w.nextId = Math.max(w.nextId, id + 1);
    return id;
  };
  // El corral de un animal sale de su especie (se crea si falta); el dato del archivo no manda.
  const homeOf = (species) => addCorral(w, corralTypeOf(species));
  const spot = (corral, rx, ry) => {
    const a = CORRAL_TYPES[corral.tipo].area;
    return { x: num(rx, a.x0, a.x1, (a.x0 + a.x1) / 2), y: num(ry, a.y0, a.y1, (a.y0 + a.y1) / 2) };
  };

  for (const a of (Array.isArray(raw.animals) ? raw.animals : []).slice(0, MAX_ANIMALS_IMPORT)) {
    if (!isObj(a) || !SPECIES[a.species]) continue;
    const sp = SPECIES[a.species];
    const corral = homeOf(a.species);
    const { x, y } = spot(corral, a.x, a.y);
    w.animals.push({
      id: newId(a.id), species: a.species, corral: corral.id,
      variant: int(a.variant, 0, sp.variants.length - 1, 0),
      shiny: a.shiny === true,
      stage: a.stage === 'adult' ? 'adult' : 'baby',
      name: cleanName(a.name, 24, sp.names[0]),
      named: a.named !== false,
      fed: num(a.fed, 0, 100, 50), happy: num(a.happy, 0, 100, 50),
      growth: num(a.growth, 0, 1e9, 0), prod: num(a.prod, 0, 1e9, 0),
      ready: int(a.ready, 0, 3, 0), cool: num(a.cool, 0, 1e9, 0), petCd: num(a.petCd, 0, 1e9, 0),
      hearts: int(a.hearts, 0, MAX_HEARTS, 0), love: num(a.love, 0, 100, 0),
      loveDay: int(a.loveDay, 0, 1e7, 0), loveToday: num(a.loveToday, 0, 1e4, 0),
      sick: typeof a.sick === 'string' && Object.hasOwn(DISEASES, a.sick) ? a.sick : null,
      sickT: num(a.sickT, 0, 1e9, 0), sadT: num(a.sadT, 0, 1e9, 0), hungryT: num(a.hungryT, 0, 1e9, 0),
      away: false, x, y, tx: x, ty: y, wait: 0,
    });
  }
  for (const e of (Array.isArray(raw.eggs) ? raw.eggs : []).slice(0, MAX_EGGS)) {
    if (!isObj(e) || !SPECIES[e.species]) continue;
    const sp = SPECIES[e.species];
    const corral = homeOf(e.species);
    w.eggs.push({
      id: newId(e.id), species: e.species, corral: corral.id,
      variant: int(e.variant, 0, sp.variants.length - 1, 0), shiny: e.shiny === true,
      left: num(e.left, 0, sp.breed, sp.breed),
      ...spot(corral, e.x, e.y),
    });
  }
  // Criadero: cupos con su pareja (nido) o su huevo; los padres de un nido quedan «ausentes» del corral.
  const cr = isObj(raw.criadero) ? raw.criadero : {};
  w.criadero = { built: cr.built === true, level: 0, lanes: [] };
  if (w.criadero.built) {
    w.criadero.level = int(cr.level, 0, BALANCE.criaderoUpgradeCosts.length, 0);
    const taken = new Set();
    for (const l of (Array.isArray(cr.lanes) ? cr.lanes : [])) {
      if (w.criadero.lanes.length >= BALANCE.criaderoSlots[w.criadero.level] || !isObj(l) || !SPECIES[l.species]) continue;
      const sp = SPECIES[l.species];
      const corral = getCorral(w, corralTypeOf(l.species));
      if (!corral) continue;
      const lane = {
        id: newId(l.id), phase: l.phase === 'egg' ? 'egg' : 'nest', species: l.species, corral: corral.id, a: 0, b: 0,
        left: num(l.left, 0, 1e9, 0), total: num(l.total, 1, 1e9, sp.breed),
        variant: int(l.variant, 0, sp.variants.length - 1, 0), shiny: l.shiny === true,
        heat: int(l.heat, 0, BALANCE.heatMax, 0), heatCd: num(l.heatCd, 0, 1e9, 0),
      };
      if (lane.phase === 'nest') {
        const A = w.animals.find((x) => x.id === l.a), B = w.animals.find((x) => x.id === l.b);
        if (!A || !B || A === B || A.species !== l.species || B.species !== l.species || taken.has(A.id) || taken.has(B.id)) continue;
        lane.a = A.id; lane.b = B.id; taken.add(A.id); taken.add(B.id);
        A.away = B.away = true;
      }
      w.criadero.lanes.push(lane);
    }
  }
  // Un corral nunca queda más chico que sus habitantes: sube de nivel lo necesario.
  for (const c of w.corrales) {
    const n = [...w.animals, ...w.eggs].filter((x) => x.corral === c.id).length;
    while (c.nivel < MAX_CORRAL_LEVEL && capacityOf(w, c.id) < n) c.nivel++;
  }
  if (!w.animals.length && !w.eggs.length) throw new Error('El mundo no tiene animales.');
  return w;
}

// ------------------------------------------------------------ exportar/importar
export function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function exportWorldText(w, now = Date.now()) {
  const world = JSON.stringify(w);
  return JSON.stringify({ format: FORMAT, version: VERSION, savedAt: now, checksum: checksum(world), world: JSON.parse(world) });
}

export function importWorldText(str, now = Date.now()) {
  let obj;
  try {
    obj = JSON.parse(str);
  } catch {
    throw new Error('El archivo no es un mundo de FarmWeb (JSON inválido).');
  }
  if (!isObj(obj) || obj.format !== FORMAT) throw new Error('El archivo no es un mundo de FarmWeb.');
  if (!Number.isInteger(obj.version) || obj.version < 1) throw new Error('Versión de archivo desconocida.');
  if (obj.version > VERSION) throw new Error('Este mundo es de una versión más nueva del juego.');
  if (checksum(JSON.stringify(obj.world)) !== obj.checksum) {
    throw new Error('El archivo está dañado o fue modificado (la suma de verificación no coincide).');
  }
  return validateWorld(migrateWorld(obj.world), now);
}
