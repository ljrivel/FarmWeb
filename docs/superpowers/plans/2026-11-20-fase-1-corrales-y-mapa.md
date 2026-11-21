# FarmWeb v2, Fase 1: corrales y mapa. Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pasar la granja de un solo corral a varios corrales (Pradera, Bosque, Estanque, Jurásico) con un mapa para viajar entre ellos, migrando sin pérdida los mundos de v1.

**Architecture:** Mundo versión 2 con `corrales[]`; cada animal y cada huevo tiene `corral`. Las reglas (espacio, capacidad, cría, hacinamiento) pasan a ser por corral. El dibujo recibe una escena (`'mapa'` o el id de un corral). La migración v1→v2 es una función pura que corre al importar o cargar. En esta fase hay **un corral por tipo**, así que cada especie vive en un único corral.

**Tech Stack:** JavaScript con módulos ES y Canvas 2D, sin dependencias ni compilación; `node:test`; Python con PIL para el arte; Playwright para la prueba en navegador.

**Spec:** `docs/superpowers/specs/2026-11-20-farmweb-v2-diseno.md` (secciones 6.1, 6.2, 6.10 y fase 1 de la sección 7).

**Fuera de la fase 1** (llegan en fases posteriores): enfermedades, corazones, mejoras de corral (techo, bebedero, nido), mover animales, puestos, pedidos, calendario, personajes y la historia nueva.

## Global Constraints

- Sin dependencias ni paso de compilación; no se puede instalar nada en este entorno.
- Lógica de juego pura y determinista: `tick(w, dt)` y aleatorio con semilla en `w.rng`. `wander` es solo visual.
- Todo texto dinámico en la interfaz se inserta con `textContent`/nodos de texto, nunca `innerHTML`.
- Textos del juego en español.
- Los mundos v1 (guardado local y archivos `.farmweb.json`) deben cargar y migrar sin pérdida. El guardado original no se borra: queda un respaldo.
- Pixel art generado por `tools/gen_sprites.py`; lienzo lógico 320×224 con escala entera.
- Probar siempre en pantalla de celular (390×844, y 360×740 para el desbordamiento) y de PC (1280×800).
- Trabajar en la rama `fase-1-corrales`. No se une a `main` hasta que el usuario pruebe en su PC.
- Cada commit termina con las dos líneas de atribución de la sesión (`Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` y `Claude-Session: https://claude.ai/code/session_018YWypG7dfhDDteNMJkAcaJ`).
- No afirmar que algo funciona sin haber corrido la verificación de su tarea.

## Review Focus

1. Un guardado v1 en el navegador se migra al abrir y el original se conserva en una clave de respaldo (aunque el respaldo falle por falta de espacio, el juego carga).
2. Un mundo v1 con más animales de los que caben en el corral nuevo: la migración sube el nivel del corral para que quepan, nadie se pierde.
3. Un archivo v2 hostil: corrales repetidos, tipo desconocido, nivel 99, animal con corral inexistente o de otro tipo, coordenadas fuera de rango.
4. Escena inválida (por ejemplo, estar en el Bosque y cargar un mundo que no lo tiene): se vuelve a la Pradera sin error.
5. Una misión que regala un animal cuando su corral no existe o está lleno, y una simulación larga (8 h) con varios corrales sin NaN.

---

### Task 1: Rama y mundo v1 de prueba

Debe hacerse **antes** de cambiar `state.js`, porque el archivo se genera con el código v1.

**Files:**
- Create: `tests/fixtures/mundo-v1.farmweb.json`
- Test: `tests/fixture-v1.test.mjs`

**Interfaces:**
- Produces: archivo `mundo-v1.farmweb.json` (formato v1 válido, con checksum) que usan las tareas 3, 4 y 8.

