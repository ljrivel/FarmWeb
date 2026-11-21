# FarmWeb: guion de la historia (borrador para aprobar)

Etapa 0. Solo texto: aquí no hay código ni escenas escritas todavía. Si lo apruebas (o lo cambias), la
Etapa B escribe los diálogos completos en `SCENES` (`src/data.js`) y la C los usa para las visitas.

## Reglas que respeta el guion

- **Ningún `id` ni meta de misión cambia** (los guardados dependen de ellos). Las escenas se **enganchan** a las
  misiones existentes: `inicio:<id>` (cuando la misión pasa a ser la activa) y `fin:<id>` (al reclamarla).
- Tono: **ternura con un toque de misterio**. Nadie es malo, nadie muere, el conflicto es la distancia y el
  miedo a no ser suficiente. Frases cortas, un chiste suave por escena.
- Cada escena dura **3 a 6 líneas** (unos 20 segundos), se puede saltar y siempre queda en el Diario.
- Cada personaje tiene **su propia cuerda** que se tensa y se cierra: así uno se encariña de verdad, no solo
  con quien da la misión.
- Retratos: expresión `normal`, `contento` o `triste` por línea (ya existen en el atlas).

## La idea central

Hace muchos años, Cosi y **Lía** encontraron un valle escondido donde seguían naciendo dinosaurios, y juraron
cuidarlo. El río que llevaba al valle cambió de curso y se «perdió»: sin él, los últimos nidos corrían peligro.
Cosi se fue a protegerlos y, como no podía llevarse la granja, **se la dejó a la familia** porque la granja es el
único lugar seguro y lleno de cariño donde esos bebés pueden crecer. No pidió una granja productiva: pidió
**personas que se encariñen con los animales**. Por eso las cartas insisten en cariño, caricias y confianza, y por
eso los corazones importan en la historia.

El misterio se arma en tres pistas, que coinciden con lo que ya ocurre en el juego:
1. el **cuaderno** con la página arrancada (cap. 1),
2. el **huevo de la tormenta** (cap. 3),
3. la **cinta rosa** del spinosaurus y el **mapa en las escamas** (cap. 4).

La respuesta llega en el festival (cap. 5): Cosi mandó el huevo con la crecida para que la familia lo criara, y
la cinta era su manera de decir «confío en ustedes».

## Los personajes y su cuerda

| Personaje | Quiere | Le da miedo | Cómo se cierra |
|---|---|---|---|
| **Abuela Cosi** | Proteger el valle sin dejar sola a la familia | Que la granja se apague sin ella | Vuelve al festival y se queda: la granja ya es de ellos |
| **Tomás** | Ser útil, que lo consideren de la granja | Ser «solo el vecino» | Cosi le confía las llaves del granero: es el cuidador oficial |
| **Mía** | Una bufanda perfecta para la abuela | Los bosques oscuros y que se rían de ella | Sale al bosque sola y entrega la bufanda en el festival |
| **Lía** | Encontrar el río de nuevo | Ser quien lo perdió | Confía en la familia, abre el camino y se queda al festival |
| **Dra. Pita** | Que ningún animal sufra por descuido | Fallarle a un paciente | Descubre que cuidar con cariño ya es medicina |
| **Don Ramón** | Que el pueblo vuelva a reunirse | Que Cosi no regrese | Confiesa que guardó la primera canasta de huevos treinta años |
| **Bruno** | Entregar cada carta a tiempo | Llegar tarde otra vez | Llega justo a tiempo con la última carta |

## Escenas por capítulo

`★` = escena obligatoria al llegar (puede saltarse). Las demás son cortas y también se pueden saltar.
Cada línea de ejemplo es solo para fijar la voz; el texto final se afina en la Etapa B.

### Capítulo 1: La granja de la abuela
Presenta el hogar, al vecino y la promesa de Cosi.

