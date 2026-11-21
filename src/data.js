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
  sickBasePerHour: { resfriado: 0.03, pulgas: 0.03 },
  sadSickPerHour: 1,      // tristeza, tras `sadAfter` con felicidad < 20
  sadAfter: 10 * MIN,
  hungrySickPerHour: 1,   // pancita, tras `hungryAfter` con saciedad en 0
  hungryAfter: 15 * MIN,
  cureCost: { resfriado: 60, pancita: 50, pulgas: 40, tristeza: 30 },
  cureCareFed: 50,        // se cura sola si está comida y contenta…
  cureCareHappy: 40,
  // ---- Visitas de personajes a la granja (solo con el juego abierto y sin nada tapando el corral).
  visitMinMs: 8 * MIN,    // cada cuánto llega una visita: entre estos dos tiempos
  visitMaxMs: 12 * MIN,
  visitStayMs: 90 * 1000, // cuánto espera antes de irse si no la tocas
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
  bosque: { nombre: 'Bosque', species: ['mapache', 'conejo'], cap: 6, cost: 300, area: LAND, aquatic: false },
  estanque: { nombre: 'Estanque', species: ['ajolote', 'spinosaurus', 'pato'], cap: 6, cost: 250, area: { x0: 52, x1: 268, y0: 104, y1: 196 }, aquatic: true },
  jurasico: { nombre: 'Jurásico', species: ['carnotauro'], cap: 4, cost: null, area: LAND, aquatic: false },
};
export const CORRAL_TYPE_ORDER = ['pradera', 'bosque', 'estanque', 'jurasico'];
export const MAX_CORRAL_LEVEL = CORRAL_COSTS.length;
// Posición de cada lugar en el mapa (lienzo lógico 320x224).
export const MAP_SPOTS = {
  pradera: { x: 96, y: 156 }, bosque: { x: 232, y: 84 }, estanque: { x: 232, y: 160 }, jurasico: { x: 96, y: 80 },
};
// La Veterinaria no es un corral: siempre está abierta y no cuenta para las metas de corrales.
export const VET_SPOT = { x: 164, y: 48 };
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
    names: ['Vela', 'Río', 'Gigi', 'Splash', 'Gota'],
  },
  // Especies nuevas (se conocen con misiones secundarias del capítulo 2 y 3)
  conejo: {
    nombre: 'Conejo', food: 'zanahoria', product: 'lana', price: 160,
    grow: 4 * MIN, prod: 170 * 1000, breed: 3 * MIN, aquatic: false,
    variants: ['Blanco', 'Gris', 'Canela', 'Cielo'],
    names: ['Saltarín', 'Copito', 'Orejitas', 'Bombón', 'Algodón'],
  },
  pato: {
    nombre: 'Pato', food: 'grano', product: 'pluma', price: 220,
    grow: 5 * MIN, prod: 210 * 1000, breed: 4 * MIN, aquatic: true,
    variants: ['Amarillo', 'Blanco', 'Menta', 'Rosado'],
    names: ['Cuac', 'Patito', 'Plumón', 'Charco', 'Lulú'],
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
  zanahoria: { nombre: 'Zanahoria', price: 12 },
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
  lana: { nombre: 'Lanita', price: 18 },
  pluma: { nombre: 'Pluma', price: 22 },
};

// Personajes: hablan en las misiones (campo `who`). `rol` explica su lugar en la historia.
export const CHARACTERS = {
  abuela: { nombre: 'Abuela Cosi', rol: 'Dejó la granja a la familia y escribe cartas desde lejos', color: '#ff8fb0' },
  tomas: { nombre: 'Tomás', rol: 'El vecino curioso que ayuda en la granja', color: '#8fdcc0' },
  pita: { nombre: 'Dra. Pita', rol: 'La veterinaria del pueblo', color: '#bfe4ff' },
  ramon: { nombre: 'Don Ramón', rol: 'El comerciante que compra tus productos', color: '#ffe08a' },
  lia: { nombre: 'Lía', rol: 'Guía del río perdido, amiga de la abuela de joven', color: '#c9b6f2' },
  mia: { nombre: 'Mía', rol: 'La hermanita de Tomás, coleccionista de cosas suaves', color: '#ffc9dc' },
  bruno: { nombre: 'Bruno', rol: 'El cartero del pueblo, que trae las cartas de la abuela', color: '#ffd3a8' },
};

