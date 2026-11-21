# FarmWeb — Documento de diseño (v0.1, con las fases 1, 2A y 2B de la v2 ya hechas)

> **Estado de la v2.** El rumbo actual está en [`docs/superpowers/specs/2026-11-20-farmweb-v2-diseno.md`](superpowers/specs/2026-11-20-farmweb-v2-diseno.md) (mezcla de Hay Day y Stardew Valley, un jugador por ahora) y su plan por fases. **Fase 1 hecha:** varios corrales, mapa y formato de mundo v2 con migración. **Fase 2A hecha:** nombres de animales, colores raros y brillantes, y sonido (diseño en [`docs/superpowers/specs/2026-11-20-fase-2a-identidad-y-sonido-diseno.md`](superpowers/specs/2026-11-20-fase-2a-identidad-y-sonido-diseno.md)). **Mejoras nocturnas (21-11):** cuidado profundo (2B), secundarias en paralelo con historial (lo que era la 2C), historia completa con capítulo 5, secretos, conejo y pato; detalles y decisiones en [`NOTAS_MEJORAS_NOCTURNAS.md`](NOTAS_MEJORAS_NOCTURNAS.md). Este documento sigue describiendo la base; donde dice «una granja» o «ampliaciones», hoy son corrales con nivel (capacidad = base del tipo + 4 por nivel). Las secciones de multijugador y nube (5 y 8) quedan en pausa por decisión del usuario.

Nombre de trabajo: **FarmWeb**. Juego de granja **familiar y tierno** (hasta 4 jugadores), en el navegador de móvil y PC, con pixel art propio.

## 1. Pilares

1. **Ternura primero.** Estética *kawaii*: formas redondas, ojos grandes con brillo, mejillas rosadas, paleta pastel, contornos suaves (nunca negro puro).
2. **Familiar y cooperativo.** Un mundo compartido por hasta 4 personas. Sin competencia ni castigos duros: los animales nunca mueren; como mucho se ponen tristes o se enferman un rato, y siempre hay una salida gratis (cuidarlos en casa).
3. **Sesiones cortas.** El tiempo corre aunque no estés (con tope de 8 h), así que abrir el juego siempre trae algo que recoger.
4. **Tu mundo es tuyo.** Se guarda en línea y también se puede **descargar a un archivo** y volver a cargar.

## 2. Los animales (8 iniciales + 2 nuevos)

| Animal | Tipo | Comida favorita | Produce | Notas |
|---|---|---|---|---|
| Gallina | Granja | Grano | Huevo | Primera en cría; la protagonista del tutorial |
| Gato | Granja | Pescadito | Pelusa | Sube la felicidad de los vecinos cercanos |
| Vaca | Granja | Heno | Leche | Produce más pero come más |
| Mapache | Bosque | Bayas | Brillito (objeto brillante) | Aparece tras el capítulo 1 |
| Chanchito | Granja | Bayas | Trufa | Producción lenta, valor alto |
| Ajolote | Agua | Gusanitos | Burbuja | Necesita estanque |
| Carnotauro | Dinosaurio | Carnita | Escama de fuego | Llega por la historia (capítulo 3) |
| Spinosaurus | Dinosaurio | Pescadito | Escama de río | Necesita estanque; llega por la historia (capítulo 4) |
| Conejo | Bosque | Zanahoria | Lanita | Se conoce con la secundaria «Huellitas en el bosque» (cap. 2) |
| Pato | Agua | Grano | Pluma | Estanque; se conoce con la secundaria «Un pato perdido» (cap. 3) |

Cada especie tiene **4 colores** y un **brillante** aparte. El orden del color es su rareza: 0 y 1 comunes, 2 poco común, 3 raro (p. ej. gallina blanca/marrón/durazno/lavanda, gato naranja/gris/siamés/medianoche). La tienda y los premios solo dan colores comunes; los otros salen de las crías (mutación) y el brillante de un huevo con poca probabilidad. Los valores están en `BALANCE` de `src/data.js`.

## 3. Sistema de juego

