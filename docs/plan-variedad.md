# Carpa Negra — Plan de variedad: más enemigos, salas, objetos y azar

## Estado (noviembre de 2026)

Ejecutado entero en la rama `variedad`, un commit por fase. Lo que se apartó del
plan, y por qué (las cifras de las tablas de abajo ya son las definitivas salvo
estas notas):

- **Fase 0**: el test destapó una sala más que la tabla (`cabezas_rodantes`,
  con 4 criaturas pesadas): se cambió un cabezudo por una bailarina. En
  `reflejo_total` se quitó un tragasables (no un reflejo), por la misma regla.
  `braseros` y `tragafuegos_nichos` pasaron a dificultad 2 tal como estaban
  (primero se les añadió un mimo, pero en las partidas completas del bot
  `tragafuegos_nichos` era donde más se moría en el Acto I).
- **Fase 1**: el fuego del Tragafuegos sigue durando 3 s (no 4). El disparo que
  moja un fuego **sigue su camino** (cada pelota moja
  cada fuego una sola vez). Pararlo, como decía el plan, convertía el fuego en un
  escudo: en `tragafuegos_nichos` el bot perdía 24 medios globos por sala; ahora, 2.
- **Fase 2**: si no caben todas las salas extra sorteadas, el generador vuelve a
  intentarlo (y a partir de 300 intentos pide menos), en lugar de colocar solo
  las que quepan.
- **Fases 3 y 5**: las criaturas que guardan la distancia (vendedor de globos,
  malabarista, hipnotizador) se apartan hacia el centro despejado
  (`Enemy.keepAway`), no contra las paredes: pegadas al borde eran muy difíciles
  de alinear y alargaban las salas.
- **Fase 3**: el malabarista lanza sus mazas cada 2 s (no 2,5): el bot tardaba
  demasiado en limpiar sus salas.
- **Fase 4**: el mono ladrón, con el saco, huye más despacio hacia sitios
  despejados (no a las esquinas) y se sienta a contar 1,5 s de cada 4: si no,
  era casi imposible de cazar. `comodin_fosos` lleva una criatura menos (11).
- **Fase 5**: el autómata tiene 18 de vida (no 22). `engranajes` lleva 4 bloques
  y `comodin_espejos` 2 espejos (no 8 y 4): el bot apenas las limpiaba.
- **Fase 7**: el bumerán vuelve a la mano del payaso (no al punto de salida) y a
  la vuelta no choca con las paredes. El carrusel es un modificador de disparo
  (`shot.cross`); el tambor, una bandera (`redoble`).

Resultados del bot antes y después: `docs/semillas-de-referencia.md`.

## Contexto

El juego gusta, pero se hace repetitivo. Se pide más variedad «sin pasarse»: más tipos de enemigos, más salas y mejor hechas (justas), más objetos que cambien el disparo, más azar en las salas especiales (hoy siempre hay una de cada y una sola secreta), alguna sala más por acto y que las llamas se puedan apagar a disparos.

### Por qué se repite hoy (medido en el código)

| Causa | Dato | Dónde |
|---|---|---|
| Una sala puede salir repetida en el mismo acto | Las plantillas se eligen con `mapRng.pick` sin descartar las ya usadas | [run.ts:183](src/core/run.ts:183) |
| Cada plantilla trae siempre las mismas criaturas en el mismo sitio | Solo cambian los volteos | [RoomBuilder.ts:168](src/systems/RoomBuilder.ts:168) |
| Pocas criaturas y muy concentradas | Acto I: 8 especies; el mimo sale en 11 de 24 plantillas. Acto II: 6 especies y solo 18 plantillas | `src/data/rooms/acto*.ts` |
| Salas especiales sin sorpresa | Siempre jefe + camerino + puesto, y diana + barraca en más del 90 % de los mapas; exactamente 1 secreta | [floorgen.ts:57](src/core/floorgen.ts:57), [acts.ts:47](src/data/acts.ts:47) |
| Pocos objetos «de disparo» | 16 de 55 (sin contar El Contrato); en una partida ves casi la mitad del catálogo | [items.ts](src/data/items.ts) |
| Dificultad irregular dentro del mismo nivel | En el Acto II, una sala de dificultad 2 va de 4 a 14 «puntos de amenaza» | medido con la tabla de la Fase 0 |
| El fuego parece indestructible | Los braseros ya se apagan con 4 disparos pero no dan ninguna señal; los charcos de fuego no se pueden apagar | [combat.ts:171](src/systems/combat.ts:171), [props.ts:220](src/entities/props.ts:220) |

### Qué cambia (resumen)

| | Hoy | Después |
|---|---|---|
| Criaturas de sala | 27 | **39** (+3 por acto) |
| Plantillas de sala | 84 (24/18/22/20) | **124** (34/28/32/30) |
| Salas normales por acto | 8–10 / 9–11 / 10–12 / 9–11 | **+1 en cada acto** |
| Tipos de sala especial | 8 | **11** (Almacén, Cama de clavos, Carromato del curandero) |
| Salas especiales por acto | fijas (≈5) | **5–7, sorteadas** de una bolsa con pesos |
| Salas secretas | 1 | **1 o 2** (50 % de «trastienda») |
| Objetos | 64 | **80** (12 cambian el disparo) |
| Variación dentro de una sala | ninguna | **comodines**: la misma plantilla trae criaturas distintas |
| Salas repetidas en un acto | posible | **nunca** (mientras queden plantillas) |
| Fuego | no se apaga | **se apaga a disparos** |

### Consecuencias que hay que aceptar

- **Las semillas antiguas darán mapas distintos.** Es inevitable al cambiar el generador y añadir plantillas. Las instantáneas de `tests/golden.test.ts` se regeneran a propósito en las fases que tocan el generador o las plantillas (se indica en cada una).
- **Las partidas guardadas siguen cargando**: guardan sus salas tal cual y no dependen de lo nuevo. No se toca `RUN_SAVE_VERSION`.
- La partida se alarga unos 4–6 minutos (una sala normal y, de media, una especial más por acto).

---

## Cómo trabajar (vale para todas las fases)

1. **Antes de empezar**: copiar este plan a `docs/plan-variedad.md` y crear la rama `variedad`.
2. **Una fase = un commit** (o varios pequeños). Al acabar cada fase: `npm test`, `npm run build` y la comprobación en navegador indicada.
3. **Navegador**: `npm run dev` y abrir `http://localhost:5173/?seed=CARPA000&jugar`. En la consola existe `window.__juego` ([debugApi.ts](src/debug/debugApi.ts)): `crear('mimo')`, `sala('id', {flipX:true})`, `acto(3)`, `ir('camerino')`, `dar('idObjeto')`, `dios()`, `avanzar(60)`, `hacer({...}, 30)`, `matarTodo()`, `mapa()`, `estado()`.
4. **Textos**: todo nombre o descripción nueva necesita su traducción en [src/ui/i18nGame.ts](src/ui/i18nGame.ts); `tests/i18n.test.ts` falla si falta.
5. **Azar**: lo que decide el mapa usa `mapRng` dentro de `buildAct`; nunca `Math.random()` para decisiones de mapa u objetos.

