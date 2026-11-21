# FarmWeb: guion «La grieta del tiempo» (borrador para aprobar)

Reforma de los dinosaurios: de dónde vienen, un viaje corto al pasado, el **Laboratorio Hélice** y el minijuego de genética
para «replicarlos». Es solo texto y diseño: no hay código hasta que lo apruebes.

## Qué cambia en la historia (y qué no)

- **Dónde va:** en el **capítulo 4** («El río perdido»), justo después de «Un gigante tierno» (`c4-spino`) y antes del festival.
  Es la mitad de la historia, como pediste. Siete misiones nuevas, todas del capítulo 4.
- **No se rompe nada:** ningún `id` ni meta existente cambia. Las misiones nuevas se insertan antes de `c5-invitacion`. A una
  partida que ya pasó esa parte se le marcan como hechas sin premio y el Laboratorio se le abre igual (migración al cargar).
- **Lo ya escrito sigue siendo verdad:** las tormentas, el huevo gigante, el mapa en las escamas, la cinta de Cosi y su carta
  («cuidando los últimos nidos») ahora tienen explicación: **el río perdido no está perdido, está en otro tiempo.**
- **Cosi** no aparece en persona hasta el festival, como estaba decidido: en el pasado solo se encuentra su campamento y una nota.
- **Los dinosaurios** aparecen en la Tienda **después del viaje**, pero comprarlos es «replicarlos» en el Laboratorio con el minijuego.

## La idea en una frase

Hace muchos años Cosi y Lía descubrieron que, en una curva del río, el agua se dobla hacia el pasado. Con cada tormenta se abre
una **grieta** y por ella se cuelan dinosaurios. La familia cruza para cerrarla antes de que lleguen demasiados, y vuelve con
muestras y unos pocos ejemplares: lo bastante para **recrearlos** en un laboratorio.

## Personajes en este tramo

| Quién | Papel |
|---|---|
| **Lía** | Guardiana de la grieta; sabe que el río «se pierde» porque se desliza en el tiempo |
| **Dra. Pita** | Directora del Laboratorio y cerebro del estabilizador |
| **Don Ramón** | Pone el dinero. «No he escatimado en gastos… ni en redondeos» |
| **Tomás y Mía** | Cruzan con la familia; Tomás hace los chistes, Mía dibuja todo |
| **Bruno** | Lleva el correo… y pisa una mariposa |
| **Señor Hélice** | Mascota de dibujos animados del Laboratorio (la hebra de ADN con ojitos) que explica el minijuego |

Noa y Mao Mao llegan en el capítulo 6; desde entonces el Laboratorio lo llevan ellas (ver «Después del festival»).

## Retoques mínimos a escenas ya escritas

Solo dos líneas nuevas, para sembrar la pista:

- **`noche-de-tormenta`** (cap. 3): Tomás añade: «Y justo antes del trueno, el cielo se abrió un segundito, como una costura.»
- **`doctora-de-dinosaurios`** (cap. 3): mientras Pita habla, su taza de té **tiembla en círculos** cada vez que el carnotauro da un
  paso. Pita: «Interesante. Muy interesante… y un poco aterrador.» *(guiño al vaso de agua que vibra)*

## Misiones nuevas (capítulo 4, en este orden)

Las metas son propuestas con los tipos que el juego ya sabe medir.

| Id | Título | Quién | Meta | Premio |
|---|---|---|---|---|
| `c4-grieta` | Algo brilla en el río | Lía | Acariciar 60 veces (calmar a los animales) | 150 monedas |
| `c4-fondos` | Fondos para la expedición | Ramón | Vender 40 productos | 200 monedas |
| `c4-estabilizador` | El estabilizador | Pita | Recoger 3 escamas de fuego | 150 monedas y 5 carnitas |
| `c4-viaje` | Cruzar la grieta | Lía | Un animal con 2 corazones (quien guíe el paso) | 250 monedas |
| `c4-cierre` | Cerrar la grieta | Tomás | Recoger 3 escamas de río | 200 monedas |
| `c4-laboratorio` | El Laboratorio Hélice | Pita | Vender 20 productos (pagar el equipo) | **Abre el Laboratorio** |
| `c4-primera-replica` | La primera réplica | Pita | Comprar 1 carnotauro (replicarlo) | 300 monedas |