- [ ] **Step 1: Crear la rama** `git checkout -b fase-1-corrales`.
- [ ] **Step 2: Generar el mundo v1** con un script de una sola vez (`node --input-type=module`) que use `newWorld('Granja de prueba', 1_700_000_000_000, 7)`, `addAnimal` y `exportWorldText(w, 1_700_000_000_000)`, y escriba el archivo. Contenido: 100 → `coins = 777`; `upgrades = { estanque: true, corral: 2 }` y `capacity = 16`; animales adultos: 2 gallinas (las del inicio), 1 gato, 2 mapaches, 1 ajolote, 1 carnotauro, 1 spinosaurus (8 en total); 1 huevo de chanchito en `w.eggs`; `unlocked` con las 8 especies; `quests.claimed` con los ids de las primeras 11 misiones de `QUESTS`.
- [ ] **Step 3: Escribir `tests/fixture-v1.test.mjs`**, test `el mundo v1 de prueba se importa`: lee el archivo, `importWorldText(texto, 1_700_000_000_001)`, y comprueba `animals.length === 8`, `eggs.length === 1`, `coins === 777`.
- [ ] **Step 4: Correr** `npm test`. Esperado: todo en verde, 30 pruebas, 0 fallos.
- [ ] **Step 5: Commit** `test: mundo v1 de prueba para la migración`.

---

### Task 2: Datos de corrales

**Files:**
- Modify: `src/data.js` (solo agrega; no quita nada todavía)
- Create: `tests/data.test.mjs`

**Interfaces:**
- Produces, en `data.js`:
  - `CORRAL_TYPES: Record<tipo, { nombre: string, species: string[], cap: number, cost: number|null, area: {x0,x1,y0,y1}, aquatic: boolean }>` con exactamente estos valores:
    - `pradera`: nombre `Pradera`, species `['gallina','gato','vaca','chanchito']`, cap 8, cost 0, area `{x0:28,x1:292,y0:66,y1:204}`.
    - `bosque`: `Bosque`, `['mapache']`, cap 6, cost 300, misma area que la pradera.
    - `estanque`: `Estanque`, `['ajolote','spinosaurus']`, cap 6, cost 250, aquatic true, area `{x0:52,x1:268,y0:104,y1:196}`.
    - `jurasico`: `Jurásico`, `['carnotauro']`, cap 4, cost `null` (llega por la historia), misma area que la pradera.
  - `CORRAL_TYPE_ORDER = ['pradera','bosque','estanque','jurasico']`
  - `MAX_CORRAL_LEVEL = CORRAL_COSTS.length` (4; cada nivel suma 4 de capacidad)
  - `corralTypeOf(species: string): string`
  - `MAP_SPOTS: Record<tipo, {x:number,y:number}>`: pradera `{x:96,y:156}`, bosque `{x:232,y:84}`, estanque `{x:232,y:160}`, jurasico `{x:96,y:80}`.

- [ ] **Step 1: Escribir `tests/data.test.mjs`** con estos tests y aserciones:
  - `cada especie pertenece a exactamente un tipo de corral`: para cada `s` de `Object.keys(SPECIES)`, hay un único tipo con `s` en `species`; `corralTypeOf(s)` lo devuelve; `aquatic` del tipo coincide con `SPECIES[s].aquatic`.
  - `las áreas caben en el lienzo`: `0 <= x0 < x1 <= 320` y `0 <= y0 < y1 <= 224` para todos; `MAP_SPOTS` tiene los 4 tipos con coordenadas dentro del lienzo.
  - `los tipos tienen orden y costos válidos`: `CORRAL_TYPE_ORDER` contiene todos los tipos una vez; `cost` es `null` o entero ≥ 0.
- [ ] **Step 2: Correr** `node --test tests/data.test.mjs`. Esperado: FALLA (`CORRAL_TYPES` no existe).
- [ ] **Step 3: Agregar las exportaciones** de la sección Interfaces a `src/data.js` (sin tocar `AREA`, `POND`, `POND_COST` ni `BASE_CAPACITY`; se retiran en la tarea 4).
- [ ] **Step 4: Correr** `npm test`. Esperado: verde.
- [ ] **Step 5: Commit** `feat(datos): tipos de corral, áreas y puntos del mapa`.

---

### Task 3: Mundo v2, migración, importación y respaldo

Después de esta tarea `tests/sim.test.mjs` y `tests/quests.test.mjs` quedan rojos hasta la tarea 4: aquí se corren solo `state`, `migrate`, `storage` y `data`.

**Files:**
- Modify: `src/data.js` (`VERSION = 2`), `src/state.js`, `src/storage.js`, `tests/state.test.mjs`
- Create: `src/migrate.js`, `tests/migrate.test.mjs`, `tests/storage.test.mjs`