### Receta: añadir una criatura

1. [src/data/enemies.ts](src/data/enemies.ts): añadirla a `EnemyKind`, a `ENEMIES` (vida, velocidad, `flying`, textura, cuerpo), su letra a `TEMPLATE_ENEMY`, su color a `GIB_COLOR` y su valor a `THREAT` (Fase 0).
2. Clase en `src/entities/creatures.ts` (Acto I), `creatures2.ts`, `creatures3.ts` o `creatures4.ts`: `export class X extends Enemy { protected think(dt) { … } }`. Ayudas de [Enemy.ts](src/entities/Enemy.ts): `chase()`, `flee()`, `toward(x,y)`, `distToPlayer()`, `aimAtPlayer(v)`, `ring(n, v)`, `fan(n, apertura, v)`, `after(seg, fn)`, `windupFlash()`. Avisos: `this.sc.telegraph.line / circle / marker`. Disparos: `this.sc.spawnShot(x, y, vx, vy, false, {damage: 1, range})`. Invocar: `this.sc.spawn(kind, x, y)`.
3. [src/entities/spawn.ts](src/entities/spawn.ts): importarla y añadirla a `CREATURE_CTORS` (si falta, no compila).
4. Sprite con la misma clave que `texture` en `src/art/sprites/enemies.ts` (Acto I) o `act2.ts` / `act3.ts` / `act4.ts`: `{ w, h, frames, paint: (p, f) => … }` con las primitivas de [pix.ts](src/art/pix.ts) (`rect`, `disc`, `ellipse`, `line`, `px`).
5. Traducción del nombre en `i18nGame.ts`.
6. Probar: `__juego.crear('kind')` en una sala vacía; luego dentro de una plantilla.

**Regla de justicia**: todo ataque avisa al menos 0,35 s antes (`windupFlash` + línea, círculo o marca).

### Receta: añadir un objeto

1. [src/data/items.ts](src/data/items.ts): entrada `ItemDef` (id, nombre, descripción corta, `pools`, `shot` / `stats` / `flags`, `lore`) y precio en `PRICES`.
2. Si trae un modificador de disparo nuevo: declararlo en `ShotMods` y darle valor por defecto y regla de combinación en `computeStats` ([stats.ts](src/core/stats.ts)); pasarlo en `buildVolley` ([volley.ts](src/core/volley.ts)); añadirlo a `ShotOpts` y a sus valores por defecto ([Shot.ts:68](src/entities/Shot.ts:68)); programar el efecto en `Shot.ts` (trayectoria) o en [combat.ts](src/systems/combat.ts) (impactos).
3. Icono `obj_<id>` de 14×14 en [src/art/sprites/items.ts](src/art/sprites/items.ts).
4. Traducción de nombre y descripción.
5. Probar con `__juego.dar('<id>')`, solo y combinado con `tripleMalabar`, `pelotasGoma` y `cuchillosLanzador`.

### Receta: añadir una plantilla de sala

1. Añadirla **al final** de la lista del acto en `src/data/rooms/actoN.ts`: `{ id, diff, rows: [7 cadenas de 13 caracteres], waves?, dark? }`.
2. Letras: baldosas en [tiles.ts](src/data/tiles.ts), criaturas en `TEMPLATE_ENEMY`, comodines `5` `6` `7` (Fase 2).
3. Reglas que comprueba `tests/templates.test.ts` (y `tests/balance.test.ts` desde la Fase 0): las cuatro celdas de puerta — (6,0), (6,6), (0,3), (12,3) — son `.`; las cuatro puertas están conectadas andando; toda criatura se puede alcanzar a disparos; el total de amenaza cabe en el presupuesto de su dificultad.
4. Probar: `__juego.sala('<id>')` y con `{flipX: true, flipY: true}`.

### Receta: añadir un tipo de sala especial

1. Tipo en `RoomType` ([floorgen.ts:5](src/core/floorgen.ts:5)).
2. Bolsa de extras del acto en [acts.ts](src/data/acts.ts).
3. Contenido: nuevo `case` en `buildSpecial` ([RoomBuilder.ts:227](src/systems/RoomBuilder.ts:227)); estilo de puerta en `doorStyle` ([RoomBuilder.ts:149](src/systems/RoomBuilder.ts:149)); si se abre con llave, añadirla a la condición de [RoomBuilder.ts:120](src/systems/RoomBuilder.ts:120).
4. Arte en [src/art/sprites/room.ts](src/art/sprites/room.ts): colores de suelo en `STYLE` (líneas 40–56), entrada en el tipo `DoorStyle` y en sus colores (líneas 338–360). Añadir el estilo a `DOOR_STYLES` en [src/art/index.ts:14](src/art/index.ts:14).
5. Icono del minimapa en `ROOM_GLYPH` ([HudScene.ts:475](src/scenes/HudScene.ts:475)).
6. Traducciones de los textos de la sala.

---

## Fase 0 — Red de seguridad y medida de la justicia

Objetivo: poder decir con números si una sala es justa, antes de añadir nada.

**0.1 Amenaza por criatura.** En [enemies.ts](src/data/enemies.ts) añadir `export const THREAT: Record<EnemyKind, number>`:

| Valor | Criaturas |
|---|---|
| 1 | polilla, payasito, titi*, globoSuelto* |
| 1,5 | pulga, perrito* |
| 2 | mimo, monociclista, loro, munieco, cabecita |
| 3 | mono, lanzacuchillos, caja, tragafuegos, leon, cobra, reflejo, bailarina, trapecista, augusto, acomodador, malabarista*, foca*, faquir*, automata*, sombra*, hipnotizador* |
| 4 | oso, domador, ilusionista, ventrilocuo, tragasables, cabezudo, hombreBala, zancudo, globero* |
| 5 | cochePayasos*, orquesta*, dragon* |
| 7 | barbuda |
| 0 | senuelo, orbe, copia, guante (no salen en plantillas) |

(* = criaturas nuevas; se añaden en su fase.)

**0.2 Test de presupuesto** — nuevo `tests/balance.test.ts`. Para cada plantilla suma la amenaza de la capa base y de cada oleada (un comodín cuenta como la criatura más fuerte de su lista) y exige:

| | Dificultad 1 | Dificultad 2 | Dificultad 3 | Cada oleada |
|---|---|---|---|---|
| Actos I y II | ≤ 8 | 4 – 12 | 8 – 15 | ≤ 14 |
| Actos III y IV | ≤ 10 | 4 – 14 | 8 – 20 | ≤ 14 |

