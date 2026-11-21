// Datos del juego: solo datos, sin lógica. Aquí se balancea y se agregan misiones.

export const VERSION = 2;
export const MIN = 60 * 1000;
export const MAX_OFFLINE_MS = 8 * 60 * MIN;
export const CORRAL_COSTS = [120, 250, 500, 900]; // cada nivel: +4 de capacidad
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
  // Cría: 85 % hereda el color de un padre; 15 % muta (10,5 % poco común y 4,5 % raro del total).
  mutationChance: 0.15,
  mutantTierOdds: { poco: 0.7, raro: 0.3 },
  shinyChance: 0.02,
  shinyChanceParent: 0.15,
  maxReady: 3,
  // ---- Fase 2B: corazones (afecto 0..5). 100 de cariño = 1 corazón.
  lovePerPet: 10,
  lovePerFav: 15,
  loveDailyCap: 100,                     // cariño máximo por animal y día (≈ 1 corazón al día)
  loveDecayPerSec: 100 / (3 * 60 * 60),  // descuidado y con el juego abierto: −1 corazón cada ~3 h
  heartProdBonus: 0.04,                  // +4 % de producción por corazón (máx. +20 % con 5)
  // ---- Fase 2B: enfermedades. Probabilidad por hora de juego abierto (solo en vivo, nunca sin conexión).
  sickBasePerHour: { resfriado: 0.012, pulgas: 0.012 },
  sadSickPerHour: 1,      // tristeza, tras `sadAfter` con felicidad < 20
  sadAfter: 10 * MIN,
  hungrySickPerHour: 1,   // pancita, tras `hungryAfter` con saciedad en 0
  hungryAfter: 15 * MIN,
  cureCost: { resfriado: 30, pancita: 25, pulgas: 20, tristeza: 15 },
  cureCareFed: 50,        // se cura sola si está comida y contenta…
  cureCareHappy: 40,
};

export const MAX_HEARTS = 5;
// Enfermedades: ningún animal muere ni pierde nada; solo se detiene su progreso hasta curarse.
// `selfCure`: tiempo de cuidados en casa (bien comido y contento, con el juego abierto) para curarse solo.
export const DISEASES = {
  resfriado: { nombre: 'Resfriado', icon: 'gota', selfCure: 25 * MIN, hint: 'Estornuda. Abrígalo con comida y mimos o llévalo a la Veterinaria.' },
  pancita: { nombre: 'Dolor de pancita', icon: 'pancita', selfCure: 15 * MIN, hint: 'Pasó mucha hambre. Dale de comer y se repondrá.' },
  pulgas: { nombre: 'Pulgas', icon: 'pulga', selfCure: 30 * MIN, hint: 'Le pica todo. Un baño en la Veterinaria lo arregla rápido.' },
  tristeza: { nombre: 'Tristeza', icon: 'nube', selfCure: 12 * MIN, hint: 'Estuvo triste mucho tiempo. Necesita comida favorita y caricias.' },
};
export const DISEASE_ORDER = Object.keys(DISEASES);

// Corrales (v2): un corral por tipo en la fase 1, así que cada especie vive en uno solo.
// `cap` es la capacidad base; cada nivel de ampliación suma 4. `cost` null = llega por la historia.
const LAND = { x0: 28, x1: 292, y0: 66, y1: 204 };
export const CORRAL_TYPES = {
  pradera: { nombre: 'Pradera', species: ['gallina', 'gato', 'vaca', 'chanchito'], cap: 8, cost: 0, area: LAND, aquatic: false },
  bosque: { nombre: 'Bosque', species: ['mapache'], cap: 6, cost: 300, area: LAND, aquatic: false },
  estanque: { nombre: 'Estanque', species: ['ajolote', 'spinosaurus'], cap: 6, cost: 250, area: { x0: 52, x1: 268, y0: 104, y1: 196 }, aquatic: true },
  jurasico: { nombre: 'Jurásico', species: ['carnotauro'], cap: 4, cost: null, area: LAND, aquatic: false },
};
export const CORRAL_TYPE_ORDER = ['pradera', 'bosque', 'estanque', 'jurasico'];
export const MAX_CORRAL_LEVEL = CORRAL_COSTS.length;
// Posición de cada lugar en el mapa (lienzo lógico 320x224).
export const MAP_SPOTS = {
  pradera: { x: 96, y: 156 }, bosque: { x: 232, y: 84 }, estanque: { x: 232, y: 160 }, jurasico: { x: 96, y: 80 },
};
export const corralTypeOf = (species) => CORRAL_TYPE_ORDER.find((t) => CORRAL_TYPES[t].species.includes(species));

