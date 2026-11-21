# Fase 2A: identidad y sonido — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (el usuario eligió ejecución en esta sesión) para implementar este plan tarea por tarea. Los pasos usan casillas `- [ ]`.

**Goal:** nombres editables, 4 colores por especie más brillante con probabilidades, y sonido sintetizado con silencio y volumen.

**Architecture:** los colores son índices con rareza fija (datos en `src/data.js`); el nombre se limpia en una sola función; el arte se regenera con `tools/gen_sprites.py`; el sonido es un módulo nuevo `src/audio.js` (Web Audio sin archivos) que `main.js` y `ui.js` solo llaman.

**Tech Stack:** JavaScript ES modules sin dependencias, Canvas 2D, Web Audio, Python + Pillow para el arte, `node --test`, Playwright con Chrome para el navegador.

**Spec:** `docs/superpowers/specs/2026-11-20-fase-2a-identidad-y-sonido-diseno.md`

## Global Constraints

- Sin dependencias ni compilación; UI en español; texto dinámico solo con `textContent`/atributos (nunca `innerHTML`).
- Formato de mundo sigue en `VERSION = 2`; los campos nuevos tienen valor por defecto y las partidas anteriores cargan sin cambios. Clave `farmweb:world:v1` intacta.
- Preferencias de sonido en `farmweb:audio:v1`, fuera del archivo del mundo.
- Simulación determinista (`w.rng` con semilla); lo visual puede usar `Math.random`.
- Sprites de animales 32x32; atlas con 80 filas; clave de fila `especie:color|shiny:etapa`.
- Rareza siempre con texto, nunca solo por color. Objetivos táctiles de al menos 44 px; sin desbordamiento horizontal desde 360 px.
- No sonar antes del primer toque del jugador; ganancia maestra por defecto 0.5; notas con ganancia máxima 0.6.
- `npm test` (`node --test "tests/*.test.mjs"`) debe quedar verde al cerrar cada tarea.
- Commits en español con el pie de atribución indicado por el sistema. Rama `fase-2a-identidad`; no unir a `main` sin confirmación.

## Review Focus

1. Nombres hostiles (HTML, 10 000 caracteres, caracteres de control, solo espacios, emoji) al renombrar y al importar un archivo; siempre se ven como texto plano.
2. Probabilidades: la tienda y los regalos nunca dan poco común ni raro; la cría respeta 85/10,5/4,5; una partida v2 sin `named` y con colores 0/1 carga sin diálogos; un color fuera de rango se corrige.
3. Una fila de sprite que falte no rompe el dibujo (cae al color 0).
4. Sonido: nada antes del primer toque, silenciado no crea nodos, sin `AudioContext` no hay errores, ráfagas rápidas no apilan voces, pestaña oculta suspende.
5. Diálogo de nombre: cerrar con Escape o tocando fuera conserva el nombre sugerido; comprar dos animales seguidos; renombrar con la tarjeta de otra escena.

---

### Task 1: Colores y rarezas (datos)

**Files:**
- Modify: `src/data.js`
- Test: `tests/colors.test.mjs` (nuevo)

**Interfaces:**
- Produces (en `src/data.js`):
  - `COMMON_VARIANTS = 2`; `VARIANT_TIERS = ['comun','comun','poco','raro']`; `TIER_LABEL = { comun:'Común', poco:'Poco común', raro:'Raro', brillante:'Brillante' }`
  - `SPECIES[s].variants` con los 4 nombres de la tabla del diseño (los 2 primeros son los actuales, en el mismo orden).
  - `BALANCE.mutationChance = 0.15` y `BALANCE.mutantTierOdds = { poco: 0.7, raro: 0.3 }` (reemplaza `mutationChance: 0.04`); `shinyChance` y `shinyChanceParent` no cambian.
  - `rarityOf({variant, shiny}): 'comun'|'poco'|'raro'|'brillante'` (el brillante gana); `rarityLabel(a): string` (texto de `TIER_LABEL`).
  - `spriteKey(species, variant, shiny, stage): string` → `'gallina:2:adult'` o, si `shiny`, `'gallina:shiny:adult'`.

