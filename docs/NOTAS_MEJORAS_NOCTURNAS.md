# Notas de las mejoras nocturnas (21-11-2026)

Ejecución sin supervisión. Plan: [`PLAN_MEJORAS_NOCTURNAS.md`](PLAN_MEJORAS_NOCTURNAS.md).

## ⚠️ Lo más importante: no se pudo hacer push

El proxy de git de esta tarea programada **no tiene autorizado el repositorio `ljrivel/FarmWeb`** (403 al
hacer `git push`). Todo el trabajo quedó en commits locales sobre `main` y se entregó como **bundle de git**
y **parches** en la sesión. Para aplicarlo:

```bash
git pull farmweb-mejoras.bundle main     # o bien: git am 00*.patch
npm test && python3 tools/e2e_smoke.py
git push origin main
```

Para que las próximas ejecuciones puedan subir solas: en un chat nuevo de claude.ai pide añadir el
repositorio `ljrivel/FarmWeb` y vuelve a crear la tarea programada desde ese chat.

## Verificación final

- `npm test`: **117 pruebas en verde** (antes 88).
- `python3 tools/e2e_smoke.py /tmp/capturas`: **157 comprobaciones, «Todo bien.»** (antes 112), en móvil
  390×844, PC 1280×800 y celular chico 360×740, sin errores de consola.
- Revisé a ojo las capturas que cambiaron (tarjeta de enfermo, Veterinaria, mapa, Misiones, Estanque con patos,
  vista previa de sprites).
- **No verificado:** los sonidos no se pueden escuchar aquí (solo se prueba que existen, que respetan los topes
  y que no lanzan errores). El **equilibrio** (probabilidades de enfermar, costos, bonus de corazones, ritmo de
  los corazones) no se pudo validar jugando: queda pendiente de que lo pruebes.
- No se instalaron paquetes: todo se hizo con lo que ya había (Node, Python + Pillow, Playwright y Chrome).
- Skills: se cargó *impeccable* para el pulido visual, pero en este entorno venía sin sus referencias ni su
  script, así que apliqué un pulido conservador a mano. Las demás (Superpowers) no se cargaron para ahorrar
  contexto; seguí su método a mano: plan primero, pruebas que fallan antes de implementar en la etapa 0 y en
  las reglas de la 2B, y verificación antes de cada commit.

## Qué se hizo por etapa (un commit cada una)

### Etapa 0 — Pendientes de la 2A
- `audio.js`: `play`/`voice` nunca lanzan; si `build()` falla a medias, `ctx` vuelve a `null` y sigue en silencio.
- Nacimientos: un solo aviso «¡Nacieron N crías!» por tanda; tocarlo solo abre el nombre si la cría sigue
  en el mundo actual (`sim.isCurrent`).
- `askName`: Enter no guarda con `e.isComposing`.
- `closeSheet`: si el elemento con foco ya no existe, el foco va a la barra de abajo. Hubo que redibujar la
  tarjeta *antes* de cerrar el diálogo de nombre (si no, el botón seguía existiendo al cerrar y se perdía después).
- Caché: los JSON de sprites llevan `version` (hash del PNG) y las imágenes se piden con `?v=`; los JSON se
  revalidan con `cache: 'no-cache'`. Los retratos del DOM usan la misma URL versionada.

### Etapa 2B — Cuidado profundo (3 sub-pasos)
1. Reglas: corazones, enfermedades, curación sola y por monedas (`tests/care.test.mjs`, 13 pruebas escritas antes).
2. Interfaz: corazones y enfermedad en tarjeta, panel Animales y dibujo; hoja Veterinaria; sonidos `heart`, `sick`, `heal`.
3. Veterinaria en el mapa (sprite propio) y e2e del flujo completo en móvil y PC.
- Opcional no hecho: limpieza de corrales (nidos/suciedad). Queda pendiente.

### Etapa a — Historia
Personajes con rol, textos de los capítulos 1–4 enriquecidos (mismos ids, orden y metas) y Capítulo 5
«El festival de la granja» con giro (la abuela cuidaba los últimos nidos de dinosaurios y mandó el huevo) y
final (vuelve para el festival y deja la granja a la familia). Epílogo al terminar.

### Etapa b — Secundarias
22 secundarias en paralelo (contando las de la etapa d), con línea base, recompensa y estado; panel Misiones
con secundarias activas e Historial plegable aparte.

### Etapa c — Secretos
8 secretos con logros en Misiones (ver la lista en `SECRETS`, `src/data.js`).

