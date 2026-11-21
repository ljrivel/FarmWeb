# FarmWeb v2: un juego de granja con cuidado profundo, pedidos y pueblo

Estado: **borrador para aprobación**. Nada de este documento está construido todavía.
Convención: lo marcado **[tuyo]** lo decidió el usuario; lo marcado **[mi llamada]** lo propuse yo y se puede cambiar.

## 1. Intención y por qué

La base actual (v1) funciona, pero el usuario la siente básica, repetitiva y con una historia cansada. Todo el juego es un verbo repetido: dar de comer, recoger, vender. Las 15 misiones son contadores en fila y los animales solo tienen saciedad y felicidad.

Quiere algo más completo y más interactivo: animales que se enfermen y se reproduzcan, varios corrales, misiones secundarias y una historia más creativa. Las referencias que dio son **Stardew Valley** y **Hay Day**.

Éxito, en palabras del usuario: que no se sienta repetitivo. En la práctica, que en una sesión de 10 minutos haya varias cosas distintas que hacer, y que haya razones para volver mañana (un pedido, un evento, un animal enfermo, un personaje con algo que contar).

## 2. Metas, no-metas, anti-metas

**Metas**
- Varios corrales con necesidades propias.
- Animales con vínculo, enfermedades y curas, y crianza con sentido.
- Producción encadenada en puestos (Hay Day) y tablero de pedidos de vecinos.
- Pueblo con personajes, diálogos y arcos propios (Stardew) y calendario con clima, estaciones y eventos.
- Misiones de historia, secundarias y pedidos, que reaccionen a lo que pasa en la granja y no solo cuenten acciones.
- Sigue siendo tierno (kawaii), familiar, jugable en celular y PC desde el navegador.

**No-metas (por ahora)**
- Multijugador y cuentas en la nube. El guardado es local **[tuyo]**.
- Mundo grande con personaje caminando y cámara (opción B descartada) **[tuyo]**.
- Sonido y música (fase final, opcional).

**Anti-metas** (fracasos aunque "funcione")
- Que un animal muera o que se pierda progreso por no jugar. Las enfermedades frenan, no castigan.
- Que perderse un evento de calendario bloquee la historia: los eventos vuelven el año siguiente.
- Que la interfaz se vuelva un tablero de muchos paneles ilegible en celular.
- Que se rompa el mundo guardado actual del usuario.

## 3. Restricciones

- JavaScript con módulos ES y Canvas 2D, sin dependencias ni paso de compilación (como v1). En este entorno no se pueden instalar paquetes.
- Lógica de juego pura y determinista (`tick(w, dt)`, aleatorio con semilla en el mundo), para probarla con `node:test` y poder moverla a un servidor más adelante.
- El mundo de v1 debe migrar a v2 sin pérdida (animales, monedas, mejoras, misiones reclamadas).
- Pixel art propio, generado por `tools/gen_sprites.py`.
- Interfaz de pantalla vertical de celular primero, con diseño ancho para PC.
- El usuario exige plan aprobado antes de implementar, verificación por etapa y no afirmar que algo funciona sin probarlo.

## 4. Enfoques considerados

| | Qué es | Costo / riesgo |
|---|---|---|
| **A (elegido) [tuyo]** | Una escena por lugar (corrales, veterinaria, mercado, pueblo) y un mapa para viajar. Todo se hace tocando. | Reutiliza el dibujo y la simulación actuales. Se pierde el paseo libre. |
| B | Mundo grande con personaje, cámara, colisiones y joystick. | Varias veces más trabajo y torpe en pantalla táctil. |
| C | Como A, con un granjero visible en cada escena que camina hacia donde tocas. | Mejora visual posterior sin cambiar la arquitectura. |
| Framework (Phaser) | Motor de juego con escenas y tilemaps. | No se puede instalar aquí y obliga a reescribir la simulación y las 29 pruebas. Descartado. |

## 5. Tiempo **[tuyo]**

Mezcla de ambos referentes:
- **Tiempo real (Hay Day):** crecimiento, producción, crianza, enfermedades, puestos y mejoras con temporizador avanzan aunque se cierre la página, con el mismo tope de 8 horas fuera que ya existe.
- **Calendario propio del juego (Stardew):** días, estaciones, clima, eventos con fecha y diálogos.

**[mi llamada]** El calendario es acelerado: 1 día = 15 min reales y 1 estación = 7 días (≈ 1 h 45 min). El año dura ≈ 7 h reales. Son constantes en `data.js`. El calendario avanza con el mismo `dt` que el resto, así que fuera de línea avanza como máximo 8 h, igual que todo lo demás.