## Escenas (guion con líneas de ejemplo)

Cada una de 4 a 6 líneas. `[mood]`: 0 normal, 1 contento, 2 triste. Las líneas fijan la voz; el texto final se afina al escribirlo.

### 1. «Algo brilla en el río» · `inicio:c4-grieta` · Lía, Tomás, Mía
Los animales están inquietos. En la curva del río, el aire brilla como una cortina de agua que no cae.

- **Lía** [2]: «Esto empezó la noche de la tormenta. Siempre empieza con una tormenta.»
- **Mía** [2]: «Yo veo una puerta. ¿Es una puerta?»
- **Lía** [0]: «Es una grieta. El río se pierde porque no está perdido: está… *antes*. Está en otro tiempo.»
- **Tomás** [1]: «O sea que mis dos hobbies, el río y los dinosaurios, eran el mismo hobby.»
- **Lía** [0]: «Calma a tus animales. Cuando tienen miedo, la grieta se abre más.»

### 2. «Fondos para la expedición» · `inicio:c4-fondos` · Ramón, Pita
Ramón llega con un trozo de **ámbar** con un mosquito dentro y unos planos enrollados. *(guiño al ámbar con el mosquito)*

- **Ramón** [1]: «Me lo vendió un viajero. Dice que dentro hay sangre de hace millones de años.»
- **Pita** [0]: «Ramón, eso no es sangre. Es resina. Y el mosquito está muy muerto.»
- **Ramón** [0]: «Pues yo ya hablé con el pueblo: el que quiera ver dinosaurios, que contribuya. No he escatimado en gastos…»
- **Pita** [1]: «…ni en redondeos.»
- **Ramón** [2]: «Eso no lo tenía que decir en voz alta.»

### 3. «El estabilizador» · `inicio:c4-estabilizador` · Pita, Bruno, Mía
Pita monta un aparato de cobre con escamas de fuego que zumba bajito.

- **Pita** [1]: «Si cruzamos, la grieta tiene que quedarse abierta lo justo. Para eso necesito escamas de fuego.»
- **Bruno** [2]: «¿Y si se queda abierta de más?»
- **Pita** [0]: «Entonces tendremos muchos más huéspedes y mucha menos granja.»
- **Bruno** [1]: «¡Sujétense los sombreros!» *(guiño a «agárrense fuerte»)*
- **Mía** [1]: «Yo me sujeto el cuaderno, que es más importante.»

### 4. «Al otro lado» · `inicio:c4-viaje` · Lía, Pita, Tomás, Mía, Bruno
Cruzan de la mano, con un chorro de luz. Al otro lado, helechos del tamaño de casas. Un **vaso de agua** (el de Pita) tiembla en círculos.

- **Mía** [1]: «Los helechos… ¡son gigantes!»
- **Pita** [2]: «Mi taza. Mi taza está temblando otra vez.»
- **Tomás** [2]: «Pita… algo viene. ¿Y si no es amistoso?»
- **Lía** [0]: «Es una manada de herbívoros. Si no los asustamos, ni nos miran.»
- **Pita** [1]: «Recojan muestras. Escamas sueltas, cáscaras, nada vivo. Y por favor: no toquen nada que se mueva.»
- **Bruno** [2]: «Entendido. No toco nada que se… oh. Se movía una mariposa.»

### 5. «El campamento» · `fin:c4-viaje` · Lía, Mía, Tomás, Bruno
En un claro hay un **campamento vacío**: una olla fría, un hamaquero, una página arrancada de un cuaderno clavada con una espina.