### Necesidades y felicidad
- **Hambre** (0–100): baja con el tiempo; al alimentar sube. Comida favorita rellena más y da bonus de felicidad.
- **Felicidad** (0–100): sube con comida favorita, caricias (tocar al animal) y espacio suficiente; baja con hambre y hacinamiento.
- Un animal triste produce más lento. Nunca muere.
- **Corazones** (0–5): suben con caricias y comida favorita (tope diario de cariño) y bajan despacio solo si está descuidado con el juego abierto. +4 % de producción por corazón.
- **Enfermedades** (resfriado, pancita, pulgas, tristeza): solo con el juego abierto y con baja probabilidad (la tristeza y la pancita, tras felicidad baja o hambre sostenidas). El enfermo no produce, no crece ni cría. Se cura solo con cuidados en casa o en la **Veterinaria** del mapa por monedas. Sin conexión nadie enferma ni empeora. Valores en `BALANCE`.

### Crecimiento
`Bebé → Adulto`. Los bebés no producen. El tiempo de crecimiento depende de la especie (los dinos tardan más).

### Producción
Cada adulto feliz genera su producto cada cierto tiempo. Aparece una burbuja sobre el animal; se toca para recolectar. Los productos se venden por monedas.

### Reproducción
Dos adultos **de la misma especie**, con hambre < 60 y felicidad ≥ 60, y con espacio en la granja, inician una cría. Tras un tiempo de incubación nace un bebé.
- **Herencia de color simple:** la cría hereda el color de uno de los padres al azar.
- **Mutación:** pequeña probabilidad de cambiar de color.
- **Brillante (shiny):** probabilidad rara; se ve con destellos y vale más.
- Los híbridos entre especies quedan fuera de la v1.

### Economía
Monedas, comida (se compra), productos (se venden), corrales (se construyen y se amplían hasta el nivel 4; el Jurásico llega por la historia). Los precios están en `src/data.js` para balancear fácil.

### Tiempo
Se calcula con marcas de tiempo (`Date.now()`) y un generador aleatorio con semilla guardado en el mundo. Al volver, se simula lo ocurrido hasta **8 horas**. Esto hace la simulación determinista, fácil de probar y trasladable al servidor.

## 4. Historia y misiones

La abuela Cosi dejó la granja a la familia con una carta y un cuaderno de animales por descubrir.

- **Cap. 1 — La granja de la abuela:** tutorial. Alimentar, recolectar huevos, comprar un gato, criar la primera gallinita.
- **Cap. 2 — Amigos del bosque:** llegan el mapache y el chanchito; se construye el estanque y llega el ajolote.
- **Cap. 3 — El huevo misterioso:** tras una tormenta aparece un huevo enorme. Nace un carnotauro bebé.
- **Cap. 4 — El río perdido:** una pista en el cuaderno lleva al spinosaurus.
- **Cap. 5 — El festival de la granja:** el pueblo celebra el festival en la granja; una carta del río revela que la abuela cuidaba los últimos nidos de dinosaurios y mandó el huevo con la tormenta; al final vuelve para el festival y deja la granja a la familia. Epílogo.

Personajes (`CHARACTERS`): abuela Cosi, Tomás (vecino), Dra. Pita (veterinaria), Don Ramón (comerciante), Lía (guía del río), Mía (hermanita de Tomás) y Bruno (cartero). Cada misión dice quién habla.

**Secundarias** (`SIDE_QUESTS`): varias activas a la vez, aparecen según el capítulo y las especies conocidas, y sus contadores empiezan al aparecer. Lo completado va al **Historial** de *Misiones*. **Secretos** (`SECRETS`): 8 easter eggs con logros. Todo son datos en `src/data.js`.

## 5. Multijugador familiar (hasta 4)

- Un **mundo** pertenece a una familia. Cada persona tiene su cuenta (correo) y se une con un **código de invitación**.
- Máximo 4 miembros por mundo (se hace cumplir en la base de datos).
- Cooperativo: todos ven y cuidan los mismos animales; el progreso de historia es compartido.
- Sincronización simple: el estado del mundo se guarda en la nube cada pocos segundos y al cerrar; se refresca al abrir. Si dos personas juegan a la vez, gana el último guardado de cada animal por marca de tiempo. Tiempo real fino queda para una versión posterior.

## 6. Guardado y exportación