**Interfaces:**
- Consumes: Task 2 (`CORRAL_TYPES`, `corralTypeOf`, `MAX_CORRAL_LEVEL`, `CORRAL_TYPE_ORDER`).
- Produces:
  - Forma del mundo v2: `{ v: 2, …, corrales: Corral[], animals, eggs, … }` **sin** `capacity` ni `upgrades`. `Corral = { id: tipo, tipo, nombre, nivel: 0..4 }`. `animal.corral` y `egg.corral` son el `id` del corral.
  - `state.js`: `capacityOf(w, corralId): number` (= `CORRAL_TYPES[tipo].cap + 4*nivel`); `getCorral(w, corralId): Corral|undefined`; `corralOfSpecies(w, species): Corral|undefined`; `addCorral(w, tipo, nivel = 0): Corral`; `addAnimal(w, species, variant, stage = 'baby', opts)` ahora lanza `Error` si no existe el corral de esa especie y fija `animal.corral`; `resolveScene(w, scene): string` (`'mapa'` o un corral existente; si no, `'pradera'`); `randomSpot(w, species)` usa el `area` del tipo; se **elimina** `inPond`.
  - `migrate.js`: `migrateWorld(raw: object): object` (de v1 a v2; si ya es v2, lo devuelve igual).
  - `importWorldText` acepta `version` 1 o 2 (mayor que `VERSION` se rechaza como hoy) y valida `validateWorld(migrateWorld(obj.world))`.
  - `storage.js`: `localStore.load()` conserva en `farmweb:world:v1:respaldo-v1` el texto original si lo guardado tenía `version < VERSION` y esa clave aún no existe; si guardar el respaldo falla, igual devuelve el mundo.

- [ ] **Step 1: Escribir las pruebas que fallan.**
  - `tests/migrate.test.mjs`, leyendo `tests/fixtures/mundo-v1.farmweb.json`:
    - `migrar v1: cada animal va a su corral y las mejoras pasan a niveles`: tras `importWorldText`, `w.v === 2`; los tipos de `w.corrales` ordenados son `['bosque','estanque','jurasico','pradera']`; nivel de la pradera `2`; `animals.length === 8`; `eggs.length === 1`; `coins === 777`; todo `a.corral === corralTypeOf(a.species)`; `eggs[0].corral === 'pradera'`; `Object.keys(w.quests.claimed).length === 11`; `'upgrades' in w === false` y `'capacity' in w === false`.
    - `migrar v1: sube el nivel si no caben`: copia del fixture con 7 mapaches (bosque tiene cap 6) → `nivel` del bosque `>= 1` y los 7 siguen existiendo.
    - `migrar v1: crea los corrales que la historia ya dio`: fixture sin animales de agua pero con `c2-estanque` reclamada → existe el corral `estanque`.
    - `ida y vuelta v2` (`newWorld` → `exportWorldText` → `importWorldText` conserva corrales, animales y monedas) y `una versión futura (3) se rechaza`.
  - `tests/state.test.mjs` (actualizar): `newWorld` tiene `corrales` con solo la pradera, `capacityOf(w,'pradera') === 8`, sin `capacity`/`upgrades`; el test de `validateWorld` hostil pasa a usar los campos v2, y agregar:
    - `validateWorld sanea corrales hostiles`: `raw.corrales = [{tipo:'pradera',nivel:99},{tipo:'pradera',nivel:1},{tipo:'volcan',nivel:0}]`, animales `[{species:'mapache',corral:'pradera',x:-50,y:900},{species:'gallina',corral:'zzz'}]` → un solo corral por tipo; la pradera con nivel 4; se crea `bosque` automáticamente; el mapache queda con `corral === 'bosque'` y `x,y` dentro del `area` del bosque; la gallina con `corral === 'pradera'`.
    - `resolveScene`: `'mapa'` → `'mapa'`; corral existente → el mismo; `'bosque'` sin bosque → `'pradera'`; basura (`undefined`, `'x'`) → `'pradera'`.
  - `tests/storage.test.mjs` con un `globalThis.localStorage` simulado (un `Map`): guardar el fixture v1 como `farmweb:world:v1`, `localStore.load()` devuelve mundo con `v === 2`; la clave de respaldo contiene el texto original exacto; tras `save()` la clave principal tiene `version: 2`; si `setItem` lanza al guardar el respaldo, `load()` igual devuelve el mundo.