## 6. Diseño

### 6.1 Escenas y navegación
- **Mapa de la granja:** pantalla con los lugares como puntos tocables. Los lugares bloqueados se ven en silueta con su requisito.
- **Escenas:** cada corral, la veterinaria, el mercado, la casa con tablero de pedidos y el pueblo tienen su fondo y su lógica de toque.
- **Barra inferior [mi llamada]:** Mapa, Lugar actual, Pedidos, Mochila, Cuaderno. El selector de animal es una tarjeta, como hoy.
- **Encabezado fijo:** monedas, día y estación, clima, hora del día.

### 6.2 Corrales **[mi llamada]**
Un corral es `{ id, tipo, nombre, nivel, capacidad, mejoras }`. Tipos iniciales:
- **Pradera** (ya existe): gallinas, gatos, vacas, chanchitos.
- **Bosque:** mapaches.
- **Estanque:** ajolotes y spinosaurus.
- **Jurásico:** carnotauros, desbloqueado por la historia.

Se compran y mejoran con monedas y materiales. Cada animal pertenece a un corral y solo puede estar en uno compatible. Mover un animal entre corrales cuesta un poco de tiempo (viaje corto).

Mejoras de corral: ampliar capacidad, techo (protege del frío y la lluvia), bebedero, nido (crianza). Cada mejora tarda en construirse, en tiempo real.

### 6.3 Cuidado y vínculo **[mi llamada]**
- Cada animal gana **corazones de amistad (0 a 5)** con mimos, su comida favorita y regalos. Los corazones afectan la producción, la crianza y los diálogos.
- Tareas de cuidado más variadas que dar de comer: limpiar el corral, cepillar, bañar y llenar el bebedero. Un corral descuidado sube el riesgo de enfermedad.
- Al nacer una cría, el jugador le pone nombre.

### 6.4 Enfermedades y veterinaria **[mi llamada]**
Cuatro enfermedades, cada una con causa y cura, para que haya que mirar al animal y decidir:

| Enfermedad | Causa | Cura |
|---|---|---|
| Resfriado | Frío o lluvia con el corral sin techo | Manta y té de manzanilla |
| Pancita | Comida que no le gusta varias veces, o mucho hambre | Caldito de hierbas |
| Pulgas | Corral sucio | Baño |
| Tristeza | Poco cariño o corral muy lleno durante días | Mimos seguidos y un regalo |

Reglas:
- Un animal enfermo no produce, no crece y no cría. **Nunca muere ni se va**.
- Se contagia a otros del mismo corral si no se aísla. La **enfermería** de la veterinaria lo aísla.
- Las curas se cocinan en la veterinaria (Dra. Magnolia) o se compran. Hay un botiquín en la mochila.
- Fuera de línea: nadie se enferma en la primera hora, como máximo uno por corral, y al volver se avisa. Es un aviso, no un castigo.

### 6.5 Cría **[mi llamada]**
Sigue habiendo parejas de la misma especie con herencia de color, mutación y brillantes (como v1). Cambia que hace falta un corral con **nido**, espacio libre y al menos 1 corazón con el cuidador. Un huevo o cría ocupa espacio, así que la cría se planifica.

### 6.6 Producción y economía (Hay Day) **[mi llamada]**
- **Puestos de producción** con cola y temporizador en tiempo real: Quesería (leche), Telar (pelusa), Cocina (huevo y bayas).
- Recetas que se desbloquean por nivel de granja o por amistad.
- **Mejoras con temporizador** (construir, ampliar), con la opción de acelerar con monedas.
- **Mercado:** vender directo, a precio variable según estación.
- **Tablero de pedidos:** 6 espacios. Cada pedido viene de un vecino, pide 1 a 3 productos y paga monedas, corazones con ese vecino y, a veces, un objeto raro. Se renuevan en tiempo real.

### 6.7 Calendario y clima **[mi llamada]**
- Estaciones: primavera, verano, otoño, invierno. Cada una cambia fondos, qué se produce mejor y el riesgo de enfermedad.
- Clima por día, determinista a partir de la semilla y el día: soleado, nublado, lluvia, tormenta y nieve (solo invierno).
- Eventos con fecha, cada uno una escena corta con diálogos y una pequeña actividad:
  - Primavera: Día de la Siembra.
  - Verano: Noche de las Luciérnagas.
  - Otoño: Feria de los Animales (concurso con los animales más queridos).
  - Invierno: Festival de las Nieves.