- **Mía** [1]: «¡Es la página que faltaba! Es de la señora Cosi.»
- **Lía** [2]: «Estuvo aquí. Hace poco. Se le enfrió el té.»
- **Tomás** [0]: «¿Qué dice la nota?»
- **Lía** [0]: «Dice: “Si leen esto, ya cruzaron. Cierren la grieta detrás de ustedes. Yo sé cómo volver.”»
- **Bruno** [2]: «Yo pisé una mariposa, pero eso seguro no cambia nada.»

*(La página arrancada del cuaderno, pista abierta desde el capítulo 1, se cierra aquí. Cosi sigue sin aparecer.)*

### 6. «Cerrar la grieta» · `inicio:c4-cierre` · Pita, Lía, Tomás
De vuelta en el río, el aire brilla cada vez más fuerte. Dos pequeños dinosaurios asoman la cabeza.

- **Pita** [0]: «Nos llevamos muestras y dos ejemplares que ya habían cruzado. No más. Si cruza uno más, la historia se enreda.»
- **Tomás** [1]: «¿Y la mariposa de Bruno?»
- **Pita** [2]: «No quiero hablar de la mariposa.»
- **Lía** [0]: «Ahora, con las escamas del río, sellamos el paso. Quien tenga que volver, volverá por el agua.»
- **Tomás** [1]: «Es decir, Cosi.»

### 7. «Se cierra» · `fin:c4-cierre` · Todos
La grieta se pliega como una cortina. El río vuelve a ser un río. Y un correo llega **un día antes** del que Bruno había mandado. *(guiño sutil a las paradojas del tiempo)*

- **Lía** [1]: «Ya está. El río sigue donde debe.»
- **Bruno** [1]: «Qué raro: acabo de recibir una carta que yo escribí mañana.»
- **Pita** [2]: «No la abras. No la abras nunca.»
- **Mía** [1]: «Tengo dibujado todo el viaje. Hasta la mariposa.»
- **Pita** [1]: «Con eso y las muestras tendremos suficiente para el siguiente paso: *recrearlos*.»

### 8. «El Laboratorio Hélice» · `inicio:c4-laboratorio` · Pita, Ramón, Tomás, Mía
Ramón estrena un edificio blanco con cúpula y un letrero enorme. *(guiño: «Bienvenidos a…»)*

- **Ramón** [1]: «Bienvenidos al Laboratorio Hélice. Cosi & Ramón, Sociedad… Casi Anónima.»
- **Tomás** [2]: «¿Esa cerca es eléctrica?»
- **Pita** [0]: «No. Es de madera. Y de buena voluntad.»
- **Mía** [1]: «El letrero dice que no se debe alimentar a los dinosaurios sin permiso.»
- **Ramón** [1]: «Es por el seguro. Si algo sale mal… pagamos en cuotas.»

### 9. «El Señor Hélice» · `fin:c4-laboratorio` · Pita, Tomás
Una hebra de ADN animada con ojitos aparece en la pantalla del laboratorio. *(guiño a la mascota que explicaba el ADN)*

- **Pita** [1]: «Les presento a nuestro asistente. Señor Hélice, explíquenos la réplica.»
- **Señor Hélice** [1]: «¡Hola, amiguitos! El ADN es una escalera de cuatro bases. Cada una tiene una pareja fija.»
- **Tomás** [2]: «Pita, ¿por qué habla como programa infantil?»
- **Pita** [0]: «Porque funciona. Atento, que vienen las reglas.»
- **Señor Hélice** [1]: «¡Completa la hebra y la vida se abre camino!» *(guiño a «la vida se abre camino»)*

### 10. «La primera réplica» · `fin:c4-primera-replica` · Pita, Ramón, Mía
Nace el primer carnotauro de laboratorio: un bebé con la cáscara en la cabeza.

