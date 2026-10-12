# Art Bible

Pixel art moderno de 16 bits, contorno oscuro, colores vivos, siluetas legibles y animaciones expresivas. Se preserva la personalidad de los dibujos infantiles y la lectura inmediata de gameplay.

## Regla principal

**Personaje aprobado = diseño bloqueado.** No reinterpretar identidad, proporciones, rasgos o papel narrativo al cambiar de escena o estado.

Referencias canónicas:

- [babito_anatomy_1.png](../art/approved/babito_anatomy_1.png), [babito_anatomy_2.png](../art/approved/babito_anatomy_2.png) y [babito_anatomy_3.png](../art/approved/babito_anatomy_3.png): anatomía canónica del Babito (base, paleta, tamaños, animaciones y capas).
- [babito_creator_style.png](../art/approved/babito_creator_style.png): lenguaje del Creador; en la construcción del personaje la sustituyen las láminas de anatomía.
- [shop_empanadilla_pinguino.png](../art/approved/shop_empanadilla_pinguino.png): tenderos aliados.
- [enemies_canonical.png](../art/approved/enemies_canonical.png): COME, VUELA y DA VUELTAS.
- [jungle_garbanzo_loco.png](../art/approved/jungle_garbanzo_loco.png): Garbanzo Loco, su lanza, escudo-vaina, estados y paleta.
- [jungle_arbol_pocho.png](../art/approved/jungle_arbol_pocho.png): Árbol Pocho, transición al enfado, golpes de ramas y paleta.
- [jungle_sapo_pota.png](../art/approved/jungle_sapo_pota.png): Sapo Pota, aparición desde el agua, vomitera tóxica y paleta.
- [city_drone_bot.png](../art/approved/city_drone_bot.png): Drone Bot, vuelo, carga, rayo eléctrico, daño y explosión.
- [city_robot_elice.png](../art/approved/city_robot_elice.png): Robot Elice, patrulla terrestre, giro invulnerable, recuperación y explosión.
- [city_ive_robot.png](../art/approved/city_ive_robot.png): IVE Robot, corazón roto, guadañas, agarre, daño y derrota.
- [bosses_canonical.png](../art/approved/bosses_canonical.png): Babito Corrupto, La Oscuridad y Boss Total.
- [power_tree_canonical.png](../art/approved/power_tree_canonical.png): Árbol triste y restaurado.
- [power_selection.png](../art/approved/power_selection.png): Fuego, Rayo y Roca.
- [credits_lola_momo.png](../art/approved/credits_lola_momo.png): lámina editorial de Lola y Momo, creadores y directores creativos y ejecutivos de BABITOS.

[worlds_environment_reference_only.png](../art/approved/worlds_environment_reference_only.png) sirve únicamente para escenarios, tiles, paletas, composición y atmósfera. Se ignoran todos los enemigos que aparezcan en esa lámina.

Las láminas son concept art, no spritesheets finales. No se recortan automáticamente como solución final. Cuando falte un sprite individual se usa un placeholder temporal con clave estable, conservando nombre, proporción, color, silueta y rol.

Las referencias de La Jungla y Ciudad gobiernan personajes jugables. Garbanzo Loco, Árbol Pocho, Sapo Pota, Drone Bot, Robot Elice e IVE Robot usan spritesheets raster de producción independientes; los recortes `portrait-enemy-*` de la landing siguen siendo presentación editorial y no deben precargarse ni tratarse como sprites de animación. Los dibujos originales de los robots son de Momo y se conservan sin sustituirlos por la reinterpretación pixel art.

## Estado de producción 0.3