### Etapa d — Contenido
Conejo y pato (4 colores, brillante, voz, sprites, comida y producto nuevos) y dos personajes nuevos
(Mía y Bruno) con sus secundarias.

### Etapa e — Visual
Pulido sutil (hover, transiciones, «latido» de lo reclamable, botón Mapa marcado, cifras tabulares) y un
arreglo: la tarjeta de un animal sano mostraba «null» desde el sub-paso 2 de la 2B.

## Decisiones de diseño tomadas sin preguntar

**2B — corazones**
- 100 de cariño = 1 corazón. Acariciar da 10 (con el enfriamiento de 20 s que ya existía) y la comida
  favorita 15. **Tope diario de 100 de cariño por animal** (≈ 1 corazón al día; 5 corazones en ~5 días).
- Bajan solo con el juego abierto y el animal descuidado (saciedad < 25 o felicidad < 30): −1 corazón cada ~3 h.
- Bonus: +4 % de producción por corazón (máx. +20 %). Sin otros efectos para no tocar la economía.
- El día del tope se calcula con `w.lastTick` en UTC.

**2B — enfermedades**
- Riesgo por hora de juego abierto: resfriado y pulgas 1,2 % cada uno siempre; tristeza 100 %/h tras 10 min
  con felicidad < 20; pancita 100 %/h tras 15 min con saciedad en 0. Con animales bien cuidados, ~1 enfermedad
  cada 3 h de juego por cada 10 animales.
- Usan un **aleatorio aparte (`w.careRng`)** para no alterar la secuencia de la cría de `w.rng` (así las pruebas
  y los resultados anteriores no cambian).
- `tick(w, dt, { live: true })` solo cuando el jugador está; la puesta al día (más de 60 s fuera, o la pestaña
  oculta) va sin `live`: nadie enferma, nadie pierde corazones y los enfermos quedan exactamente igual.
- Enfermo: no produce, no crece, no cría (su saciedad y felicidad siguen cambiando como siempre). Se dibuja algo
  apagado y quieto, con el icono de su enfermedad; el cartel con el nombre solo aparece si está seleccionado,
  para no llenar el corral de texto (la tarjeta y el panel siempre lo dicen con texto).
- Curación sola: con saciedad ≥ 50 y felicidad ≥ 40 con el juego abierto, tras 12–30 min según la enfermedad.
- Costos en la Veterinaria: resfriado 30, pancita 25, pulgas 20, tristeza 15.
- La Veterinaria **no es un corral**: siempre abierta, no cuenta para metas de corrales ni cambia la historia.
  Se abre tocándola en el mapa o desde la tarjeta del enfermo (la barra de abajo sigue con 6 botones).
- Formato: sin subir `VERSION`; campos nuevos con valor por defecto en `validateWorld` (`hearts`, `love`,
  `loveDay`, `loveToday`, `sick`, `sickT`, `sadT`, `hungryT`, `careRng`, `stats.cured`, `stats.named`,
  `quests.side`, `quests.sideBase`, `secrets`).

**Historia y misiones**
- Las misiones nuevas de historia van solo al final (capítulo 5): insertarlas en medio haría retroceder a los
  jugadores a mitad de historia.
- Capítulo 5 pide 2 corazones (≈ 2 días de juego por el tope diario): es el capítulo final, se aceptó ese ritmo.
- Las secundarias cuentan desde que aparecen (línea base); las de estado (corazones, animales a la vez) se miden
  tal cual. Aparecen según el capítulo actual (`minCh`) y si ya conoces la especie (`needs`).
- Conejo y pato se conocen con secundarias (no con la historia) para que los guardados avanzados también los reciban.
- «Cura a 1 animal» es solo secundaria (opcional): como enfermar es aleatorio, no podía bloquear la historia.

**Otros**
- El spinosaurus ya no sugiere «Nessie» como nombre al azar, porque ponérselo es un secreto.
- El secreto «Búho nocturno» usa la hora local del dispositivo (00:00–04:59). El e2e lo marca de antemano para
  no depender de la hora del equipo.
- Conejo vive en el Bosque (que solo tenía al mapache) y el pato en el Estanque (acuático).

## Pendiente / para que pruebes
- Probar el equilibrio jugando: ¿se enferman demasiado o muy poco? ¿el tope diario de corazones es lento?
  Todo está en `BALANCE` (`src/data.js`).
- Escuchar los sonidos nuevos (`heart`, `sick`, `heal`) y las voces de conejo y pato.
- Limpieza ligera de corrales (opcional de la 2B), no hecha.
- Hacer push (ver arriba).

