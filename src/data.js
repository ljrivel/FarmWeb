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
  // ---- Cesta diaria de Bruno: una al día (fecha local), ciclo de 7 días sin castigo por faltar.
  giftCoins: [30, 40, 50, 60, 70, 80, 150], // el día 7 es el premio grande
  giftFoodEach: 3,   // raciones de la comida favorita de cada especie que tengas…
  giftMaxFoods: 3,   // …hasta este número de comidas distintas
  // ---- Criadero (lugar único del mapa): cría manual en cupos (nido → huevo en incubadora → eclosión).
  criaderoCost: 300,
  criaderoMinCh: 2,                                // se abre cuando la historia llega a este capítulo
  criaderoUpgradeCosts: [400, 800, 1500, 2500],    // costo de pasar al nivel 1, 2, 3 y 4
  criaderoSlots: [1, 2, 3, 4, 5],                  // parejas a la vez según el nivel (0 a 4)
  criaderoTimeCut: 0.1,                            // −10 % de tiempo por nivel
  criaderoMutationBonus: 0.015,                    // +1,5 % de mutación de color por nivel
  criaderoNestMul: 0.5,                            // el nido dura medio tiempo de cría de la especie
  criaderoEggMul: 1,                               // la incubación dura un tiempo de cría
  // ---- Laboratorio Hélice (lugar único del mapa, se abre en el capítulo 4): los dinosaurios se «replican» con el minijuego de la hebra.
  labUpgradeCosts: [600, 1200, 2200],              // costo de pasar al nivel 1, 2 y 3
  labCostCut: 0.1,                                 // −10 % en el costo de cada réplica por nivel
  labExtraErrors: 1,                               // +1 error permitido por nivel
  labRefundPerfect: 0.25,                          // réplica perfecta: te devuelven el 25 %
  labRefundUnstable: 0.5,                          // réplica inestable: te devuelven el 50 %
  labPerfectRareBonus: 0.15,                       // réplica perfecta: probabilidad extra de color poco común o raro
  heatCut: 0.2,                                    // «Darle calor» adelanta un 20 % del tiempo total…
  heatMax: 3,                                      // …hasta 3 veces por huevo…
  heatCooldown: 30 * 1000,                         // …con este enfriamiento entre una y otra
  // ---- Veterinaria interactiva (la doctora de turno cambia con la historia)
  vetMaoFromCh: 6,                       // desde este capítulo atiende Mao Mao (antes, la Dra. Pita)
  vetTrustPerLevel: 4, vetMaxTrustLevel: 4, vetDiscountPerLevel: 0.05,   // confianza: −5 % en curas por nivel
  vetConsultsPerDay: 2,                  // consultas que suben la confianza cada día
  vetCheckupCost: 20,
  vetRounds: 3, vetRefund: [0, 0, 0.25, 0.5],    // «Ayudar a la doctora»: reembolso según aciertos (0 = se pierde la consulta)
  vetVitaminCost: 60, vetTonicProducts: 4, vetShieldMs: 30 * MIN,         // Pita: vitaminas con monedas; Mao Mao: tónico con productos
  vetRequestMul: 1.5,
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
  pradera: { nombre: 'Pradera', species: ['gallina', 'gato', 'vaca', 'chanchito', 'oveja'], cap: 8, cost: 0, area: LAND, aquatic: false },
  bosque: { nombre: 'Bosque', species: ['mapache', 'conejo', 'zorro'], cap: 6, cost: 300, area: LAND, aquatic: false },
  estanque: { nombre: 'Estanque', species: ['ajolote', 'spinosaurus', 'pato', 'plesiosaurio'], cap: 6, cost: 250, area: { x0: 52, x1: 268, y0: 104, y1: 196 }, aquatic: true },
  jurasico: { nombre: 'Jurásico', species: ['carnotauro'], cap: 4, cost: null, area: LAND, aquatic: false },
  estacion: { nombre: 'Estación', species: ['porg', 'gato_loth', 'tauntaun', 'bantha', 'purrgil', 'dewback', 'ewok', 'grogu', 'bb8'], cap: 12, cost: null, area: LAND, aquatic: false },
  valle: { nombre: 'Valle', species: ['triceratops', 'estegosaurio', 'pterodactilo'], cap: 6, cost: null, area: LAND, aquatic: false },
};
export const CORRAL_TYPE_ORDER = ['pradera', 'bosque', 'estanque', 'jurasico', 'valle', 'estacion'];
export const MAX_CORRAL_LEVEL = CORRAL_COSTS.length;
// Posición de cada lugar en el mapa (lienzo lógico 320x224).
export const MAP_SPOTS = {
  pradera: { x: 96, y: 156 }, bosque: { x: 232, y: 84 }, estanque: { x: 232, y: 160 }, jurasico: { x: 96, y: 80 }, valle: { x: 164, y: 124 }, estacion: { x: 276, y: 34 },
};
// La Veterinaria no es un corral: siempre está abierta y no cuenta para las metas de corrales.
export const VET_SPOT = { x: 164, y: 48 };
// El Criadero tampoco es un corral: lugar único del mapa que se construye con monedas y se mejora.
export const CRIADERO_SPOT = { x: 36, y: 34 };
// El Laboratorio Hélice (capítulo 4) tampoco es un corral: los dinosaurios se replican allí.
export const LAB_SPOT = { x: 214, y: 30 };
export const corralTypeOf = (species) => CORRAL_TYPE_ORDER.find((t) => CORRAL_TYPES[t].species.includes(species));