Además: como mucho 3 criaturas de amenaza ≥ 4 en la capa base.

**0.3 Arreglar lo que el test destape hoy** (ya medido):

| Plantilla | Hoy | Arreglo |
|---|---|---|
| `viejos_conocidos` (II, dif. 2) | 14 | quitar un monociclista → 12 |
| `mezcla_fieras` (II, dif. 3) | 17 | quitar un loro → 15 |
| `viejos_iv` (IV, dif. 2) | 20 | pasarla a dificultad 3 |
| `reflejo_total` (III, dif. 3) | 22 | quitar una criatura de amenaza 3 → 19 |
| `gran_desfile` (IV), 2.ª oleada | 21 | repartirla en dos oleadas o quitar 7 puntos |
| `islas_polillas` (I, dif. 2) | 2 | añadir una polilla y un mimo → 5 |
| `braseros`, `tragafuegos_nichos` (I, dif. 3) | 6 | añadir un `5` o pasarlas a dificultad 2 |
| `fosos_leones` (II, dif. 3) | 6 | añadir un león → 9 |

**0.4 Prueba con el bot** — en [debugApi.ts](src/debug/debugApi.ts) añadir `probarSalas(acto = sc.run.act)`: para cada plantilla del acto, con volteo normal y con ambos volteos, pone la vida a 3 globos, llama a `api.sala(id, flips)` y a `botFight(sc, av, 90)` (el mismo que usa `botActo`, [bot.ts](src/debug/bot.ts)) sin modo dios, y devuelve una tabla `{ sala, dif, seg, mediosPerdidos, limpia }` ordenada de peor a mejor. Sirve para comparar: **una sala nueva no debe salir peor que la peor sala ya existente de su misma dificultad**, y todas deben limpiarse en menos de 90 s.

**Comprobación**: `npm test` en verde (con los 8 arreglos). Regenerar instantáneas: `npx vitest run tests/golden.test.ts -u`. Guardar la tabla de `probarSalas()` de los cuatro actos en `docs/semillas-de-referencia.md` como referencia «antes».

---

## Fase 1 — El fuego se apaga a disparos

**Charcos de fuego** (clase `Fire`, [props.ts:220](src/entities/props.ts:220)):
- Añadir `hp = 2` y un método `douse(n = 1)`: resta, lanza un soplo de vapor (`sc.fx.sparks(x, y, 0xcfd3dc, 4)`), suena `sc.snd('fuego')`, reduce la escala a 0,7; al llegar a 0, humo y `destroy()`.
- En `GameScene`, junto a `checkHazards` ([GameScene.ts:405](src/scenes/GameScene.ts:405)), nuevo `checkFireShots()` llamado cada fotograma: recorre `this.hazards` y los disparos del jugador (`this.g.pShots.getChildren()`); si un disparo vivo está a menos de 8 px de un fuego, `fire.douse(daño ≥ 7 ? 2 : 1)` y el disparo hace `pop('obstaculo')` salvo que sea perforante o espectral. Los disparos con `burn` lo atraviesan sin apagarlo.
- Las explosiones de petardo apagan los fuegos de su radio (en la función de explosión de `combat.ts`, mismo bucle sobre `hazards`).
- El fuego del Tragafuegos pasa de 3 a 4 s ([creatures.ts:229](src/entities/creatures.ts:229)).

**Braseros** ([combat.ts:171](src/systems/combat.ts:171)): pasan de 4 a **3** golpes y cada golpe se nota: vapor, sonido y la llama se oscurece (`setTint` 0xcccccc → 0x999999). Los golpes ya se guardan en `room.damaged`; aplicar el tinte también al reconstruir la sala.

**Aros de fuego** (Acto IV): no cambian (son una ventaja del jugador).

**Comprobación**: `?seed=CARPA000&jugar`, `__juego.sala('circulo_fuego')` y `__juego.sala('braseros')`: apagar un brasero con 3 disparos y los charcos del tragafuegos con 2; un petardo apaga los de alrededor. Contador para el cartel de la Fase 7: `run.stats.fuegos++` en cada apagado (añadir el campo en [run.ts](src/core/run.ts) con valor inicial 0).

---

## Fase 2 — Generador: sin repetir, más salas, especiales al azar, comodines

Esta fase cambia todos los mapas: al terminar, `npx vitest run tests/golden.test.ts -u`.

### 2.1 No repetir plantillas en un acto
En `buildAct` ([run.ts:171](src/core/run.ts:171)) llevar un `Set` de ids usados. Al elegir: candidatas = plantillas de la dificultad pedida no usadas; si no hay, las no usadas de dificultad ±1; si no hay, cualquiera no usada; si se han usado todas, cualquiera. Test nuevo en `tests/run.test.ts`: en 200 semillas × 4 actos no hay dos salas con el mismo `templateId`.

### 2.2 Una sala normal más por acto
En [acts.ts](src/data/acts.ts): `minNormal / maxNormal` → I: 9/11 · II: 10/12 · III: 11/13 · IV: 10/12.

### 2.3 Salas especiales sorteadas
Sustituir `optional` por una bolsa con pesos.

- `FloorGenOptions` ([floorgen.ts:44](src/core/floorgen.ts:44)): `extras: { value: RoomType; weight: number }[]`, `extraCount: [min, max]`, `superSecret: number` (probabilidad). Valores por defecto: `extras` = diana y barraca con peso 1, `extraCount` = [2, 2], `superSecret` = 0 (así los tests actuales del generador siguen valiendo).
- En `tryGenerate`: `quiero = rng.int(min, max)` (tras 300 intentos, como mucho 1; tras 600, 0). `target = 1 + normales + obligatorias + quiero`. Tras colocar jefe y obligatorias en callejones, `n = min(quiero, callejonesLibres)`; si `n < 1` y `quiero ≥ 1` y van menos de 600 intentos, reintentar. Sortear `n` tipos **sin repetición** con `rng.weighted` e ir quitándolos de la bolsa. Los callejones que sobren quedan como salas normales.
- `ActDef.specials` pasa a `{ required, extras, extraCount, superSecret }`:

| Acto | Bolsa (peso) | Cuántas |
|---|---|---|
| I y II | diana 3 · barraca 3 · almacen 3 · clavos 2 · curandero 1 · camerino 1 | 2–3 |
| III y IV | pitonisa 3 · reto 3 · almacen 2 · clavos 2 · curandero 2 · barraca 2 · diana 2 · camerino 1 | 3–4 |

`superSecret`: 0,5 en los cuatro actos.

- Si sale `camerino` como extra habrá dos camerinos. En `assignPreItems` ([run.ts:321](src/core/run.ts:321)) el primero recibe `it.camerino` y el segundo `it.camerino2`.

