# Carpa Negra — Actos III y IV y camino a un juego sublime

## Contexto

Carpa Negra tiene hoy dos actos completos (≈9.500 líneas, 41 objetos, 14 criaturas, 4 jefes). La partida termina en el Acto II con un «Continuará». Se pide: (1) diseñar al detalle los actos III y IV, y (2) decidir qué pulir para que el juego sea sublime.

La exploración del código deja tres conclusiones que ordenan el plan:

1. **El motor no está preparado para 4 actos.** El estilo de suelo depende de `act === 2` ([RoomBuilder.ts:48](src/systems/RoomBuilder.ts:48)), el jefe se elige con una cadena `if/else` cuyo último `else` invoca a La Mujer Serpiente ([RoomBuilder.ts:250](src/systems/RoomBuilder.ts:250)), la reserva de El Contrato (3 objetos) se agota en el Acto II y regala un pedestal gratis, y `GameScene.ts` (1.106 líneas) concentra casi todo.
2. **Hay fallos reales que pesan más que cualquier adorno**: suelos de la partida anterior reutilizados, comportamientos que cambian con los hercios del monitor, y criaturas o recogibles que pueden salirse de la sala (posible bloqueo).
3. **Falta «jugo» y legibilidad**: no hay parada de impacto, varios ataques no avisan, las balas enemigas y las del jugador comparten tono, limpiar una sala suena igual que cruzar una puerta.

**Decisiones tomadas contigo**: Acto III = La Casa de los Espejos · Acto IV = La Pista Central con El Maestro de Ceremonias (3 fases, dos finales) · entran mando, táctil, desbloqueables/personajes y guardar partida + reto diario · orden: cimientos y game feel primero.

**Resultado buscado**: una partida de 35–45 minutos en cuatro actos con identidad propia cada uno, un jefe final memorable, y un juego que se sienta preciso, justo y con motivos para volver.

---

## Hoja de ruta

| Hito | Contenido | Tamaño aprox. | Depende de |
|---|---|---|---|
| **H0** | Arreglos urgentes | ~250 líneas | — |
| **H1** | Cimientos: motor preparado para 4 actos | ~900 (mucho es mover código) | H0 |
| **H2** | Game feel y legibilidad | ~1.100 | H1 |
| **H3** | Acto III: La Casa de los Espejos | ~2.300 | H1, H2 |
| **H4** | Acto IV: La Pista Central y finales | ~2.800 | H3 |
| **H5** | Balance, economía y objetos transversales | ~600 | H4 |
| **H6** | Metajuego: guardar, personajes, carteles, gira, función del día | ~1.400 | H4 (el formato de guardado debe incluir oleadas y público) |
| **H7** | Plataformas y presentación: mando, táctil, opciones, intro | ~1.200 | H1 (capa de entrada) |

Referencia de tamaño: el Acto II costó +1.408 líneas (arte 251, jefes 255, criaturas 242, plantillas 225). Cada hito termina con `npm test`, `npm run build` y una comprobación en el navegador con `window.__juego`.

---

## H0 — Arreglos urgentes

| Fallo | Dónde | Arreglo |
|---|---|---|
| Suelos de la partida anterior reutilizados (la clave `fondo_${act}_${x,y}` no lleva semilla) | [RoomBuilder.ts:50](src/systems/RoomBuilder.ts:50) | Incluir la semilla en la clave y borrar las texturas `fondo_*` al empezar partida (`startRun` en MenuScene) |
| Dependencia de los hercios: cuerpo de la Serpiente y rastro del Mono de Juguete por fotogramas; `lerp(…, 0.04)` del Forzudo; `delta` sin acotar | [bosses2.ts:211](src/entities/bosses2.ts:211), familiars.ts:71, bosses.ts:93, Shot.ts:73, props.ts | Rastro por distancia recorrida; suavizados con `1 - exp(-k·dt)`; acotar `dt` en todas partes |
| Criaturas y recogibles pueden salir por los huecos de puerta (sala que nunca se limpia) | RoomBuilder.ts:120, GameScene.ts:907 | Colisionador de hueco de puerta para todo lo que no sea el jugador; acotar posiciones al rectángulo interior |
| Saltadores (Pulga, Bestia, Forzudo) aterrizan dentro de cajones o fosos | creatures.ts:257 | Validar el destino con `nav` y recolocar en la baldosa libre más cercana (`nearestFreeTo`) |
| `time.removeAllEvents()` al salir cancela regalos del aplausómetro y el aviso de El Contrato | [GameScene.ts:357](src/scenes/GameScene.ts:357) | Temporizadores «de sala» frente a «de partida»; solo se cancelan los primeros |
| Reserva de El Contrato agotada → pedestal gratis con el Calcetín | RoomBuilder.ts:268 | Si no queda objeto, no se crea el pedestal (la reserva crece en H3/H4) |
| Los ajustes nuevos se perderían: la pausa sobrescribe `settings` entero y la carga mezcla solo en superficie | PauseScene.ts:56, save.ts:20 | Mezcla profunda y escritura campo a campo |
| `enemiesAlive()` sirve a la vez de «falta por matar» y de «se puede apuntar» (por eso petardos y familiares ya ignoran el cuerpo de la Serpiente) | GameScene.ts:987 | Separar en `targets()` y `clearPending()`; imprescindible para señuelos y muñecos del Acto III |
| Jefes del Acto I sin `fixedHp` | bosses.ts:17,177 | Añadirlo (hoy no afecta; evita sorpresas cuando el Maestro los invoque) |
| El tiempo de partida cuenta la pausa (`Date.now()`); salir por la pausa no cuenta como función ni guarda el álbum; `seenItems` no se guarda | GameScene.ts:649, PauseScene | Reloj de juego acumulado; registrar función y `seenItems` siempre |
| Sin pausa al perder el foco de la ventana | main.ts | Pausa automática en `blur`/`visibilitychange` |
| Código muerto (`void def`, `void st`, `trapdoorGone`, `shadowTxt`, `wrap`, sprites sin usar) | varios | Limpiar |