// Misiones de historia, en orden. Meta: { type, ... } (ver quests.js).
// Recompensa: { coins, foods: {comida: n}, unlock: [especie], gift: especie }
// Los `id` y las metas de los capítulos 1 a 4 no cambian (los guardados dependen de ellos); solo se
// enriquecieron los textos. Las misiones nuevas van siempre al final para no hacer retroceder a nadie.
export const QUESTS = [
  // Capítulo 1 — La granja de la abuela
  { id: 'c1-carta', ch: 1, who: 'abuela', title: 'Una carta de la abuela',
    text: 'Querida familia: les dejo mi granja y a mis gallinitas. Yo me voy de viaje a terminar algo que empecé hace muchos años. Empiecen dándoles de comer: ellas les enseñarán el resto. ¡Con cariño, abuela Cosi!',
    goal: { type: 'fed', n: 3 }, reward: { coins: 20 } },
  { id: 'c1-huevos', ch: 1, who: 'tomas', title: 'Los primeros huevitos',
    text: '¡Hola! Soy Tomás, vivo al lado. Tu abuela siempre me dejaba ayudar. Cuando una gallina tiene un huevo listo aparece una burbuja sobre ella: ¡tócala para recogerlo!',
    goal: { type: 'collect', product: 'huevo', n: 3 }, reward: { coins: 30, foods: { grano: 5 } } },
  { id: 'c1-vender', ch: 1, who: 'ramon', title: 'La primera venta',
    text: 'Buenos días. Le compraba huevos a la señora Cosi todas las semanas, y no pienso dejar de hacerlo. Abre la mochila y véndeme lo que recogiste: con las monedas podrás comprar comida y nuevos amigos.',
    goal: { type: 'sold', n: 3 }, reward: { coins: 25 } },
  { id: 'c1-gato', ch: 1, who: 'tomas', title: 'Un amiguito peludo',
    text: '¡Oí ruiditos en el granero! Son ratoncitos traviesos que se comen el grano. Tu abuela tenía un gato que los espantaba con solo mirarlos. Compra un gatito en la tienda.',
    goal: { type: 'bought', species: 'gato', n: 1 }, reward: { foods: { pescadito: 5 } } },
  { id: 'c1-cria', ch: 1, who: 'abuela', title: '¡Una gallinita!',
    text: 'Segunda carta: «Si dos gallinas están felices y bien comidas, ponen un huevo especial. Así empezó todo para mí: con una sola gallinita que nació una mañana de primavera.»',
    goal: { type: 'born', species: 'gallina', n: 1 }, reward: { coins: 60 } },
  { id: 'c1-cuaderno', ch: 1, who: 'tomas', title: 'El cuaderno de la abuela',
    text: 'Encontré esto debajo del heno: ¡el cuaderno de tu abuela! Tiene dibujos de amigos del bosque y una página arrancada… Dice que para ganarte la confianza de un animal hay que acariciarlo mucho.',
    goal: { type: 'petted', n: 5 }, reward: { coins: 40, unlock: ['mapache', 'chanchito'] } },

  // Capítulo 2 — Amigos del bosque
  { id: 'c2-mapache', ch: 2, who: 'tomas', title: 'Un visitante con antifaz',
    text: 'Algo se mueve entre los arbustos… ¡es el mapache del cuaderno! Le encantan las cosas que brillan. Construye el corral del Bosque en el mapa y dale la bienvenida.',
    goal: { type: 'bought', species: 'mapache', n: 1 }, reward: { coins: 30, foods: { bayas: 5 } } },
  { id: 'c2-trufa', ch: 2, who: 'ramon', title: 'Trufas escondidas',
    text: 'En el pueblo nadie ha probado una trufa en años. Dicen que los chanchitos de la señora Cosi las encontraban hasta bajo la nieve. Consígueme una y te pagaré bien.',
    goal: { type: 'collect', product: 'trufa', n: 1 }, reward: { coins: 80 } },
  { id: 'c2-estanque', ch: 2, who: 'abuela', title: 'Un estanque para refrescarse',
    text: 'Tercera carta: «En el cuaderno hay un animalito rosa que sonríe todo el tiempo. Lo conocí junto a un río que ya nadie encuentra. Necesita un estanque: constrúyanlo y vendrá.»',
    goal: { type: 'corral', tipo: 'estanque' }, reward: { coins: 60, foods: { gusanito: 6 }, unlock: ['ajolote'] } },
  { id: 'c2-burbuja', ch: 2, who: 'tomas', title: 'Burbujas de colores',
    text: '¡Ya puedes adoptar un ajolote! Mi hermanita dice que sus burbujas traen buena suerte. Cuando sea grande, recoge una burbuja.',
    goal: { type: 'collect', product: 'burbuja', n: 1 }, reward: { coins: 100 } },

  // Capítulo 3 — El huevo misterioso
  { id: 'c3-tormenta', ch: 3, who: 'tomas', title: 'La gran tormenta',
    text: 'Anoche hubo una tormenta enorme y los animales estaban asustados. Ahora algo brilla en el corral… ¡un huevo gigante! Mantén la granja animada cuidando a 6 animales mientras lo vigilamos.',
    goal: { type: 'owncount', n: 6 }, reward: { coins: 100, unlock: ['carnotauro'], corral: 'jurasico', gift: 'carnotauro' } },
  { id: 'c3-carnotauro', ch: 3, who: 'pita', title: 'El bebé carnotauro',
    text: 'Soy la Dra. Pita. Vine en cuanto me contaron… ¡nunca vi un carnotauro! Es tierno aunque tenga cuernitos. Dale carnita hasta que crezca y, si algún animal se enferma, la Veterinaria está en el mapa.',
    goal: { type: 'own', species: 'carnotauro', stage: 'adult', n: 1 }, reward: { coins: 200, foods: { carnita: 5 } } },

  // Capítulo 4 — El río perdido
  { id: 'c4-pista', ch: 4, who: 'tomas', title: 'Una escama brillante',
    text: '¡Mira! Entre las escamas de fuego hay un dibujo igual a la página arrancada del cuaderno: es un mapa del río perdido. Recoge una escama de fuego para estudiarlo.',
    goal: { type: 'collect', product: 'escama_fuego', n: 1 }, reward: { coins: 150, foods: { pescadito: 10 } } },
  { id: 'c4-expedicion', ch: 4, who: 'ramon', title: 'Preparando la expedición',
    text: 'Así que van al río perdido… La señora Cosi partió hacia allá hace meses. Para llegar hay que reunir provisiones: véndeme 15 productos en total y les armo la mochila.',
    goal: { type: 'sold', n: 15 }, reward: { coins: 100, unlock: ['spinosaurus'], gift: 'spinosaurus' } },
  { id: 'c4-spino', ch: 4, who: 'lia', title: 'Un gigante tierno',
    text: 'Me llamo Lía y cuido el río. Este spinosaurus bebé los siguió hasta casa… y lleva una cinta rosa atada a la cola: ¡es la cinta de Cosi! Necesita el estanque y mucho pescadito para crecer.',
    goal: { type: 'own', species: 'spinosaurus', stage: 'adult', n: 1 }, reward: { coins: 300 } },

  // Capítulo 5 — El festival de la granja (final)
  { id: 'c5-invitacion', ch: 5, who: 'ramon', title: 'Una invitación especial',
    text: 'El pueblo quiere celebrar el Festival de la Cosecha… ¡en esta granja! Hace años que no se hace. Para recibir a todos, la granja tiene que estar llena de vida: cuida a 10 animales.',
    goal: { type: 'owncount', n: 10 }, reward: { coins: 150, foods: { heno: 5, grano: 5 } } },
  { id: 'c5-carta', ch: 5, who: 'lia', title: 'La carta del río',
    text: 'Traigo una carta que la corriente dejó en mi orilla. Es de Cosi: «No me fui para siempre. Estaba en el río cuidando los últimos nidos de dinosaurios. El huevo de la tormenta era uno de ellos: lo mandé con la crecida para que lo cuidaran ustedes.» Gánate la confianza de un animal hasta tener 2 corazones.',
    goal: { type: 'hearts', n: 2 }, reward: { coins: 120, foods: { carnita: 3, pescadito: 3 } } },
  { id: 'c5-puesto', ch: 5, who: 'ramon', title: 'El puesto del festival',
    text: 'Todo festival necesita un puesto con productos de la granja. Junta y vende 40 productos en total: con lo que ganes compraremos guirnaldas y faroles.',
    goal: { type: 'sold', n: 40 }, reward: { coins: 200 } },
  { id: 'c5-crias', ch: 5, who: 'pita', title: 'Familias felices',
    text: 'Para el desfile de los bebés quiero ver muchas crías sanas. Que nazcan 8 crías en total en la granja, y ya sabes: animales bien comidos y contentos casi nunca se enferman.',
    goal: { type: 'born', n: 8 }, reward: { coins: 150, foods: { gusanito: 4, bayas: 4 } } },
  { id: 'c5-festival', ch: 5, who: 'abuela', title: '¡El festival!',
    text: 'Suenan las campanitas… ¡es la abuela Cosi, que volvió para el festival! «Ustedes no solo cuidaron mi granja: la hicieron suya. Ahora es de ustedes de verdad.» Para el gran cierre, acaricia a tus animales 40 veces en total.',
    goal: { type: 'petted', n: 40 }, reward: { coins: 500 } },
];