1. ★ **«El sobre mojado»** · `inicio:c1-carta` · Bruno, Abuela (en carta).
   Bruno llega tarde con el sobre porque se distrajo con las gallinas. Entrega la carta.
   > Bruno: «¡Perdón! Me quedé mirando una gallina que parecía que me saludaba.»
2. **«El vecino de al lado»** · `inicio:c1-huevos` · Tomás.
   Tomás se presenta, nervioso: llevaba años mirando la granja por la cerca sin atreverse a entrar.
   > Tomás: «Tu abuela me dejaba ayudar… yo creo que es porque le caía bien. ¿O porque era el único?»
3. **«Cuentas claras»** · `fin:c1-vender` · Don Ramón.
   Compra con gesto serio, paga de más sin decirlo y cambia de tema.
4. **«Ratoncitos»** · `fin:c1-gato` · Tomás, Mía (se asoma detrás de él, sin hablar).
   Primera aparición de Mía: tímida, solo mira al gato.
5. **«Una hoja que falta»** · `fin:c1-cuaderno` · Tomás.
   Encuentran el cuaderno y notan la página arrancada. Planta la pregunta del capítulo: ¿qué estaba escribiendo
   la abuela, y por qué se la llevó?

### Capítulo 2: Amigos del bosque
La granja crece y Mía empieza a salir de su caparazón.

6. ★ **«Ojos de antifaz»** · `inicio:c2-mapache` · Tomás, Mía.
   Mía se esconde detrás de Tomás: el bosque le da miedo. Tomás promete acompañarla.
7. **«Trufas»** · `fin:c2-trufa` · Don Ramón.
   Prueba la trufa en silencio y se emociona. Primera pista sobre su historia con Cosi: «Ella las traía por
   canastas.»
8. ★ **«Una sonrisa en el agua»** · `inicio:c2-estanque` · Bruno.
   Entrega la tercera carta y la lee en voz alta, con voz de actor. Cosi describe el ajolote como «el amigo que
   nunca se enoja».
9. **«Burbujas de suerte»** · `fin:c2-burbuja` · Mía, Tomás.
   Mía habla por primera vez directamente al jugador: le regala el primer dibujo de un animal suyo.

### Capítulo 3: El huevo misterioso
El primer susto grande y el primer cuidado serio.

10. ★ **«La noche de la tormenta»** · `inicio:c3-tormenta` · Tomás, Mía.
    Los animales asustados, el huevo gigante brillando. Tomás se queda toda la noche despierto vigilándolo y lo
    admite sin ser pedido. Mía le trae una manta suave al huevo.
11. ★ **«Doctora de dinosaurios»** · `inicio:c3-carnotauro` · Dra. Pita.
    Pita llega corriendo, alucinada y asustada a la vez. Le tiembla la libreta. Deja claro cómo se cuida: comida,
    mimos y, si hace falta, Veterinaria.
    > Pita: «Estudié veinte años para los gatos. Ahora tengo un dinosaurio. Respiremos.»
12. **«Primer estornudo»** · evento: la primera vez que un animal se enferma (nuevo gancho `evento:primera-enfermedad`).
    Pita aparece en un aviso corto y explica sin culpar: «Enfermar no es culpa de nadie.» Ancla la mecánica de
    enfermedades dentro de la historia.
13. **«Cuernitos»** · `fin:c3-carnotauro` · Tomás, Pita.
    El carnotauro adulto se acerca a Mía y ella no huye. Es el primer paso de su valentía.

### Capítulo 4: El río perdido
La pista más grande y la primera verdad sobre Cosi.

14. ★ **«El dibujo en las escamas»** · `inicio:c4-pista` · Tomás, Lía (solo su silueta al fondo).
    Hay alguien observando desde lejos: aparece una figura con bufanda.
15. **«La mochila del viaje»** · `inicio:c4-expedicion` · Don Ramón.
    Reconoce que Cosi se fue hace meses y que él nunca le dijo «vuelve». Se prepara para decírselo.
