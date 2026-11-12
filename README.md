# Carpa Negra

Roguelike de mazmorras por salas, del mismo género que The Binding of Isaac,
ambientado en un circo de los horrores. Pompón, un payaso curioso, entra en una
carpa ambulante y descubre que no hay salida fácil: cada sala esconde criaturas
del circo, objetos que se combinan entre sí y un jefe al final de cada acto.

El juego completo tiene **cuatro actos** y **dos finales**:

1. **La Carpa de Bienvenida**
2. **Las Jaulas**
3. **La Casa de los Espejos**
4. **La Pista Central**, con El Maestro de Ceremonias como jefe final.

Entre actos cae un telón, se conservan los objetos y se recupera un globo (dos si
no perdiste globos rojos en el acto).

## Jugar

**En línea:** <https://atella232.github.io/carpa-negra/> (también en el móvil,
que puede instalarlo con «Añadir a pantalla de inicio»).

Para jugar en local necesitas Node 20 o superior.

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. Para la versión final, `npm run build` deja el
juego en `dist/` (es una web estática que también se puede instalar en el móvil).

### Controles

| Teclado | Mando | Acción |
|---|---|---|
| WASD | Stick izquierdo / cruceta | Moverse |
| Flechas | Stick derecho o Y A X B | Lanzar pelotas de malabares |
| E o Mayús | LT / LB | Poner un petardo |
| Espacio | RT | Usar el objeto activo |
| Q | RB | Comer la golosina |
| Tab (mantener) | Select | Estadísticas y mapa completo |
| Esc o P | Start | Pausa |

En pantallas táctiles aparecen dos palancas y botones. Todas las teclas se pueden
reasignar en **Opciones → Teclas**.

El botón de la esquina (⛶) pone el juego a pantalla completa y lo quita, igual
que la opción del menú. No aparece en iPhone, donde el navegador no lo permite:
allí se usa «Añadir a pantalla de inicio».

## Menú

- **Continuar**: la partida se guarda al entrar en cada sala y poco después de
  limpiarla, y se borra al morir. Salir al menú desde la pausa también la guarda.
- **Función del día**: la misma semilla para todo el mundo, con marcador propio.
- **Personaje**: Pompón y tres más que se desbloquean (Colombina, Bruno y Silencio).
- **La Gira**: tras el final de la chistera, cinco niveles de dificultad.
- **Carteles**: 24 logros que desbloquean objetos, personajes y modos.
- **Álbum**: todos los objetos vistos, con su descripción y su historia.
- **Opciones**: volúmenes, sacudidas, destellos, paradas de impacto, paso de sala
  (deslizar o fundido), números de daño, balas de alto contraste, vibración,
  controles táctiles, pantalla completa, idioma (español / inglés) y teclas.

## Los actos

### Acto I: La Carpa de Bienvenida
Mimos, polillas, monos platilleros, lanzacuchillos, cajas sorpresa,
monociclistas, tragafuegos y pulgas. Jefes: El Forzudo o Los Siameses.

### Acto II: Las Jaulas
Jaulas que dejan pasar las balas y fardos de paja. Leones, cobras, osos, loros,
domadores zombis y payasitos tristes. Jefes: La Bestia de la Jaula o La Mujer
Serpiente.

### Acto III: La Casa de los Espejos
Espejos que devuelven todos los disparos y suelos móviles. Reflejos rotos que
contestan a tus disparos, bailarinas de caja de música, ilusionistas con cartas
que vuelven y señuelos, ventrílocuos con muñecos que se levantan, tragasables que
desvían lo que les llega de frente y cabezudos que se parten. Jefes:
**Tu Reflejo** (dispara con una copia de tus objetos) o **Madame Fortuna** (cada
ataque se anuncia con una carta del tarot).