- [ ] **Step 2: Correr** `node --test tests/state.test.mjs tests/migrate.test.mjs tests/storage.test.mjs`. Esperado: FALLAN.
- [ ] **Step 3: Implementar `migrateWorld`** en `src/migrate.js`. Pura: no muta la entrada. Para `v` 1: arma `corrales` con `pradera` (nivel = `upgrades.corral` entre 0 y 4); `estanque` si `upgrades.estanque` o la misión `c2-estanque` está reclamada; `jurasico` si hay un carnotauro (animal o huevo) o `c3-tormenta` está reclamada; `bosque` si hay un mapache. Asigna `corral` a cada animal y huevo según `corralTypeOf`. Para cada corral sube `nivel` hasta que `capacityOf` ≥ animales+huevos que contiene (tope `MAX_CORRAL_LEVEL`). Devuelve el objeto con `v: 2` y sin `upgrades` ni `capacity`.
- [ ] **Step 4: Implementar `state.js` v2** con las firmas de Interfaces. `validateWorld` reconstruye `corrales` con lista blanca (un corral por tipo, `id = tipo`, `nivel` entero 0–4, `nombre` por defecto el del tipo, siempre incluye `pradera`), asigna `corral` a cada animal y huevo desde su especie (crea el corral si falta, con nivel mínimo para que quepan) y limita `x,y` al `area` del corral. Mantener el tope de `MAX_ANIMALS_IMPORT`.
- [ ] **Step 5: Implementar el respaldo en `storage.js`** como en Interfaces. Mantener `KEY = 'farmweb:world:v1'` (cambiar la clave dejaría huérfanos los guardados existentes).
- [ ] **Step 6: Correr** `node --test tests/state.test.mjs tests/migrate.test.mjs tests/storage.test.mjs tests/data.test.mjs tests/fixture-v1.test.mjs`. Esperado: PASAN.
- [ ] **Step 7: Commit** `feat(estado): mundo v2 con corrales, migración desde v1 y respaldo`.

---

### Task 4: Reglas por corral y misiones

**Files:**
- Modify: `src/sim.js`, `src/quests.js`, `src/data.js` (misiones; retirar `AREA`, `POND`, `POND_COST`, `BASE_CAPACITY`), `src/ui.js` y `src/main.js` (adaptación mínima para que el juego siga funcionando), `tests/sim.test.mjs`, `tests/quests.test.mjs`

**Interfaces:**
- Consumes: Task 3 (`capacityOf`, `getCorral`, `corralOfSpecies`, `addCorral`, `addAnimal`).
- Produces en `sim.js`:
  - `spaceUsed(w, corralId): number` y `hasSpace(w, corralId): boolean` (animales + huevos de ese corral).
  - `canBuyAnimal(w, species): {ok, msg}` y `buyAnimal(w, species): {ok, msg, animal?}`: el corral se resuelve con `corralOfSpecies`. Mensajes: sin corral → `Necesita el corral {nombre}: constrúyelo en el mapa.`; lleno → `No hay espacio en {nombre}: amplíalo.`
  - `corralInfo(w): Array<{ tipo, nombre, id: string|null, built: boolean, nivel: number, capacity: number, used: number, buildCost: number|null, upgradeCost: number|null }>` en el orden de `CORRAL_TYPE_ORDER`. `buildCost` es el costo si no está construido (`null` si llega por la historia); `upgradeCost` es el del siguiente nivel (`null` si no está construido o ya está al máximo).
  - `buildCorral(w, tipo): {ok, msg}` y `upgradeCorral(w, corralId): {ok, msg}`. **Se eliminan** `buyUpgrade` y `upgradeInfo`.
  - `corralStatus(w, corralId): { used, capacity, ready, hungry }` (`hungry` = animales con `fed < 30`).