16. ★ **«La guía del río»** · `inicio:c4-spino` · Lía, Tomás, Mía.
    Presentación completa de Lía: llega con el spinosaurus bebé y la cinta rosa. Cuenta cómo conoció a Cosi
    (dos niñas, una barca, un valle). Se ve su culpa: «El río se perdió mientras yo cuidaba.»
17. **«La cinta»** · `fin:c4-spino` · Lía, Mía.
    Mía le ofrece su manta; Lía acepta por primera vez. Cierra el capítulo con la pregunta: ¿el huevo de la
    tormenta lo mandó Cosi?

### Capítulo 5: El festival de la granja
Todo converge; la granja se llena de gente.

18. ★ **«El pueblo entero»** · `inicio:c5-invitacion` · Don Ramón, Tomás, Bruno.
    Ramón organiza el festival. Confiesa que guardó treinta años la primera canasta de huevos de Cosi.
19. ★ **«La carta de la crecida»** · `inicio:c5-carta` · Lía, Bruno.
    Lía lee la carta de Cosi: el huevo de la tormenta fue un regalo. Lía llora un poco y lo niega.
20. **«Familias»** · `inicio:c5-crias` · Dra. Pita, Mía.
    Pita habla de cuidar con cariño: «La mejor medicina es esto: comida, abrazo y tiempo.» Mía enseña el progreso
    de su bufanda.
21. **«Las guirnaldas»** · `fin:c5-puesto` · Don Ramón, Bruno, Tomás.
    Bruno llega justo a tiempo con algo que se perdió: la página arrancada del cuaderno (la había traspapelado en
    su bolsa). Leen todo: es la carta de despedida de Cosi, que explica el valle.
22. ★ **«Las campanitas»** · `inicio:c5-festival` · Todos.
    Cosi llega en persona (su primer retrato en escena). Abraza a todos, entrega las llaves del granero a Tomás y
    recibe de Mía la bufanda.
23. ★ **«La granja de ustedes»** · `fin:c5-festival` · Cosi, Lía, todos.
    Cierre emotivo y epílogo. Reaparece `EPILOGUE`, que se amplía con una línea por cada personaje.

## Visitas ocasionales (Etapa C, si se hace)

Charlas cortas de 1 a 3 líneas, sin recompensa de monedas, para encariñarse con el día a día. Se desbloquean por
capítulo y por lo que ya hiciste (corazones, especies, enfermedades).

- **Tomás:** pregunta cómo van los pequeños, trae ideas para el corral, practica «cosas de granjero».
- **Mía:** muestra dibujos de tus animales; si el animal tiene corazones, lo menciona.
- **Pita:** pasa «de ronda»: si hay un animal enfermo, lo comenta; si no, felicita.
- **Ramón:** historias del pueblo y de Cosi de joven.
- **Bruno:** chiste, noticia del pueblo y «hoy no traigo cartas, pero…».
- **Lía:** historias del río; solo aparece desde el capítulo 4.
- **Cosi:** solo después del final, para que el cierre conserve su fuerza.

## Diario (Etapa D, si se hace)

Pestaña dentro de Misiones: «Cartas» (las de Cosi, relegibles), «Escenas» (repetir las ya vistas) y «Álbum» de
personajes, con su retrato y una frase que se completa con la historia.

## Lo que necesito que decidas antes de escribir (Etapa B)

1. **¿Cosi aparece en persona antes del cap. 5?** Propongo que no: solo cartas, para que su vuelta pese.
2. **¿Te gusta que la página arrancada vuelva por Bruno (esc. 21)?** Es un giro pequeño; se puede cambiar.
3. **Ramón y Cosi:** propongo amistad profunda y nostalgia, no romance. ¿Te va bien?
4. **¿Mía y Tomás son hermanos y vecinos** (como ya dice `CHARACTERS`) o algo distinto?
5. **Tono del cierre:** emotivo y sin tristeza real (propuesto) o con un toque agridulce?
6. **Longitud:** unas 23 escenas de 3 a 6 líneas (~100 líneas de texto). ¿Más o menos?
