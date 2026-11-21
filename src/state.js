// Estado del mundo: creación, validación (los archivos importados no son de fiar),
// exportación/importación con suma de verificación.

import {
  VERSION, BASE_CAPACITY, SPECIES, FOODS, PRODUCTS, QUESTS, AREA, POND,
  MAX_ANIMALS_IMPORT, MAX_OFFLINE_MS,
} from './data.js';
import { rand, randInt } from './rng.js';

export const FORMAT = 'farmweb-world';
const INITIAL_UNLOCKED = ['gallina', 'gato', 'vaca'];
const MAX_EGGS = 30;

export const capacityFor = (corral) => BASE_CAPACITY + 4 * corral;

export function inPond(x, y) {
  return x >= POND.x0 - 4 && x <= POND.x1 && y >= POND.y0 + 10 && y <= POND.y1 + 4;
}

export function randomSpot(w, species) {
  const aquatic = SPECIES[species].aquatic && w.upgrades.estanque;
  if (aquatic) {
    return {
      x: POND.x0 + 16 + rand(w) * (POND.x1 - POND.x0 - 32),
      y: POND.y0 + 24 + rand(w) * (POND.y1 - POND.y0 - 28),
    };
  }
  let x = 0, y = 0;
  for (let i = 0; i < 12; i++) {
    x = AREA.x0 + rand(w) * (AREA.x1 - AREA.x0);
    y = AREA.y0 + rand(w) * (AREA.y1 - AREA.y0);
    if (!(w.upgrades.estanque && inPond(x, y))) break;
  }
  return { x, y };
}

export function addAnimal(w, species, variant, stage = 'baby', opts = {}) {
  const sp = SPECIES[species];
  const pos = opts.pos || randomSpot(w, species);
  const a = {
    id: w.nextId++, species, variant, shiny: !!opts.shiny, stage,
    name: sp.names[randInt(w, sp.names.length)],
    fed: 80, happy: 70, growth: 0, prod: 0, ready: 0, cool: 0, petCd: 0,
    x: pos.x, y: pos.y, tx: pos.x, ty: pos.y, wait: 0,
  };
  w.animals.push(a);
  return a;
}

export function newWorld(name = 'Granja de la familia', now = Date.now(), seed = (now ^ 0x9e3779b9) >>> 0) {
  const w = {
    v: VERSION,
    id: 'w' + now.toString(36) + (seed % 1296).toString(36),
    name, createdAt: now, lastTick: now, rng: seed >>> 0,
    capacity: BASE_CAPACITY, coins: 100,
    foods: { grano: 10 }, products: {},
    animals: [], eggs: [], nextId: 1,
    stats: { fed: 0, petted: 0, sold: 0, collected: {}, born: {}, bornTotal: 0, bought: {}, breedStarted: 0 },
    quests: { claimed: {} },
    upgrades: { estanque: false, corral: 0 },
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
  const upgrades = {
    estanque: raw.upgrades?.estanque === true,
    corral: int(raw.upgrades?.corral, 0, 4, 0),
  };
  const w = {
    v: VERSION,
    id: text(raw.id, 40, 'w' + now.toString(36)),
    name: text(raw.name, 40, 'Granja de la familia'),
    createdAt: num(raw.createdAt, 0, now, now),
    lastTick: num(raw.lastTick, now - MAX_OFFLINE_MS * 1000, now, now),
    rng: int(raw.rng, 0, 4294967295, 12345) >>> 0,
    capacity: capacityFor(upgrades.corral),
    coins: int(raw.coins, 0, 1e9, 0),
    foods: countMap(raw.foods, FOODS),
    products: countMap(raw.products, PRODUCTS),
    animals: [], eggs: [], nextId: 1,
    stats: {
      fed: int(raw.stats?.fed, 0, 1e9, 0),
      petted: int(raw.stats?.petted, 0, 1e9, 0),
      sold: int(raw.stats?.sold, 0, 1e9, 0),
      collected: countMap(raw.stats?.collected, PRODUCTS, 1e9),
      born: countMap(raw.stats?.born, SPECIES, 1e9),
      bornTotal: int(raw.stats?.bornTotal, 0, 1e9, 0),
      bought: countMap(raw.stats?.bought, SPECIES, 1e9),
      breedStarted: int(raw.stats?.breedStarted, 0, 1e9, 0),
    },
    quests: { claimed: {} },
    upgrades,
    unlocked: [...INITIAL_UNLOCKED],
    players: [{ id: 'local', name: text(raw.players?.[0]?.name, 24, 'Jugador 1') }],
    maxPlayers: 4,
  };
  if (Array.isArray(raw.unlocked)) {
    for (const s of raw.unlocked) {
      if (SPECIES[s] && !w.unlocked.includes(s)) w.unlocked.push(s);
    }
  }
  if (isObj(raw.quests?.claimed)) {
    for (const q of QUESTS) if (raw.quests.claimed[q.id] === true) w.quests.claimed[q.id] = true;
  }

  const usedIds = new Set();
  const newId = (wanted) => {
    let id = int(wanted, 1, 1e9, 0);
    if (!id || usedIds.has(id)) id = Math.max(w.nextId, ...usedIds, 0) + 1;
    usedIds.add(id);
    w.nextId = Math.max(w.nextId, id + 1);
    return id;
  };
  const inArea = (v, lo, hi, d) => num(v, lo, hi, d);

  for (const a of (Array.isArray(raw.animals) ? raw.animals : []).slice(0, MAX_ANIMALS_IMPORT)) {
    if (!isObj(a) || !SPECIES[a.species]) continue;
    const sp = SPECIES[a.species];
    const x = inArea(a.x, 0, 320, 160), y = inArea(a.y, 0, 224, 120);
    w.animals.push({
      id: newId(a.id), species: a.species,
      variant: int(a.variant, 0, sp.variants.length - 1, 0),
      shiny: a.shiny === true,
      stage: a.stage === 'adult' ? 'adult' : 'baby',
      name: text(a.name, 24, sp.names[0]),
      fed: num(a.fed, 0, 100, 50), happy: num(a.happy, 0, 100, 50),
      growth: num(a.growth, 0, 1e9, 0), prod: num(a.prod, 0, 1e9, 0),
      ready: int(a.ready, 0, 3, 0), cool: num(a.cool, 0, 1e9, 0), petCd: num(a.petCd, 0, 1e9, 0),
      x, y, tx: x, ty: y, wait: 0,
    });
  }
  for (const e of (Array.isArray(raw.eggs) ? raw.eggs : []).slice(0, MAX_EGGS)) {
    if (!isObj(e) || !SPECIES[e.species]) continue;
    const sp = SPECIES[e.species];
    w.eggs.push({
      id: newId(e.id), species: e.species,
      variant: int(e.variant, 0, sp.variants.length - 1, 0), shiny: e.shiny === true,
      left: num(e.left, 0, sp.breed, sp.breed),
      x: inArea(e.x, 0, 320, 160), y: inArea(e.y, 0, 224, 120),
    });
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
  return validateWorld(obj.world, now);
}