- Un evento perdido no bloquea nada: vuelve el año siguiente.

### 6.8 Personajes y misiones secundarias **[mi llamada]**
Seis personajes iniciales con corazones propios (0 a 5) y diálogos que cambian según estación, clima y corazones:
- Abuela Cosi: cartas y la historia de fondo.
- Dra. Magnolia: veterinaria.
- Don Pancho: mercader y tablero de pedidos.
- Mica: exploradora que busca dinosaurios.
- Rufo: pescador del río.
- Tomás: cartero, reparte noticias y eventos.

Cada uno tiene un **arco personal de 3 escenas** con decisiones. Una decisión cambia el diálogo y la recompensa, pero no bloquea el avance. Esas son las misiones secundarias.

### 6.9 Historia y motor de misiones **[mi llamada]**
- Los 4 capítulos actuales se rehacen y se agrega un quinto. La historia deja de ser una fila de contadores y pasa a ser una trama con personajes y fechas.
- El motor de misiones pasa de contadores a **condiciones**: curar a un animal, entregar un pedido, tener N corazones con alguien, construir algo, asistir a un evento, tener una especie en una estación. Se pueden combinar.
- Tipos: historia (cadena), secundarias (arcos de personajes), pedidos (tablero), desafíos de temporada.
- **Cuaderno de la abuela:** colección de especies, colores, brillantes y curas, con recompensas por completar páginas.

### 6.10 Arquitectura y datos
- Mundo **versión 2**: `corrales[]`, `animal.corral`, `animal.hearts`, `animal.sick`, `edificios[]`, `pedidos[]`, `calendario { dia, acumulado }`, `clima`, `personajes { corazones, banderas }`, estado de misiones por condiciones.
- **Migración 1→2:** todos los animales pasan al corral Pradera; si había estanque, se crea el corral Estanque; las ampliaciones suben la capacidad de la Pradera; las misiones reclamadas se conservan.
- `validateWorld` sigue siendo lista blanca y se amplía. La importación acepta archivos v1 y v2. Guardado local y descarga siguen igual **[tuyo]**.
- Módulos nuevos: `calendar.js`, `corrales.js`, `health.js`, `orders.js`, `buildings.js`, `npcs.js`, `dialogue.js`. `sim.js` sigue siendo el núcleo de reglas.
- `render.js` dibuja una escena indicada por el estado. `ui.js` suma el mapa, el cuadro de diálogo y la tarjeta de pedido.
- Arte nuevo (lo genera `gen_sprites.py`): fondos de escena por corral y estación, edificios, retratos y figuras de personajes, iconos de enfermedades y curas, superposiciones de clima. La interfaz se diseña con la skill Impeccable y se revisa con capturas.

## 7. Fases (cada una termina jugable y probada)

1. **Fundación:** mundo v2 y migración, escenas, mapa, compra de corrales y animales por corral. Se guarda y se carga igual que antes.
2. **Cuidado profundo:** corazones, enfermedades, veterinaria y curas, limpieza, nido y cría mejorada.
3. **Economía:** puestos de producción, tablero de pedidos, mejoras con temporizador y mercado.
4. **Pueblo y calendario:** calendario, clima, personajes, cuadro de diálogo y eventos.
5. **Historia y misiones:** motor por condiciones, arcos personales, capítulos 1 a 5, cuaderno.
6. **Pulido:** balance, sonido opcional, instalable (PWA) y publicación en línea.

## 8. Cómo se verifica

- Pruebas de `node:test` por módulo de reglas, incluida una prueba de migración con un mundo v1 real del usuario.
- Prueba de simulación larga: avanzar 8 h y comprobar que nada se rompe (sin NaN, sin muertes, topes cumplidos).
- Prueba e2e con Playwright en móvil (390×844) y PC (1280×800), con capturas que reviso una por una.
- Cada fase se entrega con lo que se probó y lo que no.

## 9. Riesgos

- **Alcance:** es mucho contenido; por eso las fases jugables.
- **Balance:** tiempos, precios y probabilidades por intuición hasta que se jueguen. Todo vive en `data.js`.
- **Textos:** diálogos y misiones en español que escribo yo; el usuario debe revisarlos.
- **Pantalla pequeña:** muchas funciones en una interfaz de celular. Se mitiga con la barra inferior y el mapa como centro.

## 10. Qué queda para el constructor

- Valores de balance exactos y duraciones.
- Redacción final de diálogos, nombres de recetas y de cada evento.
- Diseño visual de cada escena y personaje dentro del estilo kawaii existente.