export const CHAPTERS = {
  1: 'La granja de la abuela',
  2: 'Amigos del bosque',
  3: 'El huevo misterioso',
  4: 'El río perdido',
  5: 'El festival de la granja',
};
// Misiones secundarias: independientes, varias activas a la vez. Aparecen cuando la historia llega a
// `minCh` (y, si tienen `needs`, cuando ya conoces esa especie). Las metas de contador (fed, petted,
// sold, collect, bought, born, cured, named) cuentan desde que la misión aparece, no desde el inicio.
export const SIDE_QUESTS = [
  { id: 's-mimos', minCh: 1, who: 'tomas', title: 'Ronda de mimos',
    text: 'Los animales se ponen contentos cuando los saludas. Acaricia a tus animales 10 veces.',
    goal: { type: 'petted', n: 10 }, reward: { coins: 30 } },
  { id: 's-desayuno', minCh: 1, who: 'abuela', title: 'Desayuno para todos',
    text: 'Nota en el cuaderno: «Nunca dejes a nadie con la pancita vacía». Da de comer 15 veces.',
    goal: { type: 'fed', n: 15 }, reward: { foods: { grano: 8 } } },
  { id: 's-huevos', minCh: 1, who: 'ramon', title: 'Pedido de la panadería',
    text: 'La panadera quiere hacer un pastel gigante. Recoge 10 huevos.',
    goal: { type: 'collect', product: 'huevo', n: 10 }, reward: { coins: 40 } },
  { id: 's-bautizo', minCh: 1, who: 'tomas', title: 'Día de bautizo',
    text: '¡Cada animal merece un nombre bonito! Ponle o cámbiale el nombre a 3 animales.',
    goal: { type: 'named', n: 3 }, reward: { coins: 25 } },
  { id: 's-pelusa', minCh: 1, needs: 'gato', who: 'ramon', title: 'Pelusa para almohadas',
    text: 'En el pueblo hacen almohadas suavecitas con pelusa de gato. Recoge 4 pelusas.',
    goal: { type: 'collect', product: 'pelusa', n: 4 }, reward: { coins: 50 } },
  { id: 's-leche', minCh: 2, needs: 'vaca', who: 'ramon', title: 'Leche para la escuela',
    text: 'Los niños de la escuela merecen un vaso de leche fresca. Recoge 5 leches.',
    goal: { type: 'collect', product: 'leche', n: 5 }, reward: { coins: 30, foods: { heno: 6 } } },
  { id: 's-familia', minCh: 2, who: 'pita', title: 'La familia crece',
    text: 'Me encanta ver crías sanas. Que nazcan 3 crías en la granja.',
    goal: { type: 'born', n: 3 }, reward: { coins: 70 } },
  { id: 's-corazon', minCh: 2, who: 'pita', title: 'Un amigo de verdad',
    text: 'La confianza se gana con mimos y su comida favorita. Consigue que un animal tenga 1 corazón.',
    goal: { type: 'hearts', n: 1 }, reward: { coins: 40 } },
  { id: 's-brillitos', minCh: 2, needs: 'mapache', who: 'tomas', title: 'Colección de brillitos',
    text: 'El mapache esconde cosas brillantes en el bosque. Recoge 3 brillitos.',
    goal: { type: 'collect', product: 'brillito', n: 3 }, reward: { coins: 60 } },
  { id: 's-trufas', minCh: 2, needs: 'chanchito', who: 'ramon', title: 'Cena elegante',
    text: 'El restaurante del pueblo me pidió trufas para su menú especial. Recoge 3 trufas.',
    goal: { type: 'collect', product: 'trufa', n: 3 }, reward: { coins: 90 } },
  { id: 's-chequeo', minCh: 3, who: 'pita', title: 'Visita a la Veterinaria',
    text: 'Si algún animal se enferma, tráelo: lo dejo como nuevo. Cura a 1 animal en la Veterinaria.',
    goal: { type: 'cured', n: 1 }, reward: { coins: 40 } },
  { id: 's-burbujas', minCh: 3, needs: 'ajolote', who: 'tomas', title: 'Burbujas de la suerte',
    text: 'Mi hermanita quiere un frasco lleno de burbujas. Recoge 3 burbujas.',
    goal: { type: 'collect', product: 'burbuja', n: 3 }, reward: { foods: { gusanito: 6 } } },
  { id: 's-mercado', minCh: 3, who: 'ramon', title: 'Día de mercado',
    text: 'El sábado hay mercado y quiero tener de todo. Vende 25 productos.',
    goal: { type: 'sold', n: 25 }, reward: { coins: 120 } },
  { id: 's-mejores', minCh: 3, who: 'pita', title: 'Mejores amigos',
    text: 'Dicen que un animal con 4 corazones te sigue a todas partes. Consigue que uno tenga 4 corazones.',
    goal: { type: 'hearts', n: 4 }, reward: { coins: 150 } },
  { id: 's-escamas', minCh: 4, needs: 'carnotauro', who: 'lia', title: 'Escamas para el faro',
    text: 'Con escamas de fuego se enciende el faro del río. Recoge 3 escamas de fuego.',
    goal: { type: 'collect', product: 'escama_fuego', n: 3 }, reward: { coins: 80, foods: { carnita: 6 } } },
  { id: 's-rio', minCh: 4, needs: 'spinosaurus', who: 'lia', title: 'Escamas del río',
    text: 'Quiero hacerle un collar a Cosi para cuando vuelva. Recoge 2 escamas de río.',
    goal: { type: 'collect', product: 'escama_rio', n: 2 }, reward: { coins: 150 } },
  { id: 's-conejo', minCh: 2, who: 'mia', title: 'Huellitas en el bosque',
    text: '¡Vi huellitas redondas cerca de los arbustos! Creo que es un conejo tímido. Si acaricias a tus animales 15 veces, se animará a venir.',
    goal: { type: 'petted', n: 15 }, reward: { unlock: ['conejo'], foods: { zanahoria: 5 } } },
  { id: 's-lana', minCh: 2, needs: 'conejo', who: 'mia', title: 'Una bufanda suavecita',
    text: 'Quiero tejerle una bufanda a la abuela con lanita de conejo. Recoge 4 lanitas.',
    goal: { type: 'collect', product: 'lana', n: 4 }, reward: { coins: 70 } },
  { id: 's-cartas', minCh: 2, who: 'bruno', title: 'Cartas atrasadas',
    text: 'Traigo un montón de cartas de la abuela que se mojaron en la tormenta. Mientras las seco, cuídame la granja: da de comer 20 veces.',
    goal: { type: 'fed', n: 20 }, reward: { coins: 60, foods: { zanahoria: 3, grano: 3 } } },
  { id: 's-pato', minCh: 3, needs: 'ajolote', who: 'mia', title: 'Un pato perdido',
    text: '¡Un patito siguió a los ajolotes hasta el estanque! Para que se quede, recoge 2 burbujas: le encanta jugar con ellas.',
    goal: { type: 'collect', product: 'burbuja', n: 2 }, reward: { unlock: ['pato'], foods: { grano: 6 } } },
  { id: 's-plumas', minCh: 3, needs: 'pato', who: 'bruno', title: 'Plumas para escribir',
    text: 'Con plumas de pato escribo las direcciones más bonitas del pueblo. Recoge 3 plumas.',
    goal: { type: 'collect', product: 'pluma', n: 3 }, reward: { coins: 90 } },
  { id: 's-zoologico', minCh: 4, who: 'tomas', title: '¡Parece un zoológico!',
    text: 'Mis amigos no me creen cuántos animales tienes. Cuida a 15 animales a la vez.',
    goal: { type: 'owncount', n: 15 }, reward: { coins: 200 } },
];