- [ ] **Step 1: Escribir `tests/colors.test.mjs`** (falla primero): «cada especie tiene 4 colores con nombres distintos y los 2 primeros son los actuales» (`['Blanca','Marrón']` para gallina, etc.); «rarityOf: 0 y 1 comun, 2 poco, 3 raro, y shiny gana siempre»; «spriteKey usa shiny en vez del número de color»; «las mutaciones suman 15 %: mutationChance*poco = 0.105 y mutationChance*raro = 0.045 (diferencia < 1e-9)».
- [ ] **Step 2: Correr** `node --test tests/colors.test.mjs`. Esperado: FALLA por exportaciones inexistentes.
- [ ] **Step 3: Implementar** lo de Interfaces en `src/data.js`. Si una prueba existente fija «2 colores» o usa `mutationChance`, ajustarla y dejar `Ruling:` en el ledger.
- [ ] **Step 4: Correr** `npm test`. Esperado: todo verde (si cambió una secuencia con semilla de una prueba existente por el nuevo valor, ledger `Ruling:`).
- [ ] **Step 5: Commit** `feat(colores): 4 colores por especie, rarezas y probabilidades`.

---

### Task 2: Colores en cría, tienda y regalos

**Files:**
- Modify: `src/sim.js`, `src/quests.js`
- Test: `tests/colors-rules.test.mjs` (nuevo)

**Interfaces:**
- Consumes: Task 1 (`COMMON_VARIANTS`, `VARIANT_TIERS`, `BALANCE`).
- Produces: `pickBabyVariant(w, a, b): number` exportada de `src/sim.js`: elige al azar el color de `a` o de `b`; con probabilidad `BALANCE.mutationChance` muta a un color cuyo tier sale de `mutantTierOdds` (el único índice de ese tier). `tick` la usa para los huevos. `buyAnimal` y el regalo de `claim` usan `randInt(w, COMMON_VARIANTS)`.

- [ ] **Step 1: Escribir `tests/colors-rules.test.mjs`**: «comprar 2000 veces nunca da color >= 2» (monedas enormes, quitar el animal con `w.animals.pop()` tras cada compra para conservar espacio); «pickBabyVariant con padres 0 y 1, 40 000 veces: hereda 0.85 ± 0.01, poco 0.105 ± 0.008, raro 0.045 ± 0.006»; «padres raros (3 y 3), 2000 veces: más del 85 % sale 3»; «el regalo de historia (`claim` de la misión con `gift`) nunca da color >= 2 en 200 mundos con semillas distintas».
- [ ] **Step 2: Correr** `node --test tests/colors-rules.test.mjs`. Esperado: FALLA (`pickBabyVariant` no existe).
- [ ] **Step 3: Implementar** `pickBabyVariant` y reemplazar la mutación de `tick`, y las dos tiradas de color de `buyAnimal` y `claim`.
- [ ] **Step 4: Correr** `npm test`. Esperado: verde; cualquier secuencia con semilla que cambie por el nuevo consumo de aleatorios se corrige y queda en el ledger.
- [ ] **Step 5: Commit** `feat(cría): colores raros por mutación; tienda y regalos solo comunes`.

---

### Task 3: Nombres: limpieza, renombrar y marca de «sin bautizar»

**Files:**
- Modify: `src/state.js`, `src/sim.js`
- Test: `tests/names.test.mjs` (nuevo)

**Interfaces:**
- Produces:
  - `cleanName(raw: unknown, max = 24, fallback = ''): string` en `src/state.js`: si no es texto devuelve `fallback`; normaliza NFC; quita caracteres de control y de formato (`\p{Cc}`, `\p{Cf}`, separadores de línea/párrafo); colapsa espacios; recorta; corta a `max` puntos de código (nunca a mitad de un emoji); vacío → `fallback`. Sustituye al limpiador de nombres de animales en `validateWorld`.
  - `renameAnimal(w, id, raw): {ok, msg, animal?}` en `src/sim.js`: sin animal → `no('No encuentro a ese animal.')`; limpio vacío → `no('Escribe un nombre.')` sin cambiar nada; si no, fija `name`, `named = true` y devuelve `msg: 'Ahora se llama {nombre}.'`.
  - Campo `named: boolean` en cada animal: `addAnimal` lo crea en `false`; `validateWorld` lo deja en `a.named !== false` (ausente = `true`).