**Antes de tocar nada, red de seguridad**: `tests/golden.test.ts` con ~25 semillas que fija salas, plantillas, volteos, jefe y golosinas de los actos I y II, más un hash de `ACTO1_ROOMS` y `ACTO2_ROOMS`. Esas dos listas quedan congeladas: incluso añadir una plantilla al final cambia los mapas de las semillas existentes.

**Puerta de salida**: semillas doradas en verde; test que crea dos partidas seguidas y comprueba claves de fondo distintas; en el navegador, forzar el bucle a 30 y 144 pasos por segundo y comparar la longitud de la Serpiente.

Nota: que los Zancos atraviesen jaulas es coherente con el objeto («pasas por encima de todo») y se deja. Lo que sí hay que prever es un grupo propio para obstáculos altos (H1), o el payaso con Zancos cruzaría los espejos.

---

## H1 — Cimientos: motor preparado para 4 actos

Objetivo: que añadir un acto sea añadir datos y clases, sin tocar ramas repartidas. **No debe cambiar ni el juego ni los mapas de las semillas actuales** (los flujos de azar ya van salados por acto en [run.ts:129](src/core/run.ts:129)).

1. **Actos por datos** — ampliar `ActDef` ([acts.ts](src/data/acts.ts)): `floor` (estilo por tipo de sala), `bossMusic`, `specials` (obligatorias y opcionales que pasa a `generateFloor`; por defecto exactamente las listas y el orden de [floorgen.ts:57](src/core/floorgen.ts:57), o cambian los mapas), `legend` (letras de criatura **propias de cada acto**: quedan 12 minúsculas libres y hacen falta 13), `exit: 'trampilla' | 'final'` en lugar de `final`, `contract`, y `mods` (p. ej. público a dos caras). Una sola función `romano(n)`.
2. **Registros en vez de ramas** — `BOSSES: Record<BossKind, { name, tagline, spawn(sc, cx), setup? }>` sustituye la cadena de [RoomBuilder.ts:250](src/systems/RoomBuilder.ts:250); `CREATURE_CTORS: Record<EnemyKind, Ctor>` en `entities/spawn.ts` sustituye el `switch` de [creatures.ts:283](src/entities/creatures.ts:283). Las entidades no importan el registro: piden `sc.spawn(kind, x, y)`. Así desaparecen las importaciones cruzadas y el ciclo que crearían Cabezudo, Ilusionista y Ventrílocuo. La cuerda de los Siameses pasa a ser un `Tether` reutilizable.
3. **Registro de baldosas** — hoy siete sitios deciden según el tipo de obstáculo. Se unifican en `TILES` (datos puros: transitable, qué hace con los disparos, cómo se voltea) y `TILE_BEHAVIOUR` (construir, al disparo, al petardo, al tocar). Grupo nuevo `g.altos` para obstáculos que ni los Zancos ni los voladores cruzan (espejos, podio, cañón, telones).
4. **Utilidades de combate en `Enemy`** — `ring(...)` y `fan(...)` (hoy copiados en diez sitios), `after(seg, fn)` (temporizador propio que muere con la criatura) y un sistema `Telegraph` de sala con línea, círculo, marca y franja. Todo con `dt`, nunca con `onComplete` de tweens.
5. **Clase `Boss`** — sobre `Enemy`: fases con umbral, puerta de fase (la vida no baja del umbral hasta acabar la transición, para que ninguna combinación se salte fases) y ataques escritos como guiones generadores (`yield` = segundos de espera) que avanzan con `dt`: mueren con el jefe y se congelan con la parada de impacto. Patrones compartidos (anillo, escombros, latigazo, abanico, invocación) en `entities/patterns.ts`. Los cuatro jefes actuales solo se registran, no se reescriben.
6. **Trocear `GameScene`** en este orden, de menos a más riesgo: `Fx` (confeti, restos, salpicaduras, sacudida, textos flotantes) → `data/loot.ts` + `core/loot.ts` (tablas y tiradas puras, con tests) → `Pickups` (pedestales, recogibles, cofres) → `RoomFlow` (entrar, limpiar, puertas, trampilla) → `Combat` (colisiones y daño). `GameScene` queda como fachada con la misma API pública que usan las entidades (`sc.spawnShot`, `sc.snd`…).
7. **Capa de entrada** — `Controls` pasa a ser único para todo el juego, lee el teclado con eventos del navegador (`event.code`) y se alimenta de «fuentes» (teclado hoy; mando y táctil en H7) sin cambiar a quien lo consume. **Es requisito de la parada de impacto**: pausar la escena reinicia las teclas de Phaser y soltaría las que tengas pulsadas.
8. **Herramientas de autoría** — en [debugApi.ts](src/debug/debugApi.ts) ya existen `crear(kind)`, `matarTodo()` y `acto(n)`; añadir `sala(idPlantilla, {flipX, flipY})`, `jefe(kind)` y `fase(n)`. Abaratan todo H3 y H4.
9. **Tests** — validador de plantillas para todos los actos: 7×13, solo caracteres registrados, sin colisiones entre letras de criatura y de baldosa, celdas de puerta libres (`DOOR_CELLS`), todas las puertas conectadas por relleno, ninguna criatura a menos de 2 baldosas de una entrada; generador en 1.000 semillas por acto; recorrido I→II→III→IV con `advanceAct`; instantáneas de los mapas de 20 semillas de los actos I y II para garantizar que no cambian.