| Elemento | Estado | Referencia de producción |
|---|---|---|
| Babilandia | Fondo raster 16:9 con fallback procedural | [babilandia-v2.md](../art/production/babilandia-v2.md) |
| Jungla | Fondo raster 16:9 con fallback procedural; agua, cascada, lianas, ruinas, maleza, luciérnagas y oscuridad siguen como capas de gameplay | [jungla-v1.md](../art/production/jungla-v1.md) |
| Arena de Babito Corrupto | Fondo raster 16:9 con fallback procedural | [boss-arena-v1.md](../art/production/boss-arena-v1.md) |
| Ciudad Bicharraca | Fondo oficial raster 16:9 entregado por el usuario, con fallback y tres capas transparentes de ambiente; fase jugable | [ciudad-bicharraca-v1.md](../art/production/ciudad-bicharraca-v1.md) |
| COME | Spritesheet raster por estados | [enemy-come-sheet-v3.png](../public/assets/characters/enemy-come-sheet-v3.png) |
| VUELA | Spritesheet raster de 36 poses, alpha binario y celdas de 256 px | [enemy-vuela-v4.md](../art/production/enemy-vuela-v4.md) |
| DA VUELTAS | Spritesheet procedural temporal | [EnemyAnimations.js](../src/game/EnemyAnimations.js) |
| Garbanzo Loco | Spritesheet raster v2 de 8 poses, 4 × 2, alpha binario, celdas de 256 px de alto y pivote común | [jungle-enemy-sheets-v2.md](../art/production/jungle-enemy-sheets-v2.md) |
| Árbol Pocho | Spritesheet raster v2 de 8 poses, 4 × 2, alpha binario, celdas de 256 px de alto y pivote común | [jungle-enemy-sheets-v2.md](../art/production/jungle-enemy-sheets-v2.md) |
| Sapo Pota | Spritesheet raster v2 de 8 poses, 4 × 2, alpha binario, celdas de 256 px de alto y pivote común | [jungle-enemy-sheets-v2.md](../art/production/jungle-enemy-sheets-v2.md) |
| Drone Bot | Spritesheet raster de 8 poses, 4 × 2, 1772 × 886, celdas de 443 px; vuelo y rayo vertical | [city-enemy-sheets-v1.md](../art/production/city-enemy-sheets-v1.md) |
| Robot Elice | Spritesheet raster de 8 poses, 4 × 2, 1772 × 886, celdas de 443 px; anclaje terrestre | [city-enemy-sheets-v1.md](../art/production/city-enemy-sheets-v1.md) |
| IVE Robot | Spritesheet raster de 8 poses, 4 × 2, 1772 × 886, celdas de 443 px; anclaje terrestre | [city-enemy-sheets-v1.md](../art/production/city-enemy-sheets-v1.md) |
| Babito | Atlas procedural canónico con celdas de 80 px, raster de detalle de 64 px, 54 poses y capas cosméticas sincronizadas | [babito-v5.md](../art/production/babito-v5.md) |
| Boss, tenderos y Árbol | PNG raster de personaje con poses o composición runtime | `public/assets/characters/` |
| La Oscuridad | Sprite procedural fiel a `bosses_canonical.png`: masa negra, borde violeta, tentáculos y ojos rasgados, sin boca | [createTextures.js](../src/game/createTextures.js) |
| Landing web | 42 derivados optimizados de láminas, dibujos, retratos editoriales, personajes, créditos y texturas; son presentación web, no spritesheets runtime | [landing-web-v1.md](../art/production/landing-web-v1.md) |

Los fondos no contienen colisión. El tercio inferior debe evitar falsas plataformas, bordes transitables o salientes que compitan con el terreno real.

## Contrato de animación

- Babito: `idle` (6), `walk` (8), `run` (8), `jump` (6), `fall` (6), `land` (3), `attack` (6), `hurt` (5) y `dead` (6), 54 frames en total. `walk` y `run` tienen ciclos y siluetas propios; `land` muestra impacto, asentamiento y recuperación; todas las capas cosméticas usan exactamente el mismo frame. La prioridad visual es `dead` → `hurt` → `attack` → aire (`jump`/`fall`) → `land` → locomoción, y cada *one-shot* comienza desde su primera pose en el mismo frame en que se activa.
- COME: `idle`, `walk`, `windup`, `attack`, `hurt` y `defeat`; anticipación y mordisco usan tramos distintos de la fila ofensiva.
- VUELA: `idle`, `fly`, `dive`, `attack`, `hurt` y `defeat`.
- DA VUELTAS: `idle`, `roll`, `windup`, `hurt` y `defeat`; `DIZZY` debe leerse como vulnerable.
- Garbanzo Loco: `idle`, `walk`, `windup`, `attack`, `hurt`, `recover` y `defeat`; la anticipación y la estocada horizontal con lanza deben distinguirse con claridad, y el escudo-vaina permanece en su silueta.
- Árbol Pocho: `idle`, `wake`, `angry`, `punch_left`, `punch_right`, `recover`, `hurt` y `defeat`; en reposo se lee como árbol tranquilo, al despertar abre el ojo y los dos golpes de rama conservan direcciones distintas.
- Sapo Pota: `underwater`, `emerge`, `idle`, `windup`, `vomit`, `recover`, `hurt`, `submerge` y `defeat`; los ojos bajo el agua, la gran apertura de boca y la trayectoria tóxica comunican cada ventana sin depender del HUD.
- Drone Bot: `idle`, `patrol`, `detect`, `charge`, `electric_attack`, `recover`, `hurt` y `explode`; la carga cian y el rayo vertical deben distinguirse antes de aplicar daño.
- Robot Elice: `patrol`, `detect`, `spin_windup`, `spin_attack`, `spin_recover`, `vulnerable`, `hurt` y `defeat`; permanece en tierra y la pose vulnerable rompe claramente la silueta circular del giro.
- IVE Robot: `idle`, `patrol`, `detect`, `scythe_windup`, `scythe_attack`, `grab_attack`, `recover`, `hurt` y `defeat`; el corazón roto permanece visible y las guadañas nunca se recortan en la celda.
- Ninguna pose de La Jungla se corta en el borde de su celda ni salta lateral o verticalmente al cambiar de clip: raíces del Árbol, pies de Garbanzo y asiento del Sapo permanecen en su sitio. El área de daño de cada ataque termina donde termina el arma pintada.
- Babito Corrupto: poses diferenciadas para intro, bola de fuego, ataque superior, embestida, `RECOVER` y purificación.
- La Oscuridad: ondulación continua en sombra, fundido y recolocación durante `SHIFT`, siluetas legibles para rasante, meteoritos, zona oscura y apagado, anillo dorado en `EXPOSED` y disipación en luciérnagas al quedar `DISPELLED`.