- [ ] **Step 1: Escribir `tests/names.test.mjs`**: «renameAnimal limpia espacios y controles» (`'  Pe\u0000pi\u202Eta   Luna  '` → `'Pepita Luna'`, `named` queda true); «nombre vacío o solo espacios se rechaza y conserva el actual»; «10 000 caracteres se cortan a 24 y `'🐔'.repeat(30)` queda en 24 puntos de código»; «HTML queda tal cual como texto» (`'<img src=x onerror=1>'` se guarda igual: la seguridad está en mostrarlo como texto); «importar un mundo con nombre `'\u0007\u0007  '` deja el nombre por defecto de la especie»; «una partida sin `named` carga con `named: true` y un animal nuevo nace con `named: false`».
- [ ] **Step 2: Correr** `node --test tests/names.test.mjs`. Esperado: FALLA.
- [ ] **Step 3: Implementar** `cleanName`, `renameAnimal` y el campo `named` (en `addAnimal` y en `validateWorld`).
- [ ] **Step 4: Correr** `npm test`. Esperado: verde.
- [ ] **Step 5: Commit** `feat(nombres): renombrar animales con nombre limpio y marca de sin bautizar`.

---

### Task 4: Arte de los colores nuevos y brillantes

**Files:**
- Modify: `tools/gen_sprites.py`; se regeneran `assets/sprites/animals.png`, `assets/sprites/animals.json`, `docs/preview-sprites.png`
- Test: `tests/art.test.mjs` (nuevo)

**Interfaces:**
- Consumes: Task 1 (nombres y `spriteKey`).
- Produces: `animals.json.rows` con `{especie}:{0..3}:{baby|adult}` y `{especie}:shiny:{baby|adult}` (80 filas); `species` sigue contando 4 colores; el PNG mide `80 * 32` de alto por `4 * 32` de ancho.

- [ ] **Step 1: Escribir `tests/art.test.mjs`**: «el atlas tiene una fila para cada especie x color x etapa y para cada brillante» (usa `spriteKey` de `src/data.js` y `animals.json`; 80 filas, sin repetidos); «el PNG tiene el alto de 80 filas» (leer ancho y alto del encabezado IHDR del PNG).
- [ ] **Step 2: Correr** `node --test tests/art.test.mjs`. Esperado: FALLA (hoy hay 32 filas).
- [ ] **Step 3: Implementar** en `tools/gen_sprites.py`: por especie, 2 paletas nuevas (poco común y raro, con los nombres del diseño) añadidas a su lista de variantes, más un diccionario `SHINY` con una paleta brillante por especie (cuerpo nacarado/dorado con acentos rosa y aguamarina); `build()` agrega las filas `shiny`. Cada paleta nueva usa pastel, se distingue de las otras 3 de su especie y respeta el contorno y sombreado actuales.
- [ ] **Step 4: Regenerar** `python3 tools/gen_sprites.py`, correr `node --test tests/art.test.mjs` (verde) y **mirar `docs/preview-sprites.png`**: ajustar paletas hasta que los 5 looks de cada especie se distingan y sigan siendo tiernos. Dejar en el ledger la revisión.
- [ ] **Step 5: Commit** `feat(arte): colores poco comunes, raros y brillantes por especie`.

---

### Task 5: Dibujo, etiquetas de rareza y nombres en pantalla

**Files:**
- Modify: `src/render.js`, `src/ui.js`, `src/main.js`, `styles.css`

**Interfaces:**
- Consumes: Tasks 1 a 4 (`spriteKey`, `rarityOf`, `rarityLabel`, `renameAnimal`, `named`, filas del atlas).
- Produces: `app.renameAnimal(id, raw)` y `ui.askName(id, isNew)` (abre una hoja «Ponle nombre» o «Cambiar nombre»); etiqueta `.rarity.{poco|raro|brillante}` con texto de `TIER_LABEL`.
- Comportamiento:
  - `render.js` y el retrato de `ui.js` usan `spriteKey`; si falta la fila, caen a `especie:0:etapa`.
  - Tarjeta del animal: etiqueta de rareza junto al nombre (los comunes no llevan), botón **Cambiar nombre**, y botón destacado **Ponle nombre** si `named === false`. Panel Animales: rareza en el subtítulo y «· sin bautizar» cuando corresponde.
  - Hoja de nombre: campo con etiqueta visible «Nombre», `maxlength` 24, nombre sugerido preseleccionado, **Guardar nombre** (Enter) y **Dejar este nombre**; Escape o tocar fuera conservan el actual. Comprar un animal o reclamar un premio con animal abre la hoja (`isNew`).
  - Aviso de nacimiento: `¡Nació {nombre}! Toca para ponerle nombre.`; si no es común, `¡Nació {nombre}, una cría {rara|poco común|brillante}!`.

