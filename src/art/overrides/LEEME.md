# Arte de sustitución

Coloca aquí un PNG con el mismo nombre que la clave de un sprite y el juego lo
usará en lugar del dibujado por código. No hace falta tocar nada más.

- Sprite de un solo fotograma: `<clave>.png` (por ejemplo `pelota.png`).
- Sprite con varios fotogramas en fila: `<clave>@<ancho>x<alto>.png`
  (por ejemplo `mimo@16x16.png` con dos fotogramas de 16×16 uno al lado del otro).

Las claves están en `src/art/sprites/`. Conviene respetar el tamaño original
de cada sprite para que las colisiones sigan cuadrando.
