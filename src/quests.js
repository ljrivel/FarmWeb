// Progreso de misiones. Las metas cuentan el progreso acumulado del mundo (estadísticas),
// y las misiones se desbloquean en orden: la activa es la primera sin reclamar.

import { QUESTS, SPECIES, FOODS, CORRAL_TYPES, COMMON_VARIANTS, corralTypeOf } from './data.js';
import { hasSpace } from './sim.js';
import { addAnimal, addCorral, getCorral, corralOfSpecies } from './state.js';
import { randInt } from './rng.js';

export function activeQuest(w) {
  return QUESTS.find((q) => !w.quests.claimed[q.id]) || null;
}

/** { current, target, done } para la meta de la misión. */
export function progress(w, q) {
  const g = q.goal;
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
    case 'own':
      current = w.animals.filter((a) => a.species === g.species && (!g.stage || a.stage === g.stage)).length;
      break;
    default: break;
  }
  current = Math.min(current, target);
  return { current, target, done: current >= target };
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
  w.coins += r.coins || 0;
  for (const [f, n] of Object.entries(r.foods || {})) w.foods[f] = (w.foods[f] || 0) + n;
  for (const s of r.unlock || []) if (!w.unlocked.includes(s)) w.unlocked.push(s);
  let animal = null;
  if (r.gift) {
    animal = addAnimal(w, r.gift, randInt(w, COMMON_VARIANTS), 'baby');
  }
  return { ok: true, msg: `¡Misión completada! Recibes ${rewardText(r)}.`, quest: q, animal };
}
