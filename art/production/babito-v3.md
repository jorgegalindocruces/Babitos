# Babito canónico v3

## Estado

Integrado el 8 de octubre de 2026 en [`fa77fc2`](https://github.com/jorgegalindocruces/Babitos/commit/fa77fc2). Sustituye las proporciones anchas y rectangulares del renderer anterior sin cambiar su contrato de animación, personalización o física.

## Referencia y proceso

La única referencia visual de proporción es [`art/approved/babito_creator_style.png`](../approved/babito_creator_style.png), contrastada con el recorte «BABITO BASE» entregado durante el playtest. [`babito_creator_wireframe.jpg`](../original_drawings/babito_creator_wireframe.jpg) conserva la intención del Creador, pero no define píxeles.

El rediseño se autoriza manualmente con primitivas Canvas deterministas en [`createTextures.js`](../../src/game/createTextures.js); no se utilizó generación de imagen ni un prompt generativo. La rejilla interna sigue siendo de 48 px dentro de cada celda de atlas de 64 px.

## Construcción bloqueada

- Cuerpo ovoide de 31 × 33 px en la rejilla interna de 48 px, casi circular, centrado en `(24, 23)`.
- Ojos normales de 3 × 7 px, sonrisa en U de 7 px y mejillas de 3 × 2 px.
- Pies cortos de hasta 10 px, parcialmente cubiertos por el cuerpo y con la misma línea de apoyo en todos los tamaños.
- Aletas compactas y descendentes; en reposo el ancho total no supera 1,35 veces el cuerpo.
- Paleta cian: cuerpo `#7CDBF9`, luz `#A8EDFF`, sombra `#2BBFE5`, rubor `#FF7196` y contorno `#07111E`.
- La opción base no equipa sombrero; los guardados y selecciones existentes no se alteran.

## Animación e integración

Se conservan los 51 frames definidos en [`BabitoAnimations.js`](../../src/game/BabitoAnimations.js): `idle` (6), `walk` (8), `run` (8), `jump` (6), `fall` (6), `attack` (6), `hurt` (5) y `dead` (6). [`BabitoAvatar.js`](../../src/game/BabitoAvatar.js) mantiene las siete capas compartiendo frame, giro y transformación; la hitbox permanece en 28 × 40 y las cajas visibles continúan siendo 64, 80 y 96 px. La paleta cian del renderer y el swatch `body_cyan` de [`cosmetics.json`](../../src/data/cosmetics.json) comparten `#7CDBF9`.

`drawBabitoCompositeFrame()` compone un frame con el mismo renderer para usos editoriales. [`public/assets/landing/babito.png`](../../public/assets/landing/babito.png) se regeneró a 256 × 256 desde el frame `idle` con sombrero de paja, transparencia binaria, paleta limitada y ampliación nearest 4×.

## Verificación

- [`babito-animation.test.js`](../../test/babito-animation.test.js) bloquea geometría, proporción, paleta, bounds, 51 poses y baseline.
- [`landing.test.js`](../../test/landing.test.js) comprueba dimensiones, alpha binario, bloques nearest 4× y colores canónicos de la exportación web.
- QA visual en Creador y en `GameScene` para `idle`, caminar, ataque y KO, con y sin accesorio de cabeza.
