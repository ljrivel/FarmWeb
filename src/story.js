// Escenas con diálogo: cuál toca ahora y cuáles de una partida antigua ya pasaron. Sin interfaz ni estado propio.

import { SCENES, QUESTS, VISITS } from './data.js';

const split = (when) => when.split(':');

/** ¿Se cumple ahora el disparador de la escena? */
function met(w, when) {
  const [kind, id] = split(when);
  if (kind === 'inicio') return QUESTS.find((q) => !w.quests.claimed[q.id])?.id === id;
  if (kind === 'fin') return !!(w.quests.claimed[id] || w.quests.side[id]); // también cierres de secundarias
  return id === 'primera-enfermedad' && w.animals.some((a) => a.sick);
}

/** La primera escena sin ver cuyo disparador se cumple, o null. */
export const nextScene = (w) => SCENES.find((s) => !w.story.seen[s.id] && met(w, s.when)) || null;

/** Una partida de antes de las escenas no las repite: marca como vistas las de lo que ya ocurrió. */
export function markPastScenes(w) {
  for (const s of SCENES) {
    const [kind, id] = split(s.when);
    if (kind === 'evento' ? w.stats.cured > 0 : w.quests.claimed[id] || w.quests.side[id]) w.story.seen[s.id] = true;
  }
}

/** Capítulo actual de la historia (el último + 1 = ya terminada). */
export const chapterNow = (w) => QUESTS.find((q) => !w.quests.claimed[q.id])?.ch ?? Math.max(...QUESTS.map((q) => q.ch)) + 1;

/**
 * Charla de la próxima visita: de las que ya tocan por capítulo y condición, sin repetir al `last` que acaba
 * de venir y sin repetir charlas hasta agotarlas (entonces empiezan de nuevo). `rnd` devuelve 0..1.
 */
export function pickVisit(w, last = null, rnd = Math.random) {
  const ch = chapterNow(w);
  const sick = w.animals.some((a) => a.sick);
  const ok = VISITS.filter((v) => v.minCh <= ch && v.who !== last && (!v.cond || (v.cond === 'enfermo') === sick));
  let pool = ok.filter((v) => !w.story.talked[v.id]);
  if (!pool.length) { for (const v of ok) delete w.story.talked[v.id]; pool = ok; }
  return pool[Math.floor(rnd() * pool.length)] || null;
}