### 2.4 Segunda sala secreta: la trastienda
- `FloorRoom` gana `tag?: 'super'`. Tras `placeSecret`, tirar siempre `rng.chance(o.superSecret)`. Si sale: candidatas = celdas vacías con **exactamente una** vecina ocupada, esa vecina de tipo `normal`, no pegadas al jefe ni a la primera secreta; se elige la de vecina más lejana al inicio (empates con `rng.pick`). Si no hay candidata, no se pone (sin reintentar). Se añade como `{ type: 'secreta', tag: 'super', dist: -1 }`.
- Al ser también de tipo `secreta`, todo lo existente (grieta en la pared, petardo para abrirla, minimapa) funciona sin tocar nada.
- `buildAct`: si `r.tag === 'super'`, `room.data.super = true`.
- `buildSpecial`, caso `secreta`: si `room.data.super`, rótulo «Trastienda», pedestal seguro con `sc.preItem(room, 0, 'secreta')` y dos recogibles (`globo_plata`, `taco_boletos`).
- `tests/floorgen.test.ts`: `count('secreta')` pasa a «1 o 2»; test nuevo: la trastienda toca exactamente una sala.

### 2.5 Tres salas especiales nuevas (seguir la receta)

| Tipo | Nombre | Contenido | Puerta |
|---|---|---|---|
| `almacen` | Almacén de atrezo | 2 `cofre` + 1 `cofre_candado` en fila; 30 % de un `taco_boletos` | Con llave |
| `clavos` | La Cama de Clavos | Una cama en el centro: quedarse 1 s encima quita medio globo y da premio. 1.ª vez `taco_boletos`; 2.ª `cofre`; 3.ª el objeto `pre0` (o 2 `globo_plata` si no hay). Después: «El faquir ya no quiere verte». Usos en `room.data.uses`. Copiar la estructura de `buildDiana` ([RoomBuilder.ts:426](src/systems/RoomBuilder.ts:426)); daño con `sc.hurtPlayer(1, x, y, { cause: 'la cama de clavos' })` | Abierta |
| `curandero` | Carromato del Curandero | Un `globo` gratis, un `globo` a 4 boletos y un `globo_plata` a 6 (con `sc.spawnPickup(kind, x, y, { price })`, como el puesto) | Abierta |

Colores sugeridos (suelo / icono del minimapa): almacén marrón `#3a2a1c` / `0xa8673b`; clavos gris acero `#2a2c33` / `0xa3a0ad`; curandero verde botica `#1f3a30` / `0x7fd1b9`.

### 2.6 Objetos sorteados para las salas nuevas
En `prerollAllActs` ([run.ts:293](src/core/run.ts:293)) añadir a `ActItems` y sortear, **después** de los campos actuales para no mover los existentes: `camerino2: take('camerino', 1)`, `clavos: take('camerino', 1)`, `trastienda: take('secreta', 1)`. En `assignPreItems`: `clavos` → `it.clavos`; secreta con `data.super` → `it.trastienda`. Usar `?? []` para partidas guardadas antiguas.

### 2.7 Comodines: la misma sala con criaturas distintas
- Tres letras nuevas en las plantillas: **`5`** débil, **`6`** cuerpo a cuerpo, **`7`** a distancia.
- `ActDef` gana `slots: Record<'5' | '6' | '7', EnemyKind[]>`. Lista inicial (las criaturas nuevas se añaden a su lista en su fase):

| Acto | `5` débil (amenaza ≤ 2) | `6` cuerpo a cuerpo (≤ 3) | `7` a distancia (≤ 3) |
|---|---|---|---|
| I | mimo, pulga, polilla, +perrito | mono, monociclista, +malabarista | lanzacuchillos, caja, tragafuegos |
| II | loro, payasito, mimo, +titi, +perrito | leon, mono, monociclista | cobra, lanzacuchillos, +foca, +faquir |
| III | munieco, mimo, loro, +perrito | bailarina, reflejo, leon, +sombra | lanzacuchillos, +automata, +hipnotizador, +foca |
| IV | mimo, munieco, loro, +perrito | bailarina, leon, reflejo, mono | augusto, lanzacuchillos, +automata, +foca |

- En `buildAct`, para cada sala normal y **siempre** (use o no comodines, para que el azar no dependa de la plantilla): `room.data.slot5 = mapRng.pick(def.slots['5'])`, y lo mismo con `6` y `7`. Así todas las `5` de una sala son la misma especie.
- Función nueva en `acts.ts`: `creatureAt(def, room, ch): EnemyKind | undefined` → `def.legend[ch]`, o si `ch` es comodín `room.data['slot' + ch] ?? def.slots[ch][0]`. Usarla en `buildTemplate` y `spawnWave` ([RoomBuilder.ts:168](src/systems/RoomBuilder.ts:168) y [:210](src/systems/RoomBuilder.ts:210)) en lugar de `def.legend[ch]`.
- `tests/templates.test.ts`: «es criatura» pasa a ser `legend[ch] || act.slots[ch]`. Los comodines solo pueden ir sobre suelo (sustituyen a un `.`).
- **Retocar plantillas existentes** para que también varíen:
  - Acto I, cambiar `m` por `5` en: `pasillo_cajones`, `cuchillos_parapeto`, `caja_central`, `laberinto`, `pista_monos`, `cajon_marcado`. Cambiar `u` por `6` en `pasillo_tachuelas`.
  - Acto II, cambiar `p` por `5` en: `leones_jaulas`, `pasillo_jaulas`, `trampa_tachuelas`.
  - Las salas «de presentación» (`mimos_esquinas`, `trio_mimos`, `nube_polillas`, `horda_payasitos`…) no se tocan.

**Comprobación de la fase**: tests en verde; test nuevo de generador: en 1.000 semillas por acto siempre hay jefe, camerino y puesto, entre 0 y 4 extras sin repetir (salvo camerino) y 1–2 secretas. En navegador, `__juego.mapa()` en 5 semillas distintas: cambian el número y el tipo de especiales; `__juego.ir('almacen')`, `ir('clavos')`, `ir('curandero')` funcionan y se ven en el minimapa. `tests/economy.test.ts`: si falla por la sala de más, subir `rooms` por defecto de 10 a 11 en `simulateActTickets` ([loot.ts:30](src/core/loot.ts:30)) y revisar los límites.

---

## Fases 3 a 6 — Criaturas y plantillas nuevas, acto por acto

Cada fase: 3 criaturas (receta), añadirlas a los comodines de la tabla 2.7, 10 plantillas (receta), `probarSalas(n)` y regenerar instantáneas doradas. Letras nuevas (todas libres): `G L D` (I), `S N K` (II), `U W Y` (III), `V R Z` (IV).

En las tablas de plantillas, «Am.» es la amenaza total; entre corchetes, las oleadas.

### Fase 3 — Acto I