// Secretos (easter eggs): discretos, sin efecto en la economía; cuentan como logros en Misiones.
export const SECRETS = {
  cosi: { title: 'Homenaje', text: 'Le pusiste «Cosi» a un animal. Desde el río, la abuela se ríe: «¡Qué honor!».' },
  nessie: { title: 'El monstruo del lago', text: 'Un spinosaurus llamado Nessie… dicen que vive en un lago muy, muy lejano.' },
  cartel: { title: 'Detrás del cartel', text: 'Detrás del cartel del mapa había una nota: «Los quiero mucho. —C.»' },
  konami: { title: 'La ola', text: '↑↑↓↓←→←→BA: ¡todos los animales hicieron la ola!' },
  amigo: { title: 'Mejores amigos', text: 'Un animal llegó a 5 corazones. Ya no se separa de ti.' },
  brillo: { title: '¡Qué brillo!', text: 'Tienes un animal brillante. Brilla más que los brillitos del mapache.' },
  arcoiris: { title: 'Arcoíris', text: 'Tienes los 4 colores de una misma especie a la vez.' },
  buho: { title: 'Búho nocturno', text: 'Jugaste de madrugada. Los animales duermen… ¡shh!' },
};
export const SECRET_ORDER = Object.keys(SECRETS);

/** Epílogo que se muestra al terminar la historia. */
export const EPILOGUE = 'La abuela Cosi se quedó a vivir en la casita junto al estanque. Cada tarde se sienta con Tomás, Lía y la Dra. Pita a mirar cómo juegan los animales, y dice que esta es la granja más feliz que conoció. La historia terminó, pero la granja sigue: quedan misiones secundarias, crías raras y secretos por descubrir.';