- **Pita** [1]: «Tiene los cuernitos de su mamá… que técnicamente no es su mamá.»
- **Mía** [1]: «Yo le haré su ficha: ficha número uno.»
- **Ramón** [1]: «Y yo, el presupuesto del número dos.»
- **Pita** [0]: «Recuerden: cada réplica es una responsabilidad. Aquí no hacemos cosas porque *podamos*. Las hacemos porque las cuidaremos.» *(guiño al debate «podían, pero ¿debían?»)*
- **Ramón** [2]: «Qué bonito. Qué caro. Qué bonito.»

## El Laboratorio Hélice (nuevo edificio del mapa)

- **Aspecto:** edificio blanco con cúpula de cristal azul, una **hélice de ADN** que brilla en el letrero y una valla de madera con un
  cartel de «No alimenten a los dinosaurios sin permiso». Candado hasta el capítulo 4; se abre con la misión `c4-laboratorio`.
- **Dónde:** lugar único del mapa, como el Criadero (no es un corral). Sprite nuevo de 48×48 y su versión bloqueada.
- **Quién lo atiende:** la Dra. Pita hasta el festival; después, **Mao Mao** (con Noa de consultora). Cambia la voz, no el minijuego.
- **Panel con tres pestañas:**
  1. **Banco de ADN:** una tarjeta por dinosaurio que ya hayas conseguido (por historia). Cada una tiene su muestra y su costo de réplica.
  2. **Réplica:** el minijuego (abajo).
  3. **Equipo:** mejoras del laboratorio, 3 niveles: −10 % de costo y **+1 error permitido** por nivel.
- **Tienda:** los dinosaurios salen en la Tienda **solo después del viaje**, con el botón «Replicar en el Laboratorio» en lugar de
  «Comprar». Antes del viaje solo llegan por historia (carnotauro y spinosaurus).

## Minijuego «Completa la hebra»

**Idea:** el Señor Hélice muestra una hebra de ADN con huecos; completas cada hueco con la base que **hace pareja** con la de enfrente.
Pensado para tocar con el dedo y para entenderse en diez segundos.

- **Las bases (4, con color y forma, para que no dependa solo del color):** A = rojo ♥, T = amarillo ★, C = azul ●, G = verde ◆.
- **Parejas fijas:** A–T y C–G. Siempre se recuerdan en la pantalla.
- **Tablero:** dos filas de bases. La de arriba está completa; la de abajo tiene huecos. Debajo, cuatro botones grandes con las bases.
- **Una ronda = una hebra** de 6 u 8 bases según el dinosaurio (más grande, más larga).
- **Hebras largas con «lagunas»:** en las más difíciles (estegosaurio, pterodáctilo, plesiosaurio) algunas bases arriba aparecen
  tapadas con «ADN de rana» (un huequito verde con una ranita) y hay que deducirlas por el contexto. *(guiño al ADN de rana que rellenaba huecos)*
- **Error:** el hueco tiembla y el Señor Hélice dice «¡Ah, ah, ah! Esa base no cuadra.» *(guiño a «¡Ah, ah, ah!, no dijo la palabra mágica»)*

### Resultado (pierdes la consulta según cuánto falles)

Se paga el **costo de la réplica** al empezar. Con `N` bases y `permitidos = N / 3` (redondeado hacia abajo, más lo que dé el equipo):

| Errores | Resultado | Qué pasa |
|---|---|---|
| 0 | **Perfecta** | Nace la cría + te devuelven el 25 % + el doble de probabilidad de color raro |
| 1 hasta `permitidos` | **Buena** | Nace la cría |
| `permitidos + 1` | **Inestable** | La réplica falla y te devuelven el 50 % |
| más | **Fallida** | Pierdes la muestra: no hay cría y no hay reembolso |

Salir antes de terminar **no cuesta nada** (como en la veterinaria). El equipo del laboratorio da errores extra permitidos.

### Costos y dificultad (propuestos)

| Dinosaurio | Bases | Costo |
|---|---|---|
| Carnotauro | 6 | 700 |
| Spinosaurus | 6 | 750 |
| Triceratops | 6 | 800 |
| Estegosaurio | 8 | 800 |
| Pterodáctilo | 8 | 850 |
| Plesiosaurio | 8 | 900 |