- [ ] **Step 1: Implementar** lo anterior reutilizando `h`, `row`, `btn`, la hoja existente y los estilos de chips.
- [ ] **Step 2: Correr** `npm test`. Esperado: verde.
- [ ] **Step 3: Verificar en navegador** (script de una sola vez, 390x844, 360x740 y 1280x800): comprar un gato abre el diálogo con nombre sugerido; escribir otro nombre lo guarda y se ve en la tarjeta y en Animales; Escape conserva el sugerido y la tarjeta muestra «Ponle nombre»; un nombre `<img src=x onerror=alert(1)>` se ve como texto; inyectar un animal de color 3 y uno brillante de cada especie y capturar (dibujo y tarjeta); sin desbordamiento horizontal en el diálogo y sin errores de consola. **Revisar las capturas.**
- [ ] **Step 4: Commit** `feat(ui): colores raros, nombres y diálogo de nombre`.

---

### Task 6: Motor de sonido

**Files:**
- Create: `src/audio.js`
- Test: `tests/audio.test.mjs` (nuevo)

**Interfaces:**
- Produces (en `src/audio.js`):
  - `type Note = { t:number, d:number, type:'sine'|'triangle'|'square'|'sawtooth'|'noise', f0:number, f1?:number, g:number, lp?:number }` (inicio y duración en segundos, frecuencia inicial y final, ganancia, filtro pasabajos opcional).
  - `SOUNDS: Record<string, Note[]>` con exactamente: `tap, pet, feed, feedFav, collect, sell, buy, build, upgrade, quest, hatch, egg, grown, named, rare, shiny, warn, map, open, close`; `VOICES: Record<string, Note[]>` con las 8 especies (gallina: pío corto triple; gato: maullido que sube y baja; vaca: muuu grave; mapache: risita rápida; chanchito: dos gruñidos cortos; ajolote: burbujas; carnotauro: rugido grave suave; spinosaurus: chillido suave descendente). Todo suave y breve.
  - `scheduleNotes(ctx, dest, notes, t0, noiseBuffer): number` programa las notas y devuelve cuántas.
  - `loadPrefs(storage): {muted:boolean, volume:number}` (por defecto `{muted:false, volume:0.5}`; JSON roto o fuera de rango se corrige a 0..1) y `savePrefs(storage, prefs)`; clave `farmweb:audio:v1`.
  - `createAudio({ storage, AudioContextClass }): { unlock(): Promise<void>, play(name): boolean, voice(species): boolean, setMuted(b), setVolume(v), setHidden(b), prefs, state }` con `state` en `'none'|'suspended'|'running'`.
- Reglas del motor: `play` y `voice` devuelven `false` y no crean nada antes de `unlock()`, si está silenciado, si no hay `AudioContext` o el nombre no existe; un compresor y una ganancia maestra (`prefs.volume`) protegen la salida; máximo 8 notas activas a la vez; el mismo efecto no se repite antes de 60 ms y la voz de una especie no antes de 1200 ms; `setHidden(true)` suspende y `setHidden(false)` reanuda.

- [ ] **Step 1: Escribir `tests/audio.test.mjs`** con un `AudioContext` falso que registra nodos y tiene `currentTime` controlable: «SOUNDS y VOICES tienen exactamente los nombres pedidos y cada nota es válida (t >= 0, 0 < d <= 1.5, 0 < g <= 0.6, 40 <= f0 <= 4000, duración total <= 2.5 s)»; «antes de unlock no suena ni crea contexto»; «silenciado no crea nodos»; «sin AudioContext no falla»; «50 `play('tap')` en el mismo instante programan como mucho 1 vez y 20 efectos distintos no pasan de 8 notas activas»; «la voz de una especie no se repite antes de 1200 ms»; «prefs: volumen 7 → 1, -3 → 0, JSON roto → por defecto, guardar y recuperar».
- [ ] **Step 2: Correr** `node --test tests/audio.test.mjs`. Esperado: FALLA (el módulo no existe).
- [ ] **Step 3: Implementar** `src/audio.js` (ruido blanco generado una vez en un buffer de 0.3 s; envolvente con subida rápida y caída exponencial para evitar clics).
- [ ] **Step 4: Correr** `npm test`. Esperado: verde.
- [ ] **Step 5: Commit** `feat(sonido): motor de sonido sintetizado con efectos y voces`.

