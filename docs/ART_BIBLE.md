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
| VUELA y DA VUELTAS | Spritesheets procedurales temporales | [EnemyAnimations.js](../src/game/EnemyAnimations.js) |
| Babito | Capas cosméticas procedurales sincronizadas por frame | [BabitoAvatar.js](../src/game/BabitoAvatar.js) |
| Boss, tenderos y Árbol | PNG raster de personaje con poses o composición runtime | `public/assets/characters/` |
| Jungla | Composición procedural de avance | Roadmap de arte |

Los fondos no contienen colisión. El tercio inferior debe evitar falsas plataformas, bordes transitables o salientes que compitan con el terreno real.

## Contrato de animación

- Babito: `idle`, `walk`, `jump`, `fall`, `attack`, `hurt` y `dead`, cuatro frames por clip. Todas sus capas cosméticas usan el mismo frame.
- COME: `idle`, `walk`, `attack`, `hurt` y `defeat`.
- VUELA: `idle`, `fly`, `dive`, `attack`, `hurt` y `defeat`.
- DA VUELTAS: `idle`, `roll`, `windup`, `hurt` y `defeat`; `DIZZY` debe leerse como vulnerable.
- Babito Corrupto: poses diferenciadas para intro, bola de fuego, ataque superior, embestida, `RECOVER` y purificación.

El frame nunca modifica la hitbox. Los estados de ataque, daño, vulnerabilidad y derrota deben leerse incluso sin audio. Pausa congela el estado visual junto a la simulación.

## Color, escala y legibilidad

- Mantener grupos de píxeles nítidos; no aplicar suavizado fotográfico.
- Usar contorno azul marino u oscuro y una paleta limitada por mundo.
- COME siempre se percibe mayor que el Babito; VUELA, menor. Los tres tamaños del Babito cambian el render, no la colisión.
- Reservar contraste para personaje, enemigos, proyectiles, señales de peligro, monedas y plataformas reales.
- Un cartel diegético forma una sola silueta de tabla, texto y poste. El poste toca una superficie física; el texto nunca flota fuera de la tabla ni se coloca sobre un enemigo o checkpoint.
- No incorporar texto, HUD, logos o marcas de agua dentro de un asset de fondo.

## Sustitución de placeholders

Un asset final conserva la clave runtime y el encuadre esperado, se registra en la precarga, mantiene un fallback cuando procede y añade una ficha en `art/production/` con resolución, referencias, herramienta, fecha, prompt o proceso e integración. También se actualizan [INTERACTIONS.md](INTERACTIONS.md), [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) y [CHANGELOG.md](CHANGELOG.md) si cambia la lectura o interacción.
