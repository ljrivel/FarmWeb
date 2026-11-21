// Tutorial guiado: pasos y reglas sin interfaz. Los textos los dice Tomás (ver `startTutorial` en ui.js).
// `target`: 'animal' (el primero del corral a la vista) o un selector CSS; sin `target` solo se muestra la tarjeta.
// `panel`: el tutorial abre ese panel (con el panel abierto no se oscurece nada encima); `scene: 'mapa'`: viaja al mapa.
// `act`: el paso espera una acción ('select' | 'feed' | 'pet'); `needsCard`: necesita la tarjeta de un animal abierta.

export const TUTORIAL_STEPS = [
  { id: 'hola', mood: 1, text: '¡Hola! Soy Tomás, el vecino. Te enseño lo básico de la granja en un minuto. ¿Vamos?' },
  { id: 'tocar', act: 'select', target: 'animal', text: 'Primero, toca a uno de tus animales para verlo de cerca.' },
  { id: 'tarjeta', needsCard: true, target: '#selected .meters', text: 'Esta es su tarjeta. Saciedad es cuánta hambre tiene; felicidad, qué tan contento está. Si se queda sin comer, se pone triste.' },
  { id: 'comer', act: 'feed', needsCard: true, skipIf: 'sinComida', target: '#selected .foods', text: 'Dale de comer. La ★ marca su comida favorita: le gusta más y gana más cariño.' },
  { id: 'acariciar', act: 'pet', needsCard: true, target: '#selected [data-key="pet"]', text: 'Ahora acarícialo. Los mimos lo ponen contento.' },
  { id: 'corazones', needsCard: true, target: '#selected .hearts', text: 'Cada vez que lo quieres gana cariño, y 100 de cariño son un corazón. Con más corazones produce más.' },
  { id: 'productos', target: '#collectAll', text: 'Cuando tienen algo, aparece una burbuja sobre el animal: tócala para recogerlo. Con «Recoger todo» lo juntas de una vez.' },
  { id: 'mochila', panel: 'pack', target: '[data-panel="pack"]', text: 'Esta es la Mochila: aquí vendes lo que recogiste para ganar monedas.' },
  { id: 'tienda', panel: 'shop', target: '[data-panel="shop"]', text: 'Esta es la Tienda: compras comida y nuevos amigos. ¡Que no se les acabe la comida!' },
  { id: 'misiones', panel: 'quests', target: '#questChip', text: 'Aquí están las Misiones: cuentan la historia y dan premios. Si aparece el botón de la cesta, Bruno dejó un regalo del día.' },
  { id: 'mapa', scene: 'mapa', target: '#game', text: 'Este es el Mapa: tocas un lugar para viajar a su corral. Los candados se abren con la historia.' },
  { id: 'vet', panel: 'vet', target: '[data-goto="mapa"]', text: 'Esta es la Veterinaria. Si un animal se enferma, aquí se cura por unas monedas. Nunca muere: solo necesita cuidados.' },
  { id: 'guardado', mood: 1, panel: 'world', target: '[data-panel="world"]', text: 'Todo se guarda solo. En Mundo puedes bajar una copia, ajustar el sonido o repetir este tutorial. ¡A cuidar la granja!' },
];

/** ¿Este paso no tiene sentido ahora (sin animales, o sin comida para el paso de comer)? */
export function stepSkipped(step, w) {
  if ((step.needsCard || step.act === 'select') && !w.animals.length) return true;
  return step.skipIf === 'sinComida' && !Object.values(w.foods).some((n) => n > 0);
}

/** Índice del siguiente paso que toca después de `i` (TUTORIAL_STEPS.length si ya terminó). */
export function nextIndex(i, w) {
  let j = i + 1;
  while (j < TUTORIAL_STEPS.length && stepSkipped(TUTORIAL_STEPS[j], w)) j++;
  return j;
}

/** El jugador ya hizo lo que pide el paso. `base`: contadores al empezar el paso. */
export function stepDone(step, { w, selectedId, base }) {
  if (step.act === 'select') return selectedId != null;
  if (step.act === 'feed') return w.stats.fed > base.fed;
  if (step.act === 'pet') return w.stats.petted > base.petted;
  return false;
}