| Letra | Criatura (inglés) | Vida | Vel. | Papel | Comportamiento |
|---|---|---|---|---|---|
| `G` | **Vendedor de globos** `globero` (Balloon seller) | 18 | 24 | Invocador | Guarda distancia: huye si estás a menos de 60 px, se acerca si a más de 110. Cada 3,2 s (el primero a 1,5 s), si tiene menos de 3 globos vivos: destello 0,4 s y suelta un `globoSuelto`. Al morir, sus globos se escapan sin estallar (premio por matarlo primero). |
| — | **Globo suelto** `globoSuelto` (Loose balloon) | 1 | 30 | Mina flotante | Vuela hacia ti con vaivén (copiar `Polilla` sin el temblor). No cuenta para limpiar la sala (`countsForClear = false`). Al reventar (disparo, contacto o a los 12 s): círculo de aviso 0,25 s y `ring(4, 70, { range: 60 })` en cruz. De lejos es inofensivo; de cerca, no. |
| `L` | **Malabarista** `malabarista` (Juggler) | 16 | 30 | Escudo y parábola | Tres mazas giran a su alrededor (radio 14 px, 2,2 rad/s) y **paran tus disparos** (en `tick`: si un disparo tuyo está a menos de 6 px de una maza, `pop`). Tras 2,5 s lanza las tres, una cada 0,35 s, en parábola hacia donde estás con marca de 0,6 s (copiar las tartas de `Augusto`, [creatures4.ts](src/entities/creatures4.ts), con [Lob.ts](src/entities/Lob.ts)). Sin mazas huye 2 s (ventana para pegarle) y las recupera. |
| `D` | **Perrito amaestrado** `perrito` (Trained pup) | 6 | 78 | Flanqueador en jauría | Estados: *rodear* (gira a 46 px de ti, 1,6–2,6 s; si choca, cambia de sentido) → *aviso* 0,35 s (se para, destello, ladrido) → *mordisco* (embiste recto 0,45 s a 170 px/s hacia donde estabas) → *retirada* 0,6 s → rodear. |

Plantillas nuevas del Acto I:

| id | Dif. | Criaturas | Am. | Idea |
|---|---|---|---|---|
| `jauria` | 1 | DDD | 4,5 | Sala abierta con dos palomitas (`P`) |
| `primer_globero` | 1 | G 5 5 | 8 | Globero al fondo, fosos (`O`) en dos esquinas |
| `malabaristas` | 2 | L L 5 | 8 | Cajones (`C`) como cobertura a media sala |
| `globos_y_tachuelas` | 2 | G D D | 7 | Franja central de tachuelas (`T`): los globos la cruzan, tú no |
| `comodin_cruz` | 2 | 6 6 7 | 9 | Aspa de bloques (`M`) en el centro |
| `perrera` | 2 | DDDD k | 9 | Cajones en damero; el lanzacuchillos tras ellos |
| `feria_de_globos` | 3 | G G 5 5 | 12 | Anillo de fosos; dos globeros en lados opuestos |
| `numero_de_mazas` | 3 | L L 7 D D | 12 | Dos malabaristas cubren a un tirador |
| `comodin_plaza` | 3 | 5 5 6 6 7 | 12 | Plaza con cuatro braseros (`F`) |
| `todo_el_elenco` | 3 | G L o D D | 13 | Una de cada, con cajones y una palomita |

Ejemplo dibujado (`comodin_cruz`):

```ts
{
  id: 'comodin_cruz', diff: 2,
  rows: [
    '.............',
    '...6.....7...',
    '.....M.M.....',
    '......M......',
    '.....M.M.....',
    '.........6...',
    '.............',
  ],
},
```

### Fase 4 — Acto II

| Letra | Criatura (inglés) | Vida | Vel. | Papel | Comportamiento |
|---|---|---|---|---|---|
| `S` | **Foca equilibrista** `foca` (Balancing seal) | 18 | 20 | Tiro con rebotes | Se desliza de lado respecto a ti. Cada 2,8 s: aviso 0,45 s (levanta la pelota) y lanza una pelota grande a 85 px/s con `bounce: 3` y `range: 420`. Máximo 2 pelotas suyas vivas. Campeona: dos en abanico. Antes de nada, comprobar que el rebote funciona en disparos enemigos ([combat.ts:48](src/systems/combat.ts:48) y [:89](src/systems/combat.ts:89)); si no, reutilizar el del jugador. Las jaulas dejan pasar la pelota: la geometría de la sala importa. |
| `N` | **Mono ladrón** `titi` (Thieving monkey) | 9 | 88 | Ladrón | Corre hacia ti en zigzag. Al tocarte: si tienes boletos, te roba hasta 3 (texto «-3 boletos», `contact = 0`) y huye con el saco; cada 4 s se para 1 s a contarlos. Si no tienes, muerde (medio globo) y huye 1,5 s. Al morir con botín suelta **el doble** de lo robado. Cuenta para limpiar la sala. |
| `K` | **Faquir** `faquir` (Fakir) | 20 | 34 | Niega terreno | Anda en tramos rectos de 3–5 baldosas (`nav.randomFreeTile` + `nav.lineFree`) dejando tachuelas temporales cada 14 px: aparecen brillando 0,4 s y luego pinchan 5 s (máx. 12). Cada 4 s se sienta 1,2 s y toca la flauta: todas las cobras vivas escupen a la vez; si no hay cobras, `fan(3, 0.3, 90)`. Requiere: clase `TempSpike` en [props.ts](src/entities/props.ts) y lista `sc.tempSpikes` revisada en `checkHazards` (no afecta si vuelas); método público `escupir()` en `Cobra` ([creatures2.ts](src/entities/creatures2.ts)) que reutilice su disparo. |

| id | Dif. | Criaturas | Am. | Idea |
|---|---|---|---|---|
| `ladronzuelos` | 1 | N N p p | 4 | Fardos de paja y un cajón marcado (`X`) |
| `foca_sola` | 1 | S 5 5 | 7 | Una fila de jaulas (`J`): la pelota pasa, tú no |
| `billar_de_focas` | 2 | S S 5 | 8 | Bloques (`M`) sueltos para que las pelotas reboten |
| `faquir_y_cobras` | 2 | K c c | 9 | Dos cobras en esquinas opuestas |
| `alfombra_de_clavos` | 2 | K 6 5 | 8 | Tachuelas fijas en los bordes; el faquir llena el centro |
| `comodin_jaulas` | 2 | 6 6 7 5 | 11 | Cuatro jaulas en cuadro |
| `circo_de_focas` | 3 | S S K N N | 11 | Focas tras fosos; los monos roban mientras esquivas |
| `nido_de_cobras` | 3 | K c c c 5 | 14 | El faquir en el centro: matarlo primero |
| `comodin_fosos` | 3 | 6 6 7 7 5 | 14 | Fosos que parten la sala en tres |
| `fieras_sueltas` | 3 | l b S N N | 12 | Paja rompible; mezcla de viejas y nuevas |