- Produces en `quests.js`: meta nueva `{ type: 'corral', tipo }` (progreso 1 si existe ese corral); la recompensa acepta `corral: tipo` (se construye gratis si falta, **antes** de colocar el regalo).
- Produces en `data.js`: `c2-estanque` pasa a `goal: { type: 'corral', tipo: 'estanque' }`; `c3-tormenta` agrega `corral: 'jurasico'` a su recompensa; el texto de `c2-mapache` agrega «Construye el corral del Bosque en el mapa.»
- Produces en `ui.js`/`main.js` (versión mínima, la tarea 7 la completa): el chip de espacio muestra `usados/capacidad` sumando todos los corrales; la pestaña **Mejoras** de la tienda pasa a llamarse **Corrales** (clave `'corrales'`) y lista cada tipo con **Construir** o **Ampliar** según `corralInfo`; `app.buyUpgrade` se reemplaza por `app.buildCorral(tipo)` y `app.upgradeCorral(id)`; se quita el import de `POND_COST`. Todavía no hay mapa: la escena sigue siendo la única granja que se ve (la Pradera).

- [ ] **Step 1: Actualizar y agregar pruebas** (las existentes se adaptan: `newWorld` ya no tiene `upgrades`/`capacity`; el test de `wander` usa `CORRAL_TYPES[tipo].area`).
  - `comprar un mapache pide construir el Bosque`: sin bosque `canBuyAnimal(w,'mapache').ok === false` y `msg` incluye `Bosque`; con 400 monedas `buildCorral(w,'bosque')` descuenta 300; luego `buyAnimal` devuelve un animal con `corral === 'bosque'`.
  - `construir corrales`: dos veces el mismo tipo falla; `buildCorral(w,'jurasico')` falla con mensaje de historia; sin monedas falla sin descontar.
  - `ampliar un corral`: `upgradeCorral(w,'pradera')` cuesta `CORRAL_COSTS[0]` y la capacidad pasa de 8 a 12; en el nivel 4 falla.
  - `el espacio es por corral`: con la pradera llena no se compra una gallina pero sí un mapache en el bosque.
  - `no se cría con el corral lleno aunque otro tenga espacio` y `el hacinamiento solo afecta al corral lleno` (la felicidad de los animales del otro corral no baja por eso).
  - `corralStatus cuenta listos y hambrientos`.
  - `simulación de 8 h con 4 corrales`: mundo con los 4 corrales y animales en cada uno, 8 h en pasos de 30 s → ningún valor `NaN`, `fed` y `happy` en 0–100, `eggs.length <= 30`.
  - Misiones: `progress` de `{type:'corral',tipo:'estanque'}` es 0 y luego 1 al construirlo; reclamar `c3-tormenta` construye el Jurásico y entrega el carnotauro en él; `un regalo sin espacio no se reclama` (jurásico existente y lleno → `ok: false`, misión sin reclamar); los datos de misiones son consistentes (todo `reward.corral` y `goal.tipo` existen en `CORRAL_TYPES`).
- [ ] **Step 2: Correr** `npm test`. Esperado: FALLAN las nuevas y las adaptadas.
- [ ] **Step 3: Implementar `sim.js`**: `tick` calcula el hacinamiento y la cría por corral; el huevo guarda `corral` y al eclosionar la cría hereda ese corral; `wander`/`pickTarget` usan el `area` del tipo del corral del animal (se elimina la lógica de estanque compartido).
- [ ] **Step 4: Implementar `quests.js` y los cambios de `data.js`** de Interfaces; retirar de `data.js` las exportaciones viejas y corregir cualquier importación que quede.
- [ ] **Step 5: Adaptar `ui.js` y `main.js`** como indica la sección Interfaces para que la página cargue y la tienda funcione con corrales.
- [ ] **Step 6: Correr** `npm test`. Esperado: TODO verde (0 fallos).
- [ ] **Step 7: Verificar en navegador** con un script de una sola vez (Chrome, `?debug`, móvil 390×844): la página carga sin errores de consola, la pestaña Corrales aparece, con monedas regaladas se construye el Bosque y se compra un mapache sin errores. (El mapache aún no se ve: sin mapa solo se dibuja la Pradera; se comprueba por `farmweb.app.w`).
- [ ] **Step 8: Commit** `feat(reglas): espacio, cría y compras por corral; misión de corral`.

---

### Task 5: Arte de los corrales y del mapa

**Files:**
- Modify: `tools/gen_sprites.py`
- Generated: `assets/sprites/tiles.png|json` (nuevos tiles e iconos), `assets/sprites/icons.png|json`, `assets/sprites/places.png|json`, `docs/preview-sprites.png`

