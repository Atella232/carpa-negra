# Semillas de referencia

Tres semillas fijas (FUNCION2, SERPIEN5 y BESTIA99) jugadas de principio a fin,
como pide la verificación del plan. Partidas completas del Acto I al IV **sin modo dios**, jugadas por el bot de
pruebas (`__juego.botActo()`, en `src/debug/bot.ts`). El bot esquiva balas,
avisos, charcos y cuerdas eligiendo cada fotograma la dirección de menor
peligro; apunta con anticipación; recorre el camino hasta el camerino, el
puesto, la secreta y el jefe; recoge objetos y globos; abre la secreta con un
petardo; compra si puede; y baja por la trampilla o sale por la puerta del final.
Se mueve entre salas con `ir` (como si cruzara la puerta); el combate es real.

El combate usa azar sin semilla, así que cada intento es distinto: se apunta el
porcentaje de intentos que llegan al final.

Cómo repetirlo (en la consola, con `?seed=XXXX&jugar`):

```js
for (let k = 0; k < 4; k++) { const r = __juego.botActo(); console.log(r); if (r.muerto) break; /* esperar el telón */ }
```

## Resultados (12 de noviembre de 2026, tras el ajuste del Acto II)

Formato: globos al empezar el acto · medios globos perdidos en salas · jefe (medios globos perdidos) · objetos al terminar · tiempo acumulado.

### FUNCION2 — 4 de 7 intentos llegan al final (Final A, la salida)

| Acto | Globos al empezar | Perdidos en salas | Jefe | Objetos | Tiempo |
|---|---|---|---|---|---|
| I | 6/6 | 3 | Los Siameses (1) | 3 | 1:42 |
| II | 6/6 | 2 | La Mujer Serpiente (2) | 5 | 4:04 |
| III | 6/6 | 3 | Madame Fortuna (2) | 8 | 6:05 |
| IV | 8/8 + 2 de plata | 2 | El Maestro de Ceremonias (5) | 12 | 8:25 |

### SERPIEN5 — 2 de 3 intentos llegan al final (Final A)

| Acto | Globos al empezar | Perdidos en salas | Jefe | Objetos | Tiempo |
|---|---|---|---|---|---|
| I | 6/6 | 1 | El Forzudo (1) | 3 | 2:40 |
| II | 6/6 + 2 de plata | 7 | La Mujer Serpiente (0) | 5 | 5:55 |
| III | 10/10 | 2 | Madame Fortuna (2) | 9 | 8:30 |
| IV | 10/10 + 2 de plata | 2 | El Maestro de Ceremonias (1) | 12 | 10:56 |

### BESTIA99 — llega al final (Final A)

| Acto | Globos al empezar | Perdidos en salas | Jefe | Objetos | Tiempo |
|---|---|---|---|---|---|
| I | 6/6 | 2 | El Forzudo (1) | 3 | 3:16 |
| II | 10/10 | 2 | La Bestia de la Jaula (8) | 7 | 7:14 |
| III | 8/10 + 2 de plata | 5 | Tu Reflejo (0) | 10 | 12:33 |
| IV | 10/10 + 4 de plata | 0 | El Maestro de Ceremonias (6) | 14 | 16:40 |

**Entre las tres semillas completas caen los siete jefes sin modo dios**:
El Forzudo, Los Siameses, La Bestia, La Mujer Serpiente, Tu Reflejo, Madame
Fortuna y El Maestro de Ceremonias.

### REFERENC (semilla de control difícil) — 0 de 45 intentos llegan al final

No forma parte de las tres semillas de referencia: se usa como control de una
partida con mala suerte. Su Acto I da pocos objetos útiles y su jefe es Los
Siameses; en el Acto II tocan salas de cobras y La Bestia. Resultados de 45
intentos: el mejor llega al Acto III; unos 25 mueren en el Acto I y el resto en
el II. Revisadas las salas una a una, no hay golpes inevitables: el bot se deja
acorralar (por ejemplo, por los tres mimos de *trio_mimos* volteada). No se ha
retocado el juego para esta semilla concreta.

### Otras semillas (un intento cada una)

De 18 semillas más, el bot muere casi siempre en el Acto I (polillas, tachuelas)
o en el Acto II (cobras, La Bestia), con pocos objetos. El bot juega peor que una
persona en esas dos situaciones: aquí el dato útil es **dónde** muere, no el
porcentaje.

## Ajustes de balance que salieron de estas pruebas

- **La suerte bajaba los premios** al limpiar sala (error de signo): ahora los sube.
- **Avisos que faltaban**: las embestidas de El Forzudo, Tirón (Los Siameses), el
  Mono platillero, el León y La Bestia ya marcan su línea en el suelo y van por ella.
- **Acto II** (el muro de la mayoría de intentos): vida de las criaturas ×1,15
  (antes ×1,3); las cobras escupen un abanico por salida (las campeonas, dos),
  reaparecen lejos del payaso y avisan antes de asomar; La Bestia tiene 330 de
  vida (antes 380), anillos algo menos densos, empuje menor al rugir y como mucho
  dos payasitos a la vez.
- **Acto III**: vida ×1,5 (antes ×1,65); el Reflejo roto contesta como mucho cada
  1,2 s; las cartas del ilusionista van más despacio y avisan más; los muñecos
  tardan más en levantarse, avisan antes y no muerden nada más levantarse.
- **Acto IV**: vida ×1,75 (antes ×2); el trapecista lanza cuchillos un vaivén sí y
  otro no.
- **Curas**: más globos en los premios al azar (y más boletos para que la
  economía no cambie).
- Dos fallos que rompían el juego: un señuelo que desaparecía en su propio turno
  y una tarta del Augusto que caía después de morir él.

## Rendimiento