Triceratops, estegosaurio, pterodáctilo y plesiosaurio llegan en los capítulos 6 y 7; su **muestra** se suma al Banco de ADN en cuanto
los recibes por historia. Antes no están en el Laboratorio, aunque la Tienda ya los muestre bloqueados.

## Después del festival

- **Pita se va de viaje** (ya escrito) y **Mao Mao** pasa a atender también el Laboratorio. Sus líneas del panel cambian, y llega
  **Noa** con la mirada de paleontóloga.
- **Noa**, al verlo: «Un laboratorio de dinosaurios. Estudié veinte años para esto… y me lo encuentro con una cerca de madera.»
- **Mao Mao**, al replicar: «Cada hebra es una receta. Sale mal cuando no mides… y cuando pruebo cosas que no debía.»

## Tabla de guiños (afectuosos y sin copiar texto)

| Guiño | Dónde |
|---|---|
| Vaso de agua que tiembla con cada paso | Taza de Pita en `doctora-de-dinosaurios` y en el cruce |
| Mosquito en ámbar y «es resina» | Ramón en `c4-fondos` |
| «No he escatimado en gastos» | Ramón: «…ni en redondeos» |
| «Agárrense fuerte» | Bruno: «¡Sujétense los sombreros!» |
| «¿La cerca es eléctrica?» | Tomás en el Laboratorio |
| Bienvenidos a… | El letrero de Ramón |
| Mascota de dibujos del ADN | **Señor Hélice** |
| ADN de rana para rellenar huecos | Las lagunas de las hebras largas |
| «¡Ah, ah, ah!» | El mensaje de error del minijuego |
| «La vida se abre camino» | Cierre del Señor Hélice y de la primera réplica |
| «Podían, pero ¿debían?» | Pita en `fin:c4-primera-replica` |
| Paradojas del tiempo (mariposa y el correo de mañana) | Bruno en el campamento y al cerrarse la grieta |

## Cómo se implementaría (resumen, sin código todavía)

1. **Historia (`data.js`):** 7 misiones del capítulo 4 después de `c4-spino`, 10 escenas y 2 líneas añadidas a escenas de capítulo 3.
2. **Migración (`state.js`):** si el mundo ya pasó el capítulo 4, las misiones nuevas se marcan hechas y el Laboratorio queda abierto
   (sin premios). Mis partidas de prueba se regeneran.
3. **Laboratorio (`sim.js`, `state.js`):** `w.lab = { built, level, samples }` con valores por defecto; `replicate()` con el costo,
   los errores permitidos y el reembolso del cuadro.
4. **Minijuego (`src/genetica.js`, sin interfaz, y `ui.js`):** generador de hebras, validación de parejas y panel con tres pestañas.
5. **Mapa y arte:** lugar nuevo en el mapa, sprite del Laboratorio, íconos de bases y del Señor Hélice (`gen_sprites.py`).
6. **Tienda:** los dinosaurios se listan solo después del viaje, con «Replicar en el Laboratorio».
7. **Pruebas y recorrido:** la historia completa (`historia-completa.test.mjs`) cubre las 7 misiones; pruebas del minijuego (siempre
   resoluble), de la migración y de los resultados; y recorrido en navegador con capturas.

## Decisiones que necesito de ti

1. ¿Dejo a **Cosi sin aparecer** en el pasado (solo su campamento y su nota), como en este guion?
2. ¿Te gusta el **Señor Hélice** como mascota del minijuego, o prefieres que explique la Dra. Pita?
3. ¿Los cuatro dinosaurios de los capítulos 6 y 7 se suman al Banco de ADN **al recibirlos por historia**, como está escrito?
4. ¿Los costos y la tabla de resultados te sirven? (Inestable devuelve el 50 %; fallida pierde todo.)
5. ¿Subo todo esto a `main` cuando esté implementado, o primero lo revisas en la rama?
