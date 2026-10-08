# Landing web v1

## Uso

Inventario de los 23 derivados visuales de `public/assets/landing/`, integrado en la portada en el commit [`486d347`](https://github.com/jorgegalindocruces/Babitos/commit/486d347), actualizado con el Babito v3 en [`fa77fc2`](https://github.com/jorgegalindocruces/Babitos/commit/fa77fc2) y sincronizado de nuevo con el Babito v4 en la iteración actual. Estos archivos sirven para presentación editorial, comparativas «Del papel al píxel» y el visor de arte. No sustituyen las referencias canónicas ni se usan como spritesheets del runtime de Phaser.

## Procedencia y transformación

- Siete `concept-*.webp` derivan directamente de las láminas de [`art/approved/`](../approved/): seis se ajustan a 1400 × 934 —entre ellas [la referencia de mundos](../../public/assets/landing/concept-worlds-environment-reference-only.webp)— y el Árbol de Poder conserva un encuadre cuadrado de 1400 × 1400.
- Once `drawing-*.webp` derivan de [`art/original_drawings/`](../original_drawings/) y se normalizan a 720 px de alto conservando su proporción. La portada muestra ocho comparativas; `drawing-babito-creator-wireframe.webp` y `drawing-coin-original.webp` quedan disponibles para una ampliación posterior, y el Boss Total aparece en su tarjeta de personaje.
- [logo.webp](../../public/assets/landing/logo.webp), `tree-sad.webp` y `tree-restored.webp` derivan de los PNG de producción correspondientes en [`public/assets/characters/`](../../public/assets/characters/).
- `babito.png` (320 × 320) es una exportación transparente nearest 4× de la celda fuente de 80 px del renderer canónico descrito en [babito-v4.md](babito-v4.md), compuesta con `drawBabitoCompositeFrame()`; `oscuridad.png` (384 × 384) deriva también de su textura procedural de juego.

El proceso fue conversión, redimensionado y optimización de material ya aprobado; no introdujo un prompt generativo ni rediseñó personajes. El conjunto ocupa aproximadamente 1,9 MB.

## Integración

[index.html](../../index.html) declara las dimensiones intrínsecas reales para reservar espacio sin saltos de layout. Logo, hero y fondos críticos cargan de inmediato; galería, dibujos y contenido bajo el primer pliegue usan carga diferida. [main.js](../../src/main.js) abre las láminas `data-zoom` en el visor modal.

[landing.test.js](../../test/landing.test.js) comprueba la separación entre landing y Phaser, secciones y controles, resolución de todas las rutas visuales, correspondencia entre dimensiones WebP declaradas e intrínsecas y que `babito.png` conserve alpha binario, paleta canónica y bloques de píxel nearest 4×.