**Puerta de salida**: tests en verde; partida de control con una semilla fija antes y después del refactor que produce el mismo mapa, el mismo jefe y los mismos objetos.

---

## H2 — Game feel y legibilidad

**Impacto**
- **Parada de impacto**: 35 ms al matar, 90 ms al recibir daño, 60 ms en explosiones, 250 ms al caer un jefe. `sc.freeze(ms)` pausa la escena entera al final del fotograma (nunca dentro de una colisión) y el marcador la reanuda; se toma el máximo de las peticiones, no la suma. Pausar solo la física no vale: las criaturas seguirían pensando con el cuerpo quieto.
- **Partículas**: un emisor por efecto (confeti, restos, impacto) y salpicaduras en reserva, en lugar de un tween por imagen. Los emisores siguen el reloj de la escena, así que se congelan con la parada y funcionan con el avance por fotogramas.
- **Disparos en reserva: ahora no.** El peor caso actual ronda 180 disparos por segundo y no hay indicios de tirones. Se deja preparado (`Shot.init`) y se decide con `__juego.estres(n)` en un móvil de gama media.
- **Muertes con carácter**: aplastar-y-estallar, color de estallido por criatura, sonido de muerte por familia; manchas que persisten al volver a la sala (guardadas en `RoomState`).
- **Disparo**: fogonazo en la mano, estela de 1–2 fotogramas, impacto distinto en pared, obstáculo y carne, variación de tono en los efectos.
- **Daño al jugador**: retroceso que se note (hoy la aceleración lo anula en 0,1 s), viñeta roja breve, latido y filtro en la música con el último globo.
- **Sacudida** con presupuesto central (un solo sitio decide intensidades) y ajuste para reducirla o quitarla.

**Legibilidad y justicia**
- **Avisos en todo ataque**: añadirlos a los que hoy no avisan (espiral del Oso, picado del Loro, escupitajo de la Serpiente, estallido del Payasito y del campeón azul, escombros del Forzudo sin marca en el suelo). Destello de color común en toda preparación.
- **Balas enemigas inconfundibles**: más grandes, contorno oscuro y núcleo claro con pulso; las pelotas del jugador cambian de tono para no compartir rojo.
- **Entrada segura**: ninguna criatura a menos de 2 baldosas de la puerta por la que entras (se desplaza o despierta más tarde); aparición con humo y marca en el suelo.
- **Puertas vivas**: portazo al entrar en sala hostil; apertura con polvo al limpiar.
- **Momento «sala limpia»**: sonido propio, pequeño destello y el premio saltando desde el centro.

**Jefes**
- Cartel de presentación (nombre, lema, retrato, barras negras 1,2 s), barra con «mordisco» retardado y marcas de fase, cámara lenta y fogonazo blanco al morir.

**Transición entre salas**
- Deslizamiento al estilo clásico del género en lugar del fundido: se dibuja la sala saliente en una textura fija de 240×144, se coloca a una pantalla de distancia, se construye la sala nueva en el mismo fotograma y se desplaza la cámara unos 220 ms con `dt`. Es la opción menos invasiva porque todo el código asume coordenadas de sala fijas. El fundido actual queda como opción en ajustes. De paso, el destello rojo del payaso deja de depender del reloj de escena (hoy un cambio de sala puede dejarlo teñido).

**Interfaz**
- **Cartela de objeto** al acercarte a un pedestal (nombre y descripción) y álbum con cursor, descripción y el texto `lore` que hoy está escrito pero nunca se muestra.
- **Minimapa**: formas además de colores, sala limpia / con objeto pendiente, icono de El Contrato, mapa completo al mantener Tab.
- **Fuente con tildes, ñ, ¿ y ¡** ([font.ts](src/art/font.ts)).
- Indicador de acto y reloj de partida opcionales.

**Música reactiva** (motor en [music.ts](src/audio/music.ts)): capas (melodía, contracanto, bajo, percusión de ruido), fundido cruzado entre temas, estados exploración / combate / sala limpia / poca vida, atenuación en pausa, y murmullo del público ligado al aplausómetro.

**Puerta de salida**: lista de comprobación por ataque (todos con aviso ≥ 0,35 s), capturas antes/después, y la partida de control sigue siendo determinista.

---

## H3 — Acto III: La Casa de los Espejos

> «Aquí todos se parecen a ti. Algunos, demasiado.»

**Identidad**: ilusión y reflejo. Los disparos rebotan, el suelo te mueve y los enemigos castigan disparar sin pensar. Es el acto que pone a prueba tu propia combinación de objetos.

**Ficha** — `n: 3`, 10–12 salas normales, `hpMult: 1.65`, `champion: 0.13`, música `espejos`, suelo ajedrezado negro y lila con marcos dorados; sala del jefe: «la sala de los mil espejos».

### Baldosas nuevas

| Letra | Baldosa | Regla |
|---|---|---|
| `E` | Espejo | Obstáculo alto (ni los Zancos lo cruzan). Refleja **todos** los disparos según el lado por el que entran, sin gastar tus rebotes. Un petardo lo rompe (deja esquirlas y 35 % de botín). |
| `1` `2` `3` `4` | Suelo móvil ↑ → ↓ ← | Empuja al payaso y a las criaturas de suelo (≈40 px/s). Los Zancos lo ignoran. `flipRows` intercambia 2↔4 y 1↔3. |

