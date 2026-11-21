// Datos del juego: solo datos, sin lógica. Aquí se balancea y se agregan misiones.

export const VERSION = 1;
export const MIN = 60 * 1000;
export const MAX_OFFLINE_MS = 8 * 60 * MIN;
export const BASE_CAPACITY = 8;
export const CORRAL_COSTS = [120, 250, 500, 900]; // cada nivel: +4 de capacidad
export const POND_COST = 250;
export const MAX_ANIMALS_IMPORT = 60;

export const BALANCE = {
  fedDecayPerSec: 100 / (45 * 60), // saciedad llena dura ~45 min
  happyUpPerSec: 0.25,
  happyDownPerSec: 0.2,
  crowdPenaltyPerSec: 0.05,
  favFeed: 60,
  otherFeed: 35,
  favHappy: 15,
  otherHappy: 3,
  petHappy: 8,
  petCooldown: 20000,
  minFedToBreed: 40,
  minHappyToBreed: 60,
  mutationChance: 0.04,
  shinyChance: 0.02,
  shinyChanceParent: 0.15,
  maxReady: 3,
};

// Zona caminable (píxeles lógicos del lienzo de 320x224) y estanque (columnas 13-18, filas 7-11).
export const AREA = { x0: 28, x1: 292, y0: 66, y1: 204 };
export const POND = { x0: 208, y0: 112, x1: 304, y1: 192 };

export const SPECIES = {
  gallina: {
    nombre: 'Gallina', food: 'grano', product: 'huevo', price: 40,
    grow: 3 * MIN, prod: 90 * 1000, breed: 2 * MIN, aquatic: false,
    variants: ['Blanca', 'Marrón'],
    names: ['Pepita', 'Cocó', 'Plumita', 'Huevito', 'Pollita'],
  },
  gato: {
    nombre: 'Gato', food: 'pescadito', product: 'pelusa', price: 80,
    grow: 4 * MIN, prod: 150 * 1000, breed: 3 * MIN, aquatic: false,
    variants: ['Naranja', 'Gris'],
    names: ['Misi', 'Bigotes', 'Mochi', 'Nube', 'Canela'],
  },
  vaca: {
    nombre: 'Vaca', food: 'heno', product: 'leche', price: 150,
    grow: 6 * MIN, prod: 180 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Blanquinegra', 'Marrón'],
    names: ['Manchita', 'Lola', 'Violeta', 'Flor', 'Lechuga'],
  },
  mapache: {
    nombre: 'Mapache', food: 'bayas', product: 'brillito', price: 180,
    grow: 5 * MIN, prod: 200 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Gris', 'Canela'],
    names: ['Antifaz', 'Rocío', 'Pipo', 'Nuez', 'Tizón'],
  },
  chanchito: {
    nombre: 'Chanchito', food: 'bayas', product: 'trufa', price: 200,
    grow: 5 * MIN, prod: 240 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Rosa', 'Lunares'],
    names: ['Bolita', 'Rosita', 'Pimpón', 'Fresita', 'Cerdi'],
  },
  ajolote: {
    nombre: 'Ajolote', food: 'gusanito', product: 'burbuja', price: 260,
    grow: 6 * MIN, prod: 240 * 1000, breed: 5 * MIN, aquatic: true,
    variants: ['Rosa', 'Dorado'],
    names: ['Axi', 'Burbuja', 'Coral', 'Luna', 'Gominola'],
  },
  carnotauro: {
    nombre: 'Carnotauro', food: 'carnita', product: 'escama_fuego', price: null,
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: false,
    variants: ['Coral', 'Menta'],
    names: ['Rawr', 'Cuernitos', 'Brasa', 'Dino', 'Pelusa'],
  },
  spinosaurus: {
    nombre: 'Spinosaurus', food: 'pescadito', product: 'escama_rio', price: null,
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: true,
    variants: ['Azul', 'Verde'],
    names: ['Vela', 'Río', 'Gigi', 'Splash', 'Nessie'],
  },
};
export const ORDER = Object.keys(SPECIES);

export const FOODS = {
  grano: { nombre: 'Grano', price: 10 },
  heno: { nombre: 'Heno', price: 12 },
  pescadito: { nombre: 'Pescadito', price: 14 },
  bayas: { nombre: 'Bayas', price: 12 },
  carnita: { nombre: 'Carnita', price: 18 },
  gusanito: { nombre: 'Gusanitos', price: 14 },
};

export const PRODUCTS = {
  huevo: { nombre: 'Huevo', price: 8 },
  pelusa: { nombre: 'Pelusa', price: 12 },
  leche: { nombre: 'Leche', price: 14 },
  brillito: { nombre: 'Brillito', price: 20 },
  trufa: { nombre: 'Trufa', price: 28 },
  burbuja: { nombre: 'Burbuja', price: 24 },
  escama_fuego: { nombre: 'Escama de fuego', price: 45 },
  escama_rio: { nombre: 'Escama de río', price: 45 },
};