// Escenas con diálogo (guion en docs/GUION_HISTORIA.md). `when`: `inicio:<misión>` (cuando pasa a ser la activa),
// `fin:<misión>` (al reclamarla) o `evento:primera-enfermedad`. Si dos se cumplen a la vez sale primero la de
// arriba. Línea = [quién, ánimo (0 normal, 1 contento, 2 triste), texto]. No cambies los `id`: el guardado los recuerda.
export const SCENES = [
  { id: 'sobre-mojado', when: 'inicio:c1-carta', title: 'El sobre mojado', lines: [
    ['bruno', 1, '¡Buenos días! Perdón la tardanza: me quedé mirando una gallina que parecía saludarme.'],
    ['bruno', 0, 'Traigo un sobre para la familia. Está un poquito mojado… la tormenta del mes pasado lo pescó en mi bolsa.'],
    ['bruno', 2, 'Es de la señora Cosi. Mis cartas siempre llegan tarde, pero nunca se pierden. ¡Nunca!'],
    ['bruno', 1, 'Ábranla con calma. Yo me quedo viendo a las gallinitas… por trabajo, claro.'],
  ] },
  { id: 'vecino', when: 'inicio:c1-huevos', title: 'El vecino de al lado', lines: [
    ['tomas', 1, '¡Hola! Soy Tomás, vivo al lado. Llevo años mirando esta granja por la cerca.'],
    ['tomas', 2, 'Tu abuela me dejaba ayudar con los huevos. Yo creo que era porque le caía bien… ¿o porque era el único que preguntaba?'],
    ['tomas', 1, 'Si quieres, te enseño. Cuando una gallina tiene un huevo listo, ¡aparece una burbuja!'],
    ['tomas', 0, 'Solo tienes que tocarla. Es lo más fácil del mundo. Y lo mejor.'],
  ] },
  { id: 'cuentas-claras', when: 'fin:c1-vender', title: 'Cuentas claras', lines: [
    ['ramon', 0, 'Hmm. Tres huevos, buen tamaño.'],
    ['ramon', 0, 'Son ocho monedas… mejor dicho, diez. Me equivoqué en la cuenta. Sí, eso.'],
    ['tomas', 1, '¡Don Ramón siempre se equivoca a favor de la granja!'],
    ['ramon', 2, 'Cosas del oficio, muchacho. No andes diciéndolo.'],
    ['ramon', 0, 'Los huevos de Cosi tenían fama en el pueblo. Que no se pierda esa costumbre.'],
  ] },
  { id: 'ratoncitos', when: 'fin:c1-gato', title: 'Ratoncitos', lines: [
    ['tomas', 1, '¡Mira cómo mira a los ratones! Ya se fueron todos.'],
    ['mia', 0, '…'],
    ['tomas', 0, 'Ella es Mía, mi hermanita. Es tímida, pero los gatos le encantan.'],
    ['mia', 1, '…miau.'],
    ['tomas', 1, '¡Dijo miau! Es su récord.'],
  ] },
  { id: 'hoja-que-falta', when: 'fin:c1-cuaderno', title: 'Una hoja que falta', lines: [
    ['tomas', 0, 'Mira: dibujos de animales, notas, fechas… y una página arrancada.'],
    ['tomas', 2, 'Justo después de un mapa chiquito. Alguien la quitó con mucho cuidado.'],
    ['tomas', 0, 'Tu abuela dijo que se iba a terminar algo que empezó hace años. ¿Será esto?'],
    ['tomas', 1, 'Averigüémoslo juntos. Ya somos un equipo, ¿no?'],
  ] },
  { id: 'antifaz', when: 'inicio:c2-mapache', title: 'Ojos de antifaz', lines: [
    ['tomas', 0, 'El bosque queda por allá… de noche suena como si respirara.'],
    ['mia', 2, 'N-no me gusta el bosque. Hace ruiditos.'],
    ['tomas', 1, 'Yo iré contigo, Mía. Siempre.'],
    ['mia', 0, '¿…siempre-siempre?'],
    ['tomas', 1, 'Siempre-siempre. Y el mapache usa antifaz, así que seguro que es simpático.'],
  ] },
  { id: 'trufas', when: 'fin:c2-trufa', title: 'Trufas', lines: [
    ['ramon', 0, 'Una trufa… Treinta años sin probarla.'],
    ['ramon', 1, 'Cosi las traía por canastas. Decía que sus chanchitos tenían olfato de poeta.'],
    ['ramon', 2, 'Perdona, se me nubló un ojo. Es el polvo.'],
    ['tomas', 1, 'No hay polvo, Don Ramón.'],
    ['ramon', 0, 'Hay polvo. Y se acabó la conversación.'],
  ] },
  { id: 'sonrisa-en-el-agua', when: 'inicio:c2-estanque', title: 'Una sonrisa en el agua', lines: [
    ['bruno', 1, '¡Correo! Y esta vez llegué a la hora. Anótenlo.'],
    ['bruno', 0, 'Es la tercera carta de la señora Cosi. Se las leo yo, que tengo la mejor voz del pueblo.'],
    ['bruno', 1, '«El ajolote es el amigo que nunca se enoja. Sonríe aunque llueva.»'],
    ['bruno', 0, 'Qué lindo. Ahora construyan ese estanque, que yo quiero ver sonreír a uno.'],
  ] },
  { id: 'burbujas-de-suerte', when: 'fin:c2-burbuja', title: 'Burbujas de suerte', lines: [
    ['mia', 1, 'Una burbuja… ¡de colores!'],
    ['mia', 0, 'Te hice un dibujo del ajolote. Es el primero que le hago a un animal tuyo.'],
    ['mia', 1, 'Todavía no tiene nombre. Tú elige.'],
    ['tomas', 1, '¡Mía le habló a alguien que no soy yo!'],
    ['mia', 2, 'Tomás, no lo digas en voz alta.'],
  ] },
  { id: 'noche-de-tormenta', when: 'inicio:c3-tormenta', title: 'La noche de la tormenta', lines: [
    ['tomas', 2, '¡La tormenta! Los animales no paraban de temblar.'],
    ['tomas', 0, 'Y al amanecer… esto. Un huevo gigante, calentito, brillando.'],
    ['mia', 1, 'Le traje mi manta más suave. Para que no tenga frío.'],
    ['tomas', 1, 'Me quedé toda la noche despierto vigilándolo. No se lo digas a nadie.'],
    ['tomas', 0, 'Bueno… ya lo sabes. Cuídalo conmigo.'],
  ] },
  { id: 'doctora-de-dinosaurios', when: 'inicio:c3-carnotauro', title: 'Doctora de dinosaurios', lines: [
    ['pita', 2, '¡Perdón, perdón! Me avisaron y corrí. Se me cayó la libreta dos veces.'],
    ['pita', 1, 'Soy la Dra. Pita. Estudié veinte años para atender gatos…'],
    ['pita', 0, '…y ahora tengo un dinosaurio delante. Respiremos.'],
    ['pita', 0, 'Reglas: buena comida, mimos y descanso. Si se enferma, estoy en la Veterinaria del mapa.'],
    ['pita', 1, 'Y no se asusten: mira esos cuernitos. ¡Es adorable!'],
  ] },
  { id: 'primer-estornudo', when: 'evento:primera-enfermedad', title: 'Primer estornudo', lines: [
    ['pita', 0, 'Hola, supe que un animal no se siente bien. Tranquilo: pasa hasta en las mejores granjas.'],
    ['pita', 0, 'Enfermar no es culpa de nadie. A veces el cuerpo solo necesita descansar.'],
    ['pita', 1, 'Dale comida y cariño en casa y se repone solo. Si prefieres, ven a verme: cobro lo justo.'],
  ] },
  { id: 'cuernitos', when: 'fin:c3-carnotauro', title: 'Cuernitos', lines: [
    ['tomas', 1, '¡Ya es adulto! Mira lo grande que está.'],
    ['mia', 0, '…'],
    ['mia', 1, 'Es suave por dentro. Lo sé.'],
    ['tomas', 1, '¡Mía se acercó! ¡Y no se escondió!'],
    ['pita', 1, 'El cariño hace crecer a todos, no solo a los dinosaurios.'],
  ] },
  { id: 'dibujo-en-las-escamas', when: 'inicio:c4-pista', title: 'El dibujo en las escamas', lines: [
    ['tomas', 0, 'Estas escamas tienen un dibujo… igual al de la página arrancada.'],
    ['tomas', 0, 'Es un mapa. Un río que dobla dos veces. ¿Lo ves?'],
    ['tomas', 2, 'Pero hay alguien allá afuera, entre los árboles. Una persona con bufanda, mirándonos.'],
    ['tomas', 0, 'Se fue en cuanto la miré. Vamos a averiguar quién es.'],
  ] },
  { id: 'mochila-del-viaje', when: 'inicio:c4-expedicion', title: 'La mochila del viaje', lines: [
    ['ramon', 0, 'Así que van al río perdido.'],
    ['ramon', 2, 'Cosi se fue hacia allá hace meses. Yo nunca le dije «vuelve».'],
    ['ramon', 0, 'Bah. Vender provisiones es más fácil que decir las cosas.'],
    ['ramon', 1, 'Les armo una buena mochila. Y si la encuentran… díganle que Ramón le guardó el sitio.'],
  ] },
  { id: 'guia-del-rio', when: 'inicio:c4-spino', title: 'La guía del río', lines: [
    ['lia', 0, 'Perdona la entrada. Soy Lía, cuido el río.'],
    ['lia', 0, 'Este spinosaurus bebé los siguió hasta aquí. Lleva una cinta rosa atada a la cola.'],
    ['mia', 1, '¡Esa cinta es de la señora Cosi! Sale en su retrato.'],
    ['lia', 2, 'La hicimos juntas cuando éramos niñas y encontramos un valle escondido…'],
    ['lia', 2, 'El río se perdió mientras yo lo cuidaba. Desde entonces busco el camino.'],
    ['tomas', 1, 'Ya no estás sola. Ahora somos varios.'],
  ] },
  { id: 'la-cinta', when: 'fin:c4-spino', title: 'La cinta', lines: [
    ['mia', 0, 'Toma mi manta, Lía. Hace frío cerca del río.'],
    ['lia', 0, 'No suelo aceptar nada de nadie…'],
    ['lia', 1, '…pero esta manta huele a casa. Gracias.'],
    ['tomas', 0, 'Entonces, ¿el huevo de la tormenta lo mandó Cosi?'],
    ['lia', 0, 'Es lo que más me pregunto. Pronto lo sabremos.'],
  ] },
  { id: 'el-pueblo-entero', when: 'inicio:c5-invitacion', title: 'El pueblo entero', lines: [
    ['ramon', 1, '¡Habrá Festival de la Cosecha! Aquí, en esta granja, como antes.'],
    ['bruno', 1, '¡Yo reparto las invitaciones! Si me distraigo… bueno, será una sorpresa.'],
    ['tomas', 1, 'Falta que la granja esté llena de vida.'],
    ['ramon', 2, 'Guardo hace treinta años la primera canasta de huevos de Cosi. Nunca me atreví a usarla.'],
    ['ramon', 0, 'Este año, sí. Que el pueblo entero la vea.'],
  ] },
  { id: 'carta-de-la-crecida', when: 'inicio:c5-carta', title: 'La carta de la crecida', lines: [
    ['lia', 0, 'La corriente dejó esta carta en mi orilla. Es de Cosi.'],
    ['lia', 0, '«No me fui para siempre. Estaba cuidando los últimos nidos. El huevo de la tormenta lo mandé con la crecida: quería que ustedes lo criaran.»'],
    ['lia', 1, 'Confió en ustedes antes de conocerlos.'],
    ['lia', 2, 'Perdón. Es que el río trae mucho viento.'],
    ['bruno', 1, 'Aquí no hay río, Lía.'],
    ['lia', 0, 'Hay viento. Sigamos.'],
  ] },
  { id: 'las-guirnaldas', when: 'fin:c5-puesto', title: 'Las guirnaldas', lines: [
    ['bruno', 1, '¡Llegué a tiempo! ¡A TIEMPO! Anótenlo en piedra.'],
    ['bruno', 2, 'Encontré algo en el fondo de mi bolsa, junto a las cartas mojadas: una hoja arrancada de un cuaderno. Creo que llevo meses cargándola.'],
    ['tomas', 0, '¡La página que faltaba!'],
    ['lia', 0, 'Es la letra de Cosi. Habla del valle, del río, del juramento…'],
    ['ramon', 1, 'Léanla entera. Ya era hora.'],
  ] },
  { id: 'familias', when: 'inicio:c5-crias', title: 'Familias', lines: [
    ['pita', 1, 'Quiero ver muchas crías sanas para el desfile.'],
    ['pita', 0, 'Aprendí algo con ustedes: la mejor medicina es comida, un abrazo y tiempo.'],
    ['mia', 1, 'Mi bufanda va casi lista. Para la señora Cosi. Tiene tres colores.'],
    ['pita', 1, 'Y ni una pelusa torcida, ¿verdad?'],
    ['mia', 0, 'Una sola. Pero le da carácter.'],
  ] },
  { id: 'las-campanitas', when: 'inicio:c5-festival', title: 'Las campanitas', lines: [
    ['bruno', 1, '¡Suenan las campanitas! ¡Alguien viene por el camino!'],
    ['abuela', 1, '¡Mis queridos! Perdón la tardanza: el río se puso testarudo.'],
    ['abuela', 0, 'Tomás, estas son las llaves del granero. Quien cuida con tanto cariño merece tenerlas.'],
    ['tomas', 1, '¿Yo…? ¡Las cuidaré como si fueran de oro!'],
    ['mia', 1, 'Señora Cosi, le hice una bufanda con lanita de conejo.'],
    ['abuela', 1, 'Es la más suave del mundo. Gracias, Mía.'],
  ] },
  { id: 'la-granja-de-ustedes', when: 'fin:c5-festival', title: 'La granja de ustedes', lines: [
    ['abuela', 0, 'Ustedes no solo cuidaron mi granja: la hicieron suya.'],
    ['lia', 1, 'Y el río volvió a encontrarnos. Todo sigue en su sitio.'],
    ['ramon', 1, 'Cosi… la canasta sigue aquí. Y yo también.'],
    ['abuela', 1, 'Lo sé, Ramón. Siempre lo supe.'],
    ['pita', 1, '¡Un brindis! Con leche, que hay vacas.'],
    ['abuela', 1, 'Gracias por quedarse. Esta granja es de ustedes de verdad.'],
  ] },
];