export const SPECIES = {
  gallina: {
    nombre: 'Gallina', food: 'grano', product: 'huevo', price: 40,
    dato: 'Pone un huevo cuando está contenta y bien comida.',
    grow: 3 * MIN, prod: 90 * 1000, breed: 2 * MIN, aquatic: false,
    variants: ['Blanca', 'Marrón', 'Durazno', 'Lavanda'],
    names: ['Pepita', 'Cocó', 'Plumita', 'Huevito', 'Pollita'],
  },
  gato: {
    nombre: 'Gato', food: 'pescadito', product: 'pelusa', price: 80,
    dato: 'Espanta a los ratoncitos con solo mirarlos.',
    grow: 4 * MIN, prod: 150 * 1000, breed: 3 * MIN, aquatic: false,
    variants: ['Naranja', 'Gris', 'Siamés', 'Medianoche'],
    names: ['Misi', 'Bigotes', 'Mochi', 'Nube', 'Canela'],
  },
  vaca: {
    nombre: 'Vaca', food: 'heno', product: 'leche', price: 150,
    dato: 'Da leche tibia y le encanta que le hablen.',
    grow: 6 * MIN, prod: 180 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Blanquinegra', 'Marrón', 'Fresa', 'Galaxia'],
    names: ['Manchita', 'Lola', 'Violeta', 'Flor', 'Lechuga'],
  },
  mapache: {
    nombre: 'Mapache', food: 'bayas', product: 'brillito', price: 180,
    dato: 'Le fascina todo lo que brilla: de ahí sus brillitos.',
    grow: 5 * MIN, prod: 200 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Gris', 'Canela', 'Rojizo', 'Nieve'],
    names: ['Antifaz', 'Rocío', 'Pipo', 'Nuez', 'Tizón'],
  },
  chanchito: {
    nombre: 'Chanchito', food: 'bayas', product: 'trufa', price: 200,
    dato: 'Con su olfato fino encuentra trufas bajo la nieve.',
    grow: 5 * MIN, prod: 240 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Rosa', 'Lunares', 'Chocolate', 'Algodón'],
    names: ['Bolita', 'Rosita', 'Pimpón', 'Fresita', 'Cerdi'],
  },
  ajolote: {
    nombre: 'Ajolote', food: 'gusanito', product: 'burbuja', price: 260,
    dato: 'Sonríe todo el tiempo, aunque llueva.',
    grow: 6 * MIN, prod: 240 * 1000, breed: 5 * MIN, aquatic: true,
    variants: ['Rosa', 'Dorado', 'Menta', 'Medianoche'],
    names: ['Axi', 'Burbuja', 'Coral', 'Luna', 'Gominola'],
  },
  carnotauro: {
    nombre: 'Carnotauro', food: 'carnita', product: 'escama_fuego', price: 700, dna: 6,
    dato: 'Tiene cuernitos y es muy tierno con quien lo cuida.',
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: false,
    variants: ['Coral', 'Menta', 'Lavanda', 'Medianoche'],
    names: ['Rawr', 'Cuernitos', 'Brasa', 'Dino', 'Pelusa'],
  },
  spinosaurus: {
    nombre: 'Spinosaurus', food: 'pescadito', product: 'escama_rio', price: 750, dna: 6,
    dato: 'Nada como un pez y le gusta el pescadito.',
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: true,
    variants: ['Azul', 'Verde', 'Naranja', 'Violeta'],
    names: ['Vela', 'Río', 'Gigi', 'Splash', 'Gota'],
  },
  // Especies nuevas (se conocen con misiones secundarias del capítulo 2 y 3)
  conejo: {
    nombre: 'Conejo', food: 'zanahoria', product: 'lana', price: 160,
    dato: 'Es tímido, pero se anima con una zanahoria.',
    grow: 4 * MIN, prod: 170 * 1000, breed: 3 * MIN, aquatic: false,
    variants: ['Blanco', 'Gris', 'Canela', 'Cielo'],
    names: ['Saltarín', 'Copito', 'Orejitas', 'Bombón', 'Algodón'],
  },
  pato: {
    nombre: 'Pato', food: 'grano', product: 'pluma', price: 220,
    dato: 'Su «cuac» nasal se oye desde lejos.',
    grow: 5 * MIN, prod: 210 * 1000, breed: 4 * MIN, aquatic: true,
    variants: ['Amarillo', 'Blanco', 'Menta', 'Rosado'],
    names: ['Cuac', 'Patito', 'Plumón', 'Charco', 'Lulú'],
  },
  triceratops: {
    nombre: 'Triceratops', food: 'helecho', product: 'cuerno_cristal', price: 800, dna: 6,
    dato: 'Sus cuernos brillan como cristal cuando está contento.',
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: false,
    variants: ['Verde', 'Arena', 'Cielo', 'Atardecer'],
    names: ['Tri', 'Cuernito', 'Frill', 'Rocky', 'Bambú'],
  },
  estegosaurio: {
    nombre: 'Estegosaurio', food: 'helecho', product: 'placa_dorada', price: 800, dna: 8,
    dato: 'Deja placas doradas cuando duerme bien.',
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: false,
    variants: ['Oliva', 'Lila', 'Coral', 'Turquesa'],
    names: ['Placas', 'Estego', 'Lomito', 'Rocío', 'Púas'],
  },
  pterodactilo: {
    nombre: 'Pterodáctilo', food: 'pescadito', product: 'pluma_celeste', price: 850, dna: 8,
    dato: 'Planea sobre el valle y deja plumas celestes al volar.',
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: false,
    variants: ['Cielo', 'Menta', 'Rosado', 'Medianoche'],
    names: ['Alita', 'Nube', 'Vuelo', 'Pío', 'Brisa'],
  },
  plesiosaurio: {
    nombre: 'Plesiosaurio', food: 'gusanito', product: 'perla_marina', price: 900, dna: 8,
    dato: 'Con su cuello largo saluda a los patos desde el estanque.',
    grow: 10 * MIN, prod: 360 * 1000, breed: 8 * MIN, aquatic: true,
    variants: ['Marino', 'Coral', 'Violeta', 'Dorado'],
    names: ['Ondina', 'Cuello', 'Ola', 'Perlita', 'Coco'],
  },
  oveja: {
    nombre: 'Oveja', food: 'heno', product: 'vellon', price: 170,
    dato: 'Su vellón es tan suave que parece una nube.',
    grow: 4 * MIN, prod: 160 * 1000, breed: 3 * MIN, aquatic: false,
    variants: ['Blanca', 'Crema', 'Rosa', 'Lavanda'],
    names: ['Lanita', 'Nube', 'Beti', 'Copo', 'Merino'],
  },
  zorro: {
    nombre: 'Zorro', food: 'bayas', product: 'pelo_dorado', price: 210,
    dato: 'Es curioso y siempre devuelve lo que se lleva.',
    grow: 5 * MIN, prod: 200 * 1000, breed: 4 * MIN, aquatic: false,
    variants: ['Naranja', 'Canela', 'Nieve', 'Luna'],
    names: ['Foxi', 'Chispa', 'Rojito', 'Fuego', 'Colita'],
  },
  porg: {
    nombre: 'Porg', food: 'pescadito', product: 'pluma_porg', price: 300,
    dato: 'Es pequeño, redondo y curioso, con unos ojos enormes.',
    grow: 6 * MIN, prod: 220 * 1000, breed: 5 * MIN, aquatic: false,
    variants: ['Clásico', 'Hollín', 'Canela', 'Aurora'],
    names: ['Pipo', 'Plum', 'Bolita', 'Chiqui', 'Pingo'],
  },
  gato_loth: {
    nombre: 'Gato loth', food: 'pescadito', product: 'pelo_loth', price: 340,
    dato: 'Ágil y silencioso, ronronea bajito cuando está contento.',
    grow: 6 * MIN, prod: 230 * 1000, breed: 5 * MIN, aquatic: false,
    variants: ['Arena', 'Ceniza', 'Bruma', 'Aurora'],
    names: ['Luna', 'Zafiro', 'Sombra', 'Bigotes', 'Astro'],
  },
  tauntaun: {
    nombre: 'Tauntaun', food: 'racion', product: 'pelaje_helado', price: 420,
    dato: 'Aguanta el frío como nadie con su pelaje espeso.',
    grow: 8 * MIN, prod: 260 * 1000, breed: 6 * MIN, aquatic: false,
    variants: ['Glaciar', 'Nieve', 'Ocre', 'Escarcha'],
    names: ['Copo', 'Escarcha', 'Nevado', 'Cornelio', 'Hielito'],
  },
  bantha: {
    nombre: 'Bantha', food: 'racion', product: 'leche_azul', price: 480,
    dato: 'Enorme, peludo y tranquilo: su leche azul es famosa.',
    grow: 8 * MIN, prod: 280 * 1000, breed: 7 * MIN, aquatic: false,
    variants: ['Pardo', 'Arena', 'Ceniza', 'Cobre'],
    names: ['Lanudo', 'Gran Pelo', 'Duna', 'Peludo', 'Titán'],
  },
  purrgil: {
    nombre: 'Purrgil', food: 'racion', product: 'polvo_estelar', price: 520,
    dato: 'Nada entre las estrellas y viaja siempre en manada.',
    grow: 9 * MIN, prod: 300 * 1000, breed: 7 * MIN, aquatic: false,
    variants: ['Cósmico', 'Turquesa', 'Nebulosa', 'Aurora'],
    names: ['Nebulosa', 'Cometa', 'Orión', 'Estela', 'Nube'],
  },
  dewback: {
    nombre: 'Dewback', food: 'racion', product: 'escama_duna', price: 450,
    dato: 'Camina despacio por las dunas y adora el sol.',
    grow: 8 * MIN, prod: 270 * 1000, breed: 6 * MIN, aquatic: false,
    variants: ['Pantano', 'Duna', 'Terracota', 'Zafiro'],
    names: ['Arenoso', 'Dúne', 'Colita', 'Roca', 'Sol'],
  },
  ewok: {
    nombre: 'Ewok', food: 'bayas', product: 'hilo_peludo', price: 380,
    dato: 'Pequeño, valiente y muy leal con quien lo cuida.',
    grow: 7 * MIN, prod: 250 * 1000, breed: 6 * MIN, aquatic: false,
    variants: ['Pardo', 'Bosque', 'Atardecer', 'Nieve'],
    names: ['Teddy', 'Ramita', 'Capucha', 'Pelusín', 'Lanza'],
  },
  grogu: {
    nombre: 'Grogu', food: 'racion', product: 'chispa_verde', price: 600,
    dato: 'Curioso y sereno: parece saber lo que sientes.',
    grow: 9 * MIN, prod: 320 * 1000, breed: 8 * MIN, aquatic: false,
    variants: ['Clásico', 'Menta', 'Lavanda', 'Dorado'],
    names: ['Verdecito', 'Orejas', 'Pequeño', 'Sopa', 'Brote'],
  },
  bb8: {
    nombre: 'BB-8', food: 'aceite', product: 'tuerquita', price: 560,
    dato: 'Rueda a toda velocidad y siempre acompaña a sus amigos.',
    grow: 8 * MIN, prod: 240 * 1000, breed: 7 * MIN, aquatic: false,
    variants: ['Naranja', 'Azul', 'Verde', 'Dorado'],
    names: ['Bolita', 'Rodante', 'Chispa', 'Tuerca', 'Redondo'],
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
  helecho: { nombre: 'Helecho', price: 14 },
  racion: { nombre: 'Ración estelar', price: 18 },
  aceite: { nombre: 'Aceite brillante', price: 20 },
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
  cuerno_cristal: { nombre: 'Cuernito de cristal', price: 45 },
  placa_dorada: { nombre: 'Placa dorada', price: 45 },
  pluma_celeste: { nombre: 'Pluma celeste', price: 48 },
  perla_marina: { nombre: 'Perla marina', price: 50 },
  vellon: { nombre: 'Vellón', price: 16 },
  pelo_dorado: { nombre: 'Pelo dorado', price: 24 },
  pluma_porg: { nombre: 'Pluma de porg', price: 40 },
  pelo_loth: { nombre: 'Pelo de loth', price: 44 },
  pelaje_helado: { nombre: 'Pelaje helado', price: 52 },
  leche_azul: { nombre: 'Leche azul', price: 58 },
  polvo_estelar: { nombre: 'Polvo estelar', price: 64 },
  escama_duna: { nombre: 'Escama de duna', price: 54 },
  hilo_peludo: { nombre: 'Hilo peludo', price: 56 },
  chispa_verde: { nombre: 'Chispa verde', price: 70 },
  tuerquita: { nombre: 'Tuerquita', price: 48 },
};

// Personajes: hablan en las misiones (campo `who`). `rol` explica su lugar en la historia.
export const CHARACTERS = {
  abuela: { nombre: 'Abuela Cosi', rol: 'Dejó la granja a la familia y escribe cartas desde lejos', color: '#ff8fb0' },
  tomas: { nombre: 'Tomás', rol: 'El vecino curioso que ayuda en la granja', color: '#8fdcc0' },
  pita: { nombre: 'Dra. Pita', rol: 'La veterinaria del pueblo (de viaje desde el festival)', color: '#bfe4ff' },
  mao: { nombre: 'Mao Mao', rol: 'Boticaria que cuida la Veterinaria mientras la Dra. Pita está de viaje', color: '#86d192' },
  ramon: { nombre: 'Don Ramón', rol: 'El comerciante que compra tus productos', color: '#ffe08a' },
  lia: { nombre: 'Lía', rol: 'Guía del río perdido, amiga de la abuela de joven', color: '#c9b6f2' },
  mia: { nombre: 'Mía', rol: 'La hermanita de Tomás, coleccionista de cosas suaves', color: '#ffc9dc' },
  noa: { nombre: 'Noa', rol: 'Paleontóloga joven que llega a estudiar el valle', color: '#a6e0ec' },
  helice: { nombre: 'Señor Hélice', rol: 'La hebra de ADN con ojitos que guía las réplicas del Laboratorio', color: '#b9a7ff' },
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

  // Capítulo 4 (parte 2) — La grieta del tiempo: un viaje corto al pasado y el Laboratorio Hélice
  { id: 'c4-grieta', ch: 4, who: 'lia', title: 'Algo brilla en el río',
    text: 'En la curva del río el aire brilla como una cortina de agua que no cae. Es una grieta en el tiempo: se abre cuando los animales tienen miedo. Calma a tus animales: que la granja tenga 8 y todos estén tranquilos.',
    goal: { type: 'owncount', n: 8 }, reward: { coins: 150 } },
  { id: 'c4-fondos', ch: 4, who: 'ramon', title: 'Fondos para la expedición',
    text: 'Si van a cruzar esa grieta, que sea con presupuesto. El pueblo contribuye, yo pongo la cuenta: véndeme 25 productos en total. (No he escatimado en gastos… ni en redondeos.)',
    goal: { type: 'sold', n: 25 }, reward: { coins: 200 } },
  { id: 'c4-estabilizador', ch: 4, who: 'pita', title: 'El estabilizador',
    text: 'Para que la grieta se quede abierta lo justo necesito un aparato de cobre con escamas de fuego. Reúne 4 escamas de fuego y lo armo.',
    goal: { type: 'collect', product: 'escama_fuego', n: 4 }, reward: { coins: 150, foods: { carnita: 5 } } },
  { id: 'c4-viaje', ch: 4, who: 'lia', title: 'Cruzar la grieta',
    text: 'Todo listo. Cruzaremos de la mano y volveremos con muestras, no con huevos: nada vivo que no deba. Que un animal te tenga 2 corazones de confianza y te guiará el paso.',
    goal: { type: 'hearts', n: 2 }, reward: { coins: 250, unlock: ['triceratops', 'estegosaurio', 'plesiosaurio'] } },
  { id: 'c4-cierre', ch: 4, who: 'tomas', title: 'Cerrar la grieta',
    text: 'Volvimos con muestras de la manada, de las placas y del lago. Ahora hay que sellar el paso: reúne 3 escamas de río y Lía cierra la grieta.',
    goal: { type: 'collect', product: 'escama_rio', n: 3 }, reward: { coins: 200 } },
  { id: 'c4-laboratorio', ch: 4, who: 'pita', title: 'El Laboratorio Hélice',
    text: 'Con las muestras podemos recrear a los dinosaurios… con mucho cuidado. Ramón puso el edificio; falta pagar el equipo: véndele 35 productos en total y se abre el Laboratorio.',
    goal: { type: 'sold', n: 35 }, reward: { coins: 150, lab: true } },
  { id: 'c4-primera-replica', ch: 4, who: 'pita', title: 'La primera réplica',
    text: 'Ahora sí: en el Laboratorio completa la hebra de ADN de un carnotauro y nace el primero de laboratorio. Se hace así: entra al Laboratorio del mapa y elige «Replicar».',
    goal: { type: 'bought', species: 'carnotauro', n: 1 }, reward: { coins: 300 } },

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

  // Capítulo 6 — El valle escondido
  { id: 'c6-camino', ch: 6, who: 'lia', title: 'El camino del río',
    text: 'El río volvió a abrirse: pasó por el festival y se quedó cantando. Para que el valle los acepte, los animales tienen que confiar en ustedes. Consigue que uno tenga 3 corazones y te llevo.',
    goal: { type: 'hearts', n: 3 }, reward: { coins: 200, corral: 'valle', gift: 'triceratops' } },
  { id: 'c6-noa', ch: 6, who: 'noa', title: 'Una visitante con lupa',
    text: '¡Hola! Soy Noa, paleontóloga. Seguí unas huellas imposibles hasta aquí… ¡y encontré un triceratops bebé! Prometo no asustarlo. Cuídalo hasta que sea adulto y déjame verlo crecer.',
    goal: { type: 'own', species: 'triceratops', stage: 'adult', n: 1 }, reward: { coins: 150, foods: { helecho: 6 }, gift: 'estegosaurio' } },
  { id: 'c6-nombres', ch: 6, who: 'noa', title: 'Nombres para el cuaderno',
    text: 'Cada animal del valle tendrá su ficha en mi cuaderno de campo, con su nombre y su especie. Ponle nombre a 3 de tus animales y los anoto.',
    goal: { type: 'named', n: 3 }, reward: { coins: 100 } },
  { id: 'c6-cristal', ch: 6, who: 'noa', title: 'Cuernitos de cristal',
    text: 'Los cuernos del triceratops brillan como cristal cuando está contento. Recoge 3 cuernitos de cristal y los uso para dibujar el mapa del valle.',
    goal: { type: 'collect', product: 'cuerno_cristal', n: 3 }, reward: { coins: 180 } },
  { id: 'c6-placas', ch: 6, who: 'noa', title: 'Placas doradas',
    text: '¡El estegosaurio deja placas doradas cuando duerme bien! Recoge 3 placas y las comparamos con las de un fósil que encontré.',
    goal: { type: 'collect', product: 'placa_dorada', n: 3 }, reward: { coins: 180, foods: { helecho: 6 } } },
  { id: 'c6-reserva', ch: 6, who: 'abuela', title: 'Una reserva para el valle',
    text: 'Noa quiere contarle al mundo lo que encontró y Lía teme que lo arruinen. Yo propongo una reserva, con ustedes de guardianes. Demuestren que pueden con muchos amigos: cuida a 18 animales a la vez.',
    goal: { type: 'owncount', n: 18 }, reward: { coins: 400 } },

  // Capítulo 7 — Alas y mareas
  { id: 'c7-cielo', ch: 7, who: 'bruno', title: 'Plumas en el cielo',
    text: 'Cada mañana caen plumas azules del cielo, ¡y todas apuntan hacia el acantilado! Noa dice que traen ADN nuevo para el Laboratorio. Una expedición necesita provisiones: véndeme 60 productos en total y la preparo. (Si no me distraigo con una gallina.)',
    goal: { type: 'sold', n: 60 }, reward: { coins: 200, unlock: ['pterodactilo'], gift: 'pterodactilo' } },
  { id: 'c7-alas', ch: 7, who: 'noa', title: 'Alas de verdad',
    text: '¡Es un pterodáctilo, el primero vivo en cien millones de años! No lo atosigues: cuídalo hasta que sea adulto y vuele con confianza.',
    goal: { type: 'own', species: 'pterodactilo', stage: 'adult', n: 1 }, reward: { coins: 150, foods: { pescadito: 8 }, gift: 'plesiosaurio' } },
  { id: 'c7-marea', ch: 7, who: 'lia', title: 'Un guardián para el estanque',
    text: 'Ese plesiosaurio es de los del lago de mi infancia. Si crece contento en el estanque, el río tendrá un nuevo guardián. Cuídalo hasta que sea adulto.',
    goal: { type: 'own', species: 'plesiosaurio', stage: 'adult', n: 1 }, reward: { coins: 250, foods: { gusanito: 6 } } },
  { id: 'c7-corazones', ch: 7, who: 'noa', title: 'Cinco corazones',
    text: 'Los guardianes de la reserva se ganan la confianza de los animales de verdad. Consigue que uno tenga 5 corazones y lo anoto en el informe.',
    goal: { type: 'hearts', n: 5 }, reward: { coins: 300 } },
  { id: 'c7-final', ch: 7, who: 'abuela', title: 'La última carta',
    text: 'Queridos guardianes: el valle duerme tranquilo, el río canta y la granja está llena de vida. Les dejo una última tarea, la más fácil y la más importante: acaricien a sus animales 150 veces en total. Con cariño se cuida todo lo demás. —Cosi',
    goal: { type: 'petted', n: 150 }, reward: { coins: 800 } },

  // Capítulo 8 — Más allá del cielo (las criaturas de la Estación se compran una vez que se conocen)
  { id: 'c8-senal', ch: 8, who: 'noa', title: 'Una señal desde las estrellas',
    text: 'Mi antena captó algo imposible: una señal de muy, muy lejos que pide un hogar para unas criaturas viajeras. Para recibirlas, la granja tiene que demostrar que sabe cuidar a muchos amigos: cuida a 24 animales a la vez.',
    goal: { type: 'owncount', n: 24 }, reward: { coins: 300, corral: 'estacion', unlock: ['porg', 'gato_loth'], gift: 'porg' } },
  { id: 'c8-huesped', ch: 8, who: 'bruno', title: 'Un huésped muy redondo',
    text: 'Llegó un paquete sin remitente… ¡y se mueve! Es un porg: chilla fuerte y tiene unos ojos enormes. Cuídalo hasta que sea adulto y yo se lo cuento a todo el pueblo (si no me distraigo).',
    goal: { type: 'own', species: 'porg', stage: 'adult', n: 1 }, reward: { coins: 200, foods: { racion: 6, pescadito: 6 }, unlock: ['tauntaun', 'bantha'] } },
  { id: 'c8-manada', ch: 8, who: 'lia', title: 'Una manada en la Estación',
    text: 'Estas criaturas viajan en grupo. Compra un gato loth en la tienda y cuídalo hasta que sea adulto: es silencioso, pero se le oye ronronear desde lejos.',
    goal: { type: 'own', species: 'gato_loth', stage: 'adult', n: 1 }, reward: { coins: 250, unlock: ['purrgil', 'dewback'] } },
  { id: 'c8-leche', ch: 8, who: 'mia', title: 'Leche azul',
    text: 'Dicen que la leche del bantha es azul y dulce. Compra un bantha y recoge 2 leches azules: quiero probarla… ¡para mi cuaderno!',
    goal: { type: 'collect', product: 'leche_azul', n: 2 }, reward: { coins: 350, foods: { racion: 6, bayas: 6, aceite: 6 }, unlock: ['ewok', 'grogu', 'bb8'] } },
  { id: 'c8-polvo', ch: 8, who: 'noa', title: 'Polvo de estrellas',
    text: 'El purrgil viaja entre las estrellas y deja polvo estelar a su paso. Compra uno y recoge 3 polvos estelares: con ellos mi antena avisará que todas llegaron bien.',
    goal: { type: 'collect', product: 'polvo_estelar', n: 3 }, reward: { coins: 1000 } },
];


export const CHAPTERS = {
  1: 'La granja de la abuela',
  2: 'Amigos del bosque',
  3: 'El huevo misterioso',
  4: 'El río perdido',
  5: 'El festival de la granja',
  6: 'El valle escondido',
  7: 'Alas y mareas',
  8: 'Más allá del cielo',
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
    text: 'Nota de la Dra. Pita: «Me encanta ver crías sanas. Que nazcan 3 crías en la granja.»',
    goal: { type: 'born', n: 3 }, reward: { coins: 70 } },
  { id: 's-corazon', minCh: 2, who: 'pita', title: 'Un amigo de verdad',
    text: 'Nota de la Dra. Pita: «La confianza se gana con mimos y su comida favorita. Consigue que un animal tenga 1 corazón.»',
    goal: { type: 'hearts', n: 1 }, reward: { coins: 40 } },
  { id: 's-brillitos', minCh: 2, needs: 'mapache', who: 'tomas', title: 'Colección de brillitos',
    text: 'El mapache esconde cosas brillantes en el bosque. Recoge 3 brillitos.',
    goal: { type: 'collect', product: 'brillito', n: 3 }, reward: { coins: 60 } },
  { id: 's-trufas', minCh: 2, needs: 'chanchito', who: 'ramon', title: 'Cena elegante',
    text: 'El restaurante del pueblo me pidió trufas para su menú especial. Recoge 3 trufas.',
    goal: { type: 'collect', product: 'trufa', n: 3 }, reward: { coins: 90 } },
  { id: 's-chequeo', minCh: 3, who: 'pita', title: 'Visita a la Veterinaria',
    text: 'Nota de la Dra. Pita: «Si algún animal se enferma, tráelo: lo dejo como nuevo.» Cura a 1 animal en la Veterinaria.',
    goal: { type: 'cured', n: 1 }, reward: { coins: 40 } },
  { id: 's-burbujas', minCh: 3, needs: 'ajolote', who: 'tomas', title: 'Burbujas de la suerte',
    text: 'Mi hermanita quiere un frasco lleno de burbujas. Recoge 3 burbujas.',
    goal: { type: 'collect', product: 'burbuja', n: 3 }, reward: { foods: { gusanito: 6 } } },
  { id: 's-mercado', minCh: 3, who: 'ramon', title: 'Día de mercado',
    text: 'El sábado hay mercado y quiero tener de todo. Vende 25 productos.',
    goal: { type: 'sold', n: 25 }, reward: { coins: 120 } },
  { id: 's-mejores', minCh: 3, who: 'pita', title: 'Mejores amigos',
    text: 'Nota de la Dra. Pita: «Dicen que un animal con 4 corazones te sigue a todas partes.» Consigue que uno tenga 4 corazones.',
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
  { id: 's-cielo', minCh: 7, needs: 'pterodactilo', who: 'lia', title: 'Plumas del acantilado',
    text: 'Con plumas celestes se adornan las boyas del río. Recoge 3 plumas celestes.',
    goal: { type: 'collect', product: 'pluma_celeste', n: 3 }, reward: { coins: 120 } },
  { id: 's-perlas', minCh: 7, needs: 'plesiosaurio', who: 'mia', title: 'Un collar de perlas',
    text: 'Quiero hacerle un collar a la señora Cosi con perlas marinas. Recoge 2 perlas marinas.',
    goal: { type: 'collect', product: 'perla_marina', n: 2 }, reward: { coins: 150 } },
  { id: 's-oveja', minCh: 3, who: 'tomas', title: 'Un balido en la colina',
    text: '¡Oí un balido detrás de la colina! Creo que es una ovejita perdida. Da de comer 30 veces y verás que se anima a quedarse.',
    goal: { type: 'fed', n: 30 }, reward: { unlock: ['oveja'], foods: { heno: 5 } } },
  { id: 's-vellon', minCh: 3, needs: 'oveja', who: 'mia', title: 'Un suéter para Tomás',
    text: 'Con vellón se teje un suéter calentito. Recoge 4 vellones y me pongo a tejer.',
    goal: { type: 'collect', product: 'vellon', n: 4 }, reward: { coins: 80 } },
  { id: 's-zorro', minCh: 4, who: 'lia', title: 'Huellas de zorro',
    text: 'Hay huellas de zorro en la orilla del bosque: un zorrito curioso. Solo se acerca a las granjas animadas, así que cuida a 12 animales a la vez.',
    goal: { type: 'owncount', n: 12 }, reward: { unlock: ['zorro'], foods: { bayas: 5 } } },
  { id: 's-pelo', minCh: 4, needs: 'zorro', who: 'bruno', title: 'Colitas doradas',
    text: 'Dicen que el pelo dorado del zorro da suerte con el correo. Recoge 3 pelos dorados y lo compruebo.',
    goal: { type: 'collect', product: 'pelo_dorado', n: 3 }, reward: { coins: 100 } },
  { id: 's-pelaje', minCh: 8, needs: 'tauntaun', who: 'tomas', title: 'Pelaje helado', text: 'Con pelaje helado se hacen los guantes más calentitos. Recoge 3 pelajes helados.',
    goal: { type: 'collect', product: 'pelaje_helado', n: 3 }, reward: { coins: 150 } },
  { id: 's-duna', minCh: 8, needs: 'dewback', who: 'lia', title: 'Escamas de duna', text: 'Las escamas de duna brillan al sol como pequeños espejos. Recoge 3 escamas de duna.',
    goal: { type: 'collect', product: 'escama_duna', n: 3 }, reward: { coins: 150 } },
  { id: 's-loth', minCh: 8, needs: 'gato_loth', who: 'bruno', title: 'Pelo de loth', text: 'Quiero un cojín rellenito para mis siestas entre reparto y reparto. Recoge 3 pelos de loth.',
    goal: { type: 'collect', product: 'pelo_loth', n: 3 }, reward: { coins: 120 } },
  { id: 's-porg', minCh: 8, needs: 'porg', who: 'mia', title: 'Plumitas de porg', text: 'Con plumitas de porg se hacen los marcapáginas más monos. Recoge 3 plumas de porg.',
    goal: { type: 'collect', product: 'pluma_porg', n: 3 }, reward: { coins: 120 } },
  { id: 's-hilo', minCh: 8, needs: 'ewok', who: 'mia', title: 'Hilo peludo', text: 'Con hilo peludo tejo bufandas para todo el pueblo. Recoge 3 hilos peludos.',
    goal: { type: 'collect', product: 'hilo_peludo', n: 3 }, reward: { coins: 140 } },
  { id: 's-chispa', minCh: 8, needs: 'grogu', who: 'noa', title: 'Chispas verdes', text: 'Su chispa verde brilla sin pilas ni enchufes: no entiendo cómo. Recoge 3 chispas verdes para mi cuaderno.',
    goal: { type: 'collect', product: 'chispa_verde', n: 3 }, reward: { coins: 160 } },
  { id: 's-tuerca', minCh: 8, needs: 'bb8', who: 'bruno', title: 'Tuerquitas rodantes', text: 'Las tuerquitas que suelta tu bolita naranja arreglan mi bicicleta de reparto. Recoge 3 tuerquitas.',
    goal: { type: 'collect', product: 'tuerquita', n: 3 }, reward: { coins: 140 } },
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
export const EPILOGUE = 'La abuela Cosi se quedó a vivir en la casita junto al estanque. Cada tarde se sienta con Tomás, Mía, Lía, Noa, Mao Mao y Don Ramón a mirar jugar a los animales: los de la granja, los del valle y hasta los que llegaron de las estrellas. Bruno reparte la noticia de que todo está en calma, y las postales de la Dra. Pita desde su viaje. Dicen que es la granja más feliz que conocieron. La historia terminó, pero la granja sigue: quedan misiones secundarias, crías raras y secretos por descubrir.';

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
    ['tomas', 2, 'Y justo antes del trueno, el cielo se abrió un segundito. Como una costura.'],
    ['mia', 1, 'Le traje mi manta más suave. Para que no tenga frío.'],
    ['tomas', 1, 'Me quedé toda la noche despierto vigilándolo. No se lo digas a nadie.'],
    ['tomas', 0, 'Bueno… ya lo sabes. Cuídalo conmigo.'],
  ] },
  { id: 'doctora-de-dinosaurios', when: 'inicio:c3-carnotauro', title: 'Doctora de dinosaurios', lines: [
    ['pita', 2, '¡Perdón, perdón! Me avisaron y corrí. Se me cayó la libreta dos veces.'],
    ['pita', 1, 'Soy la Dra. Pita. Estudié veinte años para atender gatos…'],
    ['pita', 0, '…y ahora tengo un dinosaurio delante. Respiremos.'],
    ['pita', 2, 'Interesante. Muy interesante… Mi taza de té tiembla en círculos cada vez que da un paso. Y un poco aterrador.'],
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
  { id: 'algo-brilla-en-el-rio', when: 'inicio:c4-grieta', title: 'Algo brilla en el río', lines: [
    ['lia', 2, 'Esto empezó la noche de la tormenta. Siempre empieza con una tormenta.'],
    ['mia', 2, 'Yo veo una puerta. ¿Es una puerta?'],
    ['lia', 0, 'Es una grieta. El río se perdió porque no está perdido: está… antes. En otro tiempo.'],
    ['tomas', 1, 'O sea que mis dos hobbies, el río y los dinosaurios, eran el mismo hobby.'],
    ['lia', 0, 'Calma a tus animales. Cuando tienen miedo, la grieta se abre más.'],
  ] },
  { id: 'fondos-para-la-expedicion', when: 'inicio:c4-fondos', title: 'Fondos para la expedición', lines: [
    ['ramon', 1, 'Me lo vendió un viajero. Dice que dentro de este ámbar hay sangre de hace millones de años.'],
    ['pita', 0, 'Ramón, eso no es sangre. Es resina. Y el mosquito está muy muerto.'],
    ['ramon', 0, 'Pues yo ya hablé con el pueblo: el que quiera ver dinosaurios, que contribuya. No he escatimado en gastos…'],
    ['pita', 1, '…ni en redondeos.'],
    ['ramon', 2, 'Eso no lo tenía que decir en voz alta.'],
  ] },
  { id: 'el-estabilizador', when: 'inicio:c4-estabilizador', title: 'El estabilizador', lines: [
    ['pita', 1, 'Si cruzamos, la grieta tiene que quedarse abierta lo justo. Para eso necesito escamas de fuego.'],
    ['bruno', 2, '¿Y si se queda abierta de más?'],
    ['pita', 0, 'Entonces tendremos muchos más huéspedes y mucha menos granja.'],
    ['bruno', 1, '¡Sujétense los sombreros!'],
    ['mia', 1, 'Yo me sujeto el cuaderno, que es más importante.'],
  ] },
  { id: 'al-otro-lado', when: 'inicio:c4-viaje', title: 'Al otro lado', lines: [
    ['mia', 1, 'Los helechos… ¡son gigantes!'],
    ['pita', 2, 'Mi taza. Mi taza está temblando otra vez.'],
    ['tomas', 2, 'Pita… algo viene. ¿Y si no es amistoso?'],
    ['lia', 0, 'Es una manada de herbívoros. Si no los asustamos, ni nos miran.'],
    ['pita', 1, 'Recojan muestras. Escamas sueltas, cáscaras, nada vivo. Y por favor: no toquen nada que se mueva.'],
    ['bruno', 2, 'Entendido. No toco nada que se… oh. Se movía una mariposa.'],
  ] },
  { id: 'el-campamento', when: 'fin:c4-viaje', title: 'El campamento', lines: [
    ['mia', 1, '¡Es la página que faltaba! Es de la señora Cosi.'],
    ['lia', 2, 'Estuvo aquí. Hace poco. Se le enfrió el té.'],
    ['tomas', 0, '¿Qué dice la nota?'],
    ['lia', 0, 'Dice: «Si leen esto, ya cruzaron. Cierren la grieta detrás de ustedes. Yo sé cómo volver.»'],
    ['bruno', 2, 'Yo pisé una mariposa, pero eso seguro no cambia nada.'],
  ] },
  { id: 'cerrar-la-grieta', when: 'inicio:c4-cierre', title: 'Cerrar la grieta', lines: [
    ['pita', 0, 'Nos llevamos muestras y nada vivo. Si cruza uno más, la historia se enreda.'],
    ['tomas', 1, '¿Y la mariposa de Bruno?'],
    ['pita', 2, 'No quiero hablar de la mariposa.'],
    ['lia', 0, 'Ahora, con las escamas del río, sellamos el paso. Quien tenga que volver, volverá por el agua.'],
    ['tomas', 1, 'Es decir, Cosi.'],
  ] },
  { id: 'se-cierra', when: 'fin:c4-cierre', title: 'Se cierra', lines: [
    ['lia', 1, 'Ya está. El río sigue donde debe.'],
    ['bruno', 1, 'Qué raro: acabo de recibir una carta que yo escribí mañana.'],
    ['pita', 2, 'No la abras. No la abras nunca.'],
    ['mia', 1, 'Tengo dibujado todo el viaje. Hasta la mariposa.'],
    ['pita', 1, 'Con eso y las muestras tendremos suficiente para el siguiente paso: recrearlos.'],
  ] },
  { id: 'el-laboratorio-helice', when: 'inicio:c4-laboratorio', title: 'El Laboratorio Hélice', lines: [
    ['ramon', 1, 'Bienvenidos al Laboratorio Hélice. Cosi & Ramón, Sociedad… Casi Anónima.'],
    ['tomas', 2, '¿Esa cerca es eléctrica?'],
    ['pita', 0, 'No. Es de madera. Y de buena voluntad.'],
    ['mia', 1, 'El letrero dice que no se debe alimentar a los dinosaurios sin permiso.'],
    ['ramon', 1, 'Es por el seguro. Si algo sale mal… pagamos en cuotas.'],
  ] },
  { id: 'el-senor-helice', when: 'fin:c4-laboratorio', title: 'El Señor Hélice', lines: [
    ['pita', 1, 'Les presento a nuestro asistente. Señor Hélice, explíquenos la réplica.'],
    ['helice', 1, '¡Hola, amiguitos! El ADN es una escalera de cuatro bases. Cada una tiene una pareja fija.'],
    ['tomas', 2, 'Pita, ¿por qué habla como programa infantil?'],
    ['pita', 0, 'Porque funciona. Atento, que vienen las reglas.'],
    ['helice', 1, '¡Completa la hebra y la vida se abre camino!'],
  ] },
  { id: 'la-primera-replica', when: 'fin:c4-primera-replica', title: 'La primera réplica', lines: [
    ['pita', 1, 'Tiene los cuernitos de su mamá… que técnicamente no es su mamá.'],
    ['mia', 1, 'Yo le haré su ficha: ficha número uno.'],
    ['ramon', 1, 'Y yo, el presupuesto del número dos.'],
    ['pita', 0, 'Recuerden: cada réplica es una responsabilidad. Aquí no hacemos cosas porque podamos. Las hacemos porque las cuidaremos.'],
    ['ramon', 2, 'Qué bonito. Qué caro. Qué bonito.'],
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
  { id: 'una-boticaria-nueva', when: 'fin:c5-festival', title: 'Una boticaria nueva', lines: [
    ['pita', 1, 'Antes de que se acabe la fiesta, tengo noticias: me voy de viaje a un congreso de veterinaria. ¡Volveré con muchas historias!'],
    ['tomas', 2, '¿Y quién cuidará de los animales enfermos?'],
    ['pita', 0, 'Dejo la Veterinaria en buenas manos. Ella es Mao Mao, boticaria del pueblo vecino.'],
    ['mao', 0, 'Hola. Entiendo de hierbas, de remedios y de por qué los pacientes nunca quieren tomárselos.'],
    ['mia', 1, '¡Tiene pecas como yo!'],
    ['mao', 1, 'Y un gorro con orejitas de gato. Es práctico para el frío.'],
  ] },
  { id: 'el-rio-vuelve', when: 'inicio:c6-camino', title: 'El río vuelve a cantar', lines: [
    ['lia', 1, '¿Lo oyen? El río cantó toda la noche. Desde el festival ya no se esconde.'],
    ['mia', 1, '¡Suena como un cascabel enorme!'],
    ['lia', 0, 'Algo cambió cuando Cosi volvió. Como si el valle supiera que ya no estoy sola cuidándolo.'],
    ['tomas', 0, '¿Podemos ir a verlo? ¿El valle?'],
    ['lia', 0, 'Primero tienen que demostrar que los animales confían en ustedes: tres corazones. Así lo pidió Cosi hace años.'],
  ] },
  { id: 'puerta-del-valle', when: 'fin:c6-camino', title: 'La puerta del valle', lines: [
    ['lia', 0, 'Aquí. Detrás de esta cascada. Cierren los ojos un momento.'],
    ['mia', 2, '¿Y si hay cosas con muchos dientes?'],
    ['tomas', 1, 'Si las hay, serán cosas con muchos dientes simpáticas.'],
    ['abuela', 1, 'Hace cuarenta años crucé este mismo paso, Mía. Tenía tu edad y tanto miedo como tú.'],
    ['abuela', 0, 'El miedo no se va. Se hace pequeño cuando alguien te toma de la mano.'],
    ['mia', 1, '…¿Me toma de la mano?'],
  ] },
  { id: 'visitante-con-lupa', when: 'inicio:c6-noa', title: 'Una visitante con lupa', lines: [
    ['noa', 1, '¡Alto! ¡No pisen esa huella! Perdón. Hola. Soy Noa.'],
    ['noa', 0, 'Soy paleontóloga. Llevo tres años siguiendo unas huellas que, según mis colegas, no existen.'],
    ['lia', 2, 'Nadie debía encontrar esas huellas.'],
    ['noa', 2, 'Lo sé, perdón… pero ¿han visto lo que hay ahí? ¡Un triceratops bebé!'],
    ['tomas', 1, 'Es un poco tímido. Como mi hermana.'],
    ['noa', 1, 'Prometo no asustarlo. Solo quiero verlo crecer.'],
  ] },
  { id: 'noa-y-el-triceratops', when: 'fin:c6-noa', title: 'Noa y el triceratops', lines: [
    ['noa', 1, 'Ya es adulto… ¡y me reconoció! ¡Me reconoció!'],
    ['noa', 0, 'Veinte años de libros sobre ellos y ninguno decía que ronronean.'],
    ['mao', 1, 'No ronronean, Noa. Se les hincha el pecho de felicidad. Lo comprobé… con un estetoscopio y mucha paciencia.'],
    ['noa', 1, 'Eso. Lo apunto ahora mismo.'],
    ['mao', 0, 'Y si me traes sus placas y cuernos, comparo su ADN con las muestras del viaje. Es receta, no magia.'],
  ] },
  { id: 'nombres-para-el-cuaderno', when: 'inicio:c6-nombres', title: 'Nombres para el cuaderno', lines: [
    ['noa', 0, 'Cada animal merece su ficha: nombre, especie, qué come y qué le gusta.'],
    ['mia', 1, 'Yo los dibujo. Tengo uno por animal, ¿ven?'],
    ['noa', 1, '¡Mía, esto es mejor que cualquier ilustración científica!'],
    ['mia', 2, '¿De verdad? Es que los miro mucho.'],
    ['noa', 0, 'Eso es ciencia: mirar mucho y escribir lo que ves.'],
  ] },
  { id: 'cuernitos-de-cristal', when: 'fin:c6-cristal', title: 'Cuernitos de cristal', lines: [
    ['noa', 1, 'Mira cómo cambia el cristal con el sol: azul, rosa, otra vez azul.'],
    ['ramon', 0, 'Eso se vende bien. Digo… se admira. Se admira muy bien.'],
    ['noa', 0, 'Don Ramón, no son para vender.'],
    ['ramon', 2, 'Ya lo sé, jovencita. Es la costumbre. La costumbre es muy fuerte.'],
  ] },
  { id: 'placas-doradas', when: 'fin:c6-placas', title: 'Placas doradas', lines: [
    ['noa', 1, 'Idénticas a las del fósil. El estegosaurio del cuaderno de mi maestro era de aquí.'],
    ['noa', 2, 'Y ahora debo decidir qué hago. Mi maestro quería que todo el mundo lo supiera.'],
    ['lia', 2, 'Si todos lo saben, vendrán todos.'],
    ['noa', 0, 'Lo sé. Por eso todavía no mandé el informe.'],
    ['tomas', 0, '¿Y qué vas a hacer?'],
    ['noa', 2, 'No lo sé todavía.'],
  ] },
  { id: 'lo-que-hay-que-proteger', when: 'inicio:c6-reserva', title: 'Lo que hay que proteger', lines: [
    ['lia', 2, 'Noa merece contar lo que descubrió. Pero yo prometí proteger este lugar.'],
    ['noa', 0, 'Y yo prometí algo también: no mentir nunca en la ciencia.'],
    ['abuela', 0, 'Dos promesas no se pelean, niñas. Solo hay que encontrar la forma de cumplir las dos.'],
    ['abuela', 1, 'Una reserva: un lugar que se cuida, se estudia y no se enseña a cualquiera.'],
    ['mia', 1, '¿Con guardianes?'],
    ['abuela', 1, 'Con guardianes. Y ya están en la granja.'],
  ] },
  { id: 'una-reserva', when: 'fin:c6-reserva', title: 'Una reserva', lines: [
    ['noa', 1, 'Escribiré el informe. Sin decir dónde está el valle.'],
    ['lia', 0, '¿Harías eso?'],
    ['noa', 0, 'La ciencia no es contar dónde está algo. Es entenderlo y cuidarlo.'],
    ['lia', 1, 'Gracias, Noa. Perdóname por desconfiar.'],
    ['noa', 1, '¿Amigas?'],
    ['lia', 1, 'Amigas.'],
  ] },
  { id: 'plumas-en-el-aire', when: 'inicio:c7-cielo', title: 'Plumas en el aire', lines: [
    ['bruno', 1, '¡Atención! Hoy llovieron plumas azules. Una me cayó en el sombrero.'],
    ['noa', 1, '¡Déjame ver! No es de ninguna ave que conozca.'],
    ['tomas', 0, 'Todas apuntan hacia el acantilado, como flechas.'],
    ['noa', 0, 'Algo vive allá arriba. Algo que vuela. Y estas plumas traen ADN nuevo: el Laboratorio sabrá qué hacer con él.'],
    ['bruno', 2, 'Yo prefiero lo que no vuela. Es más fácil de entregarle las cartas.'],
  ] },
  { id: 'el-acantilado', when: 'fin:c7-cielo', title: 'El acantilado', lines: [
    ['noa', 1, '¡Un pterodáctilo! Un pterodáctilo de verdad, con sus alas y todo.'],
    ['bruno', 2, '¡Me mira! ¿Por qué me mira?'],
    ['lia', 0, 'Quiere saber si traes comida. Todos los visitantes traen comida.'],
    ['mia', 2, 'Yo no quiero acercarme. Está muy alto.'],
    ['noa', 0, 'No hace falta. Él vendrá a la granja si lo cuidamos bien.'],
  ] },
  { id: 'primer-vuelo', when: 'inicio:c7-alas', title: 'Primer vuelo', lines: [
    ['noa', 0, 'Anoto: «Las alas se pliegan como un abanico. Planea antes de aletear.»'],
    ['mia', 2, 'Me da vértigo solo de mirarlo.'],
    ['tomas', 1, 'Mía, tú dibujas nubes. ¡Tienes más altura que cualquiera!'],
    ['mia', 1, '…Tengo más altura que cualquiera.'],
    ['noa', 1, 'Eso también va en mi cuaderno.'],
  ] },
  { id: 'ola-y-cuello', when: 'fin:c7-alas', title: 'Ola y cuello', lines: [
    ['lia', 0, 'Algo se acerca al estanque. Algo con el cuello larguísimo.'],
    ['noa', 1, '¡Un plesiosaurio! ¡Pero si son de mar, no de río!'],
    ['lia', 1, 'Este es de agua dulce. Mi abuela decía que el lago de aquí los guardaba.'],
    ['mao', 1, '¡Qué cuello! Voy a medirlo… y a probar un gusanito. Por ciencia.'],
    ['lia', 0, 'Ahora el estanque tiene guardián. Y el río, compañía.'],
  ] },
  { id: 'noche-de-estrellas', when: 'fin:c7-marea', title: 'Noche de estrellas', lines: [
    ['lia', 0, 'Cosi, ¿recuerdas cuando creí que había perdido el río?'],
    ['abuela', 0, 'Lo recuerdo. Te sentaste conmigo tres noches seguidas.'],
    ['lia', 2, 'Nunca te dije que me sentía culpable.'],
    ['abuela', 1, 'No hacía falta, mi niña. Los ríos cambian. Lo que importa es quién los cuida.'],
    ['lia', 1, 'Gracias por no dejarme sola.'],
    ['abuela', 1, 'Gracias por no irte tú.'],
  ] },
  { id: 'cinco-corazones', when: 'inicio:c7-corazones', title: 'Cinco corazones', lines: [
    ['mao', 1, 'La Dra. Pita me dejó apuntes sobre el cariño. Mi conclusión: es un abrazo largo.'],
    ['noa', 0, 'Eso no es un método.'],
    ['mao', 0, 'Y funciona. Los animales con cinco corazones casi no se enferman.'],
    ['tomas', 1, 'Entonces el truco es quererlos mucho.'],
    ['mao', 1, 'Eso. Escríbelo, Noa. Con letra clara.'],
  ] },
  { id: 'la-gran-guardia', when: 'inicio:c7-final', title: 'La gran guardia', lines: [
    ['abuela', 0, 'Está todo en orden. El valle duerme tranquilo y el río canta.'],
    ['noa', 1, 'Mi informe ya está publicado. Cuenta que hay huellas, pero no dónde.'],
    ['ramon', 1, 'Y el pueblo lo celebra sin preguntar nada. Así se cuidan las cosas.'],
    ['bruno', 1, '¡Y yo llevo la noticia a todos los que quieran creerme!'],
    ['abuela', 0, 'Falta lo último: una carta para quienes vengan después de nosotros.'],
  ] },
  { id: 'epilogo-del-valle', when: 'fin:c7-final', title: 'Epílogo del valle', lines: [
    ['abuela', 1, 'Escribí una carta para quien cuide esta granja cuando yo ya no esté.'],
    ['mia', 1, '¿Eso significa que te quedas mucho tiempo?'],
    ['abuela', 1, 'Significa que tengo muchas historias. Cobro un té por cada una.'],
    ['lia', 1, 'Yo traigo el río.'],
    ['noa', 1, 'Y yo, las preguntas. Siempre tengo preguntas.'],
    ['tomas', 1, 'Y yo las llaves del granero. ¡Y los abrazos!'],
  ] },
  { id: 'una-ovejita', when: 'fin:s-oveja', title: 'Una ovejita', lines: [
    ['tomas', 1, '¡Es una oveja! Y se dejó acariciar a la primera.'],
    ['mia', 1, 'Parece una nube con patas.'],
    ['tomas', 0, 'Una nube que se come el heno, Mía.'],
    ['mia', 1, 'Las mejores nubes.'],
  ] },
  { id: 'sueter-para-tomas', when: 'fin:s-vellon', title: 'Un suéter para Tomás', lines: [
    ['mia', 1, 'Tejí algo con el vellón. Es para ti, Tomás.'],
    ['tomas', 2, '¿Es… un suéter?'],
    ['mia', 0, 'Tiene tres mangas. Todavía estoy aprendiendo.'],
    ['tomas', 1, '¡Es el mejor suéter con tres mangas del mundo!'],
  ] },
  { id: 'huellas-de-zorro', when: 'fin:s-zorro', title: 'Huellas de zorro', lines: [
    ['lia', 0, 'Mira: huellas pequeñas, muy limpias. Un zorro que cuida dónde pisa.'],
    ['bruno', 1, '¡Y se lleva mis cartas! Digo… se las lleva y me las devuelve.'],
    ['lia', 0, 'Es curioso. Y es el único que no te teme.'],
    ['bruno', 2, 'Eso es lo que más me asusta.'],
  ] },
  { id: 'colitas-doradas', when: 'fin:s-pelo', title: 'Colitas doradas', lines: [
    ['bruno', 1, 'Mi suerte cambió: hoy entregué todas las cartas a la primera.'],
    ['ramon', 0, 'Eso es el pelo dorado. O las ganas.'],
    ['bruno', 1, '¡Quiero un llavero de pelo dorado!'],
    ['ramon', 0, 'No se vende, Bruno.'],
  ] },
  { id: 'una-senal', when: 'inicio:c8-senal', title: 'Una señal', lines: [
    ['noa', 1, '¡Silencio, silencio! Mi antena está recibiendo algo.'],
    ['bruno', 2, '¿Es una carta? Yo no recibí ninguna carta.'],
    ['noa', 0, 'No es una carta. Es una señal de muy, muy lejos: piden un hogar para unas criaturas viajeras.'],
    ['tomas', 1, '¿Criaturas de las estrellas? ¡Yo me apunto!'],
    ['mia', 2, '¿Y si son muy grandes?'],
    ['noa', 0, 'Entonces tendremos que demostrar que esta granja sabe cuidar a muchos amigos.'],
  ] },
  { id: 'la-estacion', when: 'fin:c8-senal', title: 'La Estación', lines: [
    ['lia', 0, 'Aparecieron luces sobre el prado. Una puerta redonda se abrió en el cielo.'],
    ['noa', 1, '¡Una estación! Pequeñita, pero con suelo de metal y todo.'],
    ['abuela', 1, 'Tantos años cuidando animales y todavía me sorprenden.'],
    ['mia', 1, '¡Mira! Algo redondo con ojos enormes asoma por la puerta.'],
    ['abuela', 0, 'Que pase. Aquí hay sitio para todos.'],
  ] },
  { id: 'un-huesped-redondo', when: 'fin:c8-huesped', title: 'Un huésped redondo', lines: [
    ['bruno', 1, '¡Entregado! Y sin que se escapara por el camino.'],
    ['tomas', 1, '¡Chilla como un silbato chiquitito!'],
    ['mia', 1, 'Tiene los ojos más grandes que la cabeza. Lo adoro.'],
    ['bruno', 2, 'Se comió mi sombrero. No se lo digan a nadie.'],
    ['tomas', 1, 'Te compramos otro, Bruno.'],
  ] },
  { id: 'en-la-manada', when: 'fin:c8-manada', title: 'En la manada', lines: [
    ['lia', 0, 'Es la primera vez que escucho este ronroneo. Suena a viento lejano.'],
    ['noa', 1, 'Lo anoto: «ronronea con la cola enroscada».'],
    ['lia', 1, 'Se sienten seguros. Eso es lo que importa.'],
    ['noa', 0, 'Seguros, y con ganas de explorar.'],
  ] },
  { id: 'leche-azul', when: 'fin:c8-leche', title: 'Leche azul', lines: [
    ['mia', 1, '¡Es azul de verdad! Y huele a vainilla.'],
    ['ramon', 0, 'Eso se vende… digo, se bebe. Se bebe con mucho respeto.'],
    ['mao', 1, 'La probé primero, por seguridad. Calcio, vitaminas y cero culpa. Aprobada.'],
    ['mia', 1, 'Brindo por el bantha más peludo de la galaxia.'],
  ] },
  { id: 'tres-visitantes', when: 'fin:c8-leche', title: 'Tres visitantes', lines: [
    ['tomas', 1, '¡Miren! Por la puerta de la Estación asoman tres visitantes más.'],
    ['mia', 1, 'Uno con capucha, uno con orejas enormes… ¡y una bolita naranja que rueda!'],
    ['noa', 1, 'Mi antena no avisó de ellos. Qué bonito: llegaron sin invitación.'],
    ['bruno', 2, 'La bolita me persigue. Creo que quiere mi correo.'],
    ['abuela', 1, 'Que se queden. En esta granja nunca sobra un amigo.'],
  ] },
  { id: 'hogar-entre-estrellas', when: 'fin:c8-polvo', title: 'Hogar entre estrellas', lines: [
    ['noa', 1, 'Mi antena ya avisó: «Todas llegaron bien».'],
    ['abuela', 1, 'Mi granja empezó con una gallinita y ahora tiene criaturas de las estrellas.'],
    ['lia', 1, 'El río, el valle y ahora el cielo. Todo cuidado.'],
    ['tomas', 1, '¿Y si algún día llegan más?'],
    ['mia', 1, 'Entonces les haremos sitio. Siempre hay sitio.'],
    ['bruno', 1, '¡Y yo repartiré el correo… intergaláctico!'],
  ] },
];

// Cartas de Cosi: misiones cuyo texto es una carta. Se releen en el Diario cuando ya las recibiste.
export const LETTERS = ['c1-carta', 'c1-cria', 'c2-estanque', 'c5-carta', 'c7-final'];

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
  { id: 'v-pita-1', who: 'pita', minCh: 3, maxCh: 5, cond: 'enfermo', lines: [['pita', 0, 'Vi a un animalito con mala cara. Dale descanso, comida y mimos; si quieres, pasa por la Veterinaria.'], ['pita', 1, 'Y recuerda: no es culpa de nadie.']] },
  { id: 'v-pita-2', who: 'pita', minCh: 3, maxCh: 5, cond: 'sano', lines: [['pita', 1, '¡Qué granja tan sana! Esto sí que es buen cuidado.'], ['pita', 0, 'Casi me quedo sin pacientes. Qué problema más bonito.']] },
  { id: 'v-pita-3', who: 'pita', minCh: 3, maxCh: 5, lines: [['pita', 0, 'Pasé de ronda. Los dinosaurios también se resfrían, ¿sabes? Lo descubrí esta semana.']] },
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
  { id: 'v-noa-1', who: 'noa', minCh: 6, lines: [['noa', 0, 'Anoté hoy: «El triceratops duerme con una pata estirada». Eso no está en ningún libro.']] },
  { id: 'v-noa-2', who: 'noa', minCh: 6, lines: [['noa', 1, 'Descubrí que a los dinosaurios les encanta el helecho. Y a mí el café. Combina.']] },
  { id: 'v-tomas-5', who: 'tomas', minCh: 6, lines: [['tomas', 1, 'Noa me enseñó a dibujar huellas. Las mías parecen papas.']] },
  { id: 'v-mia-4', who: 'mia', minCh: 6, lines: [['mia', 1, 'Le dibujé un triceratops a Noa. Dijo que tiene «proporciones expresivas». No sé qué es, pero suena lindo.']] },
  { id: 'v-lia-3', who: 'lia', minCh: 6, lines: [['lia', 0, 'El valle está más tranquilo desde que Noa lo cuida con nosotras.']] },
  { id: 'v-pita-4', who: 'mao', minCh: 6, lines: [['mao', 0, 'Noa sabe de huesos y yo de hierbas. Entre las dos curamos casi todo.']] },
  { id: 'v-ramon-4', who: 'ramon', minCh: 6, lines: [['ramon', 0, 'Cosi dice que ya no vende nada que no pueda mirar a los ojos. Yo sigo vendiendo huevos, pero con cariño.']] },
  { id: 'v-bruno-4', who: 'bruno', minCh: 7, lines: [['bruno', 1, 'Entregué una carta en lo alto del acantilado. Me la devolvió un pterodáctilo, sin sello.'], ['bruno', 0, 'Creo que es un pedido de más comida.']] },
  { id: 'v-lia-4', who: 'lia', minCh: 7, lines: [['lia', 0, 'El plesiosaurio nada despacito, como si midiera el estanque. Creo que ya lo considera suyo.']] },
  { id: 'v-noa-3', who: 'noa', minCh: 7, lines: [['noa', 0, 'Hoy dibujé nubes. Pasó un pterodáctilo y me arruinó el dibujo. Valió la pena.']] },
  { id: 'v-tomas-6', who: 'tomas', minCh: 7, lines: [['tomas', 1, '¿Sabías que el pterodáctilo duerme con una pata levantada? ¡Igual que yo!']] },
  { id: 'v-mia-5', who: 'mia', minCh: 7, lines: [['mia', 1, 'Hoy subí al mirador a dibujar al pterodáctilo. Casi me mareo, pero valió la pena.']] },
  { id: 'v-pita-5', who: 'mao', minCh: 7, lines: [['mao', 1, 'Chequeo de rutina al plesiosaurio: cuello perfecto, aletas perfectas y mucho apetito. Se lo cuento por carta a la Dra. Pita.']] },
  { id: 'v-ramon-5', who: 'ramon', minCh: 7, lines: [['ramon', 0, 'Vendo huevos, lana y plumas celestes. Todo con certificado de cariño.']] },
  { id: 'v-cosi-3', who: 'abuela', minCh: 7, lines: [['abuela', 1, 'El valle respira tranquilo. Eso se oye, si uno se queda quieto.']] },
  { id: 'v-noa-4', who: 'noa', minCh: 8, lines: [['noa', 1, 'El suelo de la Estación zumba suavecito. Creo que es de contento.']] },
  { id: 'v-tomas-7', who: 'tomas', minCh: 8, lines: [['tomas', 1, 'Los porgs me persiguen por el prado. Siempre quieren compañía.']] },
  { id: 'v-mia-6', who: 'mia', minCh: 8, lines: [['mia', 1, 'Dibujé al bantha en tres páginas: no cabía en una.']] },
  { id: 'v-lia-5', who: 'lia', minCh: 8, lines: [['lia', 0, 'El purrgil flota cerca del estanque como si supiera que el agua es de casa.']] },
  { id: 'v-bruno-5', who: 'bruno', minCh: 8, lines: [['bruno', 2, 'Un tauntaun se comió el sello de una carta. Digo… lo saboreó. Con cariño.']] },
  { id: 'v-cosi-4', who: 'abuela', minCh: 8, lines: [['abuela', 1, 'Vi a un dewback tomando el sol en la Estación. Ni en sueños me lo imaginaba.']] },
  { id: 'v-tomas-8', who: 'tomas', minCh: 8, lines: [['tomas', 1, 'El ewok me enseñó a hacer nudos. Los míos parecen espaguetis.']] },
  { id: 'v-noa-5', who: 'noa', minCh: 8, lines: [['noa', 0, 'Grogu me mira como si entendiera mis notas. Creo que corrige mi ortografía.']] },
  { id: 'v-bruno-6', who: 'bruno', minCh: 8, lines: [['bruno', 1, 'BB-8 rodó detrás de mi bicicleta y llegamos a todas las casas en la mitad de tiempo.']] },
  { id: 'v-mao-1', who: 'mao', minCh: 6, cond: 'enfermo', lines: [['mao', 0, 'Huele a resfriado. Tranquilo: tengo hierbas. Y la Veterinaria cura rápido, por unas monedas.']] },
  { id: 'v-mao-2', who: 'mao', minCh: 6, cond: 'sano', lines: [['mao', 0, 'Todos sanos. Qué aburrido. Si ves un animal con la nariz roja, avísame: tengo ganas de preparar un té.']] },
  { id: 'v-mao-3', who: 'mao', minCh: 6, lines: [['mao', 0, 'Estoy catalogando las hierbas del valle. Algunas son tan amargas que… ya me entiendes.'], ['mao', 1, 'Bueno, yo no. Yo las pruebo igual.']] },
];

// Frases de la doctora de turno en la Veterinaria. {nombre}, {producto} y {n} se reemplazan al decirlas.
export const VET_LINES = {
  pita: {
    saludo: ['¡Hola! Todo tranquilo por aquí. Si ves a alguien decaído, tráelo.', 'Buen día. Mi consejo de siempre: comida, mimos y descanso.'],
    enfermos: ['Veo pacientes. Tranquilo: con cuidado se recuperan.', 'Hay animalitos que no se sienten bien. Vamos paso a paso.'],
    hambre: ['{nombre} tiene la pancita vacía. Dale de comer antes de que se enferme.', 'Cuidado con {nombre}: la saciedad está muy baja.'],
    triste: ['{nombre} anda decaído. Unos mimos le harían muy bien.', 'A {nombre} le falta ánimo. Acarícialo y dale su comida favorita.'],
    criadero: ['Tienes una pareja lista para el Criadero. ¡Qué ilusión una cría sana!', 'Dos de tus animales están listos para el nido: elige bien los padres.'],
    bien: ['Todos están estupendos. Se nota que los cuidas con cariño.', 'Ni una queja. Así se hace.'],
    curaOk: ['Listo: {nombre} ya está mejor. Tienes buena mano.', '¡Curado! {nombre} te lo agradece.'],
    curaMal: ['Esta vez no salió… pierdes la consulta. Con calma, la próxima sale.', 'No pasa nada: se pierde la consulta, pero se aprende.'],
    escudo: ['Vitaminas listas. Nadie se resfriará en un buen rato.'],
    pedido: ['Gracias por el pedido de {producto} (×{n}). Eso me ayuda muchísimo.'],
    diag: { resfriado: 'Un resfriado común. Abrigo, comida y un poco de paciencia.', pancita: 'Pasó mucha hambre: el estómago se queja.', pulgas: 'Pulgas. Un buen baño y listo.', tristeza: 'Estuvo triste demasiado tiempo. Necesita cariño.' },
  },
  mao: {
    saludo: ['Si nadie está enfermo, tengo tiempo para mis hierbas. No me interrumpas mucho.', 'Hoy huele a paz. Qué raro.'],
    enfermos: ['Hay pacientes. Qué bien… digo, qué mal. Veamos.', 'Alguien se siente mal. Siempre pasa cuando preparo el té.'],
    hambre: ['{nombre} tiene hambre. No necesito probar nada para saberlo.', '{nombre} está casi vacío de comida. Eso no es ciencia, es sentido común.'],
    triste: ['{nombre} está de bajón. Un rato contigo y se arregla. Gratis, además.', 'A {nombre} le falta compañía. Las hierbas no curan eso.'],
    criadero: ['Hay una pareja lista para el Criadero. Elige bien a los padres: la genética no perdona.', 'Dos de tus animales pueden ir al nido. Yo que tú, aprovecho.'],
    bien: ['Todos sanos. Qué aburrido… pero está bien.', 'Sin problemas. Aprovecharé para probar una hierba nueva.'],
    curaOk: ['Curado. Y no, no me comí la medicina… esta vez.', 'Listo. {nombre} me debe un favor.'],
    curaMal: ['Eso salió mal. La consulta se pierde; así es el oficio.', 'Fallamos. Pierdes la consulta, pero no el ánimo.'],
    escudo: ['Tónico hecho con tus productos. Sabe horrible, así que seguro funciona.'],
    pedido: ['Gracias por el pedido de {producto} (×{n}). Servirá… para algo que no te contaré.'],
    diag: { resfriado: 'Resfriado. Una infusión caliente y descanso.', pancita: 'Hambre prolongada. El estómago protesta, normal.', pulgas: 'Pulgas. Lo normal en granjas felices.', tristeza: 'Tristeza. Esto no se cura con hierbas, se cura con ratos juntos.' },
  },
};
