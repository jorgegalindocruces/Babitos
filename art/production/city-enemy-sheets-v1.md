# Robots de Ciudad Bicharraca · spritesheets v1

## Resultado

Tres hojas transparentes de producción, una por enemigo de la Fase 3, generadas con el generador de imágenes integrado de Codex el 12 de octubre de 2026. Cada hoja mide 1772 × 886 px y se divide en una cuadrícula exacta de 4 × 2 celdas de 443 × 443 px. No contienen rótulos, fondos, marcos ni elementos de las fichas conceptuales.

| Enemigo | Hoja runtime | Referencia aprobada | Dibujo original |
|---|---|---|---|
| Drone Bot | [drone-bot-sheet-v1.png](../../public/assets/enemies/city/drone-bot-sheet-v1.png) | [city_drone_bot.png](../approved/city_drone_bot.png) | [city-drone-bot-momo.jpg](../original_drawings/city-drone-bot-momo.jpg) |
| Robot Elice | [robot-elice-sheet-v1.png](../../public/assets/enemies/city/robot-elice-sheet-v1.png) | [city_robot_elice.png](../approved/city_robot_elice.png) | [city-robot-elice-momo.jpg](../original_drawings/city-robot-elice-momo.jpg) |
| IVE Robot | [ive-robot-sheet-v1.png](../../public/assets/enemies/city/ive-robot-sheet-v1.png) | [city_ive_robot.png](../approved/city_ive_robot.png) | [city-ive-robot-momo.jpg](../original_drawings/city-ive-robot-momo.jpg) |

Las hojas se normalizaron mecánicamente desde 1774 × 887 a 1772 × 886 para que las ocho celdas fueran enteras. Phaser las precarga como spritesheets; las fichas completas solo aparecen en la landing.

## Prompts finales

### Drone Bot

> Crea una spritesheet 4×2 sobre fondo totalmente transparente para el enemigo Drone Bot de BABITOS. Ocho celdas cuadradas iguales, sin separación dibujada, sin texto, etiquetas, números, marco, escenario, suelo, HUD ni ficha de diseño. Pixel art moderno de videojuego 2D lateral, bordes nítidos, paleta limitada azul acero, blanco, negro, rojo y electricidad cian. Conserva exactamente el diseño de la referencia: robot volador compacto y cuadrado, cara enfadada roja, dientes blancos, antena roja, cuatro brazos verticales terminados en hélices. Mantén el personaje completo centrado, con margen transparente, escala y pivote estables. Poses en orden de lectura: 1 idle flotando; 2 patrulla inclinada; 3 detecta al Babito; 4 carga electricidad cian; 5 dispara un rayo eléctrico vertical hacia abajo; 6 recuperación con humo y chispas; 7 recibe daño con piezas sueltas; 8 explosión eléctrica divertida con silueta todavía reconocible. No conviertas la hoja conceptual ni su fondo en un sprite.

### Robot Elice

> Crea una spritesheet 4×2 sobre fondo totalmente transparente para Robot Elice de BABITOS. Ocho celdas cuadradas iguales, sin texto, etiquetas, números, marco, escenario, suelo, HUD ni ficha. Pixel art moderno de videojuego 2D lateral, nítido y con paleta limitada blanco, gris azulado, negro, rojo y pequeños acentos cálidos. Conserva exactamente la referencia: robot estrictamente terrestre, bajo y ancho, cabeza metálica triangular como sombrero, hélice horizontal roja encima, ojos rojos, mandíbula mecánica, dos piernas cortas y dos grandes brazos cuchilla curvos. Personaje completo centrado, con margen transparente y pies sobre una línea base común. Poses en orden: 1 patrulla; 2 detección; 3 preparación del giro; 4 ataque giratorio comenzando; 5 ataque giratorio máximo con arco rojo; 6 recuperación; 7 vulnerable/dañado con chispas; 8 derrota en explosión mecánica legible. No lo hagas volar y no uses el tablero conceptual como sprite.

