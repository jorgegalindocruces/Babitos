# Babito canónico v4

## Estado

Contrato visual vigente desde el 8 de octubre de 2026 y revisado el 9 de octubre de 2026. Sustituye a [Babito canónico v3](babito-v3.md), cuya ficha se conserva como historial, y corrige la lectura todavía estrecha, angulosa y con ápice superior de aquella versión. No cambia animación, personalización, física ni guardados.

## Referencia y proceso

La referencia visual de proporción es [`art/approved/babito_creator_style.png`](../approved/babito_creator_style.png), contrastada con el recorte «BABITO BASE» entregado durante el playtest. Esa referencia manda en silueta, rostro y proporciones, pero su franja inferior de azul oscuro queda expresamente supersedida por la revisión del 9 de octubre: no debe trasladarse al renderer. [`babito_creator_wireframe.jpg`](../original_drawings/babito_creator_wireframe.jpg) conserva la intención del Creador, pero no define píxeles.

El rediseño se dibujó con primitivas Canvas deterministas en [`createTextures.js`](../../src/game/createTextures.js). No se utilizó ImageGen, generación de imagen ni un prompt generativo: las mismas funciones componen runtime, previsualizaciones y export editorial.

## Rejillas y celda fuente

- El sistema conserva una rejilla de diseño lógica de 48 unidades para no reescribir las 51 poses ni los cosméticos.
- `BABITO_DETAIL_SCALE = 4 / 3` rasteriza esas coordenadas a una rejilla real de detalle de 64 px.
- Cada frame ocupa una celda fuente transparente de 80 × 80 px (`BABITO_TEXTURE_SIZE` y `BABITO_RENDER_SIZE`), con margen para aletas, movimiento y accesorios.
- Pequeño, normal y grande usan escalas `0.8`, `1` y `1.2`, por lo que sus cajas visibles siguen midiendo 64, 80 y 96 px. En tamaño normal cada píxel fuente se muestra 1:1.
- La baseline del arte es 30 px y se compensa a una baseline de 20 px en el mundo. Los tres tamaños comparten apoyo sin modificar la hitbox de 28 × 40.

## Construcción bloqueada

- Cuerpo redondo de 47 × 45 px en el raster real. Parte de `rx = ry = 23` y recorta un píxel en los extremos superior e inferior, formando una corona plana sin ápice y una curva lateral con más escalones.
- Ojos normales de 4 × 9 px, con 11 px entre ambos; sonrisa pequeña y mejillas compactas. La cara no debe crecer para llenar el nuevo volumen.
- Aletas de reposo más largas y caídas que en v3. El ancho total de la silueta con ambas aletas no supera 1,4 veces el ancho del cuerpo.
- Pies cortos pero visibles, integrados en la curva inferior y anclados a la misma línea de apoyo en todos los tamaños. El contorno inferior se abre únicamente en dos raíces estrechas, una por pie, para unirlos al vientre sin dibujar una cinturilla horizontal.
- Paleta cian: cuerpo `#7CDBF9`, luz `#A8EDFF`, sombra declarada `#2BBFE5`, rubor `#FF7196` y contorno `#07111E`. La sombra sigue formando parte de la definición de paleta, pero no se pinta sobre el cuerpo del Babito.
- Barriga, raíces de los pies e interior de ambos pies usan `palette.main` de forma continua en todas las paletas y los 51 frames. `palette.shade` no se usa en el cuerpo: ni el bajo ni los laterales pueden introducir un segundo tono que se lea como cinturilla, calzoncillo o pantalón.
- La opción base no equipa sombrero; las selecciones y guardados existentes se conservan.

## Animación e integración

Se conservan los 51 frames definidos en [`BabitoAnimations.js`](../../src/game/BabitoAnimations.js): `idle` (6), `walk` (8), `run` (8), `jump` (6), `fall` (6), `attack` (6), `hurt` (5) y `dead` (6). [`BabitoAvatar.js`](../../src/game/BabitoAvatar.js) mantiene siete capas (`body`, `eyes`, `mouth`, `arms`, `headAccessory`, `glasses` y `neckAccessory`) compartiendo frame, giro y transformación. El rediseño no cambia la hitbox, estados, ventanas de combate ni persistencia.

`drawBabitoCompositeFrame()` compone un frame con el mismo renderer para usos editoriales. [`public/assets/landing/babito.png`](../../public/assets/landing/babito.png) se exporta a 320 × 320 desde la celda fuente de 80 px, con transparencia binaria, paleta limitada y nearest 4×.

## Verificación

- [`babito-animation.test.js`](../../test/babito-animation.test.js) bloquea celda y render de 80 px, detalle 4/3, cuerpo de 47 × 45, ojos, aletas, bounds, 51 poses, escalas y baseline; además recorre todas las combinaciones de paleta y frame para impedir un tono secundario en barriga, raíces o pies.
- [`landing.test.js`](../../test/landing.test.js) comprueba 320 × 320, alpha binario, bloques nearest 4×, colores canónicos y ausencia de la sombra oscura en la exportación web.
- La revisión visual cubre Creador y `GameScene` en `idle`, caminar, ataque y KO, con y sin accesorio de cabeza, y confirma corona plana, silueta redonda, pies apoyados y cosméticos sin recorte.