Se combinan con las anteriores (fosos, tachuelas, bloques): cintas que arrastran hacia tachuelas, pasillos de espejos donde un disparo rebota varias veces.

**Motor antes que contenido** (~500 líneas, con tests propios): grupo `altos` y reflexión, campo de suelo (cintas, charcos, tachuelas y fuego unificados en zonas), disparos con opciones iguales para ambos bandos (`halves`, `boomerang`, rebote y teledirigido también en enemigos), proyectil en parábola (`lob`), gancho `onShot` para desviar, aviso «el payaso ha disparado», penumbra v1 y un `buildVolley` puro extraído de [Player.ts:135](src/entities/Player.ts:135) que usará Tu Reflejo.

### Criaturas (6 especies, 7 letras)

| Letra | Criatura | Vida | Comportamiento | Parte de |
|---|---|---|---|---|
| `e` | **Reflejo roto** | 16 | Copia tu velocidad con la X invertida. Solo dispara cuando disparas tú: devuelve una pelota 0,25 s después en la dirección espejada (campeón: abanico de 3). | Nuevo: lee `player.vel` y el evento de disparo |
| `a` | **Bailarina de caja de música** | 14 | Se desliza en línea recta hasta chocar; pirueta de 0,5 s con destello → anillo de 6; sale hacia tu eje. | Monociclista + Caja sorpresa |
| `i` | **Ilusionista** | 18 | Se teletransporta con humo cada 2,5–3,5 s (a ≥ 60 px de ti); 0,5 s de aviso → 3 cartas bumerán. Al primer truco deja 2 señuelos (1 golpe, no cuentan para limpiar). | Cobra (`nav.randomFreeTile`) + disparo `boomerang` nuevo |
| `n` | **Muñeco** | 12 | Persigue y muerde. Al morir queda tirado y revive a los 3 s mientras viva un ventrílocuo (hilo visible entre ambos). | Mimo + patrón de cuerda `addRope` |
| `q` | **Ventrílocuo** | 20 | Guarda distancia (70–100 px); cada 3 s lanza una «carcajada» grande y lenta. Si muere, caen sus muñecos. | Domador |
| `s` | **Tragasables** | 24 | Guardia frontal: los disparos que le llegan de frente (±60°) vuelven hacia ti. Estocada con línea de aviso 0,5 s; después 0,8 s vulnerable. Rebotes, esquirlas, familiares y fuego lo rodean. | León + desvío de disparos nuevo |
| `w` | **Cabezudo** | 30 | Tanque lento; al morir se parte en 2 cabecitas (7 de vida, rápidas, rebotan). Campeón: 3. | Payasito (`die`) + Monociclista |

Cada una enseña algo distinto: no disparar a lo loco (Reflejo, Tragasables), elegir objetivo (Ventrílocuo), distinguir lo real (Ilusionista), controlar el espacio (Bailarina, Cabezudo).

### Plantillas: 22 (dificultad 0/1/2/3 = 1/4/9/8)

Ejemplos de intención: `pasillo_espejos` (dos filas de `E`, bailarinas rebotando), `teatro_munecos` (ventrílocuo tras fosos con tres muñecos: «mata al titiritero»), `tiovivo` (cintas en bucle alrededor de un bloque central con un cabezudo), `cinta_tachuelas` (cintas hacia tachuelas con tragasables), `laberinto` (espejos e ilusionistas), `sala_gemela` (sala simétrica con dos reflejos) y tres mezclas con veteranos de los actos I y II.

### Jefes (uno al azar)

**Tu Reflejo** — *«Es igual que tú. Pero con talento.»* — 560 de vida
- Dispara con **una copia de tus modificadores actuales** (triple, rebote, esquirlas, fuego, veneno, teledirigido suave). El daño al payaso es siempre medio globo y su cadencia va del 45 % de la tuya, entre 1 y 3,5 disparos/s.
- Fase 1 (100–60 %): se mueve como tu espejo respecto al centro y contesta a cada ráfaga.
- Fase 2 (60–25 %): rompe el espejo; caza por su cuenta y las paredes reflejan todos los disparos una vez.
- Fase 3 (< 25 %): se divide en tres; solo el verdadero proyecta sombra. Golpear a un falso lo revienta en anillo.
- Es el jefe que hace que cada partida sea distinta: tu mejor arma es también su arma.

**Madame Fortuna** — *«Ya ha visto cómo acaba esto.»* — 520 de vida
- Flota entre tres posiciones. Antes de cada ataque saca una **carta del tarot** que se alza 0,8 s sobre ella: la carta es el aviso.

| Carta | Ataque |
|---|---|
| La Torre | 6 marcas en el suelo → 0,7 s después caen columnas (fase 2: 10 marcas en dos tandas) |
| La Rueda de la Fortuna | Anillo de 10 orbes que se expande girando, con dos huecos |
| El Colgado | Movimiento invertido 3 s (reutiliza `mareoT`; el apuntado no se invierte) y abanico lento |
| La Luna | Penumbra con luz alrededor del payaso 3 s y 3 orbes teledirigidos lentos que se pueden destruir (son criaturas voladoras, no disparos) |
| La Muerte (fase 2) | Una franja de fila o columna parpadea 0,8 s y la guadaña la barre |

- Guiño: si llevas la **Bola de Cristal**, el marcador te enseña su próxima carta.

