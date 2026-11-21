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
| Pruebas unitarias | `npm test` (deben pasar todas; hoy 117) |
| Regenerar sprites | `npm run sprites` (Python + Pillow; escribe `assets/sprites/*`) |
| Recorrido en navegador | `python tools/e2e_smoke.py <carpeta_capturas>` (Playwright + Chrome; hoy 157 comprobaciones) |

Tras un cambio visible, recarga con Ctrl+F5. El servidor local envía `Cache-Control: no-store`.
Con `?debug` en la URL queda disponible `window.farmweb = { app, sim, audio }`.

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
historia hasta el Capítulo 5, secundarias en paralelo con Historial, 8 secretos, conejo y pato.
Detalle y decisiones en `docs/NOTAS_MEJORAS_NOCTURNAS.md`.

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
