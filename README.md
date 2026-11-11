# Carpa Negra

Roguelike de mazmorras por salas, del mismo género que The Binding of Isaac,
ambientado en un circo de los horrores. Pompón, un payaso curioso, entra en una
carpa ambulante y descubre que no hay salida fácil: cada sala esconde criaturas
del circo, objetos que se combinan entre sí y un jefe al final de cada acto.

Esta primera versión incluye el **Acto I: La Carpa de Bienvenida** completo.

## Jugar

Necesitas Node 20 o superior.

```bash
npm install
npm run dev
```

Abre <http://localhost:5173>. Para la versión final, `npm run build` deja el
juego en `dist/` (es una web estática).

### Controles

| Tecla | Acción |
|---|---|
| WASD | Moverse |
| Flechas | Lanzar pelotas de malabares |
| E o Mayús | Poner un petardo |
| Espacio | Usar el objeto activo |
| Q | Comer la golosina |
| Esc o P | Pausa (volumen, reiniciar, menú) |

En el menú: **S** para escribir una semilla y **A** para ver el álbum de objetos.

## Qué hay en el Acto I

- **Piso generado al azar** con semilla reproducible: 8–10 salas normales a
  partir de 24 plantillas con volteos, más las salas especiales.
- **Salas especiales**: camerino (objeto gratis), puesto de feria (tienda, se
  abre con llave), entre bastidores (secreta, se abre con un petardo en la
  pared agrietada), diana del lanzacuchillos (recibe un cuchillo a cambio de
  premios) y barraca (ruleta a 3 boletos).
- **8 criaturas** con variantes campeón: mimo roto, polilla del foco, mono
  platillero, lanzacuchillos, caja sorpresa, monociclista, tragafuegos y pulga
  amaestrada.
- **2 jefes** (uno al azar): El Forzudo y Los Siameses.
- **33 objetos** (30 normales + 3 de El Contrato) que se combinan: triple
  malabar + cuchillos + palomitas + helio, etc.
- **7 golosinas misteriosas** cuyo efecto cambia en cada partida.
- **Aplausómetro**: mata sin que te den y el público te lanza regalos.
- **El Contrato**: si vences al jefe sin perder globos rojos en todo el acto,
  el Maestro de Ceremonias te ofrece objetos a cambio de globos máximos.

## Estructura

```
src/
  core/      lógica pura sin Phaser (azar, generador, estadísticas, partida)
  data/      objetos, criaturas, golosinas y plantillas de sala
  art/       paleta, sprites dibujados por código y fuente pixelada
  audio/     efectos y música sintetizados con WebAudio
  entities/  jugador, disparos, criaturas, jefes, familiares, recogibles
  systems/   controles, navegación, construcción de salas, efectos
  scenes/    arranque, menú, juego, marcador, pausa y final
  debug/     API de pruebas (window.__juego)
tests/       tests de Vitest (generador en 1000 semillas, estadísticas...)
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

En desarrollo (o con `?debug=1`) existe `window.__juego` en la consola:

- `__juego.estado()`, `__juego.mapa()`: estado de la partida y mapa del piso.
- `__juego.ir('jefe')`, `__juego.dar('tripleMalabar')`, `__juego.dios()`.
- `__juego.hacer({ derecha: true, dispararArriba: true }, 30)`: simula
  fotogramas con teclas pulsadas.

`?seed=ABCD1234&jugar` en la URL empieza directamente una partida con esa semilla.
