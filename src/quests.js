// Progreso de misiones. Las metas cuentan el progreso acumulado del mundo (estadísticas),
// y las misiones se desbloquean en orden: la activa es la primera sin reclamar.

import { QUESTS, SIDE_QUESTS, SPECIES, FOODS, CORRAL_TYPES, COMMON_VARIANTS, corralTypeOf } from './data.js';
import { hasSpace } from './sim.js';
import { addAnimal, addCorral, getCorral, corralOfSpecies } from './state.js';
import { randInt } from './rng.js';

export function activeQuest(w) {
  return QUESTS.find((q) => !w.quests.claimed[q.id]) || null;
}

// Metas que cuentan algo acumulado: en las secundarias se miden desde que aparece la misión.
const COUNTERS = new Set(['fed', 'petted', 'sold', 'collect', 'bought', 'born', 'cured', 'named']);

/** { current, target, done } para la meta de la misión; `base` se resta en las metas de contador. */
export function progress(w, q, base = 0) {
  const g = q.goal;
  let { current, target } = rawProgress(w, g);
  if (COUNTERS.has(g.type)) current -= base;
  current = Math.max(0, Math.min(current, target));
  return { current, target, done: current >= target };
}

function rawProgress(w, g) {
  const st = w.stats;
  let current = 0, target = g.n ?? 1;
  switch (g.type) {
    case 'fed': current = st.fed; break;
    case 'petted': current = st.petted; break;
    case 'sold': current = st.sold; break;
    case 'collect': current = st.collected[g.product] || 0; break;
    case 'bought': current = st.bought[g.species] || 0; break;
    case 'born': current = g.species ? (st.born[g.species] || 0) : st.bornTotal; break;
    case 'corral': current = getCorral(w, g.tipo) ? 1 : 0; target = 1; break;
    case 'owncount': current = w.animals.length; break;
    case 'hearts': current = w.animals.reduce((m, a) => Math.max(m, a.hearts || 0), 0); break;
    case 'cured': current = st.cured || 0; break;
    case 'named': current = st.named || 0; break;
    case 'own':
      current = w.animals.filter((a) => a.species === g.species && (!g.stage || a.stage === g.stage)).length;
      break;
    default: break;
  }
  return { current, target };
}

export function rewardText(r) {
  const parts = [];
  if (r.coins) parts.push(`${r.coins} monedas`);
  for (const [f, n] of Object.entries(r.foods || {})) parts.push(`${n} ${FOODS[f].nombre.toLowerCase()}`);
  if (r.corral) parts.push(`el corral ${CORRAL_TYPES[r.corral].nombre}`);
  if (r.gift) parts.push(`un ${SPECIES[r.gift].nombre.toLowerCase()} bebé`);
  for (const s of r.unlock || []) parts.push(`conoces al ${SPECIES[s].nombre.toLowerCase()}`);
  return parts.join(', ');
}

export function claim(w) {
  const q = activeQuest(w);
  if (!q) return { ok: false, msg: 'No hay más misiones por ahora.' };
  if (!progress(w, q).done) return { ok: false, msg: 'Todavía falta para terminar esta misión.' };
  const r = q.reward || {};
  if (r.gift) {
    // el regalo vive en el corral que ya existe, o en el que esta misma recompensa abre
    const home = corralOfSpecies(w, r.gift);
    if (home && !hasSpace(w, home.id)) return { ok: false, msg: `Necesitas espacio en ${home.nombre} para tu nuevo amigo.` };
    if (!home && !(r.corral && CORRAL_TYPES[r.corral].species.includes(r.gift))) {
      return { ok: false, msg: `Necesitas construir el corral ${CORRAL_TYPES[corralTypeOf(r.gift)].nombre} para tu nuevo amigo.` };
    }
  }
  w.quests.claimed[q.id] = true;
  if (r.corral) addCorral(w, r.corral);
  giveReward(w, r);
  let animal = null;
  if (r.gift) {
    animal = addAnimal(w, r.gift, randInt(w, COMMON_VARIANTS), 'baby');
  }
  return { ok: true, msg: `¡Misión completada! Recibes ${rewardText(r)}.`, quest: q, animal };
}

function giveReward(w, r) {
  w.coins += r.coins || 0;
  for (const [f, n] of Object.entries(r.foods || {})) w.foods[f] = (w.foods[f] || 0) + n;
  for (const s of r.unlock || []) if (!w.unlocked.includes(s)) w.unlocked.push(s);
}

// ------------------------------------------------------------- secundarias
/** Capítulo en el que va la historia (Infinity si ya terminó). */
const storyChapter = (w) => activeQuest(w)?.ch ?? Infinity;
const sideOpen = (w, q) => !w.quests.side[q.id] && storyChapter(w) >= q.minCh && (!q.needs || w.unlocked.includes(q.needs));

/** Anota la línea base de las secundarias que acaban de aparecer. Devuelve las nuevas. */
export function syncSide(w) {
  const fresh = [];
  for (const q of SIDE_QUESTS) {
    if (!sideOpen(w, q) || Object.hasOwn(w.quests.sideBase, q.id)) continue;
    w.quests.sideBase[q.id] = rawProgress(w, q.goal).current;
    fresh.push(q);
  }
  return fresh;
}

export const sideProgress = (w, q) => progress(w, q, w.quests.sideBase[q.id] ?? rawProgress(w, q.goal).current);
/** Secundarias activas (abiertas y sin reclamar), en orden. */
export const activeSide = (w) => SIDE_QUESTS.filter((q) => sideOpen(w, q));
/** Secundarias ya reclamadas. */
export const doneSide = (w) => SIDE_QUESTS.filter((q) => w.quests.side[q.id]);

export function claimSide(w, id) {
  const q = SIDE_QUESTS.find((x) => x.id === id);
  if (!q || !sideOpen(w, q)) return { ok: false, msg: 'Esa misión no está activa.' };
  if (!sideProgress(w, q).done) return { ok: false, msg: 'Todavía falta para terminar esta misión.' };
  w.quests.side[q.id] = true;
  delete w.quests.sideBase[q.id];
  giveReward(w, q.reward);
  return { ok: true, msg: `¡Misión «${q.title}» completada! Recibes ${rewardText(q.reward)}.`, quest: q };
}