### Acto IV: La Pista Central
Salas por oleadas («números»), apagones con luz alrededor del payaso, aros de
fuego que prenden tus pelotas y cañones de pista. El público vota: si llenas el
aplausómetro te lanza regalos y un ramo; si te golpean, abuchea y tira tomates.
Trapecistas, hombres bala, zancudos, augustos, acomodadores y la Mujer Barbuda.
Jefe final: **El Maestro de Ceremonias**, en tres fases (el presentador, el duelo
y la Carpa Negra). Después, una salida y una chistera: dos finales.

### Salas especiales
Camerino, puesto de feria (con reposición), entre bastidores (secreta), diana,
barraca de la ruleta, **Gabinete de la Pitonisa** (lecturas por boletos) y
**Número de riesgo** (un objeto que, al cogerlo, desata dos oleadas).

### Objetos
64 objetos: estadísticas, disparos (triple, rebote, fuego, veneno, esquirlas,
cadena, división, carga, explosivos, críticos...), familiares que escalan con tu
daño, activos y los nueve de **El Contrato**, que se pagan con globos máximos.
Los **trajes** (Fiera, Malabarista, Mago y Payaso Completo) dan un extra y un
disfraz al juntar varias piezas.

## Estructura

```
src/
  core/      lógica pura sin Phaser (azar, generador, estadísticas, partida,
             guardado, carteles, función del día, economía, telemetría)
  data/      actos, baldosas, objetos, trajes, personajes, criaturas, botín y plantillas
  art/       paleta, sprites dibujados por código y fuente pixelada
  audio/     efectos y música sintetizados con WebAudio (con capas y fundidos)
  entities/  jugador, disparos, criaturas, jefes (clase Boss con fases y guiones),
             familiares, recogibles y registros
  systems/   controles (teclado, mando, táctil), avisos, efectos, oscuridad,
             baldosas, navegación, construcción de salas
  scenes/    arranque, menú, juego, marcador, pausa y final
  ui/        texto, menús, opciones e idiomas
  debug/     API de pruebas (window.__juego)
tests/       Vitest: semillas doradas, plantillas, generador, actos, guardado,
             carteles, economía...
docs/        plan de los actos III y IV
```

## Cambiar el arte

Todo el arte se dibuja por código. Para sustituir un sprite por una imagen,
deja un PNG con el nombre de su clave en `src/art/overrides/` (detalles en
`src/art/overrides/LEEME.md`).

## Desarrollo y pruebas

```bash
npm test          # tests de lógica
npm run build     # comprobación de tipos + compilación
```

`tests/golden.test.ts` fija los mapas de 25 semillas de los actos I y II: si
falla, una semilla antigua ya no da la misma partida.

En desarrollo (o con `?debug=1`) existe `window.__juego` en la consola:

- `__juego.estado()`, `__juego.mapa()`: estado de la partida y mapa del piso.
- `__juego.ir('jefe')`, `__juego.dar('tripleMalabar')`, `__juego.dios()`,
  `__juego.acto(3)` (salta al acto conservando al jugador).
- `__juego.sala('pasillo_espejos', { flipX: true })`: prueba una plantilla.
- `__juego.jefe('fortuna')`, `__juego.fase(2)`: lucha contra un jefe y salta de fase.
- `__juego.hacer({ derecha: true, dispararArriba: true }, 30)`: simula
  fotogramas con teclas pulsadas.
- `__juego.telemetria()`: salas más dañinas y lentas, y causas de muerte.
- `__juego.botActo()`: un bot juega el acto actual **sin modo dios** (esquiva,
  apunta, recoge y baja por la trampilla). Resultados de las semillas de
  referencia en `docs/semillas-de-referencia.md`.

`?seed=ABCD1234&jugar` en la URL empieza directamente una partida con esa semilla.

`node scripts/medir-fps.mjs /tmp/perfil` mide los fps reales (escritorio y móvil)
en un Chrome sin interfaz, con el servidor de desarrollo en el puerto 5180.

`?fps` en la URL muestra un contador de fotogramas en una esquina. Para probar en
un móvil de verdad, arranca `npm run dev -- --host` y abre en el teléfono (en la
misma wifi) la dirección «Network» que imprime Vite, añadiendo `?fps`.
