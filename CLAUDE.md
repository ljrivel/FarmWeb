# FarmWeb: guía para Claude Code

Juego de granja tierno (kawaii) para navegador, móvil y PC. Pixel art propio. Un solo jugador por ahora,
guardado automático en localStorage y descarga/carga de `.farmweb.json`. Repo: `ljrivel/FarmWeb`.
El dueño es Luis Josué; **responde siempre en español**.

## Cómo trabajar (reglas del dueño)

1. **Analiza primero**: revisa la estructura, las dependencias y los archivos relacionados con el pedido.
2. **Plan antes de cambiar**: presenta un plan paso a paso (archivos a tocar, qué cambia, riesgos, cómo se
   verificará) y **espera su aprobación**. No modifiques archivos antes.
3. Nada destructivo ni cambios de formato del guardado sin autorización explícita.
4. Respeta la arquitectura, no toques lo que no se pidió, reutiliza lo que ya existe, implementa por etapas
   y verifica cada una.
5. Usa las skills que apliquen: Superpowers (planificar, depurar, TDD) e Impeccable (diseño de interfaz).
   Una skill instalada no está activa por sí sola: invócala.
6. Explica las decisiones técnicas, reporta errores y límites, y **no afirmes que algo funciona sin
   haberlo verificado** (pruebas o navegador).

## Comandos

| Qué | Comando |
|---|---|
| Jugar en local (PC y celular en la misma Wi-Fi) | doble clic a `iniciar.bat` o `npm start` |
| Pruebas unitarias | `npm test` (deben pasar todas; hoy 186) |
| Regenerar sprites | `npm run sprites` (Python + Pillow; escribe `assets/sprites/*`) |
| Recorrido en navegador | `python tools/e2e_smoke.py <carpeta_capturas>` (Playwright + Chrome; hoy 364 comprobaciones) |

Tras un cambio visible, recarga con Ctrl+F5. El servidor local envía `Cache-Control: no-store`.
Con `?debug` en la URL queda disponible `window.farmweb = { app, sim, audio }`. `?sinescenas` y `?sintutorial` apagan las
escenas y el tutorial (para pruebas).

## Arquitectura

- Sin dependencias: Canvas 2D + módulos ES. Lienzo lógico 320×224, aleatorio determinista (`w.rng`).
- `src/data.js`: especies, comida, mapa, historia, secundarias, secretos y `BALANCE` (todos los números de
  equilibrio). `src/sim.js`: reglas del mundo. `src/state.js`: formato y `validateWorld`.
  `src/quests.js`: misiones. `src/render.js`: dibujo. `src/ui.js`: hojas y paneles. `src/audio.js`: sonido
  sintetizado (Web Audio). `src/main.js`: arranque y enlace de todo.
- Guardado: `VERSION = 2`. Campos nuevos se añaden **con valor por defecto en `validateWorld`**, sin subir
  `VERSION`, para no romper partidas existentes. localStorage: `farmweb:world:v1`, audio `farmweb:audio:v1`.
- Color y rareza: el índice de variante es la rareza (`VARIANT_TIERS`), el brillante (shiny) va aparte.
  Los sprites los genera `tools/gen_sprites.py`; el atlas lleva `version` y se pide con `?v=`.
- Cuidado: corazones (100 de cariño = 1), enfermedades, Veterinaria (no es corral). Los aleatorios de
  enfermedad usan `w.careRng`, aparte de `w.rng`, para no alterar la cría.

## Estado