**Interfaces:**
- Produces: tiles nuevos `moss`, `fern`, `sand`, `rock`, `tree` (el último con fondo transparente); iconos nuevos `mapa` y `candado`; atlas `places.png` de celdas de **48×48** con `places.json = { cell: 48, index: { pradera, bosque, estanque, jurasico, pradera_bloq, bosque_bloq, estanque_bloq, jurasico_bloq } }`. Las variantes `_bloq` son las mismas imágenes desaturadas por código. Mismo estilo kawaii: contorno `#5b4256`, paleta pastel.

- [ ] **Step 1: Agregar** las funciones de tiles, iconos y lugares siguiendo el patrón de `TILES`/`ICONS`/`build()`; los lugares: granero rosa pastel (pradera), pino con cartel (bosque), charco con nenúfar (estanque), huevo moteado sobre roca (jurásico).
- [ ] **Step 2: Regenerar** con `npm run sprites`. Esperado: sin errores, y se imprime el conteo de tiles/iconos nuevo.
- [ ] **Step 3: Verificar el contenido**: con `python3 -c` comprobar que `tiles.json` tiene las 12 claves, `icons.json` incluye `mapa` y `candado`, `places.json` tiene 8 claves y `places.png` mide 384×48. Extender la vista previa para mostrar lugares y tiles nuevos y **revisar la imagen** `docs/preview-sprites.png`: que cada lugar se distinga del fondo, que el bloqueado se vea apagado y que los tiles se vean bien.
- [ ] **Step 4: Correr** `npm test` (sin cambios de lógica). Esperado: verde.
- [ ] **Step 5: Commit** `feat(arte): tiles de corral, iconos de mapa y lugares`.

---

### Task 6: Escenas y mapa en el dibujo y el bucle

**Files:**
- Modify: `src/render.js`, `src/main.js`, `index.html` (solo el `aria-label` inicial del lienzo si hace falta)

**Interfaces:**
- Consumes: Tasks 3–5 (`resolveScene`, `corralStatus`, `CORRAL_TYPES`, `MAP_SPOTS`, sprites `places`).
- Produces:
  - `loadSprites()` agrega `placesImg` y `places`.
  - `draw(ctx, S, w, view, t)`: `view.scene` es `'mapa'` o un corral. En un corral dibuja su suelo según el tipo (pradera: la actual; bosque: musgo con árboles en el borde; estanque: agua con orilla de arena; jurásico: helechos y rocas; todos con valla) y **solo** los animales y huevos de ese corral. En `'mapa'` dibuja pasto, senderos entre `MAP_SPOTS`, cada lugar con su sprite, nombre y, si está bloqueado, `candado` y costo (o «Historia»); si está construido, una insignia con la cantidad de productos listos (usa `corralStatus`).
  - `hitTest(w, lx, ly, corralId)` (solo animales de ese corral) y `hitMap(w, lx, ly): tipo|null` con área de toque de 56×56 centrada en cada lugar.
  - `main.js`: `app.scene` (inicia en `'pradera'`), `app.goTo(scene)` (usa `resolveScene`, deselecciona si el animal no está en la escena y llama a `ui.refresh()`), y `pointerdown` que en el mapa entra al corral construido o abre `ui.openPanel('shop','corrales')` si está sin construir. `replaceWorld` y `newWorld` aplican `resolveScene`. `wander` sigue moviendo a todos los animales.

- [ ] **Step 1: Implementar** `render.js` y `main.js` como en Interfaces. La pestaña `corrales` de la tienda ya existe desde la tarea 4.
- [ ] **Step 2: Correr** `npm test`. Esperado: verde.
- [ ] **Step 3: Verificar en navegador** con un script Playwright de una sola vez (Chrome, `?debug`, móvil 390×844 y PC 1280×800): regalar monedas con `window.farmweb.sim`, construir los 4 corrales, y capturar las 5 escenas (mapa, pradera, bosque, estanque, jurásico) cambiando `farmweb.app.goTo(...)`. **Revisar cada captura**: sin animales fuera de su escena, animales dentro del área, mapa con lugares bloqueados y construidos distinguibles, sin errores de consola.
- [ ] **Step 4: Commit** `feat(escenas): dibujo por corral y mapa tocable`.

---

### Task 7: Interfaz: navegación, tienda de corrales y paneles