### Salas especiales nuevas (actos III y IV)

- **Gabinete de la Pitonisa** (`pitonisa`): por 5 boletos eliges una lectura: revelar el mapa, identificar todas las golosinas o ver qué jefe te espera. Da uso a los boletos. Si mataste a Madame Fortuna, en el Acto IV el gabinete está cerrado «por defunción» y deja una golosina.
- **Número de riesgo** (`reto`): un objeto a la vista; al cogerlo se cierran las puertas y entran dos oleadas.

### Objetos que llegan con el Acto III (8)

| Objeto | Tipo | Efecto | Arquetipo que estrena |
|---|---|---|---|
| Esquirla de Espejo | pasivo | El disparo salta a un enemigo cercano (60 % de daño) | Cadena |
| Baraja Marcada | pasivo | Crítico ×2,5: 8 % + 4 % por punto de suerte | La suerte importa |
| Sierra del Mago | pasivo | El disparo se parte en dos a mitad de alcance | División |
| Varita Trucada | pasivo | Mantener el disparo lo carga hasta ×4 | Disparo cargado |
| Bomba de Humo | pasivo | Al recibir daño, 2 s invisible: te pierden de vista | Defensa |
| Doble de Riesgo | familiar | Reflejo que dispara con tus modificadores al 50 % | Familiar que escala |
| Carta de El Loco | activo (4) | Vuelve a sortear los pedestales de la sala | Resorteo |
| Chistera de Doble Fondo | pasivo | 25 % de duplicar el botín al limpiar | Economía |

**El Contrato** crece de 3 a 6 con: Alma en Prenda (disparos espectrales y perforantes, 1 globo), Sombra Alquilada (familiar que repite cada disparo 0,3 s después al 40 %, 1 globo), Reloj Parado (disparos enemigos un 25 % más lentos, 1 globo).

### Arte, sonido y música
- Sprites en `src/art/sprites/act3.ts` (≈300 líneas): 7 criaturas, cabecita, señuelo, 2 jefes, cartas del tarot, espejo y esquirlas, cintas animadas, humo, 11 iconos.
- Estilos de suelo `espejos` y `mil_espejos` en `room.ts` con bandera `checker`.
- Tema `espejos`: caja de música en 3/4 cuya segunda mitad es la melodía **invertida** (el espejo también suena); tema de jefe propio.
- Efectos nuevos: cristal, rebote en espejo, humo, carta, caja de música, carcajada, cinta.

### Archivos
Nuevos: `data/rooms/acto3.ts`, `entities/creatures3.ts`, `entities/bosses3.ts`, `art/sprites/act3.ts`. Tocados: `acts.ts`, `enemies.ts`, `items.ts`, `stats.ts`, `Shot.ts` (`boomerang`, reflexión, cadena, división, carga), `ItemEffects.ts`, `familiars.ts`, `floorgen.ts` (`RoomType`), `RoomBuilder.ts` (salas especiales), `music.ts`, `sfx.ts`, `README.md`.

**Puerta de salida**: validador de plantillas en verde; cada criatura probada con `__juego.sala(...)`; ambos jefes vencidos sin `dios()` con una semilla de referencia y con tres combinaciones extremas (Triple + Palomitas, Bola de Cañón, Monóculo); partida I→III completa.

---

## H4 — Acto IV: La Pista Central

> «Damas y caballeros… el número final.»

**Identidad**: el espectáculo. Todo lo anterior era el camino a la pista; ahora actúas tú, el público juzga y el Maestro presenta. Cierra las tres promesas del juego: el público (aplausómetro), El Contrato y «el Maestro aún te espera».

**Ficha** — `n: 4`, 9–11 salas normales, `hpMult: 2.0`, `champion: 0.16`, música `pista`, `exit: 'final'`, `contract: false`, `mods: { publico: 'dos_caras' }`. Suelo de serrín con el círculo de la pista; en las paredes, gradas con siluetas y ojos que parpadean.

### Sistemas nuevos

1. **Números (oleadas)** — `RoomTemplate.waves`: capas extra de 13×7 solo con criaturas; `RoomState.wave` guarda cuántas van. Entre oleadas: «Número 2 de 3», puntos de aparición marcados 0,7 s, puertas cerradas hasta la última. Un premio al final con extra por oleada.
2. **El público interviene** — el medidor pasa a `RunState` (hoy se pierde en cada cambio de acto) y gana dos caras: lleno, regalos (como hoy) más un ramo que cura medio globo; si te golpean baja a negativo y, pasado un umbral, **abucheo**: 2–4 tomates en parábola sobre marcas de sombra que dejan charcos que frenan. El daño de un tomate no vuelve a mover el medidor.
3. **Apagón** — algunas salas de dificultad 2–3 están a oscuras: luz alrededor del payaso y uno o dos focos que recorren la sala. Técnica: una capa de 240×144 que se rellena y se recorta con discos de luz cada fotograma, colocada **por debajo** de los disparos, que así siempre se ven; los avisos en el suelo cuentan como luces.
4. **Baldosas** — `A` aro de fuego (no sólido: tus disparos que lo cruzan salen ardiendo; quema si te quedas dentro) y `Q` cañón de pista (mecha de 1 s y dispara un hombre bala por su fila o columna).

### Criaturas (6)

