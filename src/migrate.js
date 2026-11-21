// Migración de mundos antiguos al formato actual. Es pura: no muta la entrada.
// Solo reorganiza (corrales, campo `corral` de animales y huevos); la limpieza y los topes
// los hace `validateWorld`, que corre justo después.

import { CORRAL_TYPES, CORRAL_TYPE_ORDER, MAX_CORRAL_LEVEL, corralTypeOf } from './data.js';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** v1 → v2. Un mundo que ya trae `corrales` se devuelve tal cual. */
export function migrateWorld(raw) {
  if (!isObj(raw) || Array.isArray(raw.corrales)) return raw;

  const up = isObj(raw.upgrades) ? raw.upgrades : {};
  const claimed = isObj(raw.quests?.claimed) ? raw.quests.claimed : {};
  const present = new Set();
  const place = (list) => (Array.isArray(list) ? list : []).map((x) => {
    const tipo = isObj(x) ? corralTypeOf(x.species) : undefined;
    if (!tipo) return x;
    present.add(tipo);
    return { ...x, corral: tipo };
  });
  const animals = place(raw.animals);
  const eggs = place(raw.eggs);

  // La Pradera siempre existe. El Estanque y el Jurásico también si la historia v1 ya los entregó
  // (ids de misiones de v1, que no cambian), y cualquier corral donde ya viva un animal.
  const wanted = new Set(['pradera', ...present]);
  if (up.estanque === true || claimed['c2-estanque'] === true) wanted.add('estanque');
  if (claimed['c3-tormenta'] === true) wanted.add('jurasico');

  const level = Math.min(MAX_CORRAL_LEVEL, Math.max(0, Math.trunc(Number(up.corral)) || 0));
  const corrales = CORRAL_TYPE_ORDER.filter((t) => wanted.has(t)).map((tipo) => ({
    id: tipo, tipo, nombre: CORRAL_TYPES[tipo].nombre, nivel: tipo === 'pradera' ? level : 0,
  }));

  const { upgrades, capacity, ...rest } = raw; // eslint-disable-line no-unused-vars
  return { ...rest, v: 2, corrales, animals, eggs };
}
