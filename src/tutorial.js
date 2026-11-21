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

/** Índice del siguiente paso que toca después de `i` (`steps.length` si ya terminó). */
export function nextIndex(i, w, steps = TUTORIAL_STEPS) {
  let j = i + 1;
  while (j < steps.length && stepSkipped(steps[j], w)) j++;
  return j;
}

/** El jugador ya hizo lo que pide el paso. `base`: contadores al empezar el paso. */
export function stepDone(step, { w, selectedId, base }) {
  if (step.act === 'select') return selectedId != null;
  if (step.act === 'feed') return w.stats.fed > base.fed;
  if (step.act === 'pet') return w.stats.petted > base.petted;
  return false;
}

// Mini lecciones: una por mecánica nueva. `ch`: capítulo en que salen; `when: 'lab'`: al abrirse el Laboratorio; `when: 'criadero'`: al abrirse el Criadero.
// Mismos pasos que el tutorial, contados por el personaje `who`. Se ven una vez por dispositivo y se repiten desde Mundo.
export const LESSONS = [
  { id: 'vender', ch: 2, who: 'tomas', title: 'Vender animales', steps: [
    { id: 'tarjeta', needsCard: true, target: '#selected [data-key="sell"]', text: 'Si un animal te sobra, puedes venderlo desde su tarjeta. Un bebé vale menos que un adulto, y los colores raros valen más.' },
    { id: 'lista', panel: 'animals', text: 'En «Animales» ves la etapa de cada uno (bebé o adulto) y también puedes venderlos desde la lista. No se vende uno enfermo ni el último.' },
    { id: 'cuidado', mood: 1, panel: 'pack', text: 'Los productos se siguen vendiendo en la Mochila. Piénsalo bien: vender un animal no se deshace.' },
  ] },
  { id: 'criadero', ch: 1, when: 'criadero', who: 'tomas', title: 'El Criadero', steps: [
    { id: 'mapa', scene: 'mapa', target: '#game', text: 'El Criadero es un lugar del mapa, arriba a la izquierda. Los animales no crían solos: ahí tú eliges las parejas.' },
    { id: 'pareja', panel: 'criadero', text: 'Elige dos adultos de la misma especie, sanos y contentos: van al nido y después sale el huevo.' },
    { id: 'calor', panel: 'criadero', text: '«Darle calor» adelanta la eclosión. Si lo mejoras, tienes más cupos, menos espera y más colores raros.' },
  ] },
  { id: 'salud', ch: 3, who: 'pita', title: 'Enfermedades', steps: [
    { id: 'aviso', needsCard: true, target: '#selected .meters', text: 'Soy la Dra. Pita. Si un animal pasa hambre o tristeza, se enferma y verás una nota roja en su tarjeta. Enfermar no es culpa de nadie.' },
    { id: 'vet', panel: 'vet', text: 'En la Veterinaria curas por monedas, haces una consulta gratis o me ayudas con un minijuego para ahorrar.' },
    { id: 'reposo', mood: 1, panel: 'vet', text: 'Un enfermo no crece, no produce y no se puede vender. Cúralo y vuelve a ser el de siempre.' },
  ] },
  { id: 'lab', ch: 4, when: 'lab', who: 'helice', title: 'El Laboratorio', steps: [
    { id: 'banco', mood: 1, panel: 'lab', text: '¡Hola, amiguitos! Aquí replicamos dinosaurios. Elige una muestra del Banco de ADN y toca «Replicar».' },
    { id: 'hebra', panel: 'lab', text: 'Completa la hebra de abajo con la pareja de cada base de arriba: ♥ con ★ y ● con ◆. Cada una tiene su forma y su color.' },
    { id: 'errores', panel: 'lab', text: 'Sin errores te devuelven el 25 % y hay más chance de un color raro. Con muchos errores se pierde la réplica. Salir antes no cuesta nada.' },
    { id: 'equipo', mood: 1, panel: 'lab', text: 'En «Equipo» mejoras el laboratorio: cada réplica cuesta menos y perdona un error más.' },
  ] },
  { id: 'mao', ch: 6, who: 'mao', title: 'Mao Mao en la Veterinaria', steps: [
    { id: 'tonico', panel: 'vet', text: 'Soy Mao Mao. Ahora atiendo yo la Veterinaria. Mi tónico no se paga con monedas: se hace con tus productos.' },
    { id: 'hierbas', panel: 'vet', text: 'Si me ayudas con la «Mezcla de hierbas», te devuelvo parte del precio de la cura. Si sale muy mal, se pierde la consulta.' },
    { id: 'confianza', mood: 1, panel: 'vet', text: 'Con más confianza, las curas cuestan hasta un 20 % menos. La consulta diaria es gratis.' },
  ] },
  { id: 'estacion', ch: 8, who: 'noa', title: 'La Estación Estelar', steps: [
    { id: 'mapa', mood: 1, scene: 'mapa', target: '#game', text: '¡Llegó la Estación Estelar! Es un corral nuevo del mapa para criaturas de las estrellas.' },
    { id: 'tienda', panel: 'shop', text: 'En la Tienda compras las criaturas que ya conoces. Las demás se conocen al cobrar misiones de la historia.' },
    { id: 'guia', panel: 'animals', text: 'Cada una tiene su comida favorita y produce algo distinto. Míralo en «Animales», en la pestaña Guía.' },
  ] },
];

/** La primera lección sin ver que ya toca: por capítulo, o al abrirse el Laboratorio. `seen`: { id: true }. */
export const lessonOpen = (w, l, ch) => (l.when === 'lab' ? w.lab.built : l.when === 'criadero' ? !!w.quests.claimed['c1-gato'] : ch >= l.ch);
export const lessonDue = (w, seen, ch) => LESSONS.find((l) => !seen[l.id] && lessonOpen(w, l, ch)) || null;
/** Lecciones de un capítulo anterior al actual: una partida que ya iba avanzada no las repite. */
export const pastLessons = (ch) => Object.fromEntries(LESSONS.filter((l) => l.ch < ch).map((l) => [l.id, true]));