**Files:**
- Modify: `index.html`, `styles.css`, `src/ui.js`, `src/main.js`

**Interfaces:**
- Consumes: Task 4 (`corralInfo`, `buildCorral`, `upgradeCorral`, `corralStatus`) y Task 6 (`app.scene`, `app.goTo`).
- Produces:
  - Barra inferior de 6 botones: **Mapa** (nuevo, icono `mapa`, va a `app.goTo('mapa')`), Animales, Tienda, Mochila, Misiones, Mundo.
  - Chip de espacio del encabezado: en un corral muestra `{nombre} {usados}/{capacidad}`; en el mapa muestra el total de animales.
  - Tienda, pestaña **Corrales** (creada en la tarea 4): se completa con nivel y capacidad por corral, el botón **Visitar** (va a la escena del corral), y «Llega con la historia» cuando `buildCost` es `null`. La pestaña **Animales** indica a qué corral va cada especie y el motivo si no se puede comprar.
  - Panel **Animales**: agrupado por corral con encabezado `{nombre} {usados}/{capacidad}` y botón **Ir al corral**.
  - `app.buildCorral(tipo)`, `app.upgradeCorral(id)` (sustituyen a `app.buyUpgrade`); `app.buyAnimal` selecciona al animal nuevo y lleva a su corral.
  - El `aria-label` del lienzo describe la escena actual.

- [ ] **Step 1: Implementar** la interfaz de Interfaces reutilizando `h`, `row`, `btn`, `price` y la hoja existente; cuidar que 6 botones quepan en 360 px (ajustar `font-size` y `padding` de `#dock button` si hace falta).
- [ ] **Step 2: Correr** `npm test`. Esperado: verde.
- [ ] **Step 3: Verificar en navegador** (script de una sola vez, móvil 390×844 y 360×740, y PC): ver el mapa, tocar un lugar bloqueado y comprobar que abre la tienda en Corrales; construir el Bosque con monedas regaladas, comprar un mapache y comprobar que aparece en el Bosque; ampliar la pradera y ver el chip cambiar de 8 a 12; abrir Animales y comprobar los grupos. Sin desbordamiento horizontal y sin errores de consola. **Revisar las capturas.**
- [ ] **Step 4: Commit** `feat(ui): mapa en la barra, tienda de corrales y animales por corral`.

---

### Task 8: Prueba de humo, documentación y verificación final

**Files:**
- Modify: `tools/e2e_smoke.py`, `README.md`, `docs/DISENO.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `python3 tools/e2e_smoke.py <carpeta>` cubre el flujo v2 y falla ante errores de consola.

- [ ] **Step 1: Actualizar `tools/e2e_smoke.py`** para: (a) jugar el flujo base ya existente; (b) abrir el mapa, tocar un corral bloqueado y confirmar que abre la tienda; (c) construir el Bosque y comprar un mapache; (d) **migración en navegador**: antes de cargar la página poner `tests/fixtures/mundo-v1.farmweb.json` en `localStorage['farmweb:world:v1']`, recargar y comprobar 8 animales, 4 corrales, 777 monedas y la clave `farmweb:world:v1:respaldo-v1` con el texto original; (e) cargar ese mismo archivo con «Cargar mundo desde archivo»; (f) estar en el Bosque y cargar un mundo sin Bosque → vuelve a la Pradera; (g) 360×740 sin desbordamiento. Todo en móvil y PC.
- [ ] **Step 2: Correr** `npm test` y `python3 tools/e2e_smoke.py /tmp/f1-shots`. Esperado: `0 fallos` y todas las líneas `ok`. **Revisar las capturas** de cada escena y del panel de corrales.
- [ ] **Step 3: Actualizar** `README.md` (qué hay ahora: corrales y mapa; cómo probar en el celular) y `docs/DISENO.md` (marcar la fase 1 como hecha y la v2 como camino).
- [ ] **Step 4: Commit** `docs: fase 1 documentada y prueba de humo del flujo v2`, y subir la rama `fase-1-corrales` a GitHub.
- [ ] **Step 5: Entregar al usuario**: copiar la carpeta a `C:\Users\ljriv\Documents\GitHub\FarmWeb` y avisar cómo probar su mundo actual con `iniciar.bat`; **no** unir a `main` hasta que confirme.