---

### Task 7: Sonido en el juego, controles y comprobación acústica

**Files:**
- Modify: `src/main.js`, `src/ui.js`, `styles.css`

**Interfaces:**
- Consumes: Task 6 (`createAudio`, `SOUNDS`, `VOICES`, `scheduleNotes`) y Task 5 (`app.renameAnimal`).
- Produces: `app.audio`; expuesto como `window.farmweb.audio` con `?debug`.
- Comportamiento:
  - `unlock()` una sola vez en el primer `pointerdown`/`keydown`; `setHidden` con `visibilitychange`.
  - Mapa de eventos: mimar → `pet` + voz; tocar un animal → `tap` + voz; dar comida → `feed` (`feedFav` si es su favorita); recoger y recoger todo → `collect`; vender → `sell`; comprar animal o comida → `buy`; construir → `build`; ampliar → `upgrade`; reclamar misión → `quest`; nacer → `hatch` (`rare` si es poco común o raro, `shiny` si es brillante); huevo → `egg`; crecer → `grown`; guardar nombre → `named`; ir a otra escena → `map`; abrir o cerrar una hoja → `open`/`close`; cualquier aviso de fallo → `warn`. Nada suena para eventos ocurridos mientras estabas fuera.
  - Panel Mundo: sección **Sonido** con botón «Sonido: activado/silenciado» (`aria-pressed`) y deslizador «Volumen» (0 a 100, de 5 en 5), guardados con `savePrefs`.

- [ ] **Step 1: Implementar** lo anterior.
- [ ] **Step 2: Correr** `npm test`. Esperado: verde.
- [ ] **Step 3: Verificar en navegador** (script de una sola vez): antes de tocar nada `farmweb.audio.state === 'none'`; tras un toque pasa a `'running'`; renderizar cada `SOUNDS` y `VOICES` con `OfflineAudioContext` (22 050 Hz, 2.5 s) usando `scheduleNotes`: pico entre 0.02 y 1.0, sin NaN, cola final silenciosa; el silencio y el volumen sobreviven a recargar; sin errores de consola. Decir en el informe que **no se pudo escuchar**.
- [ ] **Step 4: Commit** `feat(sonido): efectos en el juego y controles de volumen en Mundo`.

---

### Task 8: Prueba de humo, documentación y entrega

**Files:**
- Modify: `tools/e2e_smoke.py`, `README.md`, `docs/DISENO.md`

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: `python3 tools/e2e_smoke.py <carpeta>` cubre nombres, colores raros y sonido, y falla ante errores de consola.

- [ ] **Step 1: Actualizar `tools/e2e_smoke.py`**: (a) comprar un animal abre el diálogo y el nombre escrito queda; (b) Escape conserva el sugerido y la tarjeta ofrece «Ponle nombre»; (c) inyectar un animal de color 3 y un brillante y comprobar que se dibujan sin errores; (d) tras un toque `farmweb.audio.state === 'running'` y el silencio persiste al recargar; (e) el diálogo cabe a 360x740. Móvil y PC.
- [ ] **Step 2: Correr** `npm test` y `python3 tools/e2e_smoke.py /tmp/f2a-shots`. Esperado: `Todo bien.` y todas las líneas `ok`. **Revisar las capturas.**
- [ ] **Step 3: Actualizar** `README.md` (qué hay ahora, cómo ajustar las probabilidades en `src/data.js`, el sonido y sus controles) y `docs/DISENO.md` (2A hecha; 2B y 2C siguen).
- [ ] **Step 4: Commit** `docs: fase 2A documentada y prueba de humo`, y subir la rama `fase-2a-identidad`.
- [ ] **Step 5: Entregar**: copiar los archivos cambiados a `C:\Users\ljriv\Documents\GitHub\FarmWeb` y avisar cómo probar; **no** unir a `main` hasta que el usuario confirme.
