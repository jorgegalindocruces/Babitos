# Landing web v1

## Uso

Inventario de los 42 derivados visuales de `public/assets/landing/`, integrado inicialmente en la portada y ampliado con Garbanzo Loco, Árbol Pocho, Sapo Pota, los créditos de Lola y Momo y, en la Fase 3, Drone Bot, Robot Elice e IVE Robot. Estos archivos sirven para presentación editorial, catorce comparativas «Del papel al píxel», créditos y el visor de arte. No sustituyen las referencias canónicas ni se usan como spritesheets del runtime de Phaser.

## Procedencia y transformación

- Trece `concept-*.webp` derivan directamente de las láminas de [`art/approved/`](../approved/), incluida [la referencia de mundos](../../public/assets/landing/concept-worlds-environment-reference-only.webp). Las fichas de La Jungla se exportan a 1400 px de ancho; las tres fichas de Ciudad conservan 1536 × 1024 para que estados y textos del diseño sigan legibles.
- Diecisiete `drawing-*.webp` derivan de [`art/original_drawings/`](../original_drawings/). La portada muestra catorce comparativas; los bocetos de La Jungla y Ciudad usan `object-fit: contain` para conservar armas, ramas, hélices y guadañas. `drawing-babito-creator-wireframe.webp` y `drawing-coin-original.webp` quedan disponibles para una ampliación posterior, y el Boss Total aparece en su tarjeta.
- Seis `portrait-enemy-*.webp` son recortes editoriales de las referencias aprobadas o de la primera celda de la hoja runtime. Los tres de Ciudad miden 443 × 443. Se usan en tarjetas y comparativas; no se precargan en Phaser.
- [logo.webp](../../public/assets/landing/logo.webp), `tree-sad.webp` y `tree-restored.webp` derivan de los PNG de producción correspondientes en [`public/assets/characters/`](../../public/assets/characters/).
- `babito.png` (320 × 320) es una exportación transparente nearest 4× de la celda fuente de 80 px del renderer canónico descrito en [babito-v5.md](babito-v5.md), compuesta con `drawBabitoCompositeFrame()`; `oscuridad.png` (384 × 384) deriva también de su textura procedural de juego.
- [credits-lola-momo.webp](../../public/assets/landing/credits-lola-momo.webp) conserva los 1536 × 1024 de [la lámina aprobada](../approved/credits_lola_momo.png). Se exporta en WebP de alta calidad sin metadatos y reduce el peso web de 1,87 MB a unos 358 KB; no se aplica `image-rendering: pixelated` para mantener legible su tipografía al reducirla.
- La tarjeta de Ciudad Bicharraca reutiliza directamente el fondo oficial [ciudad-bicharraca-v1.webp](../../public/assets/backgrounds/ciudad-bicharraca-v1.webp), derivado sin recorte de [city_background_v1.png](../approved/city_background_v1.png).

El proceso de landing fue conversión, recorte editorial, redimensionado y optimización de material aprobado. Los tres retratos de Ciudad derivan de hojas generadas con el sistema integrado según [city-enemy-sheets-v1.md](city-enemy-sheets-v1.md); no se generó arte adicional para la portada.

## Integración

[index.html](../../index.html) declara las dimensiones intrínsecas reales para reservar espacio sin saltos de layout. Logo, hero y fondos críticos cargan de inmediato; galería, dibujos y contenido bajo el primer pliegue usan carga diferida. La sección Personajes separa Babilandia, Jungla y Ciudad; «Del papel al píxel» suma catorce comparativas y la galería doce láminas. Los robots se identifican como **Jugable · Fase 3** y la atribución exacta a Momo se mantiene como HTML visible. Sus retratos permanecen editoriales y no se confunden con los spritesheets. Después del CTA final, `#creditos` muestra la lámina completa y atribuye la idea, los dibujos y la dirección creativa y ejecutiva a Lola y Momo. [main.js](../../src/main.js) abre todas las láminas `data-zoom`, incluidos los créditos, en el visor modal.

[landing.test.js](../../test/landing.test.js) comprueba la separación entre landing y Phaser, secciones y controles, resolución de rutas visuales, dimensiones WebP, créditos, presencia y estado jugable de los enemigos de Jungla y Ciudad, atribución a Momo y que `babito.png` conserve alpha binario, paleta canónica y bloques nearest 4×.
