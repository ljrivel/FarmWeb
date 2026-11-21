# Plan de mejoras nocturnas (sin supervisión)

Base: `main` con la Fase 2A (88 pruebas en verde, e2e de 112 comprobaciones en «Todo bien.»).
Arquitectura que se respeta: datos en `src/data.js`, reglas puras y deterministas en `src/sim.js`
(con `w.rng`), misiones en `src/quests.js`, validación de archivos en `validateWorld` (`src/state.js`),
DOM sin innerHTML en `src/ui.js`, dibujo en `src/render.js`, conexión de eventos y sonido en `src/main.js`,
arte generado por `tools/gen_sprites.py`. Formato del mundo: se mantiene **VERSION 2**; todo campo nuevo
entra con valor por defecto en `validateWorld` (como `named`).

Verificación de cada etapa: `npm test` + `python3 tools/e2e_smoke.py /tmp/capturas` («Todo bien.») y
revisión de las capturas que cambien. Un commit por etapa o sub-paso.

## Etapa 0 — Pendientes de la 2A
| Arreglo | Archivo | Prueba |
|---|---|---|
| `play`/`voice` nunca lanzan; `build()` a medias deja `ctx = null` | `src/audio.js` | `tests/audio.test.mjs` (contexto falso que lanza) |
| Aviso de nacimiento solo abre si `sim.find(app.w, a.id) === a` | `src/main.js` | e2e (no hay DOM en Node): se extrae `sameAnimal` a `sim.js` y se prueba en Node |
| Enter no guarda durante composición (`!e.isComposing`) | `src/ui.js` | revisión + e2e |
| `closeSheet` devuelve el foco a la barra si el elemento ya no existe | `src/ui.js` | e2e |
| Versión del atlas: `version` en `animals.json` y `?v=` en la imagen | `tools/gen_sprites.py`, `src/render.js` | `tests/art.test.mjs` |
| Varios nacimientos en el mismo segundo → «¡Nacieron N crías!» | `src/main.js` (función pura `hatchToast` en `sim.js`) | Node |

Riesgo: bajo. El e2e cubre que nada se rompa.

## Etapa 2B — Cuidado profundo (sub-plan)
Sub-pasos (un commit cada uno):
1. **Reglas** (`data.js`, `state.js`, `sim.js`, pruebas primero): campos `hearts` (0..5, por defecto 0),
   `love` (progreso al siguiente corazón), `loveDay`/`loveToday` (tope diario), `sick` (`null` o id de
   enfermedad), `sickT` (tiempo acumulado de cuidados para curarse solo), `sadT`/`hungryT` (tiempo sostenido
   de felicidad baja / hambre). `tick(w, dt, { offline })`: sin conexión no hay contagio ni pérdida de corazones
   ni curación espontánea que empeore; enfermo no produce, no crece, no cría. `cure(w, id)` cobra
   `BALANCE.cureCost[enfermedad]`. Bonus: `+heartProdBonus` por corazón a la producción (tope 5 × 4 % = 20 %).
2. **Interfaz**: corazones con texto accesible («Corazones 3 de 5») en tarjeta y panel Animales;
   icono y texto de enfermedad en el dibujo, la tarjeta y el panel. Sonidos `heart`, `sick`, `cure`.
3. **Veterinaria**: lugar nuevo en el mapa (sprite 48×48 propio), siempre disponible (no es un corral, no
   cuenta para las metas de corrales), hoja con la lista de enfermos y botón «Curar (N monedas)».
   e2e: ver corazones, forzar enfermedad con `?debug`, ir a la Veterinaria, curar, sin errores, móvil y PC.
Riesgos: economía (no se puede validar jugando → queda anotado), determinismo (todo con `w.rng`),
compatibilidad (pruebas con el fixture v1 y con un mundo 2A sin campos nuevos).

## Etapa a — Historia
Reescritura suave de los textos de los capítulos 1–4 (mismos `id`, mismas metas, para no romper guardados)
con diálogos de personajes, y **Capítulo 5 «Festival de la granja»** con giro y final coherente.
Archivos: `data.js` (QUESTS, CHAPTERS, CHARACTERS), `ui.js` (quién habla). Riesgo: medio-bajo; las pruebas de
`quests.test.mjs` usan los ids existentes.

## Etapa b — Misiones secundarias en paralelo
`SIDE_QUESTS` en `data.js` con `minCh` (capítulo desde el que aparecen); se guardan en `w.quests.side`
(mapa de reclamadas, validado por id). Metas con el mismo `progress()` de `quests.js`, pero contadas desde
una **línea base** tomada al aparecer la misión (`w.quests.base[id]`), para que no salgan completas de golpe.
`claimSide(w, id)`. Panel Misiones: Historia, Secundarias activas e **Historial** aparte (plegable).

## Etapa c — Easter eggs
Secretos discretos guardados en `w.secrets` (validado por id) y un contador «Secretos x/N» en Misiones:
nombres especiales, tocar muchas veces el cartel del mapa, código Konami, etc.

## Etapa d — Contenido
Dos especies nuevas con 4 colores + brillante + voz + sprites: **conejo** (Pradera) y **pato** (Estanque).
Comida/productos nuevos con iconos. Personajes nuevos (`CHARACTERS`) con rol en historia y secundarias.
Pruebas de arte/sonido actualizadas (filas del atlas, voces).

## Etapa e — Visual
Ajustes de CSS: sombras y transiciones suaves en botones, aparición escalonada de filas, tipografía y
espaciado del panel Misiones, todo desactivado con `prefers-reduced-motion`.