### IVE Robot

> Crea una spritesheet 4×2 sobre fondo totalmente transparente para IVE Robot de BABITOS. Ocho celdas cuadradas iguales, sin texto, etiquetas, números, marco, escenario, suelo, HUD ni ficha. Pixel art moderno de videojuego 2D lateral, silueta elegante y amenazante, paleta limitada blanco roto, gris oscuro, negro, rojo y rosa corrupto. Conserva exactamente la referencia: robot terrestre alto de tres patas o faldones metálicos, cabeza blanca con orejas/puntas, ojos negros inclinados, sonrisa dentada, cables con pequeños corazones rotos, gran corazón roto y podrido visible en el pecho, dos brazos larguísimos terminados en guadañas. Personaje completo centrado, con margen transparente y línea de pies común. Poses en orden: 1 idle; 2 patrulla; 3 detección; 4 preparación de guadaña; 5 gran tajo de guadaña; 6 agarre con brazo extendido; 7 recuperación/daño con corazón expuesto; 8 derrota colapsando con cables y chispas. No uses el escenario ni la ficha completa como sprite.

La hoja de IVE Robot recibió una edición final con `imagegen` para encerrar cada silueta en su celda y preservar las guadañas completas. Este fue el prompt de reparación final:

> SECOND AND FINAL GUTTER REPAIR of this exact transparent IVE ROBOT pixel-art sprite sheet. Preserve the character identity, white skull-like head, broken rotten red heart, black cable limbs, three grounded lower body panels, silver/red scythes, palette, crisp 16-bit rendering, transparent RGBA, eight authored animation poses, and their reading order. The final sheet must be exactly a 4 columns × 2 rows atlas of eight independent equal square cells. Work against these implicit target zones on a 1772×886 canvas: top row y=0–442; bottom row y=443–885; column 1 x=0–442; column 2 x=443–885; column 3 x=886–1328; column 4 x=1329–1771. CRITICAL FAILURE TO FIX: the bottom-row second pose (the long grab/scythe pose) currently extends across the x=886 boundary into column 3. Recompose and uniformly scale down that WHOLE pose so every cable, arm, hand, scythe blade, red slash, spark, glow, and shadow stays between x=465 and x=863 and y=465 and y=863. Do the same for all other poses with at least 20 transparent pixels of padding from every implicit cell boundary. Every cell contains exactly one complete pose, centered independently. No mark from any pose may enter a neighboring cell or touch the outer sheet edge. Keep a consistent shared character scale and grounded baseline for terrestrial poses. Do not draw visible cell guides. No text, labels, numbers, borders, grid lines, floor line, backdrop, scenery, HUD, logo, or concept-board layout. Do not merge poses.

Tras el redimensionado exacto se ejecuta [normalize-city-atlas.mjs](../../scripts/normalize-city-atlas.mjs): solo reubica dentro de su propia celda una pose que deje antialias en los cuatro píxeles de seguridad. No recorta, mezcla ni redibuja las siluetas.

## Integración

[EnemyAnimations.js](../../src/game/EnemyAnimations.js) registra los ocho clips de cada hoja y mapea todos los estados de las tres máquinas. [EnemyController.js](../../src/game/EnemyController.js) mantiene Drone Bot en vuelo y Robot Elice e IVE Robot sobre superficies físicas; sus escalas visibles son aproximadamente 1,5×, 2× y 3× un Babito normal. [EnemyAttackSystem.js](../../src/game/EnemyAttackSystem.js) aporta el rayo vertical y las ventanas de guadaña/agarre. [city.json](../../src/data/levels/city.json) distribuye las apariciones por Entrada, Fábricas y Fortaleza.

Los retratos de la landing son recortes editoriales de la primera celda de cada hoja; no se precargan en Phaser. Los dibujos originales y las fichas aprobadas se muestran por separado para reconocer la autoría de Momo y conservar el recorrido del papel al píxel.
