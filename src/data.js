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

// Personajes: hablan en las misiones (campo `who`). `rol` explica su lugar en la historia.
export const CHARACTERS = {
  abuela: { nombre: 'Abuela Cosi', rol: 'Dejó la granja a la familia y escribe cartas desde lejos', color: '#ff8fb0' },
  tomas: { nombre: 'Tomás', rol: 'El vecino curioso que ayuda en la granja', color: '#8fdcc0' },
  pita: { nombre: 'Dra. Pita', rol: 'La veterinaria del pueblo', color: '#bfe4ff' },
  ramon: { nombre: 'Don Ramón', rol: 'El comerciante que compra tus productos', color: '#ffe08a' },
  lia: { nombre: 'Lía', rol: 'Guía del río perdido, amiga de la abuela de joven', color: '#c9b6f2' },
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