Hecho y subido a `main`: corrales y mapa, nombres, colores raros y brillantes, sonido, cuidado profundo (2B),
historia hasta el Capítulo 5, secundarias en paralelo con Historial, 8 secretos, conejo y pato, 25 especies.
Detalle y decisiones en `docs/NOTAS_MEJORAS_NOCTURNAS.md`.
Retratos pixel art de los 7 personajes (`assets/sprites/portraits.*`, se ven en Misiones). Escenas con diálogo (Etapa B, 23 escenas del guion aprobado en `docs/GUION_HISTORIA.md`): `SCENES` en `data.js`,
lógica en `src/story.js`, diálogo en `ui.js` (`playStory`), vistas guardadas en `w.story.seen`. `?sinescenas` las apaga
(el e2e lo usa). Visitas ocasionales (Etapa C: `VISITS` en `data.js`, `pickVisit` en `story.js`, dibujo en `render.js`, cadencia en
`BALANCE.visit*`, charlas contadas en `w.story.talked`) y Diario (Etapa D: pestaña en Misiones con cartas y escenas
repetibles).
Cesta diaria de Bruno (`BALANCE.gift*`, `w.gift`), etiquetas en el corral y Guía de especies (`dato` en cada especie).
Historia hasta el Capítulo 7 («El valle escondido» y «Alas y mareas»): corral Valle, Noa, 6 dinosaurios en total
(carnotauro, spinosaurus, triceratops, estegosaurio, pterodáctilo, plesiosaurio) y oveja y zorro por secundarias.
Estación Estelar (Capítulo 8 «Más allá del cielo»): corral `estacion` (12 lugares) por historia y 9 criaturas de Star Wars que se
compran y crían (porg, gato loth, tauntaun, bantha, purrgil, dewback, ewok, Grogu y BB-8; los últimos 3 se conocen al
cobrar la leche azul). Sitio privado y sin fines de lucro, según el dueño.
Criadero (lugar único del mapa, `CRIADERO_SPOT`; `w.criadero = { built, level, lanes }`, `a.away`, `corral.breed`): cupos con
nido → huevo en incubadora → eclosión, «Darle calor», niveles 0 a 4, cría automática por defecto y «manual» por corral. Los
padres en el nido están ausentes (sin hambre ni ánimo, ni dibujados). Todo en `BALANCE.criadero*` y `heat*`. Los 6 dinosaurios tienen
precio y se listan en la Tienda, pero se replican en el Laboratorio (ver abajo).
Mao Mao (retrato pixel art chibi de gato, id `mao`) atiende la Veterinaria desde el Capítulo 6 mientras la Dra. Pita está de viaje:
Pita se despide en la escena `una-boticaria-nueva` (al terminar el festival), sus visitas llevan `maxCh: 5` y las líneas de los
capítulos 6 a 8 las dice Mao Mao.
Veterinaria interactiva (siempre, con la doctora de turno: Pita hasta el cap. 5 y Mao Mao desde el 6; `vetDoctor` en `sim.js`,
`w.vet`, `BALANCE.vet*`, frases en `VET_LINES`, minijuegos puros en `src/vetgames.js`): diagnóstico con su voz, Consulta (gratis,
sube la confianza), Chequeo, protección (Pita: vitaminas con monedas; Mao Mao: tónico con productos), pedido diario y
«Ayudar a la doctora» (Pita: ritmo «Latidos»; Mao Mao: «Mezcla de hierbas»; el precio de la cura se devuelve según los aciertos y
sin aciertos se pierde la consulta). La confianza da hasta −20 % en curas. `farmweb.app.mgEasy` facilita los minijuegos en pruebas.
Actualización automática (`src/update.js`): `npm run build` escribe `dist/version.json` (commit de Cloudflare o la hora) y el juego lo
consulta cada 5 min y al volver a la pestaña; si cambió, guarda y se recarga solo cuando no hay panel, escena ni tutorial abiertos
(la raíz trae un `version.json` de desarrollo con `dev` para que en local no haya 404).
Tutorial guiado de Tomás, 13 pasos; los de panel abren el panel y no oscurecen encima (`src/tutorial.js` pasos, `startTutorial` en `ui.js`, marca `tutorial` en `farmweb:ui:v1`, una vez
por dispositivo, repetible en Mundo; `?sintutorial` lo apaga y el e2e lo usa).
La grieta del tiempo (capítulo 4, tras `c4-spino`; guion en `docs/GUION_VIAJE_EN_EL_TIEMPO.md`): 7 misiones nuevas (`c4-grieta` a `c4-primera-replica`) y
10 escenas. El viaje da las muestras de triceratops, estegosaurio y plesiosaurio (`unlock`); el pterodáctilo llega por las plumas del capítulo 7. Cosi no aparece:
solo su nota. Laboratorio Hélice (lugar único, `LAB_SPOT`, `w.lab = { built, level }`, se abre con la misión `c4-laboratorio` por `reward.lab`; atiende la
doctora de turno): los dinosaurios ya no se compran, se **replican** (`replicate` en `sim.js`, hebra de 6 u 8 bases `SPECIES[s].dna`, reglas puras en
`src/genetica.js`, panel `lab` en `ui.js`, `BALANCE.lab*`). Resultado por errores: perfecta (−25 % de costo, más color raro), buena, inestable (devuelven 50 %), fallida
(se pierde); el cobro es al terminar, salir antes es gratis. Partidas viejas que ya pasaron el capítulo 4 reciben esas misiones hechas y el Laboratorio abierto
(migración en `validateWorld`, sin subir `VERSION`). Personaje nuevo `helice` (Señor Hélice). Sin hacer: las «lagunas de ADN de rana» del guion.
Vender animales (`sellPrice`, `canSellAnimal`, `sellAnimal` en `sim.js`; `BALANCE.sell*`; `stats.soldAnimals`): bebé 25 % y adulto 50 % del precio de la
especie, por la rareza (poco ×1,5, raro ×2,5, brillante ×4); no se vende un enfermo, uno del nido ni el último animal. Botón en la tarjeta y en la lista de
Animales, con confirmación (`askSell` en `ui.js`). La etapa se ve como etiqueta (`stageBadge`: Bebé / Adulto).
Mini lecciones por mecánica nueva (`LESSONS` en `src/tutorial.js`: vender, Criadero, enfermedades, Laboratorio, Mao Mao y Estación; las cuentan Tomás, Pita,
el Señor Hélice, Mao Mao y Noa): salen solas al llegar a su capítulo (el Laboratorio, al abrirse), tras el tutorial y las escenas, y se guardan en
`farmweb:ui:v1` (`lessons`); una partida avanzada no repite las de capítulos anteriores y las repite desde Mundo → Lecciones. `startTutorial(onDone, lesson)`
sirve para ambos. Una mecánica nueva en el futuro = una lección más en `LESSONS`.
Juego ocasional: la saciedad llena dura ~3 h (`fedDecayPerSec`), con hambre el ánimo cae en ~33 min, cada animal acumula hasta 6 productos (`maxReady`) y
sin conexión la saciedad no baja de `offlineFedFloor` (25) y el ánimo no cae: ausentarse no castiga (solo con el juego abierto se vacía, enferma o pierde corazones).
`tests/historia-completa.test.mjs` recorre toda la historia: añade ahí cualquier capítulo nuevo sin tocar más.

## Pendiente

- **Probar jugando el equilibrio** (enfermar, costos de Veterinaria, ritmo de corazones) y ajustar `BALANCE`.
- **Escuchar** los sonidos nuevos (`heart`, `sick`, `heal`) y las voces de conejo y pato: nunca se oyeron.
- Limpieza de corrales (nidos y suciedad), opcional, no hecha.
- **Hosting** en línea: aún sin resolver (el juego es estático, sirve cualquier hosting de archivos).
- Cuentas de usuario con inicio de sesión y guardado en línea (parte del proyecto original): aún no se hacen;
  hoy el guardado es localStorage y archivo. Requiere servidor y base de datos: planificarlo con el dueño.
- Ideas sin empezar: más animales y personajes, más pulido visual.

## Notas

- Commits en español, estilo `tipo(área): mensaje`. No subas `node_modules`, `.env` ni secretos.
- Los PNG de `assets/sprites` son generados: cámbialos con `npm run sprites`, no a mano.