// Cartas de Cosi: misiones cuyo texto es una carta. Se releen en el Diario cuando ya las recibiste.
export const LETTERS = ['c1-carta', 'c1-cria', 'c2-estanque', 'c5-carta'];

// Visitas ocasionales: charlas cortas de un personaje que pasa por la granja. `minCh`: capítulo desde el que salen
// (6 = después del final). `cond`: 'enfermo' (hay un animal enfermo) o 'sano' (ninguno). Línea = [quién, ánimo, texto].
export const VISITS = [
  { id: 'v-tomas-1', who: 'tomas', minCh: 1, lines: [['tomas', 1, '¿Cómo van los pequeños? Pasé a saludar. ¡Es mi parte favorita del día!']] },
  { id: 'v-tomas-2', who: 'tomas', minCh: 2, lines: [['tomas', 0, 'Estuve practicando eso de ser granjero. Ya sé distinguir un balde de un comedero.'], ['tomas', 1, '…casi siempre.']] },
  { id: 'v-tomas-3', who: 'tomas', minCh: 3, lines: [['tomas', 1, 'Anoche soñé que el huevo gigante era una nube con cuernitos. ¡Dormí buenísimo!']] },
  { id: 'v-tomas-4', who: 'tomas', minCh: 5, lines: [['tomas', 0, 'Antes me sentía un invitado aquí. Ahora siento que esta también es mi casa.'], ['tomas', 1, 'Gracias por dejarme.']] },
  { id: 'v-mia-1', who: 'mia', minCh: 2, lines: [['mia', 1, 'Te traje un dibujo. Es de la gallina que parece que sonríe.'], ['mia', 0, 'No se lo digas a Tomás: este es solo para ti.']] },
  { id: 'v-mia-2', who: 'mia', minCh: 2, lines: [['mia', 0, 'El bosque ya no me da tanto miedo. Un poquito, nada más.']] },
  { id: 'v-mia-3', who: 'mia', minCh: 4, lines: [['mia', 1, 'Mi bufanda ya tiene dos colores. Va a ser la más suave de todas.']] },
  { id: 'v-pita-1', who: 'pita', minCh: 3, cond: 'enfermo', lines: [['pita', 0, 'Vi a un animalito con mala cara. Dale descanso, comida y mimos; si quieres, pasa por la Veterinaria.'], ['pita', 1, 'Y recuerda: no es culpa de nadie.']] },
  { id: 'v-pita-2', who: 'pita', minCh: 3, cond: 'sano', lines: [['pita', 1, '¡Qué granja tan sana! Esto sí que es buen cuidado.'], ['pita', 0, 'Casi me quedo sin pacientes. Qué problema más bonito.']] },
  { id: 'v-pita-3', who: 'pita', minCh: 3, lines: [['pita', 0, 'Pasé de ronda. Los dinosaurios también se resfrían, ¿sabes? Lo descubrí esta semana.']] },
  { id: 'v-ramon-1', who: 'ramon', minCh: 1, lines: [['ramon', 0, 'Pasaba por aquí. Casualidad, claro.'], ['ramon', 0, 'En el pueblo todos hablan de los huevos de esta granja. Es buena señal.']] },
  { id: 'v-ramon-2', who: 'ramon', minCh: 2, lines: [['ramon', 1, 'Cuando Cosi era joven, subía al tejado a contar estrellas.'], ['ramon', 2, 'Yo le sostenía la escalera. Siempre fui bueno sosteniendo cosas.']] },
  { id: 'v-ramon-3', who: 'ramon', minCh: 4, lines: [['ramon', 0, 'Si ven a Cosi, díganle que la tienda sigue abierta.'], ['ramon', 1, 'Y que hay trufas.']] },
  { id: 'v-bruno-1', who: 'bruno', minCh: 1, lines: [['bruno', 1, 'Hoy no traigo cartas, pero sí noticias: ¡el panadero se cayó en un charco!'], ['bruno', 0, 'Está bien. Solo orgulloso.']] },
  { id: 'v-bruno-2', who: 'bruno', minCh: 2, lines: [['bruno', 1, 'Ayer entregué un paquete en la casa equivocada. Los vecinos estaban encantados.'], ['bruno', 2, 'Tuve que pedirlo de vuelta.']] },
  { id: 'v-bruno-3', who: 'bruno', minCh: 4, lines: [['bruno', 0, 'Cada vez que veo el río me acuerdo de las cartas de la señora Cosi.'], ['bruno', 1, 'Cuando vuelva, le ofrezco un sello conmemorativo.']] },
  { id: 'v-lia-1', who: 'lia', minCh: 4, lines: [['lia', 0, 'Vine a ver cómo crece el pequeño. El río lo echa de menos.'], ['lia', 1, 'Pero creo que aquí está mejor.']] },
  { id: 'v-lia-2', who: 'lia', minCh: 5, lines: [['lia', 0, 'El río hace un ruidito cuando está contento. Hace días que lo oigo desde aquí.'], ['lia', 1, 'Dicen que es mi imaginación. Yo creo que no.']] },
  { id: 'v-cosi-1', who: 'abuela', minCh: 6, lines: [['abuela', 1, 'Me gusta sentarme a verlos jugar. Siempre hay uno que hace travesuras.'], ['abuela', 0, 'Y siempre es el que más cariño necesita.']] },
  { id: 'v-cosi-2', who: 'abuela', minCh: 6, lines: [['abuela', 0, 'Hay una carta mía que nunca terminé. La estoy escribiendo despacio, para ustedes.'], ['abuela', 1, 'Sin prisa. Tengo toda la tarde.']] },
];
