# Art Bible

Pixel art moderno de 16 bits, contorno oscuro, colores vivos, siluetas legibles y animaciones expresivas. Se preserva la personalidad de los dibujos infantiles y la lectura inmediata de gameplay.

## Regla principal

**Personaje aprobado = diseño bloqueado.** No reinterpretar identidad, proporciones, rasgos o papel narrativo al cambiar de escena o estado.

Referencias canónicas:

- [babito_creator_style.png](../art/approved/babito_creator_style.png): construcción del Babito y lenguaje del Creador.
- [shop_empanadilla_pinguino.png](../art/approved/shop_empanadilla_pinguino.png): tenderos aliados.
- [enemies_canonical.png](../art/approved/enemies_canonical.png): COME, VUELA y DA VUELTAS.
- [bosses_canonical.png](../art/approved/bosses_canonical.png): Babito Corrupto, La Oscuridad y Boss Total.
- [power_tree_canonical.png](../art/approved/power_tree_canonical.png): Árbol triste y restaurado.
- [power_selection.png](../art/approved/power_selection.png): Fuego, Rayo y Roca.

[worlds_environment_reference_only.png](../art/approved/worlds_environment_reference_only.png) sirve únicamente para escenarios, tiles, paletas, composición y atmósfera. Se ignoran todos los enemigos que aparezcan en esa lámina.

Las láminas son concept art, no spritesheets finales. No se recortan automáticamente como solución final. Cuando falte un sprite individual se usa un placeholder temporal con clave estable, conservando nombre, proporción, color, silueta y rol.

## Estado de producción 0.2

| Elemento | Estado | Referencia de producción |
|---|---|---|
| Babilandia | Fondo raster 16:9 con fallback procedural | [babilandia-v2.md](../art/production/babilandia-v2.md) |
| Arena de Babito Corrupto | Fondo raster 16:9 con fallback procedural | [boss-arena-v1.md](../art/production/boss-arena-v1.md) |
| Ciudad Bicharraca | Fondo raster 16:9 y recorte dentro de su pantalla de avance, con fallback | [ciudad-bicharraca-v1.md](../art/production/ciudad-bicharraca-v1.md) |
| COME | Spritesheet raster por estados | [enemy-come-sheet-v3.png](../public/assets/characters/enemy-come-sheet-v3.png) |
| VUELA | Spritesheet raster de 36 poses, alpha binario y celdas de 256 px | [enemy-vuela-v4.md](../art/production/enemy-vuela-v4.md) |
| DA VUELTAS | Spritesheet procedural temporal | [EnemyAnimations.js](../src/game/EnemyAnimations.js) |
| Babito | Atlas procedural canónico con celdas de 80 px, raster de detalle de 64 px, 51 poses y capas cosméticas sincronizadas | [babito-v4.md](../art/production/babito-v4.md) |
| Boss, tenderos y Árbol | PNG raster de personaje con poses o composición runtime | `public/assets/characters/` |
| Jungla | Nivel jugable con fondo, losetas, agua, cascada, lianas y ruinas procedurales; sin raster de producción todavía | [jungleScenery.js](../src/game/jungleScenery.js) y [createTextures.js](../src/game/createTextures.js) |
| La Oscuridad | Sprite procedural fiel a `bosses_canonical.png`: masa negra, borde violeta, tentáculos y ojos rasgados, sin boca | [createTextures.js](../src/game/createTextures.js) |
| Landing web | 23 derivados optimizados de láminas, dibujos, personajes y texturas; son presentación web, no spritesheets runtime | [landing-web-v1.md](../art/production/landing-web-v1.md) |

Los fondos no contienen colisión. El tercio inferior debe evitar falsas plataformas, bordes transitables o salientes que compitan con el terreno real.

## Contrato de animación

