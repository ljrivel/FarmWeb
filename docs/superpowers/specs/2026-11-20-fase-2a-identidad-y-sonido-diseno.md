# FarmWeb Fase 2A: identidad de los animales y sonido

Continúa el [diseño v2](2026-11-20-farmweb-v2-diseno.md). Aprobado por el usuario en la conversación (22:23): nombres, colores raros con probabilidades como el shiny de Pokémon, y sonidos.

## 1. Intención

Que cada animal se sienta **tuyo** (le pones y le cambias el nombre), que criar tenga **emoción** (a veces nace un color raro) y que el juego **suene** tierno. Es la primera de tres entregas de la fase 2: 2A identidad y sonido, 2B cuidado profundo (corazones, enfermedades, veterinaria), 2C misiones simultáneas con historial aparte.

## 2. Metas, no-metas, anti-metas

- **Metas:** poner y cambiar nombres; 4 colores por especie más un look brillante propio; probabilidades claras y fáciles de ajustar; efectos de sonido y voces de animales, con silencio y volumen a mano.
- **No-metas:** música de fondo, cuaderno de colores descubiertos (fase 5), enfermedades y corazones (2B), misiones (2C).
- **Anti-metas:** sonido que molesta (fuerte, repetitivo, antes de que el jugador toque algo); rareza que solo se distingue por color (siempre hay texto); romper partidas guardadas; que un nombre inserte HTML.

## 3. Enfoques considerados

**Colores.** A) 2 comunes + 1 poco común + 1 raro + brillante, con la rareza por índice de color *(elegido: simple, probabilidades visibles, arte acotado)*; B) muchos colores sin rareza (menos emoción); C) genes mezclables (potente pero difícil de explicar y de probar).

**Sonido.** A) Web Audio sintetizado en el navegador, sin archivos *(elegido: cero dependencias, carga instantánea, se prueba sin oído)*; B) archivos de audio (más ricos, pero no puedo grabarlos ni licenciarlos aquí); C) sin sonido.

## 4. Diseño

### Colores y rarezas
Índice de color = rareza: `0, 1` comunes (los de hoy), `2` poco común, `3` raro. El brillante es aparte (`shiny`) y tiene su propia paleta por especie. Atlas: 8 especies x (4 colores + brillante) x 2 etapas = **80 filas**.

| Color | Gallina | Gato | Vaca | Mapache | Chanchito | Ajolote | Carnotauro | Spinosaurus |
|---|---|---|---|---|---|---|---|---|
| Poco común | Durazno | Siamés | Fresa | Rojizo | Chocolate | Menta | Lavanda | Naranja |
| Raro | Lavanda | Medianoche | Galaxia | Nieve | Algodón | Medianoche | Medianoche | Violeta |

Probabilidades (en `BALANCE`, en `src/data.js`):
- Tienda y regalos de historia: solo colores comunes.
- Cría: 85 % hereda el color de un padre; 15 % muta: 70 % de las mutaciones poco común y 30 % raro (10,5 % y 4,5 % del total). Una línea rara se conserva criando padres raros.
- Brillante: 2 % al nacer, 15 % si un padre es brillante (como hoy).

### Nombres
Cada animal tiene `named`. Comprar o recibir un animal abre un diálogo «Ponle nombre» con un nombre sugerido. Las crías que nacen se quedan con el sugerido y `named:false` (la tarjeta muestra «Ponle nombre»). «Cambiar nombre» está siempre en la tarjeta. Nombre limpio: sin caracteres de control, espacios colapsados, máximo 24 caracteres (no corta un emoji por la mitad). Siempre se muestra como texto. Partidas anteriores cargan con `named:true`; el formato de mundo sigue en v2.

### Sonido
`src/audio.js`, Web Audio sin archivos. Cada sonido es una lista de notas (osciladores y ruido filtrado) y un motor que las programa. 20 efectos (tocar, mimo, comida, recoger, vender, comprar, construir, ampliar, misión, nacer, huevo, crecer, nombre, raro, brillante, aviso, mapa, abrir, cerrar) y una voz por especie al mimar o seleccionar. Reglas: no suena hasta el primer toque del jugador; tope de voces simultáneas y de repeticiones; se suspende con la pestaña oculta; volumen y silencio se guardan **por dispositivo** en `farmweb:audio:v1` (no van en el archivo del mundo); sin soporte de audio todo es un no-op.

## 5. Qué queda para el constructor

Los colores exactos de las paletas nuevas (pastel, distintos entre sí y de los comunes, revisados en capturas) y la forma de cada nota de sonido (suave, graves discretos, ganancia baja).

## 6. Cómo se verifica

Pruebas de Node: distribuciones con miles de nacimientos, nombres hostiles, filas de arte, notas de sonido válidas y el motor con un `AudioContext` falso. Navegador real: diálogos y capturas a 390, 360 y 1280 px; cada sonido renderizado con `OfflineAudioContext` (no vacío, sin NaN, sin saturar). **No se puede comprobar de oído**: el jugador debe confirmar cómo suena.