El frame nunca modifica la hitbox. Los estados de ataque, daño, vulnerabilidad y derrota deben leerse incluso sin audio. Pausa congela el estado visual junto a la simulación.

## Color, escala y legibilidad

- Mantener grupos de píxeles nítidos; no aplicar suavizado fotográfico.
- El Babito conserva un diseño lógico de 48 unidades y lo rasteriza a 64 px reales con escala de detalle 4/3 dentro de celdas fuente de 80 px. Sigue las láminas de anatomía: cuerpo de gominola de 47 × 47 px (superelipse con corona plana y flancos casi verticales), contorno `#182334` de 2 px, cuerpo `#48D9F5`, luz `#91F1FF` en el cuarto superior izquierdo, sombra `#229CCB` solo en el flanco derecho, ojos ovalados de 8 × 12 px con destello blanco, sonrisa abierta con lengua, mejillas `#FF91AD`, brazos en forma de muñón redondeado y dos pies cortos separados. La sombra nunca cruza la barriga ni toca los pies, de modo que no se lee como cinturilla o calzoncillo. Caminar, correr, saltar, caer, aterrizar y atacar conservan la cara equipada; el daño muestra ojos «> <» con estrellas y la derrota, ojos en X. Sus tres cajas de presentación son 54, 80 y 106 px (escalas `0.675`, `1` y `1.325`, lo más cercano en píxel entero a los 32/48/64 de las láminas); el tamaño normal muestra cada píxel fuente 1:1 y los tres comparten línea de pies. La animación usa cambios reales de silueta, apoyo de pies, brazos, inclinación y *squash/stretch*; no se simula con una única imagen deslizándose.
- VUELA se autoriza en celdas raster de 256 px y se muestra a 64 × 64 mediante escala exacta de 1/4 y filtro nearest. Cada pose conserva margen transparente y alpha 0/255 para evitar neblina, rectángulos o interpolación sobre el fondo.
- Las hojas de Ciudad usan celdas de 443 × 443 con fondo transparente. Drone Bot se muestra aproximadamente a 120 px, Robot Elice a 160 px e IVE Robot a 240 px, manteniendo la relación 1,5×/2×/3× frente a un Babito normal y suficiente margen para hélices, cuchillas y guadañas.
- Usar contorno azul marino u oscuro y una paleta limitada por mundo.
- La estética pixel art no justifica texto empastado: el texto visible parte de 12 px, conserva counters y huecos abiertos y usa como máximo 1 px de contorno entre 12 y 15 px. El filtro nearest se reserva para arte; las texturas tipográficas usan linear.
- COME siempre se percibe mayor que el Babito; VUELA, menor. Los tres tamaños del Babito cambian el render, no la colisión. Los pies de COME se anclan al borde inferior del cuerpo físico en todos sus clips y nunca atraviesan visualmente la superficie de apoyo.
- Reservar contraste para personaje, enemigos, proyectiles, señales de peligro, monedas y plataformas reales.
- Un cartel diegético forma una sola silueta de tabla, texto y poste. El poste toca una superficie física; el texto nunca flota fuera de la tabla ni se coloca sobre un enemigo o checkpoint.
- No incorporar texto, HUD, logos o marcas de agua dentro de un asset de fondo.

## Sustitución de placeholders

Un asset final conserva la clave runtime y el encuadre esperado, se registra en la precarga, mantiene un fallback cuando procede y añade una ficha en `art/production/` con resolución, referencias, herramienta, fecha, prompt o proceso e integración. También se actualizan [INTERACTIONS.md](INTERACTIONS.md), [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) y [CHANGELOG.md](CHANGELOG.md) si cambia la lectura o interacción.