| Letra | Criatura | Vida | Comportamiento | Parte de |
|---|---|---|---|---|
| `t` | **Trapecista** | 16 | Se balancea en péndulo; solo se le puede dar en la parte baja del arco. Lanza dos cuchillos en cada extremo; al tercer vaivén cae 1,5 s. | Loro + inmunidad por `lift` |
| `h` | **Hombre bala** | 22 | Línea de aviso 0,7 s → sale disparado hasta la pared rompiendo obstáculos; anillo de 8 y 1,2 s aturdido. | Mono + `telegraphLine` |
| `z` | **Zancudo** | 26 | Avanza a zancadas de tres baldosas; cada pisada marca su zona antes de caer. | Pulga + `telegraphCircle` |
| `x` | **Augusto** | 20 | El payaso malo: tartas en parábola hacia una marca; deja crema que frena. | Tragafuegos + disparo `lob` nuevo |
| `y` | **Acomodador** | 14 | Apoyo: su farol acelera a los aliados cercanos y cada 5 s señala tu posición al público. Objetivo prioritario. | Domador + aura |
| `B` | **Mujer Barbuda** (élite) | 60 | Látigos de barba en tres líneas con aviso y tirón hacia ella. Si llevas la **Barba Postiza** entra furiosa («¡Esa barba es MÍA!») y suelta premio seguro. | Domador + empuje de la Bestia invertido |

Más veteranos de los tres actos anteriores con ×2 de vida: «la compañía al completo».

### Plantillas: 20
8 números por oleadas, 4 apagones, 8 clásicas con aros y cañones. Ejemplos: `numero_trapecio` (trapecistas sobre fosos, luego hombres bala), `gran_desfile` (tres oleadas, una por acto anterior), `apagon_augustos`, `aros_de_fuego` (pasillo de aros que premia disparar a través).

### Jefe final: El Maestro de Ceremonias — 1.140 de vida en tres fases (+8 % por cada objeto de El Contrato que lleves)

Barra segmentada en tres. Las fases no se pueden saltar. Si firmaste algún contrato, te saluda: «Veo que ya trabajas para mí.»

**Fase 1 — El Presentador** (380). Inmóvil en su podio, dirige con la batuta. Anuncia un número y lo ejecuta; entre números, abanico de cartas.

| Anuncio | Número |
|---|---|
| «¡El Forzudo!» | Tres pesas caen sobre marcas y estallan en anillo |
| «¡Los Siameses!» | Una cuerda de clavos barre la sala con un hueco |
| «¡La Bestia!» | Dos rugidos en anillo desde los bordes y dos payasitos |
| «¡La Mujer Serpiente!» | Una serpiente de ocho disparos cruza ondulando |
| «¡Madame Fortuna!» / «¡Tu Reflejo!» | Marcas de La Torre / una ráfaga con tus modificadores |

Empieza por los jefes que venciste en esta partida. Es el repaso de todo lo aprendido.

**Fase 2 — El Duelo** (380). Baja a la pista: estocada de bastón con línea de aviso, chistera bumerán (sin ella, su cabeza recibe ×1,5), látigos en tres direcciones. Con contratos firmados añade «Letra pequeña»: una lluvia de pliegos teledirigidos lentos.

**Fase 3 — La Carpa Negra** (380). Se apagan las luces: el traje está vacío; quedan la chistera, la sonrisa y dos guantes. Los guantes golpean sobre sombras y barren (el daño a los guantes pasa a la cabeza al 60 %, como los segmentos de la Serpiente), la sonrisa escupe espirales, el público ahora es suyo y lanza tomates sin parar. Por debajo del 10 %, los telones laterales se cierran y estrechan la pista.

### Finales

Tras vencerle no hay trampilla ni contrato (`exit: 'final'`, `contract: false`): se abre la **Salida** con el mismo mecanismo que la puerta de El Contrato y la **chistera** queda en el suelo; hay que quedarse 1,2 s sobre ella para ponérsela, así nadie elige final sin querer. `finish(victory)` pasa a `finish('muerte' | 'libertad' | 'maestro')`.

- **Final A — La salida**: cruzas la puerta. Sin contratos: «Fuera amanece. Nadie te cree.» Con contratos: «Sales. Tu sombra se queda dentro, aplaudiendo.»
- **Final B — La chistera**: te la pones. «Damas y caballeros… / Mañana habrá un payaso nuevo.» (el epitafio de siempre, ahora dicho por ti). El menú cambia: Pompón lleva chistera.

Cada final desbloquea algo distinto (ver H6). `EndScene` pasa a mostrar epílogo por final, causa de muerte, récords y botón para copiar la semilla.

### Objetos que llegan con el Acto IV (8) y resto de El Contrato

| Objeto | Tipo | Efecto | Arquetipo |
|---|---|---|---|
| Tomate Podrido | pasivo | Disparos explosivos pequeños (no te hieren) | Explosivo |
| Megáfono | pasivo | Ondas anchas que atraviesan, −35 % de alcance | Haz corto |
| Red de Seguridad | pasivo | Una vez por acto sobrevives a un golpe mortal | Vida extra |
| La Claque | pasivo | El aplausómetro se llena el doble de rápido y da 3 regalos | Aplauso como estrategia |
| Ramo de Rosas | pasivo | Cada 12 muertes, medio globo | Curación al matar |
| Máscara de la Comedia / de la Tragedia | pasivos | ×1,3 de daño con todos los globos / +0,6 de daño por globo vacío | Pareja de riesgo |
| Foco de Teatro | orbital | Ilumina hacia donde apuntas; los iluminados reciben +25 % | Marcado |
| Cañón de Confeti | activo (3) | Cono que empuja, aturde 1 s y borra disparos | Control |