Tres capas:
1. **Local (ya implementado):** `localStorage`, guardado automático.
2. **Archivo (ya implementado):** botón *Descargar mundo* genera `*.farmweb.json` con formato versionado y suma de verificación. *Cargar mundo* lo valida (formato, versión, checksum, límites) antes de reemplazar el actual. Se pide confirmación porque reemplaza el mundo.
3. **Nube (fase siguiente):** Supabase. El cliente ya guarda a través de una interfaz (`src/storage.js`) para enchufar la nube sin tocar el juego.

## 7. Arquitectura

```
index.html, styles.css          Interfaz (HTML + Canvas)
src/data.js                     Especies, comidas, productos, tipos de corral, mapa, misiones (solo datos)
src/migrate.js                  Pasa un mundo v1 al formato v2 (función pura)
src/rng.js                      Aleatorio con semilla
src/state.js                    Mundo nuevo, validación, exportar/importar, progreso offline
src/sim.js                      Reglas: necesidades, crecimiento, producción, cría
src/quests.js                   Progreso de misiones de historia y secundarias
src/storage.js                  Guardado local y archivo (interfaz para la nube)
src/render.js                   Dibujo en Canvas por escena (mapa y cada corral), animación de sprites
src/ui.js                       Paneles: animales, tienda, mochila, misiones, mundo
src/main.js                     Bucle principal
assets/sprites/                 Atlas de animales, iconos, tiles y lugares del mapa (generados)
tools/gen_sprites.py            Generador del pixel art (Python + PIL)
tests/                          Pruebas de la lógica (node --test)
```

Sin dependencias ni paso de compilación: se publica tal cual en Cloudflare Pages. Si el proyecto crece, migrar a Vite/Phaser es posible porque la lógica (`state`, `sim`, `quests`) no depende del dibujo.

## 8. Modelo de datos en la nube (propuesto, **no ejecutado**)

```sql
profiles(id uuid pk -> auth.users, display_name text)
worlds(id uuid pk, name text, invite_code text unique, owner uuid, state jsonb, updated_at timestamptz)
world_members(world_id -> worlds, user_id -> profiles, role text, primary key(world_id, user_id))
-- disparador: máximo 4 filas por world_id
-- RLS: solo miembros leen/escriben su mundo
```

Para empezar, el estado completo del mundo vive en `worlds.state` (jsonb). Normalizar animales a tablas propias solo hará falta si se necesitan consultas entre mundos. Antes de crear nada en Supabase se pedirá aprobación.

## 9. Arte

- Sprites de **32×32**, animales *chibi* de frente, 4 cuadros de animación en reposo (respirar y parpadear), versión bebé y adulta, 4 colores y brillante por especie (100 filas en el atlas). Cada JSON de sprites lleva un `version` (hash del PNG) que se usa como `?v=` al cargar la imagen.
- Iconos de **16×16** para comida, productos y monedas; tiles de 16×16.
- Todo se genera con `tools/gen_sprites.py`, así que ajustar colores o formas es rehacer el script. Vista previa: `docs/preview-sprites.png`.
- Paleta pastel cálida con fondo crema; contorno de cada sprite = tono oscuro de su propio color.

## 10. Hoja de ruta

1. **Base (v0.1, hecha):** sprites, granja jugable local, guardado local y por archivo, misiones capítulos 1–4.
2. **Fase 1 de la v2 (hecha):** corrales por tipo (Pradera, Bosque, Estanque, Jurásico), mapa para viajar, formato de mundo v2 con migración y respaldo de los guardados anteriores.
3. **Fase 2A (hecha):** nombres, colores raros y brillantes, sonido sintetizado con volumen y silencio.
4. **Mejoras nocturnas (hechas):** 2B cuidado profundo, secundarias con historial, capítulo 5, secretos, conejo y pato.
5. **Fases siguientes de la v2** (detalle en el diseño v2; aún sin aprobar para empezar): 3 economía (puestos y pedidos) · 4 pueblo y calendario · 5 historia y misiones secundarias · 6 pulido y publicación.
6. Más adelante: cuentas y nube con Supabase + mundo familiar, publicación en Cloudflare Pages, música suave, instalación como PWA.