## Ajuste de equilibrio y retratos (sesión posterior)
- `BALANCE`: resfriado y pulgas 0,012 → 0,03 por hora; `cureCost` ×2 (60, 50, 40, 30). Corazones sin cambios.
  Medido con una simulación de perfiles de jugador: un jugador atento pasa de ~1 enfermedad cada 5 h a ~1 cada 1,7 h
  con 10 animales.
- Retratos: atlas `portraits` (32×32, 7 personajes × normal/contento/triste), generado por `gen_sprites.py`,
  mostrado en `speaker()` de `ui.js`. Sin retrato, cae a la inicial de color.
- Escenas con diálogo (Etapa B): 23 escenas enganchadas a misiones (`inicio:`/`fin:`) y a la primera enfermedad. Se
  marcan vistas al empezar. Una partida sin `story` marca como vistas las de lo que ya ocurrió (no se repiten), pero
  sí sale la de la misión activa. Campo nuevo `story.seen` con valor por defecto, sin subir `VERSION`.
- Visitas (Etapa C): cada 8 a 12 min con el juego abierto llega un personaje a la entrada del corral a la vista,
  con su retrato y un «!»; se va solo a los 90 s. 20 charlas de 1 a 2 líneas, por capítulo (`minCh`) y condición
  (Pita según haya enfermos). Lía desde el cap. 4 y Cosi solo tras el final. No repite personaje seguido ni charla
  hasta agotarlas. `w.story.talked` con valor por defecto. Usan `Math.random`, no `w.rng` ni `w.careRng`.
- Diario (Etapa D): pestaña en Misiones con las cartas recibidas y las escenas vistas (se repiten sin marcarlas).
- Sin hacer: «Álbum» de personajes y ampliar el `EPILOGUE` (ver `docs/GUION_HISTORIA.md`).

## Cesta, especies nuevas y capítulos 6 y 7 (sesión posterior)
- Cesta diaria: una por fecha local (`w.gift = { day, n }`), ciclo de 7 días (`BALANCE.giftCoins`), comida favorita de lo
  que tienes. Etiquetas en el corral (`farmweb:ui:v1`, en el dispositivo) y Guía de especies con `dato`.
- Especies nuevas: triceratops, estegosaurio, pterodáctilo, plesiosaurio (por historia; no se compran) y oveja y zorro
  (con precio, se conocen con secundarias). Corral nuevo **Valle** (por historia, `cost: null`).
- Capítulo 6 (Noa llega al valle; conflicto: publicar o proteger → una reserva) y Capítulo 7 (alas y mareas; última carta
  de Cosi en el Diario). Escenas de cierre también para secundarias (`fin:s-…`). `EPILOGUE` ampliado; `chapterNow` calcula
  el último capítulo en vez de un número fijo.
- Decisiones: los dinosaurios nuevos llegan como regalo de misión (uno de cada); Noa es la voz científica y nunca antagonista;
  la oveja y el zorro llegan por secundarias para no alargar la historia principal.
- Sin hacer: «Álbum» de personajes, secretos nuevos, sonido de los animales nuevos escuchado por el dueño.

## Tutorial guiado
- Tomás guía 12 pasos (3 con acción: tocar, comer, acariciar). Ilumina el elemento con un recuadro que lo sigue cada cuadro
  y deja pasar los toques. No cambia el mundo. Se salta el paso de comer si no hay comida y los de la tarjeta si no hay animales.
- Marca `tutorial: true` en `farmweb:ui:v1` (por dispositivo, no dentro del mundo): quien ya tenía partida lo ve una vez.
  Sin localStorage sale una vez por sesión. En una partida nueva empieza después de la escena de Bruno; las visitas esperan.
- Las preferencias del dispositivo ahora se fusionan (antes guardar etiquetas pisaba todo el objeto).

## Estación Estelar y mejora del tutorial
- Capítulo 8 (5 misiones, 6 escenas): la señal de Noa abre la Estación (corral `estacion`, 10 lugares, solo por historia).
  Las 6 criaturas se conocen en tres tandas (porg y gato loth; tauntaun y bantha; purrgil y dewback) y se compran
  (300 a 520 monedas) para poder criarlas, a diferencia de los dinosaurios, que llegan de uno en uno.
- Comida nueva «ración estelar» (tauntaun, bantha, purrgil, dewback); porg y gato loth comen pescadito. 6 productos nuevos
  y 4 secundarias. Suelo propio (metal con estrellas) y lugar en el mapa arriba a la derecha.