// Misiones de historia, en orden. Meta: { type, ... } (ver quests.js).
// Recompensa: { coins, foods: {comida: n}, unlock: [especie], gift: especie }
export const QUESTS = [
  // Capítulo 1 — La granja de la abuela
  { id: 'c1-carta', ch: 1, title: 'Una carta de la abuela',
    text: 'Querida familia: les dejo mi granja y a mis gallinitas. Empiecen dándoles de comer. ¡Con cariño, abuela Cosi!',
    goal: { type: 'fed', n: 3 }, reward: { coins: 20 } },
  { id: 'c1-huevos', ch: 1, title: 'Los primeros huevitos',
    text: 'Cuando una gallina tiene un huevo listo aparece una burbuja sobre ella. ¡Tócala para recogerlo!',
    goal: { type: 'collect', product: 'huevo', n: 3 }, reward: { coins: 30, foods: { grano: 5 } } },
  { id: 'c1-vender', ch: 1, title: 'La primera venta',
    text: 'Abre la mochila y vende lo que recogiste. Las monedas sirven para comprar comida y nuevos amigos.',
    goal: { type: 'sold', n: 3 }, reward: { coins: 25 } },
  { id: 'c1-gato', ch: 1, title: 'Un amiguito peludo',
    text: 'El granero tiene ratoncitos traviesos. Compra un gatito en la tienda.',
    goal: { type: 'bought', species: 'gato', n: 1 }, reward: { foods: { pescadito: 5 } } },
  { id: 'c1-cria', ch: 1, title: '¡Una gallinita!',
    text: 'Si dos gallinas están felices y bien comidas, ponen un huevo especial. Cuídalas y espera.',
    goal: { type: 'born', species: 'gallina', n: 1 }, reward: { coins: 60 } },
  { id: 'c1-cuaderno', ch: 1, title: 'El cuaderno de la abuela',
    text: 'Entre las páginas hay dibujos de amigos del bosque. Acaricia a tus animales para ganarte su confianza.',
    goal: { type: 'petted', n: 5 }, reward: { coins: 40, unlock: ['mapache', 'chanchito'] } },

  // Capítulo 2 — Amigos del bosque
  { id: 'c2-mapache', ch: 2, title: 'Un visitante con antifaz',
    text: 'Algo se mueve entre los arbustos… ¡un mapache curioso! Dale la bienvenida.',
    goal: { type: 'bought', species: 'mapache', n: 1 }, reward: { coins: 30, foods: { bayas: 5 } } },
  { id: 'c2-trufa', ch: 2, title: 'Trufas escondidas',
    text: 'El chanchito tiene un olfato increíble. Consigue una trufa.',
    goal: { type: 'collect', product: 'trufa', n: 1 }, reward: { coins: 80 } },
  { id: 'c2-estanque', ch: 2, title: 'Un estanque para refrescarse',
    text: 'En el cuaderno hay un dibujo de un animalito rosa que vive en el agua. Necesita un estanque.',
    goal: { type: 'upgrade', key: 'estanque' }, reward: { coins: 60, foods: { gusanito: 6 }, unlock: ['ajolote'] } },
  { id: 'c2-burbuja', ch: 2, title: 'Burbujas de colores',
    text: '¡Ya puedes adoptar un ajolote! Cuando sea grande, recoge una burbuja.',
    goal: { type: 'collect', product: 'burbuja', n: 1 }, reward: { coins: 100 } },

  // Capítulo 3 — El huevo misterioso
  { id: 'c3-tormenta', ch: 3, title: 'La gran tormenta',
    text: 'Esta noche hubo una tormenta enorme y algo brilla en el corral. Cuida a 6 animales para mantener la granja animada.',
    goal: { type: 'owncount', n: 6 }, reward: { coins: 100, unlock: ['carnotauro'], gift: 'carnotauro' } },
  { id: 'c3-carnotauro', ch: 3, title: 'El bebé carnotauro',
    text: '¡Del huevo misterioso nació un carnotauro! Es tierno aunque tenga cuernitos. Dale carnita hasta que crezca.',
    goal: { type: 'own', species: 'carnotauro', stage: 'adult', n: 1 }, reward: { coins: 200, foods: { carnita: 5 } } },

  // Capítulo 4 — El río perdido
  { id: 'c4-pista', ch: 4, title: 'Una escama brillante',
    text: 'Entre las escamas de fuego aparece un mapa del río perdido. Recoge una escama de fuego para estudiarlo.',
    goal: { type: 'collect', product: 'escama_fuego', n: 1 }, reward: { coins: 150, foods: { pescadito: 10 } } },
  { id: 'c4-expedicion', ch: 4, title: 'Preparando la expedición',
    text: 'Para llegar al río hay que reunir provisiones. Vende 15 productos en total.',
    goal: { type: 'sold', n: 15 }, reward: { coins: 100, unlock: ['spinosaurus'], gift: 'spinosaurus' } },
  { id: 'c4-spino', ch: 4, title: 'Un gigante tierno',
    text: '¡Un spinosaurus bebé te siguió desde el río! Necesita el estanque y mucho pescadito para crecer.',
    goal: { type: 'own', species: 'spinosaurus', stage: 'adult', n: 1 }, reward: { coins: 300 } },
];

export const CHAPTERS = {
  1: 'La granja de la abuela',
  2: 'Amigos del bosque',
  3: 'El huevo misterioso',
  4: 'El río perdido',
};