### Fase 5 — Acto III

| Letra | Criatura (inglés) | Vida | Vel. | Papel | Comportamiento |
|---|---|---|---|---|---|
| `U` | **Autómata de feria** `automata` (Fairground automaton) | 22 | 0 | Ritmo previsible | Late cada 0,7 s. En los latidos 1 y 2 da un paso de una baldosa hacia ti por el eje más largo (si `nav` la da libre). En el 3.º no anda y dispara 4 balas a 80 px/s, alternando cruz y aspa; en el latido anterior se le encienden los ojos (aviso). Campeón: 8 direcciones. |
| `W` | **Sombra** `sombra` (Shadow) | 14 | — | Te pisa los talones | Repite tu camino con 1,4 s de retraso usando `TimeTrail` ([core/trail.ts](src/core/trail.ts), como la Sombra Alquilada en [familiars.ts:239](src/entities/familiars.ts:239)). Si hay dos, la segunda va con 2,2 s. `flying = true` (no choca: tu camino siempre es válido), semitransparente, daño por contacto. Al aparecer espera 1 s y va andando hasta su punto del rastro (90 px/s) antes de empezar a calcarlo. Obliga a no quedarse quieto ni volver sobre tus pasos. |
| `Y` | **Hipnotizador** `hipnotizador` (Hypnotist) | 18 | 28 | Estorbo sin daño | Guarda 70–100 px (copiar `Ventrilocuo`). Cada 3,6 s: aviso 0,6 s y lanza un orbe espiral lento (60 px/s, grande) que **no quita vida**: si te da, movimiento invertido 2,2 s. Requiere `daze?: number` en `ShotOpts`; en el solape payaso–balas ([combat.ts:54](src/systems/combat.ts:54)), si la bala tiene `daze`: `this.mareoT = Math.max(this.mareoT, daze)`, `pop` y sin daño (`mareoT` ya existe, [GameScene.ts:95](src/scenes/GameScene.ts:95)). |

| id | Dif. | Criaturas | Am. | Idea |
|---|---|---|---|---|
| `tu_sombra` | 1 | W 5 | 5 | Cuatro espejos (`E`) sueltos; aprender a no pararse |
| `relojeria` | 1 | U U | 6 | Sala abierta: leer el compás |
| `hipnosis` | 2 | Y 6 6 | 9 | Cintas (`1`–`4`) hacia el hipnotizador |
| `sombras_gemelas` | 2 | W W 7 | 9 | Pasillo de espejos |
| `engranajes` | 2 | U U U 5 | 11 | Rejilla de bloques: los autómatas la rodean a pasos |
| `comodin_espejos` | 2 | 6 6 7 5 | 11 | Espejos en diagonal |
| `pesadilla` | 3 | Y W W a a | 15 | Invertido y perseguido por tu rastro |
| `fabrica_de_automatas` | 3 | U U U U Y | 15 | Cintas que te acercan a los autómatas |
| `comodin_cintas` | 3 | 6 6 6 7 7 | 15 | Tiovivo de cintas alrededor de un bloque |
| `sin_salida` | 3 | s W Y U 5 5 | 17 | Una de cada con un tragasables en el centro |

### Fase 6 — Acto IV

| Letra | Criatura (inglés) | Vida | Vel. | Papel | Comportamiento |
|---|---|---|---|---|---|
| `V` | **Coche de payasos** `cochePayasos` (Clown car) | 36 | 70 | Invocador móvil | Rueda en línea recta rebotando en las paredes (copiar `Monociclista`). Cada 3,5 s frena 0,8 s (se abre la puerta: aviso) y baja un `payasito`; lleva 4. Al destruirlo salen de golpe los que queden (con humo y `wake = 0.6`). Cuanto antes lo rompas, menos payasos. |
| `R` | **Hombre orquesta** `orquesta` (One-man band) | 34 | 18 | Patrones de balas | Anda despacio hacia ti. Cada 2,6 s toca un instrumento, siempre en este orden y con 0,6 s de aviso de color: **bombo** (rojo) `ring(10, 75)` alternando el desfase; **platillos** (amarillo) dos abanicos `fan(4, 0.25, 95)` a ±90° de tu dirección; **trompeta** (azul) 3 balas rápidas (130 px/s) apuntadas, una cada 0,15 s (con `after`). |
| `Z` | **Dragón de papel** `dragon` (Paper dragon) | 40 | 46 | Fuego que se apaga | Cabeza y 4 segmentos que la siguen con `TimeTrail` (copiar `SerpienteSegmento`, [bosses2.ts:167](src/entities/bosses2.ts:167): el daño a un segmento pasa a la cabeza al 60 %). Serpentea hacia ti (`ángulo + sin(t·2)·0,8`), `flying = true`. Cada 1,1 s la cola deja un fuego de 6 s (`sc.spawnFire`), máximo 8. No dispara: su amenaza es el suelo, y ahora se puede apagar. |

| id | Dif. | Criaturas | Am. | Idea |
|---|---|---|---|---|
| `coche_de_payasos` | 1 | V 5 | 7 | Pista vacía: aprender a romper el coche pronto |
| `desfile_del_dragon` | 1 | Z | 5 | Dos aros de fuego (`A`): tus pelotas ardiendo contra el dragón |
| `la_charanga` | 2 | R y y | 11 | Dos acomodadores aceleran al hombre orquesta |
| `atasco` | 2 | V V | 10 | Un cañón de pista (`Q`) en el centro |
| `comodin_pista` | 2 | 6 6 7 [5 5 6] | 9 [7] | Número en dos partes |
| `dragon_y_aros` | 2 | Z x x | 11 | Augustos tras los aros |
| `gran_charanga` | 3 | R V 5 5 [x x 6] | 14 [9] | El coche descarga mientras suena el bombo |
| `apagon_dragon` | 3 | Z t t (`dark`) | 11 | A oscuras: el fuego del dragón es la luz |
| `comodin_numero` | 3 | 6 7 7 [6 6 5 5] [7 7 6] | 9 [10] [9] | Número en tres partes |
| `fin_de_fiesta` | 3 | R Z V [5 5 5 5] | 15 [8] | Los tres nuevos a la vez |

**Comprobación de cada fase (3–6)**: tests en verde (plantillas, presupuesto, traducciones); `__juego.crear(...)` de cada criatura para ver aviso, ataque y muerte; `__juego.sala(id)` de las 10 plantillas; `probarSalas(n)` sin ninguna sala nueva peor que la peor antigua de su dificultad (si la hay, quitar o cambiar criaturas, no subir el presupuesto); partida entera del acto con `?seed=…&jugar`; regenerar instantáneas doradas.