Coste por fotograma (actualización + dibujo, forzando a la GPU a terminar), en
las escenas más pesadas:

| Escena | Media | Percentil 95 | Máximo |
|---|---|---|---|
| El Maestro, fase 3 (a oscuras, guantes) | 0,2 ms | 0,4 ms | 14 ms |
| Lo mismo con 300 balas en pantalla | 0,56 ms | 1,1 ms | 13,5 ms |
| Apagón con hombres bala y zancudos | 0,16 ms | 0,3 ms | 11 ms |
| Número final (oleadas) | 0,18 ms | 0,5 ms | 13,5 ms |

El presupuesto a 60 fps es 16,7 ms. Los máximos son fotogramas sueltos (recolección
de memoria o el primer dibujo de una sala).

### Fps en un navegador visible (GPU real)

Chrome de escritorio visible, WebGL sobre la GPU real (Apple M5, Metal), a
tiempo real:

| Escena | Fps | Fotogramas > 25 ms | Peor fotograma |
|---|---|---|---|
| Juego en reposo (referencia) | 60 | 0 | 18,5 ms |
| Sala del Acto I | 60 | 0 | 18,7 ms |
| 300 balas en pantalla | 60 | 0 | 18,6 ms |
| Apagón total (Acto IV) | 60 | 0 | 18,7 ms |
| Número final (oleadas) | 60 | 0 | 18,7 ms |
| El Maestro, fase 3, a oscuras | 60 | 0 | 18,7 ms |
| El Maestro, fase 3, + 300 balas | 60 | 0 | 18,7 ms |

El peor fotograma es igual en reposo que en las escenas pesadas: es el temblor
normal de la pantalla, no coste del juego.

### Fps reales en pantalla (Chrome sin interfaz)

Medidos a tiempo real (sin avanzar fotogramas a mano) en Chrome sin interfaz con
WebGL, contando fotogramas con `requestAnimationFrame` durante 3–5 s por escena
(`node scripts/medir-fps.mjs <perfil>`). «Largos» = fotogramas de más de 25 ms.

| Escena | Escritorio | Móvil 375×812 | Móvil con CPU ×4 más lenta |
|---|---|---|---|
| Sala del Acto I | 60 fps · 0 largos | 60 · 0 | 60 · 0 |
| 300 balas en pantalla | 60 · 0 | 60 · 0 | 60 · 0 |
| Apagón total (Acto IV) | 60 · 0 | 60 · 0 | 60 · 0 |
| Número final (oleadas) | 60 · 0 | 60 · 0 | 60 · 0 |
| El Maestro, fase 3, a oscuras | 60 · 0 | 60 · 0 | 60 · 0 |
| El Maestro, fase 3, + 300 balas | 60 · 0 | 60 · 0 | 60 · 0 |

En todas, el percentil 95 del tiempo entre fotogramas es 16,7–16,8 ms (el ritmo
de la pantalla) y el peor, 16,8 ms. La GPU de un móvil real no se puede emular
aquí: la prueba con la CPU frenada cubre la parte del procesador.

### WebKit (el motor de Safari) con un iPhone 13 emulado

Playwright con WebKit y el perfil `iPhone 13` (390×664, densidad ×3, táctil y
agente de Safari para iOS), en vertical y en horizontal, a tiempo real y sin
ventana. Es lo más cercano a un iPhone que se puede probar sin el teléfono; la
GPU sigue siendo la del Mac.

| Escena | Vertical | Horizontal |
|---|---|---|
| Sala del Acto I | 60 fps · 0 largos | 60 · 0 |
| 300 balas en pantalla | 60 · 0 | 60 · 0 |
| Apagón total (Acto IV) | 60 · 0 | 60 · 0 |
| Número final (oleadas) | 60 · 0 | 60 · 0 |
| El Maestro, fase 3, a oscuras | 60 · 0 | 60 · 0 |
| El Maestro, fase 3, + 300 balas | 60 · 0 | 60 · 0 |

Peor fotograma: 24 ms. Además se comprobó:

- Sin errores en la consola, con WebGL.
- **Audio**: suspendido hasta el primer toque y en marcha después.
- **Palanca izquierda**: mueve al payaso.
- **Botón PET**: pone un petardo.
- **Escala**: en vertical, ×4 en píxeles reales (320×235 CSS) con los controles
  debajo; en horizontal, ×5 (400×293) con las palancas y los botones en los
  márgenes, sin tapar la sala ni el marcador.
- **Pantalla completa**: la opción no aparece, porque el iPhone no la admite
  (allí se usa «Añadir a pantalla de inicio»).

Fallos que encontró esta prueba y ya están arreglados:

- **Toques rápidos**: un toque (o una tecla) que se soltaba antes del siguiente
  fotograma se perdía. Ahora cada pulsación cuenta al menos una vez (test en
  `tests/controls.test.ts`).
- **Controles en horizontal**: en un iPhone apaisado las palancas tapaban los
  bordes de la sala y los botones, el aplausómetro y el mapa. Ahora el lienzo
  deja libre el sitio que ocupan los controles, medido sobre los elementos
  reales, así que incluye la muesca.
- **Pantalla completa**: la opción ya no aparece donde no funciona.
- **Audio en iOS**: también se desbloquea con `touchend` y `click`, los
  gestos que Safari acepta.
- **Icono**: hay un icono PNG de 180 px para la pantalla de inicio de iOS (no
  usa iconos SVG).

Con la ventana visible pero tapada por otras, macOS frena WebKit a unos 5 fps
(fotogramas de 220 ms constantes, también en la sala más ligera). Es el sistema ahorrando
energía, no coste del juego.

Para medir en un teléfono de verdad: `npm run dev -- --host` y abrir en el
móvil la dirección «Network» con `?fps`.