- Arte rehecho según referencias del dueño. Ewok, Grogu y BB-8 ya son especies (ver abajo). El bantha y el
  tauntaun son los menos fieles: un sprite de 32 px solo captura los rasgos principales.
- Tutorial: los pasos de panel abren el panel; con una hoja abierta no se oscurece nada encima (`.tuto.quiet`), la hoja se
  acorta (`body.tuto-sheet`) y la tarjeta de Tomás va arriba. El paso del mapa viaja al mapa y al terminar se vuelve al
  corral. Antes el recuadro iluminado dejaba el panel opaco.
- Derechos: nombres y criaturas de Star Wars son de Lucasfilm/Disney. Aviso en el README; si el sitio es público conviene
  mantenerlo privado o sustituir los nombres.

## Ewok, Grogu y BB-8 como animales
- Se suman a la Estación (capacidad 12): ewok (380, come bayas), Grogu (600, ración estelar) y BB-8 (560, «aceite brillante»,
  comida nueva). Productos: hilo peludo, chispa verde y tuerquita. Se conocen al cobrar `c8-leche` (la escena
  «Tres visitantes» los presenta) y se compran y crían como el resto. 3 secundarias y 3 charlas de visita.
- El dueño confirmó que el sitio es privado, sin acceso externo y sin fines de lucro.

## Mao Mao reemplaza a la Dra. Pita en la Veterinaria
- Mao Mao es la boticaria del pueblo vecino (inspirada en el personaje de «Los diarios de la boticaria»; sitio privado y sin fines
  de lucro, según el dueño). Retrato pixel art chibi de gato con 3 expresiones, id `mao`.
- Lore: la Dra. Pita se va a un congreso de veterinaria al terminar el festival (escena `una-boticaria-nueva`, `fin:c5-festival`)
  y deja la Veterinaria a Mao Mao. Desde el capítulo 6 solo hablan y visitan Mao Mao; Pita sigue en los capítulos 1 a 5
  (sus visitas llevan `maxCh: 5`) y deja «notas» en sus secundarias. El panel de la Veterinaria lo dice según el capítulo.
- Descartado a propósito: la versión humana y la versión ilustrada suave de Maomao (pruebas fuera del proyecto).

## Criadero y dinosaurios a la venta
- Criadero: lugar único del mapa (arriba a la izquierda), se abre al llegar al capítulo 2 y cuesta 300. Cupos = parejas a la vez
  (1 a 5 según el nivel 0 a 4; mejorar cuesta 400, 800, 1500 y 2500). Cada cupo pasa de nido (la mitad del tiempo de cría de la
  especie) a huevo en incubadora (un tiempo de cría); cada nivel quita un 10 % de tiempo y suma un 1,5 % de mutación.
  «Darle calor»: −20 % del tiempo total, hasta 3 veces por huevo y con 30 s de enfriamiento.
- Los padres en el nido están ausentes: no se dibujan, no se tocan, no crían solos y su hambre y ánimo quedan en pausa. Cada cupo
  reserva el lugar de su cría en el corral. Sin conexión, el tiempo sobrante pasa de una fase a la siguiente.
- Cría automática por defecto (nada cambia para partidas existentes); un corral puede ponerse en «manual» (Animales).
- Decisiones tomadas sin preguntar: se abre en el capítulo 2 con monedas; valen todas las especies (dinosaurios y Estación);
  el hambre se pausa en el nido. Guardado: sin subir `VERSION`; campos nuevos con valor por defecto y validación que libera a
  los ausentes si su cupo no cuadra.
- Dinosaurios: tenían `price: null` y la Tienda solo lista especies con precio, por eso no aparecían. Ahora cuestan 700
  (carnotauro), 750 (spinosaurus), 800 (triceratops y estegosaurio), 850 (pterodáctilo) y 900 (plesiosaurio).
- Pendiente de la lista original: cuidados nuevos (cepillar, jugar, bañar), remedios de Mao Mao y ficha de cría con el álbum de colores.

## Actualización automática
- `tools/build-web.mjs` escribe `dist/version.json` con `CF_PAGES_COMMIT_SHA` (o la hora). `_headers` lo marca `no-cache`.
- El juego guarda la versión con la que abrió y la compara cada 5 min, al volver a la pestaña y al recuperar la red. Si cambió,
  espera un momento tranquilo (`ui.busy()` falso), guarda y recarga. Una marca en `sessionStorage` evita recargar en bucle.
- Límite: un dispositivo que ya tenga abierta una versión anterior a esta necesita **una** recarga manual para recibir el
  actualizador; desde ahí se actualiza solo.