---

## Fase 7 — 16 objetos nuevos (12 cambian el disparo)

Todos en las reservas `camerino` y `barraca` (constante `ALL`), más las indicadas.

| id | Nombre (inglés) | Qué hace | Datos | Reservas extra · precio |
|---|---|---|---|---|
| `bumeranPayaso` | Bumerán de Payaso (Clown boomerang) | Las pelotas vuelven y golpean otra vez | `shot.boomerang` (ya existe en [Shot.ts:112](src/entities/Shot.ts:112) para las cartas enemigas; al dar la vuelta, vaciar `hit`) | secreta · 18 |
| `serpentinas` | Serpentinas (Streamers) | Vuelan en zigzag ancho | `shot.wiggle`; `damage +0.5` | puesto · 15 |
| `florSolapa` | Flor de Solapa (Squirting flower) | Chorro rápido y flojo que moja, frena y apaga el fuego de un golpe | `shot.water`; `tearsMult 2.0`, `damageMult 0.55`, `shotSpeed +1` | puesto · 18 |
| `chicle` | Chicle (Bubble gum) | Las fieras golpeadas van lentas | `shot.sticky` → `e.slowT = 1.5` (0,5 en jefes) | puesto · 15 |
| `platosChinos` | Platos Chinos (Spinning plates) | Tus pelotas rompen las balas enemigas | `shot.antiBala`: solape `g.pShots` × `g.eShots`; cada pelota rompe 1 bala y se gasta (3 si atraviesa) | jefe · 20 |
| `trabuco` | Trabuco de Feria (Fairground blunderbuss) | Cinco perdigones cortos y dispersos | `shot.extraShots 4`, `spread 7`, `jitter 0.35`; `tearsMult 0.42`, `damageMult 0.6`, `range -2.5` | secreta · 20 |
| `dobleCanon` | Doble Cañón (Double barrel) | Dos pelotas en paralelo | `shot.parallel`; `tearsMult 0.85` | jefe · 20 |
| `bolos` | Bolos (Skittles) | Al acabar el alcance, la pelota se queda 3 s en el suelo y hiere a quien la pise | `shot.linger` | puesto · 15 |
| `bolaEspejos` | Bola de Espejos (Mirror ball) | Al chocar con una pared se parte en tres | `shot.prism` | secreta · 18 |
| `aroHula` | Aro de Hula (Hula hoop) | Las pelotas giran a tu alrededor | `shot.orbit`; `tearsMult 0.8` | secreta · 18 |
| `carrusel` | Carrusel (Carousel) | Cada cuarta ráfaga sale en las cuatro direcciones | `shot.cross` | puesto · 15 |
| `mazoFeria` | Mazo de Feria (High striker) | Cada golpe seguido a la misma fiera duele más (+15 %, hasta +90 %) | `shot.ramp` | jefe · 18 |
| `tamborRedoble` | Tambor de Redoble (Drum roll) | Cada quinta ráfaga es enorme (daño ×2,5) | bandera `redoble` | puesto · 15 |
| `cuboAgua` | Cubo de Agua (Water bucket) | Activo, 2 cargas: apaga todo el fuego de la sala y frena 3 s a las fieras | efecto activo `cubo` | puesto · 12 |
| `focaAmaestrada` | Foca Amaestrada (Trained seal) | Familiar: cada 3 s devuelve de un cabezazo una bala que se te acerque | familiar `foquita` | puesto · 15 |
| `mapaTesoro` | Mapa del Tesoro (Treasure map) | Marca en el mapa las salas secretas del acto | bandera `mapaTesoro` | puesto · 10 |

### Cómo programar cada modificador nuevo

| Modificador | Dónde | Cómo |
|---|---|---|
| `boomerang` | `stats.ts`, `volley.ts` | Solo declararlo y pasarlo; `Shot.ts` ya lo hace |
| `wiggle` | `Shot.ts` (`preUpdate`) | Guardar la dirección inicial; velocidad = dirección × rapidez + perpendicular × `cos(life × 14) × 90` |
| `water` / `sticky` | `combat.ts` (`shotHitEnemy`) | Poner `e.slowT`. `water` además: en `checkFireShots` apaga del todo; en `hitObstacle`, un brasero se apaga de un golpe |
| `antiBala` | `combat.ts` (colisiones) | `add.overlap(g.pShots, g.eShots, …)` solo si el disparo lleva la opción |
| `jitter` | `volley.ts` | Nuevo parámetro `rand = () => 0.5`; ángulo += `(rand() − 0,5) × jitter`; nuevo `speedMult` 0,8–1,1 por perdigón (aplicarlo donde [Player.ts](src/entities/Player.ts) llama a `spawnShot`) |
| `parallel` | `volley.ts`, `Player.ts` | Duplicar cada ángulo con `offset` ±4 px perpendicular al disparo |
| `linger` | `Shot.ts` | Al agotar el alcance, en lugar de `pop`: velocidad 0, 3 s de vida extra, daño ×0,75, desaparece al primer golpe. Máximo 12 en la sala (se quita la más vieja) |
| `prism` | `combat.ts` (`shotHitWall`, línea 89) | Si no es fragmento y no le quedan rebotes: 3 disparos reflejados (0°, ±25°), daño ×0,5, alcance ×0,6, `isFragment: true` |
| `orbit` | `Shot.ts` | Posición calculada cada fotograma alrededor del payaso: radio de 18 a 34 px, 5 rad/s, dura 2,2 × (alcance ÷ velocidad); no choca con paredes; vaciar `hit` cada 0,4 s |
| `cross`, `redoble` | `Player.ts` | Contador de ráfagas: la 4.ª repite la ráfaga en las otras tres direcciones; la 5.ª con daño ×2,5 y tamaño ×1,5 |
| `ramp` | `combat.ts` (`shotHitEnemy`) | Guardar en la escena `{ objetivo, n }`: mismo objetivo → `n = min(6, n + 1)`; otro → `n = 0`. Daño × (1 + 0,15 n) |
| activo `cubo` | [ItemEffects.ts:62](src/systems/ItemEffects.ts:62) | Apagar todos los `hazards` y braseros; `slowT = 3` a todas las criaturas |
| familiar `foquita` | [familiars.ts](src/entities/familiars.ts) | Copiar el Globo-Perro: cada 3 s, la bala enemiga a menos de 22 px del payaso se destruye y sale un disparo tuyo (daño ×1,5) hacia el objetivo más cercano |
| bandera `mapaTesoro` | [HudScene.ts](src/scenes/HudScene.ts) (minimapa) | Dibujar las salas `secreta` con su icono aunque no se hayan descubierto |