export const SPECIES = {
  gallina: {
    nombre: 'Gallina', food: 'grano', product: 'huevo', price: 40,
    grow: 3 * MIN, prod: 90 * 1000, breed: 2 * MIN, aquatic: false,
    variants: ['Blanca', 'Marrón', 'Durazno', 'Lavanda'],
    names: ['Pepita', 'Cocó', 'Plumita', 'Huevito', 'Pollita'],
  },
  gato: {
    nombre: 'Gato', food: 'pescadito', product: 'pelusa', price: 80,
    grow: 4 * MIN, prod: 150 * 1000, breed: 3 * MIN, aquatic: false,
    variants: ['Naranja', 'Gris', 'Siamés', 'Medianoche'],
    names: ['Misi', 'Bigotes', 'Mochi', 'Nube', 'Canela'],
  },
  vaca: {
    nombre: 'Vaca', food: 'heno', product: 'leche', price: 150,
    grow: 6 * MIN, prod: 180 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Blanquinegra', 'Marrón', 'Fresa', 'Galaxia'],
    names: ['Manchita', 'Lola', 'Violeta', 'Flor', 'Lechuga'],
  },
  mapache: {
    nombre: 'Mapache', food: 'bayas', product: 'brillito', price: 180,
    grow: 5 * MIN, prod: 200 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Gris', 'Canela', 'Rojizo', 'Nieve'],
    names: ['Antifaz', 'Rocío', 'Pipo', 'Nuez', 'Tizón'],
  },
  chanchito: {
    nombre: 'Chanchito', food: 'bayas', product: 'trufa', price: 200,
    grow: 5 * MIN, prod: 240 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Rosa', 'Lunares', 'Chocolate', 'Algodón'],
    names: ['Bolita', 'Rosita', 'Pimpón', 'Fresita', 'Cerdi'],
  },
  ajolote: {
    nombre: 'Ajolote', food: 'gusanito', product: 'burbuja', price: 260,
    grow: 6 * MIN, prod: 240 * 1000, breed: 5 * MIN, aquatic: true,
    variants: ['Rosa', 'Dorado', 'Menta', 'Medianoche'],
    names: ['Axi', 'Burbuja', 'Coral', 'Luna', 'Gominola'],
  },
  carnotauro: {
    nombre: 'Carnotauro', food: 'carnita', product: 'escama_fuego', price: null,
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: false,
    variants: ['Coral', 'Menta', 'Lavanda', 'Medianoche'],
    names: ['Rawr', 'Cuernitos', 'Brasa', 'Dino', 'Pelusa'],
  },
  spinosaurus: {
    nombre: 'Spinosaurus', food: 'pescadito', product: 'escama_rio', price: null,
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: true,
    variants: ['Azul', 'Verde', 'Naranja', 'Violeta'],
    names: ['Vela', 'Río', 'Gigi', 'Splash', 'Nessie'],
  },
};
export const ORDER = Object.keys(SPECIES);

// Colores: el índice de `variants` fija la rareza. Los 2 primeros son los comunes (tienda y regalos
// solo dan estos); el 2 es poco común y el 3 raro (solo nacen por mutación). El brillante es aparte.
export const COMMON_VARIANTS = 2;
export const VARIANT_TIERS = ['comun', 'comun', 'poco', 'raro'];
export const TIER_LABEL = { comun: 'Común', poco: 'Poco común', raro: 'Raro', brillante: 'Brillante' };
/** Rareza de un animal o huevo: el brillante gana sobre el color. */
export const rarityOf = (a) => (a.shiny ? 'brillante' : VARIANT_TIERS[a.variant] || 'comun');
export const rarityLabel = (a) => TIER_LABEL[rarityOf(a)];
/** Clave de fila del atlas de sprites: el brillante tiene su propia fila en vez del número de color. */
export const spriteKey = (species, variant, shiny, stage) => `${species}:${shiny ? 'shiny' : variant}:${stage}`;

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
    text: 'Algo se mueve entre los arbustos… ¡un mapache curioso! Construye el corral del Bosque en el mapa y dale la bienvenida.',
    goal: { type: 'bought', species: 'mapache', n: 1 }, reward: { coins: 30, foods: { bayas: 5 } } },
  { id: 'c2-trufa', ch: 2, title: 'Trufas escondidas',
    text: 'El chanchito tiene un olfato increíble. Consigue una trufa.',
    goal: { type: 'collect', product: 'trufa', n: 1 }, reward: { coins: 80 } },
  { id: 'c2-estanque', ch: 2, title: 'Un estanque para refrescarse',
    text: 'En el cuaderno hay un dibujo de un animalito rosa que vive en el agua. Necesita un estanque.',
    goal: { type: 'corral', tipo: 'estanque' }, reward: { coins: 60, foods: { gusanito: 6 }, unlock: ['ajolote'] } },
  { id: 'c2-burbuja', ch: 2, title: 'Burbujas de colores',
    text: '¡Ya puedes adoptar un ajolote! Cuando sea grande, recoge una burbuja.',
    goal: { type: 'collect', product: 'burbuja', n: 1 }, reward: { coins: 100 } },

  // Capítulo 3 — El huevo misterioso
  { id: 'c3-tormenta', ch: 3, title: 'La gran tormenta',
    text: 'Esta noche hubo una tormenta enorme y algo brilla en el corral. Cuida a 6 animales para mantener la granja animada.',
    goal: { type: 'owncount', n: 6 }, reward: { coins: 100, unlock: ['carnotauro'], corral: 'jurasico', gift: 'carnotauro' } },
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