El Contrato llega a 9 con: Cláusula Adicional (+1 pelota por ráfaga, 2 globos), Pluma de Sangre (+0,1 de daño por sala limpia sin daño, 1 globo), Aplauso Eterno (el aplausómetro solo pierde la mitad al recibir daño, 2 globos).

### Arte, sonido y música
- `src/art/sprites/act4.ts` (≈380 líneas): 6 criaturas, Maestro en tres formas (podio, duelo, traje vacío con guantes y sonrisa), gradas con público, tomates, charcos, aro, cañón, telones, foco, salida, chistera, 11 iconos.
- Tema `pista` (marcha de circo en 2/4 con redoble) y tema del Maestro en tres capas, una más por fase.
- Público sonoro: murmullo, ovación, abucheo, tomatazo, redoble de «siguiente número».

### Archivos
Nuevos: `data/rooms/acto4.ts`, `entities/creatures4.ts`, `entities/bosses4.ts`, `art/sprites/act4.ts`, `systems/Publico.ts`, `systems/Oscuridad.ts`. Tocados: `acto1.ts` (`RoomTemplate.waves`), `run.ts` (`RoomState` con la oleada actual), `RoomFlow`, `ItemEffects.ts` (`Applause`), `HudScene.ts` (barra segmentada), `EndScene.ts`, `MenuScene.ts`, `save.ts`, `README.md`.

**Puerta de salida**: partida completa I→IV sin `dios()` en dos semillas de referencia; ambos finales alcanzados; cada fase del Maestro probada con `__juego.fase(n)`; salas de oleadas guardan y restauran bien al salir y volver; 60 fotogramas por segundo estables en la fase 3 y en apagones.

---

## H5 — Balance, economía y objetos transversales

- **Trajes (conjuntos)**: llevar 3 objetos de un grupo da un extra y un disfraz. *Fiera* (melena, colmillo, pluma, corazón, collar, leoncito): rugido que asusta al entrar en sala. *Malabarista* (triple, goma, equilibrista, llamas, cañón): +1 pelota. *Mago* (baraja, sierra, varita, chistera, El Loco): un disparo de cada cinco es una paloma teledirigida. *Payaso Completo* (nariz, zapatones, guantes, pajarita, maquillaje, barba; 4 de 6): +1 globo y aplauso doble.
- **Familiares que escalan** con tu daño; Mono de Juguete y Maquillaje Corrido heredan modificadores.
- **Objetos flojos reforzados**: Espejo Deformante (el disparo trasero hereda el abanico), Saco de Serrín (además ralentiza disparos enemigos que lo cruzan), Bola de Cristal (ve el jefe y el contenido del camerino).
- **Reservas para cuatro actos**: la de jefe solo tiene 7 objetos (todos compartidos con el camerino) y también se agotaría; se amplía, y un test de presupuesto comprueba que ninguna reserva se vacía en una partida completa.
- **Economía**: hoy entran 6–10 boletos por acto y un objeto del puesto cuesta 15. Usar el campo `price` (8/12/15/20 según potencia), +1 boleto seguro en salas de dificultad ≥ 2 y nuevos usos (Pitonisa 5, reposición del puesto 5).
- **Llaves y petardos**: puertas de reto con candado; espejos rompibles con premio.
- **Topes sanos**: daño con rendimiento decreciente por encima de ×3; la Bocina pasa a 2 cargas; el miedo del Látigo dura la mitad en jefes; el Empacho cuenta como daño rojo; la Diana no cierra El Contrato si el daño lo absorbe un globo de plata (y se avisa en la sala).
- **Curva**: los ataques fuertes de jefes de los actos III y IV quitan un globo entero; la curación entre actos pasa a +1 globo, o +2 si no perdiste rojos.
- **Medición**: registro local por sala (tiempo, daño recibido por criatura, causa de muerte) consultable con `__juego.telemetria()`; simulación Monte Carlo de la economía sobre `core/loot.ts` en Vitest.

---

## H6 — Metajuego

1. **Guardar y continuar** — instantánea al limpiar sala y al entrar en salas sin combate; se borra al morir o ganar. Exige serializar `RunState` (mapa de salas, estado de cada flujo de azar, reservas de objetos) y mover a `RunState` lo que hoy vive en la escena (aplausómetro, tiempo de juego). Ya hay media base: `ItemPools.toJSON()` existe y `new Rng(rng.state)` reproduce un flujo. Punto de guardado principal: al entrar en sala, antes de construirla (no hay nada transitorio y el contenido se regenera igual); segundo punto, 0,8 s después de limpiar, para no repetir un jefe vencido. La partida va en clave aparte (`carpa-negra:partida`), se valida al cargar y se borra en el instante en que la vida llega a cero. Salir a mitad de combate reinicia esa sala; no se pueden volver a tirar los premios porque el azar va guardado. El perfil conserva su clave con versión interna y cadena de migración.
2. **Carteles (logros)** — cada logro es un cartel de circo en un muro del menú. ~24 carteles que desbloquean ~14 objetos, 3 personajes y los modos. Ejemplos: vencer a cada jefe, acto sin daño, firmar tres contratos en una partida, premio gordo de la ruleta, identificar las 10 golosinas, completar un traje, ambos finales.
3. **Personajes**

| Personaje | Arranque | Rasgo | Se desbloquea |
|---|---|---|---|
| Pompón | 3 globos | Equilibrado | Inicial |
| Colombina, la trapecista | 2 globos, rápida, cuchillos | «Voltereta»: esquiva que se recarga por tiempo | Final A |
| Bruno, el forzudo arrepentido | 5 globos, lento, pelotas enormes, +3 petardos | Rompe cajones al andar | Vencer a El Forzudo sin daño |
| Silencio, el mimo | 3 globos, alcance corto, daño ×2 | Empieza con Maquillaje Corrido | Acto II sin usar petardos |