- Babito: `idle` (6), `walk` (8), `run` (8), `jump` (6), `fall` (6), `attack` (6), `hurt` (5) y `dead` (6), 51 frames en total. `walk` y `run` tienen ciclos y siluetas propios; todas las capas cosméticas usan exactamente el mismo frame.
- COME: `idle`, `walk`, `windup`, `attack`, `hurt` y `defeat`; anticipación y mordisco usan tramos distintos de la fila ofensiva.
- VUELA: `idle`, `fly`, `dive`, `attack`, `hurt` y `defeat`.
- DA VUELTAS: `idle`, `roll`, `windup`, `hurt` y `defeat`; `DIZZY` debe leerse como vulnerable.
- Babito Corrupto: poses diferenciadas para intro, bola de fuego, ataque superior, embestida, `RECOVER` y purificación.
- La Oscuridad: ondulación continua en sombra, fundido y recolocación durante `SHIFT`, siluetas legibles para rasante, meteoritos, zona oscura y apagado, anillo dorado en `EXPOSED` y disipación en luciérnagas al quedar `DISPELLED`.

El frame nunca modifica la hitbox. Los estados de ataque, daño, vulnerabilidad y derrota deben leerse incluso sin audio. Pausa congela el estado visual junto a la simulación.

## Color, escala y legibilidad

- Mantener grupos de píxeles nítidos; no aplicar suavizado fotográfico.
- El Babito conserva un diseño lógico de 48 unidades y lo rasteriza a 64 px reales con escala de detalle 4/3 dentro de celdas fuente de 80 px. El cuerpo físico del raster mide 47 × 45 px (`rx = ry = 23`, con un píxel recortado en cada extremo vertical), de modo que la corona queda plana y la curva gana escalones sin formar un ápice. Los ojos normales miden 4 × 9 px con 11 px de separación; la sonrisa y las mejillas son compactas, las aletas de reposo son más largas y caídas sin superar 1,4 veces el ancho del cuerpo y los pies permanecen visibles. El cian canónico usa `#7CDBF9`, luz `#A8EDFF` y sombra `#2BBFE5`. Sus tres cajas de presentación son 64, 80 y 96 px mediante escalas `0.8`, `1` y `1.2`; el tamaño normal muestra cada píxel fuente 1:1 y los tres comparten línea de pies. La animación usa cambios reales de silueta, apoyo de pies, brazos, expresión, inclinación y *squash/stretch*; no se simula con una única imagen deslizándose.
- VUELA se autoriza en celdas raster de 256 px y se muestra a 64 × 64 mediante escala exacta de 1/4 y filtro nearest. Cada pose conserva margen transparente y alpha 0/255 para evitar neblina, rectángulos o interpolación sobre el fondo.
- Usar contorno azul marino u oscuro y una paleta limitada por mundo.
- La estética pixel art no justifica texto empastado: el texto visible parte de 12 px, conserva counters y huecos abiertos y usa como máximo 1 px de contorno entre 12 y 15 px. El filtro nearest se reserva para arte; las texturas tipográficas usan linear.
- COME siempre se percibe mayor que el Babito; VUELA, menor. Los tres tamaños del Babito cambian el render, no la colisión. Los pies de COME se anclan al borde inferior del cuerpo físico en todos sus clips y nunca atraviesan visualmente la superficie de apoyo.
- Reservar contraste para personaje, enemigos, proyectiles, señales de peligro, monedas y plataformas reales.
- Un cartel diegético forma una sola silueta de tabla, texto y poste. El poste toca una superficie física; el texto nunca flota fuera de la tabla ni se coloca sobre un enemigo o checkpoint.
- No incorporar texto, HUD, logos o marcas de agua dentro de un asset de fondo.

## Sustitución de placeholders

Un asset final conserva la clave runtime y el encuadre esperado, se registra en la precarga, mantiene un fallback cuando procede y añade una ficha en `art/production/` con resolución, referencias, herramienta, fecha, prompt o proceso e integración. También se actualizan [INTERACTIONS.md](INTERACTIONS.md), [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) y [CHANGELOG.md](CHANGELOG.md) si cambia la lectura o interacción.
