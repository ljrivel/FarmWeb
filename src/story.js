// Escenas con diálogo: cuál toca ahora y cuáles de una partida antigua ya pasaron. Sin interfaz ni estado propio.

import { SCENES, QUESTS } from './data.js';

const split = (when) => when.split(':');

/** ¿Se cumple ahora el disparador de la escena? */
function met(w, when) {
  const [kind, id] = split(when);
  if (kind === 'inicio') return QUESTS.find((q) => !w.quests.claimed[q.id])?.id === id;
  if (kind === 'fin') return !!w.quests.claimed[id];
  return id === 'primera-enfermedad' && w.animals.some((a) => a.sick);
}

/** La primera escena sin ver cuyo disparador se cumple, o null. */
export const nextScene = (w) => SCENES.find((s) => !w.story.seen[s.id] && met(w, s.when)) || null;

/** Una partida de antes de las escenas no las repite: marca como vistas las de lo que ya ocurrió. */
export function markPastScenes(w) {
  for (const s of SCENES) {
    const [kind, id] = split(s.when);
    if (kind === 'evento' ? w.stats.cured > 0 : w.quests.claimed[id]) w.story.seen[s.id] = true;
  }
}