4. **La Gira** (tras el Final B): cinco niveles que suman reglas (más campeones, puesto más caro, jefes furiosos al 60 %, menos curación, salas malditas).
5. **La Función del Día**: semilla derivada de la fecha UTC, mismo personaje para todos, marcador local (acto, tiempo, puntuación) y texto para compartir. Las partidas con semilla escrita o diarias usan el catálogo completo de objetos para que la semilla signifique lo mismo en todas partes (las de semilla escrita no dan carteles; la diaria sí). Para que además no dependa del orden en que visitas las salas, los objetos de camerino, puesto, secreta y jefe se sortean al generar el acto: cambia qué objetos da una semilla antigua, no sus mapas.
6. **Récords**: mejor tiempo, racha, acto más lejano, muertes por criatura.

---

## H7 — Plataformas y presentación

- **Mando**: stick izquierdo mueve; stick derecho o botones frontales disparan en cuatro direcciones; gatillos para petardo, objeto y golosina; menús navegables; vibración opcional.
- **Táctil**: dos palancas virtuales y botones como capa HTML fuera del lienzo (en horizontal ocupan los márgenes; en vertical, bajo el juego), pantalla completa y manifiesto de aplicación web. El escalado actual es entero en píxeles de CSS ([main.ts:12](src/main.ts:12)) y en un móvil en vertical se queda en ×1 (240 px). Se calcula en píxeles reales del dispositivo: sigue siendo nítido y el juego crece (de 240 a 320 px de ancho en un móvil típico).
- **Opciones**: volumen de música por niveles, sacudida, destellos, transición, números de daño, pantalla completa, reasignar teclas (resuelve AZERTY), confirmación antes de reiniciar o salir; «reiniciar» ofrece misma semilla o nueva.
- **Accesibilidad**: formas además de colores en campeones, golosinas y minimapa; modo de alto contraste para disparos.
- **Presentación**: introducción en tres viñetas, **telón** entre actos (cierra al caer por la trampilla, cartela «Acto III», abre), créditos, menú con la carpa animada y el muro de carteles, icono y metadatos para compartir.
- **Idiomas**: tabla de textos `es` / `en` (las cadenas están hoy repartidas por todos los archivos).

---

## Archivos críticos

- Motor: [GameScene.ts](src/scenes/GameScene.ts), [RoomBuilder.ts](src/systems/RoomBuilder.ts), [Enemy.ts](src/entities/Enemy.ts), [Shot.ts](src/entities/Shot.ts), [Controls.ts](src/systems/Controls.ts)
- Datos: [acts.ts](src/data/acts.ts), [enemies.ts](src/data/enemies.ts), [items.ts](src/data/items.ts), [acto1.ts](src/data/rooms/acto1.ts) (`RoomTemplate`, `flipRows`, `DOOR_CELLS`)
- Lógica pura: [run.ts](src/core/run.ts), [floorgen.ts](src/core/floorgen.ts), [rng.ts](src/core/rng.ts), [stats.ts](src/core/stats.ts), [itempool.ts](src/core/itempool.ts), [save.ts](src/core/save.ts)
- Presentación: [HudScene.ts](src/scenes/HudScene.ts), [EndScene.ts](src/scenes/EndScene.ts), [MenuScene.ts](src/scenes/MenuScene.ts), [PauseScene.ts](src/scenes/PauseScene.ts), [music.ts](src/audio/music.ts), `sfx.ts`, [room.ts](src/art/sprites/room.ts), [font.ts](src/art/font.ts)
- Pruebas: `tests/run.test.ts`, [debugApi.ts](src/debug/debugApi.ts)

**Se reutiliza, no se reinventa**: `chase` / `flee` / `aimAtPlayer` y `Nav.lineFree` / `randomFreeTile`; inmunidad en el aire por `lift`; redirección de daño de `SerpienteSegmento`; patrón `roomUpdate` de `addRope`; `mareoT`; `spawnFire`, `explode`, `shockwave`; opción `burst` de los disparos; lluvia desde el techo del Forzudo; `Paloma`; clase `Applause`; `room.data` para estado persistente; banderas de `STYLE` en `room.ts`; `RngStreams.get(nombre, sal)`.

---

## Verificación

- **Automática en cada hito**: `npm test` (generador en 1.000 semillas por acto, validador de plantillas, instantáneas de mapas de los actos I y II, recorrido I→IV, ida y vuelta de guardado, economía simulada) y `npm run build`.
- **En el navegador** con `?seed=XXXX&jugar` y `window.__juego`: `sala(id)`, `jefe(kind)`, `fase(n)`, `acto(n)`, `avanzar(n)`, `hacer(...)`. La lógica se comprueba con pasos de fotograma; lo visual, a tiempo real (los tweens no siguen el reloj a pasos).
- **Prueba de humo de plantillas**: recorrer todas las plantillas × volteos con un bot sencillo y `dios()`; falla si hay excepción, criatura fuera de la sala o sala que no se limpia.
- **Semillas de referencia**: tres semillas fijas jugadas de principio a fin al cerrar H3, H4 y H5, anotando tiempo por acto, objetos y globos al llegar a cada jefe.
- **Rendimiento**: 60 fotogramas por segundo en apagones y en la fase 3 del Maestro, también con emulación de móvil.