**Reglas de combinación** (probar cada una): `orbit` manda sobre `boomerang`, `wiggle` y `linger`; los fragmentos de `prism` no se vuelven a partir; `bolos` + Tomate Podrido estalla al pisarlo; `trabuco` + Triple Malabar suma perdigones (tope: 9 por ráfaga).

**Tu Reflejo** dispara con una copia de tus modificadores ([bosses3.ts](src/entities/bosses3.ts) usa `buildVolley`): en los disparos enemigos ignorar `water`, `sticky`, `antiBala`, `linger`, `orbit`, `ramp` y `cross` (no tienen sentido contra el jugador).

**Trajes** ([sets.ts](src/data/sets.ts)): añadir `aroHula`, `bolos` y `dobleCanon` al de Malabarista; `florSolapa` al de Payaso Completo. Las piezas necesarias no cambian.

**Carteles nuevos** ([meta.ts](src/core/meta.ts)), que desbloquean tres de los objetos (poner `unlock` en el objeto):

| id | Nombre | Condición | Premio |
|---|---|---|---|
| `bombero` | Bombero | Apaga 25 fuegos en total (`run.stats.fuegos`, Fase 1) | Flor de Solapa |
| `trastienda` | Doble fondo | Entra en una trastienda | Mapa del Tesoro |
| `ladron` | Manos arriba | Recupera el botín de 5 monos ladrones | Trabuco de Feria |

**Tests**: ampliar `tests/stats.test.ts` (cada modificador nuevo llega a `FinalStats.shot` y `buildVolley` lo pasa; `parallel` duplica; `jitter` con `rand` fijo es determinista). Test de reservas en `tests/itempool.test.ts`: tras `prerollAllActs` en 200 semillas ninguna reserva queda vacía.

**Comprobación**: `__juego.dar(id)` de los 16, solos y con las combinaciones de arriba; `__juego.jefe('reflejo')` con `trabuco` y `aroHula` para ver que el jefe no se rompe; `__juego.estres()` con `trabuco` + `tripleMalabar` + `bolos` sin caída de fotogramas.

---

## Fase 8 — Cierre

1. **Equilibrio final**: `probarSalas()` de los 4 actos y `botActo()` en las tres semillas de `docs/semillas-de-referencia.md`; anotar la tabla «después» junto a la «antes» de la Fase 0. Si el bot pierde claramente más globos por acto que antes, bajar criaturas en las salas nuevas peor paradas.
2. **Economía**: `tests/economy.test.ts` en verde con la sala extra; el Almacén gasta llaves: si en las partidas de prueba faltan, subir el peso de `llave` de 12 a 14 en [loot.ts](src/data/loot.ts).
3. **README**: actualizar cifras (criaturas por acto, 80 objetos, salas especiales nuevas, fuego que se apaga, trastienda).
4. **Álbum y carteles**: comprobar que los 16 objetos y los 3 carteles aparecen y que la cuenta de «Coleccionista» sigue teniendo sentido.
5. **Inglés**: `tests/i18n.test.ts` en verde y repaso visual con el idioma en inglés.
6. **Móvil**: una partida corta con controles táctiles (`?fps`) en el Acto IV con dragón y coche de payasos: 60 fps.
7. Fusionar en `main` (se publica solo en GitHub Pages).

---

## Tamaño y orden

| Fase | Contenido | Líneas aprox. | Se nota al jugar |
|---|---|---|---|
| 0 | Amenaza, test de presupuesto, `probarSalas`, 8 arreglos | 200 | Salas más parejas |
| 1 | Fuego apagable | 80 | Sí, enseguida |
| 2 | Generador, 3 salas especiales, trastienda, comodines | 550 | **Mucho**: cada acto distinto |
| 3–6 | 12 criaturas + 1 secuaz, 40 plantillas | 4 × 450 | **Mucho** |
| 7 | 16 objetos, 3 carteles | 700 | Mucho |
| 8 | Equilibrio, textos, publicar | 100 | — |

Las fases 0, 1 y 2 no dependen de contenido nuevo y ya quitan buena parte de la sensación de repetición. Las fases 3–6 son independientes entre sí (se pueden hacer en cualquier orden). La 7 es independiente de las 3–6, salvo el cartel `ladron` (necesita la Fase 4).

**Fuera de este plan** (para no pasarse; ideas si después se quiere más): salas con modificador («Bis» con segunda tanda, «Sala de gala» con campeón dorado seguro), un tercer jefe por acto, minijefes.

## Archivos principales

- Generador y partida: [floorgen.ts](src/core/floorgen.ts), [run.ts](src/core/run.ts), [acts.ts](src/data/acts.ts)
- Salas: `src/data/rooms/acto1.ts` … `acto4.ts`, [template.ts](src/data/rooms/template.ts), [RoomBuilder.ts](src/systems/RoomBuilder.ts), [tiles.ts](src/data/tiles.ts)
- Criaturas: [enemies.ts](src/data/enemies.ts), `src/entities/creatures*.ts`, [spawn.ts](src/entities/spawn.ts), [Enemy.ts](src/entities/Enemy.ts), [props.ts](src/entities/props.ts)
- Objetos y disparo: [items.ts](src/data/items.ts), [stats.ts](src/core/stats.ts), [volley.ts](src/core/volley.ts), [Shot.ts](src/entities/Shot.ts), [Player.ts](src/entities/Player.ts), [combat.ts](src/systems/combat.ts), [ItemEffects.ts](src/systems/ItemEffects.ts), [familiars.ts](src/entities/familiars.ts), [sets.ts](src/data/sets.ts), [meta.ts](src/core/meta.ts)
- Arte y textos: `src/art/sprites/*.ts`, [src/art/index.ts](src/art/index.ts), [i18nGame.ts](src/ui/i18nGame.ts), [HudScene.ts](src/scenes/HudScene.ts)
- Pruebas: `tests/golden.test.ts`, `tests/templates.test.ts`, `tests/floorgen.test.ts`, `tests/run.test.ts`, `tests/stats.test.ts`, `tests/itempool.test.ts`, `tests/economy.test.ts`, nuevo `tests/balance.test.ts`; [debugApi.ts](src/debug/debugApi.ts), [bot.ts](src/debug/bot.ts)

## Verificación de extremo a extremo

1. `npm test` y `npm run build` en verde al final de cada fase.
2. Variedad medible (script o test): en 200 semillas, ninguna plantilla repetida por acto; el número de salas especiales varía entre 5 y 7; hay trastienda en torno al 50 % de los actos; cada criatura nueva aparece al menos en el 30 % de las partidas de su acto.
3. Justicia: `tests/balance.test.ts` en verde y `probarSalas()` sin salas nuevas peores que la peor antigua de su dificultad.
4. Partida completa I→IV con el bot (`botActo()` en cada acto) en las tres semillas de referencia, y una partida a mano.
5. Web publicada: abrir con `?v=N` para saltar la caché y jugar un acto.
