# Registro de cambios

Este archivo relaciona las iteraciones entregadas con sus cambios observables, código, arte y comprobaciones. El detalle funcional vigente está en [INTERACTIONS.md](INTERACTIONS.md); este registro explica cuándo y por qué cambió.

## Próxima iteración

- Mantener sincronizados `README.md`, `INTERACTIONS.md`, `GAME_DESIGN.md`, `IMPLEMENTATION_SPEC.md` y `ACCEPTANCE_CRITERIA.md` cuando cambien flujo, controles, estados, persistencia o contenido jugable.
- Añadir una entrada aquí por cada cambio observable, con el commit final y las pruebas realizadas.

## Fase 3 · Ciudad de los Bicharracos — 2026-10-12

Ciudad Bicharraca deja de ser una pantalla de avance y pasa a ser la tercera fase jugable:

- **Fondo oficial**: el panorama industrial entregado por el usuario sustituye al paisaje provisional en juego, landing y cierre. Se conserva completo a 1672 × 941; el parallax ahora usa capas transparentes de ambiente para no ocultar sus carteles, fortaleza, plataformas y tráfico.
- **Nivel completo**: [city.json](../src/data/levels/city.json) define 7200 px en tres zonas —Entrada, Fábricas y Fortaleza—, cuatro checkpoints, once encuentros, 36 Babicoins, plataformas de metal y tuberías, tres plataformas móviles, cinco peligros eléctricos y el portal final.
- **Tres robots de Momo**: Drone Bot vuela, carga y dispara un rayo vertical; Robot Elice patrulla por tierra, gira invulnerable y queda expuesto al terminar; IVE Robot, también terrestre, combina guadaña, agarre con retroceso y doble tajo avanzado. Sus tamaños mantienen la jerarquía aproximada 1,5×/2×/3× frente a Babito.
- **Animación de estados**: las tres hojas transparentes 4 × 2 contienen ocho poses completas de 443 × 443 px por personaje y sustituyen cualquier uso de la ficha conceptual dentro de Phaser. Los mappings cubren todos los estados de IA, daño y derrota. Referencias, prompts y herramienta están en [city-enemy-sheets-v1.md](../art/production/city-enemy-sheets-v1.md).
- **Escenario con profundidad**: el paisaje industrial existente funciona como capa lejana; [cityScenery.js](../src/game/cityScenery.js) añade tres niveles de parallax, rótulos de zona y chispas. Arte, colisión y peligros permanecen separados.
- **Flujo y persistencia**: el Mapa desbloquea Ciudad tras la Fase 2, `CONTINUAR` reanuda sus checkpoints y el portal guarda `phase3Complete`. El cierre muestra `PRÓXIMAMENTE: BOSS TOTAL` y permite volver al Mapa o al Título sin implementar todavía ese boss.
- **Landing y autoría**: Ciudad figura como Fase 3 jugable; las tarjetas, comparativas y láminas incorporan Drone Bot, Robot Elice e IVE Robot. El texto visible declara: «Los robots de la Ciudad Bicharraca han sido imaginados y dibujados por Momo.»
- **Compatibilidad**: Babilandia, La Jungla, ambos bosses, los tres poderes, HUD, controles, tienda, guardados antiguos y GitHub Pages mantienen sus contratos.

Validación pendiente de cierre en esta iteración: pruebas automáticas actualizadas, build de producción, `git diff --check` y QA visual de los tres robots, las tres zonas y la pantalla de Boss Total.

## Fondo raster de La Jungla — 2026-10-12

La Fase 2 incorpora como capa lejana el paisaje pixel art aprobado de selva, montañas, cascadas y templo:

- **Paridad con Babilandia**: `GameScene(jungla)` precarga el nuevo raster 16:9, lo escala con *cover* y lo desplaza suavemente según la cámara durante los 6400 px del recorrido.
- **Gameplay intacto**: plataformas, puentes, pilares, fosos y agua conservan cuerpos y reglas independientes; ninguna forma pintada en el fondo crea o elimina colisión.
- **Profundidad dinámica**: el agua de los fosos, la cascada, las lianas, las ruinas, la maleza, las luciérnagas y el oscurecimiento final siguen renderizados por encima del paisaje.
- **Carga resiliente**: si el archivo no está disponible, `addPixelBackground()` vuelve al fondo procedural `jungle` sin impedir jugar.
- **Trazabilidad**: se preserva el PNG aportado en `art/approved/jungla_background_v1.png`, el runtime usa un WebP optimizado y [jungla-v1.md](../art/production/jungla-v1.md) registra dimensiones, derivado e integración.

## Babito v5 según las láminas de anatomía — 2026-10-11

El protagonista se audita contra las tres láminas de anatomía aprobadas ([babito_anatomy_1.png](../art/approved/babito_anatomy_1.png), [_2](../art/approved/babito_anatomy_2.png), [_3](../art/approved/babito_anatomy_3.png)) y se redibuja para coincidir con ellas. Detalle en [babito-v5.md](../art/production/babito-v5.md):

- **Personaje base**: cuerpo de gominola (corona plana y flancos casi verticales) en lugar de círculo; paleta CUERPO `#48D9F5`, LUZ `#91F1FF`, SOMBRA `#229CCB`, CONTORNO `#182334` y MEJILLAS `#FF91AD`; ojos ovalados brillantes; sonrisa abierta con lengua; brazos en muñón redondeado; y dos pies separados. La sombra aparece solo en el flanco derecho, así que no reintroduce la banda inferior corregida en la v4.
- **Animación**: caminar, correr, saltar, caer, aterrizar y atacar ya no ponen ceño fruncido ni ocultan los ojos y la boca elegidos. El daño muestra ojos «> <» con estrellas; la derrota mantiene los ojos en X. Los brazos ya no se alargan hasta parecer orejas al caminar o saltar.
- **Cosméticos**: sombreros por encima de los ojos y gafas de sol a la nueva altura de la cara; las once pieles heredan la nueva geometría.
- **Tamaños**: ×0,675 / ×1 / ×1,325 (54 / 80 / 106 px), lo más cercano con píxel entero a los 32/48/64 px de las láminas; la vista previa del Creador pasa a ×2,75 para que GRANDE ocupe lo mismo que antes. Hitbox, física y guardados no cambian.
- **Landing**: `babito.png` se reexporta desde el nuevo renderer.

Pruebas actualizadas y añadidas en `babito-animation.test.js`, `landing.test.js` y `game-data.test.js`.

## Auditoría y correcciones de la Fase 2 — 2026-10-11

Revisión completa de La Jungla, sus tres enemigos, La Oscuridad y la rejugabilidad, con recorridos automáticos en navegador:

- **Atlas v2 de los tres enemigos**: la v1 cortaba la punta de la lanza de Garbanzo, partía en dos al Sapo vomitando, recortaba la copa del Árbol derrotado y dejaba esos fragmentos dentro de la celda vecina. La v2 reubica cada fragmento sin redibujar nada, usa celdas más anchas y un pivote común, de modo que las raíces del Árbol y el cuerpo del Sapo ya no saltan al cambiar de pose. Ver [jungle-enemy-sheets-v2.md](../art/production/jungle-enemy-sheets-v2.md).
- **Árbol y Sapo ya no se hunden**: el `Arcade.Group` de enemigos reactivaba la gravedad al añadirlos y ambos atravesaban el suelo poco a poco. `configureBody()` se aplica de nuevo tras agrupar.
- **Golpes que coinciden con el arte**: la estocada alcanzaba 159 px (la lanza pintada llega a 82) y la rama 193 px (el puño, a 62). Ahora cada área termina en el arma visible. El Árbol anticipa cada golpe 300 ms en ámbar, Garbanzo fija la dirección al anticipar, no ataca a un Babito situado en una cornisa ni persigue a uno fuera de su tramo, y los impactos en `RECOVER` ya no prolongan la ventana vulnerable.
- **Sapo en el agua**: queda medio sumergido detrás del río y de los puentes, sus ojos descansan en la superficie, la vomitera sale de la boca, los disparos pasan por encima cuando está sumergido y el primer sapo ya no tenía un anillo en el que se dejaba ver sin atacar.
- **Nivel**: checkpoints sin enemigos activos al reaparecer (Árbol de `lianas`, Árbol de `ruinas` y `penumbra`), Sapo de la laguna entre los dos puentes, carteles que ya no se solapan, monedas soltadas que frenan solas y los disparos (también la roca) atraviesan puentes y ramas, lo que hace jugable la laguna con Roca.
- **Rejugabilidad**: salir por `TÍTULO` tras un Game Over congelaba el siguiente nivel; salir desde la pausa de La Oscuridad desactivaba su pausa; una segunda victoria contra ella no mostraba el panel de salida. Las tres escenas de juego reinician sus overlays al crearse.
- **Controles táctiles**: HUD y pausa muestran los controles táctiles en lugar de las teclas cuando el juego usa el pad.

Pruebas añadidas: `jungle-enemy-ai.test.js` (lógica real de `EnemyController` con Phaser simulado), `jungle-level-safety.test.js` y nuevas comprobaciones de atlas. QA en navegador: las 24 poses vía `qaEnemy`, ataques con hitboxes superpuestas, recorrido completo de La Jungla por un bot con 250 ms de reacción, victoria, tienda, mapa y rejugado de ambas fases.

## Garbanzo Loco, Árbol Pocho y Sapo Pota jugables — 2026-10-10

La Jungla deja de reutilizar los enemigos de Babilandia e integra los tres Bicharracos definidos por sus dibujos y fichas aprobadas:

- **Elenco propio de Fase 2**: los diez enemigos del nivel forman seis secuencias legibles: Garbanzo Loco solo, Árbol Pocho camuflado, Sapo Pota en la laguna, Garbanzo + Árbol, Sapo + Garbanzo y el trío completo antes del portal. COME, VUELA y DA VUELTAS permanecen sin cambios en Babilandia.
- **Tres máquinas de estado completas**: Garbanzo patrulla, persigue, anticipa y ataca horizontalmente con su lanza; Árbol despierta por proximidad, golpea a izquierda o derecha y deja una recuperación vulnerable; Sapo emerge, anticipa, lanza vomitera tóxica, se recupera y vuelve a sumergirse. Los sapos avanzados disparan ráfagas de dos y tres proyectiles.
- **Arte de producción**: tres hojas transparentes de 1024 × 512, organizadas en ocho celdas de 256 × 256, sustituyen cualquier uso de retratos o láminas completas dentro del juego. La procedencia y el orden de poses quedan registrados en [jungle-enemy-sheets-v1.md](../art/production/jungle-enemy-sheets-v1.md).
- **Sistemas compartidos**: daño, poderes, terreno, checkpoints, drops de 0–2 Babicoins, pausa y sellado del portal siguen el contrato común de `GameScene`. Garbanzo respeta bordes y plataformas; Árbol y Sapo permanecen anclados a su hábitat; los proyectiles tóxicos se eliminan al impactar o al agotar su tiempo de vida.
- **Correcciones de combate y apoyo**: los golpes izquierdo/derecho del Árbol y la orientación del Sapo coinciden con sus hitboxes; recibir daño cancela la estocada pendiente y tocar el tronco, la espalda o el escudo no sustituye al área de ataque. Garbanzo y Árbol compensan el padding inferior del atlas, los tres sapos viven en huecos con agua, la vomitera sale de la boca hacia una calle horizontal útil y sus monedas aterrizan en una orilla o puente accesibles.
- **Portada coherente**: las tarjetas dejan atrás `En desarrollo` y presentan a los tres como `Jugable · Fase 2`. Los retratos y concept boards continúan siendo contenido editorial; los spritesheets de Phaser son assets separados.

La validación de cierre incluye pruebas de datos, composición del nivel, mapeo estado/animación, transparencia y padding de las 24 poses, build de producción y QA visual de los seis encuentros.

## Créditos de Lola y Momo — 2026-10-10

Commit [`0443a74`](https://github.com/jorgegalindocruces/Babitos/commit/0443a74). La landing termina ahora reconociendo de forma expresa a quienes dieron origen al universo del juego:

- **Autoría visible**: después de la llamada final a jugar, `#creditos` atribuye a Lola y Momo las ideas y los dibujos de BABITOS y los presenta como sus directores creativos y ejecutivos. El cargo existe como texto HTML y no depende de leer la imagen.
- **Lámina completa**: el gráfico 3:2 se muestra sin recorte, con dimensiones intrínsecas declaradas y carga diferida. También se abre en el visor de arte mediante ratón, toque o teclado.
- **Original preservado**: `art/approved/credits_lola_momo.png` conserva el PNG aportado de 1536 × 1024; el derivado web de alta calidad pesa unos 358 KB frente a los 1,87 MB originales y no aplica nearest al reducir texto pequeño.
- **Responsive y accesible**: el cierre mantiene la atribución legible aunque falle la imagen, no introduce overflow a 390 px y añade una entrada `Créditos` a la navegación de escritorio.

Validación: 137 pruebas automáticas, build de producción, `git diff --check`, QA visual de escritorio y móvil (390 × 844), ampliación accesible, imagen completa y consola sin avisos ni errores.

## Banda sonora melódica con tres arreglos — 2026-10-10

Commit [`ef29ca2`](https://github.com/jorgegalindocruces/Babitos/commit/ef29ca2). El antiguo acorde continuo se sustituye por una banda sonora chiptune compuesta y seleccionable:

- **Siete canciones originales**: título, Babilandia, Babito Corrupto, tienda, Jungla, La Oscuridad y cierre tienen bucles propios de 32 pasos, con melodía, progresión de acordes, arpegio, bajo y ritmo en lugar de osciladores estáticos.
- **Tres formas de escucharla**: `AVENTURA` es el arreglo inicial, cálido y melódico; `CALMA` reduce tempo, densidad y brillo; `ARCADE` acelera el pulso y usa timbres chiptune más marcados. El botón `♫` junto a `AUDIO` cambia el arreglo global, anuncia el resultado y no altera el mute.
- **Preferencia compatible**: `babitos.audio.v1` continúa guardando exclusivamente `muted`/`enabled`; `babitos.music.v1` conserva el arreglo. Valores ausentes, desconocidos o un `localStorage` bloqueado vuelven de forma segura a `AVENTURA`.
- **Reproducción estable**: un scheduler Web Audio con anticipación de 160 ms, envolventes finitas, límite de voces, filtro suave y crossfade evita zumbidos, huecos, clics y acumulación de nodos. Cambiar tema o arreglo limpia su transporte anterior, también tras una interrupción del sistema.
- **Ciclo de vida y responsive**: cerrar el juego suspende el contexto y retira el listener de recuperación para que la landing no reactive música; reabrirlo recompone el arreglo correcto. Los dos controles ocupan una barra propia en móvil y pantalla completa sin interceptar el HUD.

Validación: 136 pruebas automáticas, build de producción, `git diff --check`, revisión de código sin hallazgos P1/P2 y QA visual en escritorio y móvil (390 × 844) de las tres opciones, persistencia, barra reservada y consola sin avisos ni errores.

## Nuevos Bicharracos de La Jungla en la landing — 2026-10-10

Commit [`9f24c57`](https://github.com/jorgegalindocruces/Babitos/commit/9f24c57). La portada incorpora los dibujos infantiles y las fichas pixel art aprobadas de Garbanzo Loco, Árbol Pocho y Sapo Pota sin presentarlos todavía como enemigos jugables:

- **Personajes por fase**: Babilandia conserva COME, VUELA y DA VUELTAS. Una segunda fila presenta los tres diseños de La Jungla con retratos editoriales, rasgos propios y la etiqueta visible `Diseño aprobado · En desarrollo`.
- **Del papel al píxel**: la selección pasa de ocho a once comparativas. Los bocetos nuevos se encuadran completos con `object-fit: contain`, sin cortar escudo, ramas, lengua ni nombres, y se emparejan con retratos derivados de las fichas aprobadas.
- **Galería**: Garbanzo Loco, Árbol Pocho y Sapo Pota abren sus láminas completas en el visor. Las tres ocupan el ancho disponible para conservar la lectura de poses, ataques, detalles y paletas.
- **Procedencia**: se preservan los seis PNG aportados en `art/approved/` y `art/original_drawings/`; nueve WebP optimizados añaden bocetos, retratos y fichas a la landing. El inventario editorial pasa de 23 a 32 derivados y ocupa aproximadamente 3 MB.
- **Alcance honesto**: estos recortes no se precargan en Phaser y no cambian la Jungla jugable, sus ocho encuentros ni los tres tipos de enemigo actuales. La ficha editorial evita usar «en el juego» hasta que existan spritesheets y comportamiento runtime reales.

Validación: 123 pruebas automáticas, build de producción, `git diff --check` y QA visual en escritorio y móvil (390 × 844) de tarjetas, comparativas, galería y visor, sin overflow horizontal, imágenes rotas ni errores de consola.

Este estado editorial quedó supersedido el mismo 10 de octubre al integrar las tres máquinas de estado y sus spritesheets de producción en la Fase 2 jugable.

## Estados completos y siluetas pixeladas del Babito — 2026-10-09

Commit [`4f31baf`](https://github.com/jorgegalindocruces/Babitos/commit/4f31baf). La animación del protagonista deja de depender de poses casi idénticas y de un override QA que podía ocultar el estado real:

- **Nueve estados y 54 poses**: se añade `land` con impacto, asentamiento y recuperación. La prioridad común es `dead` → `hurt` → `attack` → `jump`/`fall` → `land` → `idle`/`walk`/`run`.
- **Acciones inmediatas**: salto normal o de seta, ataque, daño, KO y respawn seleccionan su pose en el mismo frame; cada ataque aceptado reinicia el *one-shot* completo, incluso con el cooldown corto de Rayo. El reloj visual se congela durante *hit-stop*.
- **Pixel art legible**: aletas de reposo, apertura, guardia, elevación, subida, extensión, golpe y caída tienen geometría propia. Los brazos de muelle siguen esos destinos sin perder el zigzag; los pies distinguen planta, punta, elevación, recogida, caída, impacto y KO. Ataque, salto, caída y muerte ya no comparten la misma máscara.
- **Apoyo estable**: `idle`, caminar, correr apoyado, aterrizar y atacar compensan squash e inclinación para mantener el pie de contacto en una baseline exacta. La hitbox de 28 × 40, las siete capas, tamaños, paletas y guardados no cambian; el cuerpo continúa sin sombra inferior ni lectura de calzoncillo.
- **QA fiable**: `qaMotion` sin `qaFrame` anima a velocidad real; con `qaFrame` congela el frame local; cualquier input real libera el override. La exportación [babito.png](../public/assets/landing/babito.png) vuelve a salir del renderer compartido.

Validación: 122 pruebas automáticas, build de producción, `git diff --check`, hoja completa de las 54 poses con brazos normales y de muelle, y QA visual en `GameScene` para salto, ataque activo, aterrizaje, KO y liberación del override; consola sin avisos ni errores.

## Babito sin sombra corporal ni lectura de calzoncillo — 2026-10-09

Commit [`0dc8b0a`](https://github.com/jorgegalindocruces/Babitos/commit/0dc8b0a). La referencia aprobada continúa gobernando la silueta, el rostro y las proporciones del Babito, pero queda supersedida en su franja inferior oscura. El renderer deja de pintar `palette.shade` sobre el cuerpo en todas las paletas y los 51 frames: barriga, raíces de los pies y pies comparten `palette.main`, y el contorno inferior se abre en dos uniones estrechas para evitar una cinturilla, un calzoncillo o un pantalón. La exportación editorial de la landing se regenera desde el mismo renderer.

Validación: 118 pruebas automáticas —incluida la matriz de 561 combinaciones de paleta y frame—, build de producción, `git diff --check` y QA visual sin errores de consola en Creador (cian y rosa) y `GameScene` (caminar y atacar).

## Babito sin banda inferior de sombra — 2026-10-08

Commit [`60126f3`](https://github.com/jorgegalindocruces/Babitos/commit/60126f3). Se elimina la lectura accidental de pantalón en el Babito base: vientre e interior de los pies comparten ahora el color principal de forma continua, mientras la sombra de volumen queda limitada al lateral lejano del cuerpo. El ajuste conserva silueta, paletas desbloqueables, 51 frames, siete capas, tamaños, baseline, hitbox y guardados.

Validación: 117 pruebas automáticas, build de producción, `git diff --check` y QA visual en Creador y `GameScene` (caminar), con el Babito cian y rosa, sin banda inferior ni errores de consola.

## Babito v4 más redondo y con mayor detalle — 2026-10-08

Commit [`0e760a1`](https://github.com/jorgegalindocruces/Babitos/commit/0e760a1). El protagonista se vuelve a contrastar con el recorte «BABITO BASE» y corrige la silueta todavía estrecha y puntiaguda de v3:

- **Más resolución útil**: el diseño lógico permanece en 48 unidades, pero se rasteriza con detalle 4/3 a 64 px reales dentro de celdas fuente de 80 × 80. El tamaño normal usa esos píxeles 1:1; pequeño y grande aplican `0.8` y `1.2` para conservar 64/80/96 px.
- **Silueta canónica**: el cuerpo pasa a 47 × 45 px, con radios 23, extremos verticales recortados y corona plana sin ápice. Se mantienen rostro pequeño, sonrisa compacta y mejillas; las aletas son más largas y caídas y los pies quedan visibles.
- **Contratos estables**: continúan los 51 frames, ocho estados, siete capas, hitbox de 28 × 40, paleta y guardados. La baseline fuente de 30 px se compensa a 20 px de mundo y los cambios de tamaño no desplazan el apoyo.
- **Landing**: [babito.png](../public/assets/landing/babito.png) se vuelve a exportar desde el renderer compartido a 320 × 320, con alpha binario y nearest 4× desde la celda de 80 px.
- **Proceso y contexto**: la construcción vigente queda fijada en [babito-v4.md](../art/production/babito-v4.md); [babito-v3.md](../art/production/babito-v3.md) se conserva como historial supersedido. El rediseño es Canvas determinista y no utiliza ImageGen.

Validación: 117 pruebas automáticas, build de producción, `git diff --check` y QA visual en Creador y `GameScene` para reposo, caminar, ataque y KO, con el Babito base y sombrero, sin recortes ni errores de consola.

## Texto nítido y legible en toda la interfaz — 2026-10-08

Commit [`f58ec45`](https://github.com/jorgegalindocruces/Babitos/commit/f58ec45). La corrección se aplica a todas las rutas comunes de texto y no solo a la Tienda:

- **Causa corregida**: `pixelArt: true` mantiene sprites y fondos en nearest, pero ya no degrada las texturas Canvas de `Phaser.Text`. Cada texto restaura filtro linear y sincroniza su resolución de fuente después de cualquier rerasterizado dinámico.
- **Jerarquía tipográfica**: escenas, HUD, menús, carteles, depuración y avisos suben a un mínimo visible de 12 px. Botones y etiquetas usan contorno proporcional: 1 px entre 12 y 15 px y 2 px desde 16 px.
- **Tienda**: catálogo, página, saldo, nombre, CTA y puesto aumentan de tamaño. Las recompensas se compactan bajo `PREMIOS DE 1.ª VICTORIA` para conservar ambas cantidades y estados sin salirse del panel.
- **Resto del juego**: Creador, Poder, Intro, Título, Mapa, Ciudad, letreros de fases, HUD y los dos bosses eliminan sus configuraciones anteriores de 7–11 px y reajustan espacio cuando era necesario.
- **Regresión**: las pruebas fijan el filtro tras cada `updateText()`, la sincronización 2×, los contornos y la ausencia de tamaños autorados inferiores a 12 px.

Validación: 117 pruebas automáticas, build de producción, `git diff --check` y QA visual en Tienda (incluido cambio de página), Poder, Babilandia y Babito Corrupto, sin errores de consola.

## Babito alineado con el arte canónico — 2026-10-08

Commit [`fa77fc2`](https://github.com/jorgegalindocruces/Babitos/commit/fa77fc2). El protagonista deja atrás la silueta ancha y rectangular del renderer anterior y adopta la construcción de la referencia aprobada:

- **Silueta y rostro**: en la rejilla interna de 48 px, cuerpo ovoide de 31 × 33 px, ojos normales de 3 × 7 px, sonrisa y mejillas compactas, aletas descendentes y pies cortos; la sombra inferior sigue el volumen en lugar de formar una banda.
- **Color**: el cian base pasa a `#7CDBF9`, con luz `#A8EDFF` y sombra `#2BBFE5`, sin alterar las variantes desbloqueables.
- **Sistema completo**: se conservan los 51 frames, ocho estados, siete capas cosméticas, tres tamaños visuales, baseline y hitbox de 28 × 40. La opción inicial queda sin sombrero; los guardados existentes no cambian.
- **Landing**: [babito.png](../public/assets/landing/babito.png) se vuelve a exportar desde el mismo renderer con transparencia binaria y nearest 4×, para que portada y juego compartan identidad.
- **Referencia**: proporciones, proceso e integración quedan inventariados en [babito-v3.md](../art/production/babito-v3.md). El rediseño fue determinista en Canvas y no utilizó generación de imagen.

Validación: 114 pruebas automáticas, build de producción y QA visual en Creador, caminar, ataque y KO.

## Contexto integral, landing y Fase 2 reconciliados — 2026-10-08

Commits [`dbe1757`](https://github.com/jorgegalindocruces/Babitos/commit/dbe1757) y [`19d6fc6`](https://github.com/jorgegalindocruces/Babitos/commit/19d6fc6), tras contrastar los cambios de game feel, Fase 2 y landing con código, datos, arte, guardado y despliegue real:

- **Flujo vigente**: `ComingSoonScene` queda reservado a Ciudad. Enlaces heredados `world=jungle|jungla` entran en `GameScene(jungla)` y nunca vuelven a presentar La Jungla como futura; su copy reconoce que las Fases 1 y 2 ya son jugables.
- **Landing fiable**: cerrar durante la primera importación de Phaser desactiva el controlador al terminar, sin juego ni foco ocultos. `?qa` solo abre el diálogo en desarrollo. Se corrigieron dimensiones intrínsecas y se añadieron regresiones de carga diferida, estructura, controles, rutas y WebP.
- **Tienda y controles**: el puesto muestra por separado las recompensas únicas configuradas de Babito Corrupto (+30) y La Oscuridad (+40), con estado `PENDIENTE`/`COBRADA`. El panel de Controles incluye activación de menús con Espacio.
- **Justicia de La Oscuridad**: las tandas de meteoritos se desplazan como bloque junto a los bordes y conservan siempre 150 px entre centros; una función pura impide comprimir una tanda que no quepa.
- **Regresiones de Fase 2**: se fijan 6400 px, cuatro checkpoints, ocho enemigos, 30 monedas, dos setas, siete carteles, velo y portal; se comprueba el apoyo de todos los carteles y la persistencia Mapa → Jungla → boss2 → Tienda → Mapa con recompensa idempotente y rejuego.
- **Contexto**: README, prompt maestro, diseño, arte, implementación, interacciones y aceptación describen el mismo recorrido. Los 23 derivados de la landing quedan inventariados en [landing-web-v1.md](../art/production/landing-web-v1.md), y las rutas QA documentan La Jungla y `DarknessBossScene` sin prometer una persistencia que el código no garantiza.
- **Producción**: GitHub Pages está `built`, el certificado para `babitos.es`/`www.babitos.es` está aprobado y **Enforce HTTPS** activo; `www` y la URL técnica redirigen al dominio canónico.

Validación: 112 pruebas automáticas, build de producción (landing 6,55 kB; chunk diferido del juego 1,47 MB) y `git diff --check`.

## Landing page con diálogo de juego — 2026-10-08

Commit [`486d347`](https://github.com/jorgegalindocruces/Babitos/commit/486d347). `index.html` pasa a ser una landing page del juego:
- **Contenido**: hero, historia del Árbol de Poder, creador y poderes, tres mundos, personajes, ocho comparativas «Del papel al píxel» y una galería de láminas conceptuales con visor.
- **Juego en diálogo**: `JUGAR` abre un `<dialog>`. El motor se separa en [gameBoot.js](../src/gameBoot.js) y se carga solo en ese momento: la landing usa 6.5 kB de JavaScript y el juego 1.47 MB.
- **Cerrar el diálogo**: pausa la partida, duerme el bucle, silencia el audio y devuelve el teclado a la página. `Esc` sigue siendo la pausa del juego, y `#jugar` abre el juego directamente.
- **Arte**: optimizado a WebP en `public/assets/landing/` (1,9 MB); logo, hero y fondos críticos cargan de inmediato y galería/dibujos bajo el primer pliegue, en diferido.
- **Pruebas**: 96 casos automáticos y, en Chrome, escritorio y móvil sin overflow horizontal. Build de producción servida sin errores ni imágenes rotas. Ciclo abrir → jugar → `Esc` → cerrar → desplazar con teclado → reabrir en pausa.

## Fase 2: La Jungla y La Oscuridad — 2026-10-08

Commit [`1b767b9`](https://github.com/jorgegalindocruces/Babitos/commit/1b767b9). La Jungla deja de ser una pantalla de avance y se convierte en la Fase 2 jugable, con su jefe.

- **Motor de niveles**: `GameScene` carga cualquier nivel del nuevo registro [levels/index.js](../src/data/levels/index.js) (fondo, texturas, recompensas, anuncio y jefe de destino) y resuelve el nivel desde el progreso guardado. Babilandia no cambia.
- **La Jungla** ([jungla.json](../src/data/levels/jungla.json)): 6400 px en tres tramos (Raíces, Puentes de cuerda, Ruinas en penumbra), cuatro checkpoints, ocho encuentros y 30 Babicoins colocadas (`jungla:coin:`). Es la primera fase con fosos: todos se saltan (≤ 160 px) o se cruzan por puentes, y caer cuesta un corazón. Añade setas saltarinas (mantener el salto lanza más alto), pilares de ruinas sólidos y una oscuridad progresiva con halo sobre el Babito. Ambientación procedural en [jungleScenery.js](../src/game/jungleScenery.js).
- **Enemigos**: COME y DA VUELTAS se quedan en su tramo de suelo continuo (COME espera en el borde y DA VUELTAS se da la vuelta), giran al chocar con un pilar y vuelven a su origen si caen fuera del mundo.
- **La Oscuridad** ([DarknessBossScene.js](../src/scenes/DarknessBossScene.js)): intangible en la sombra y vulnerable solo al cruzar la luz de un farolillo encendido. El jugador enciende los farolillos disparándoles. Tiene sombra rasante, meteoritos oscuros y zona oscura, y apaga farolillos con aviso. Al vencer devuelve la Manzana de Poder y concede 40 Babicoins una vez. Su sprite sigue la lámina canónica.
- **Progreso**: el Mapa abre La Jungla al completar la Fase 1 y marca la Fase 2 como completa; `CONTINUAR` reanuda `jungla` o `boss2`. El guardado añade `boss2Defeated` y `phase2Complete`. Música nueva: `jungle` y `darkness`.
- **Correcciones del playtest**:
  - La Roca fallaba a media distancia porque su arco pasaba por encima de la hitbox baja de La Oscuridad; ahora la hitbox crece al quedar expuesta.
  - Un farolillo encendido bloqueaba los disparos cuando ella quedaba expuesta a su lado; ahora los deja pasar.
  - La seta lanzaba 184 px en vez de 250 porque la velocidad máxima de caída también limitaba la subida; ese límite se levanta solo durante el rebote.
  - La lluvia de meteoritos dejaba huecos demasiado estrechos; ahora caen separados 150 px.
- **Pruebas**:
  - Unitarias: 8 tests nuevos (registro de niveles, tramos de suelo, fosos saltables, apoyo de checkpoints, enemigos, setas y portal, datos del jefe y desbloqueo), y la prueba de alcanzabilidad cubre ahora los dos niveles, con setas.
  - Bots en Chrome: La Jungla completada con los tres poderes en 48–63 s, con 0 golpes en modo preciso y 2 en modo casual.
  - La Oscuridad vencida por el bot casual con los tres poderes: Fuego 31 s, Rayo 16 s, Roca 80 s.
  - Flujo completo verificado: Mapa → Jungla → jefe → Tienda → Mapa, y `CONTINUAR`.

## Babito nítido en menús — 2026-10-08

Commit [`1b767b9`](https://github.com/jorgegalindocruces/Babitos/commit/1b767b9). El Babito se veía borroso en Título y Creador. Su arte de 48 px se dibujaba con formas vectoriales bajo una escala fraccionaria: el 62 % de los píxeles quedaba semitransparente y aparecían franjas de colores mezclados, que la ampliación ×4/×3 hacía evidentes. Ahora cada capa se dibuja a tamaño nativo, se copia con muestreo *nearest* y su alfa se binariza: el cuerpo pasa de 210 colores mezclados a 6 limpios. Se comprobaron las 51 poses con accesorios en la hoja completa.

## Bajar de plataformas con ↓ — 2026-10-08

Commit [`1b767b9`](https://github.com/jorgegalindocruces/Babitos/commit/1b767b9). Primera de las ideas aplazadas en la iteración anterior: los refugios dejaban al jugador sin forma de bajar sobre COME salvo caminar hasta el borde.

- `S`, `↓` o el nuevo pad táctil `▼` dejan caer al Babito a través de la plataforma elevada en la que está de pie; sobre el suelo base no hacen nada. Funciona en Babilandia, La Jungla y las dos arenas de jefe.
- [platformCollision.js](../src/game/platformCollision.js) añade `findOneWayPlatformsUnder()`, `hasClearedPlatform()` y la opción `ignore` de `shouldCollideWithTerrain()`; enemigos, monedas y boss no cambian.
- La pulsación se encola desde `keydown`, como el salto: en el navegador, un toque de un solo frame se perdía con `JustDown`.
- Aviso contextual único la primera vez que el Babito descansa sobre una plataforma, y la tecla aparece en Controles y en ambas pausas.
- Pruebas: 2 tests unitarios nuevos; playtest en Chrome de la caída con `↓`, `S` y pad táctil en ambas escenas, de la vuelta a subir a la misma plataforma y de `↓` sobre el suelo sin efecto.

## Game feel, nivel y boss justos — 2026-10-08

Commit [`28e32ec`](https://github.com/jorgegalindocruces/Babitos/commit/28e32ec). Auditoría de jugabilidad con playtest automatizado en navegador (bots preciso y «casual» con 250 ms de reacción, con los tres poderes):

- **Control**: nuevo modelo puro [playerMovement.js](../src/game/playerMovement.js) con tuning en `player.movement`. El salto pasa de 85 a ~133 px medidos, con gravedad de caída mayor, corte suave al soltar (antes multiplicaba la velocidad por frame y dependía de los Hz) y flotación en el vértice. El giro deja de derrapar (de 48 px/267 ms a 15 px/83 ms), la frenada pasa de 51 a 19 px y el control aéreo es propio. El retroceso bloquea el control 220 ms y hay 10 px de margen al aterrizar en bordes. Se eliminan `moveSpeed`, que no se usaba, y `jumpVelocity`.
- **Nivel**: 5 de las 9 plataformas elevadas eran inalcanzables con el salto anterior. Ahora las 10 lo son, con el suelo continuo intacto. Se añaden 25 Babicoins colocadas de cobro único (`babilandia:coin:<id>`), una ruta alta sobre el puente y otra hacia el portal, y COME_2 se mueve junto a DA VUELTAS para crear el primer encuentro combinado. COME_2 alcanzaba con su persecución el checkpoint `boss_gate`.
- **Justicia**: al reaparecer, los enemigos cercanos vuelven a su origen; cargar un checkpoint intermedio concede invulnerabilidad de respawn. DA VUELTAS se orienta y rueda hacia el Babito y solo ataca a menos de 460 px. El portal sellado indica qué falta y dónde.
- **Bugs**: la Roca sumaba su gravedad a la global (alcance real ~120 px en lugar de ~300). Los avisos flotantes quedaban encima de la pausa y de `GAME OVER` para siempre, porque su temporizador estaba detenido. El aviso inicial del boss tapaba el primer patrón.
- **Boss**: `FIREBALL` mezclaba una bola que pasaba 1 px por encima de la hitbox con otra que obligaba a saltar, separadas 330 ms. Ahora todas salen a la altura de los pies, con orbe de carga de 300 ms y separación de 900/850 ms. La embestida no daña con el boss detenido.
- **Feedback**: polvo al saltar y aterrizar, hit-stop al recibir daño (80 ms), al acertar (35/45 ms) y al derrotar (70 ms), chispas y latido del contador al recoger monedas en lugar de un destello a pantalla completa, y cámara con *look-ahead* direccional.
- **Código**: pads táctiles compartidos en [touchControls.js](../src/ui/touchControls.js), con zona activa ampliada; `applyKnockback()`, `grantSpawnGrace()`, `resetToHome()`, `dismissToast()`, `spawnDust()` y `hitStop()`.

Resultado del playtest: los bots completan Babilandia en 28–46 s con los tres poderes y vencen al boss. El bot casual ya no muere por bolas ilegibles (antes perdía siempre en `FIREBALL`). Pruebas: 86 casos automáticos (10 nuevos en [player-movement.test.js](../test/player-movement.test.js)), compilación de producción y `git diff --check`.

## Acceso al mapa y rejugada de la Fase 1 — 2026-10-08

Commit [`6889c92`](https://github.com/jorgegalindocruces/Babitos/commit/6889c92):

- convirtió la salida de Tienda en el CTA principal `CONTINUAR AL MAPA`, lo colocó primero en el orden accesible y guardó `scene: 'map'` antes del fundido;
- hizo visible la acción de la tarjeta completada de Babilandia con `REJUGAR DESDE EL INICIO`, en lugar de mostrar únicamente un estado `COMPLETADO` que parecía inactivo;
- inició cada rejugada con `scene: 'babilandia'` y `checkpoint: 'start'`, conservando poder, finalización, recompensas, monedas, aspecto y colección;
- movió el control HTML de audio a una esquina segura en viewports bajos para que no intercepte el CTA inferior;
- centralizó las transiciones persistentes en `progressionFlow.js` y añadió una regresión que recarga el guardado después de Tienda → Mapa y después de Mapa → Fase 1.

QA visual e interactiva: recorrido completo con clic real en escritorio y 667 × 375, orden accesible correcto, aparición en el inicio de Babilandia y consola sin errores. Pruebas: 76 casos automáticos, compilación de producción y `git diff --check`.

## Babito ampliado y plataformas unidireccionales — 2026-10-08

Commit [`a360fd9`](https://github.com/jorgegalindocruces/Babitos/commit/a360fd9):

- amplió pequeño, normal y grande de 48/64/80 px a cajas de render de 64/80/96 px sin modificar la hitbox de 28 × 40 ni la línea de apoyo;
- convirtió las plataformas elevadas de Babilandia y de la arena de Babito Corrupto en superficies unidireccionales: se atraviesan desde abajo o por el lateral inferior y sostienen al caer desde arriba;
- mantuvo el suelo base completamente sólido y dejó los colliders de proyectiles separados, por lo que los poderes siguen destruyéndose al impactar sin alterar el terreno;
- aplicó la misma decisión física a Babito, COME, DA VUELTAS, monedas y Babito Corrupto, mientras VUELA continúa atravesando toda plataforma;
- ancló los frames de COME a `body.bottom`, eliminando los 25 px de hundimiento que causaba centrar un render de 118 px sobre una hitbox de 68 px;
- reajustó el aislamiento `qaEnemy` de los enemigos terrestres para que su cuerpo, y no el desfase visual anterior, quede realmente apoyado en el suelo;
- añadió contratos puros para escala/baseline, anclaje enemigo y colisión semisólida, con regresiones de ascenso, descenso, reposo, contacto lateral, tolerancia y orden de argumentos.

QA visual: Babito normal y grande en `idle`; COME real en `PATROL` y aislado en `BITE`; pies alineados con la superficie y badge de estado fuera del sprite. Pruebas: 74 casos automáticos, compilación de producción y `git diff --check`.

## Estados de enemigos y VUELA raster — 2026-10-08

Commit [`d0466ea`](https://github.com/jorgegalindocruces/Babitos/commit/d0466ea):

- sustituyó la hoja procedural de VUELA por un atlas raster de 36 poses fiel a su diseño canónico, normalizado a celdas de 256 px, alpha 0/255 y render exacto a 64 × 64;
- separó `idle`, vuelo, picado, anticipación, daño y derrota; los clips no cíclicos sostienen su última pose en vez de saltar al inicio;
- convirtió `hurt` en una interrupción jugable completa: pausa el estado, anula daño e impactos repetidos y saca a COME/VUELA de ataques peligrosos hacia `RECOVER`/`RETURN`;
- eliminó la colisión de VUELA con plataformas para que el picado y el regreso no queden atrapados en geometría elevada;
- corrigió la inversión repetida de dirección en límites y muros, la orientación de VUELA al apuntar y la rotación residual de DA VUELTAS al caer derrotado;
- dividió la fila ofensiva de COME en anticipación y mordisco con tiempos alineados a sus ventanas reales, y evitó reiniciar `walk`/`fly` entre estados que comparten clip;
- añadió `qaEnemy`, `qaEnemyState` y `qaEnemyFrame` para aislar cualquier monstruo y revisar de forma determinista todos sus estados y frames sin daño ni persistencia.

Asset: [enemy-vuela-sheet-v4.png](../public/assets/characters/enemy-vuela-sheet-v4.png). Procedencia y prompt: [enemy-vuela-v4.md](../art/production/enemy-vuela-v4.md).

QA visual: 36 celdas de VUELA; `AIR_PATROL`, `WINDUP`, `DIVE`, `hurt` y `defeat`; ciclo real `DIVE → RETURN → AIR_PATROL`; `WINDUP`/`BITE` de COME; `WINDUP`/`DIZZY` de DA VUELTAS; consola sin errores. Pruebas: 68 casos automáticos, compilación de producción y `git diff --check`.

## Dominio canónico `babitos.es` — 2026-10-08

Commit [`a720de9`](https://github.com/jorgegalindocruces/Babitos/commit/a720de9):

- registró `babitos.es` como dominio personalizado en la configuración de GitHub Pages;
- añadió la URL canónica y `og:url` al documento público y actualizó los enlaces principales;
- mantuvo `base: './'` para servir el juego desde el dominio raíz y conservar compatibilidad con previews bajo subruta; con el dominio personalizado activo, la URL técnica redirige al canónico;
- documentó los cuatro registros IPv4, los cuatro IPv6, el alias `www` y el TXT de verificación;
- dejó explícito que los despliegues mediante GitHub Actions ignoran el archivo `CNAME` del artefacto y usan la configuración Pages del repositorio;
- añadió una regresión documental para evitar que la URL canónica o los DNS de GitHub desaparezcan por accidente.

Pruebas: 64 casos automáticos, compilación de producción y `git diff --check`.

Seguimiento documentado en [`4bfd3ce`](https://github.com/jorgegalindocruces/Babitos/commit/4bfd3ce) y verificado de nuevo el 8 de octubre de 2026: los cuatro `A`, los cuatro `AAAA` y `www` resuelven a GitHub Pages; el certificado está aprobado para `babitos.es` y `www.babitos.es`, **Enforce HTTPS** está activo, el dominio raíz responde y `www` redirige al canónico. No queda aprovisionamiento pendiente.

## Movimiento y acabado del Babito — 2026-10-08

Commit [`1795ebd`](https://github.com/jorgegalindocruces/Babitos/commit/1795ebd):

- sustituyó el contrato provisional de 28 frames por 51 poses repartidas entre `idle`, `walk`, `run`, `jump`, `fall`, `attack`, `hurt` y `dead`;
- separó caminar y correr con ciclos de ocho frames, apoyos, braceo, expresiones, inclinación y *squash/stretch* propios;
- amplió el atlas por capas a celdas de 64 px y añadió volumen, highlights, nuevas expresiones y poses de brazos sin aplanar la personalización del Creador;
- mantuvo sincronizadas cuerpo, ojos, boca, brazos, cabeza, gafas y cuello en todos los frames y tamaños;
- selecciona la pose después de resolver la física para eliminar un frame de retraso visual y conserva una línea de suelo común en pequeño, normal y grande;
- eliminó transformaciones fraccionarias en runtime que producían temblor, evitó recortes con límites transformados verificables y corrigió el KO para que no se hunda en la plataforma;
- añadió `qaMotion`, `qaFrame` y `qaSize` para inspeccionar cualquier estado, pose y tamaño en desarrollo.

QA visual: ocho estados del Babito, extremos de ataque y KO, los tres tamaños, Título, Creador, Poder, Intro, Babilandia, Boss, Tienda, Mapa y Ciudad Bicharraca; consola sin errores. Pruebas: 63 casos automáticos, compilación de producción y `git diff --check`.

## Carteles tutoriales apoyados — 2026-10-08

Commit [`6f0b5b4`](https://github.com/jorgegalindocruces/Babitos/commit/6f0b5b4):

- movió los cinco carteles de Babilandia a la definición data-driven del nivel, sin alturas manuales;
- ancló cada poste a la superficie física superior que soporta toda su base;
- sustituyó captions y sprites desconectados por una composición pixel art única de tabla, texto y poste;
- desplazó el aviso de DA VUELTAS para que no quede detrás del enemigo, el checkpoint o el jugador;
- añadió `qaCheckpoint=<id>` para revisar las cuatro zonas directamente sin modificar el progreso guardado;
- conserva tabla y texto sincronizados si la fuente pixel art termina de cargar después de iniciar la escena;
- añadió regresiones puras de superficie, bordes, origen, huecos y los cinco carteles reales.

QA visual: inicio, `market_gate`, `fountain` y `boss_gate`; todos los postes tocan su soporte y todas las frases quedan dentro de la tabla.

Pruebas: 59 tests automáticos, compilación de producción y `git diff --check`.

## Texto nítido y escala pixel-perfect — 2026-10-08

Commit [`def542c`](https://github.com/jorgegalindocruces/Babitos/commit/def542c):

- eliminó la ampliación CSS fraccionaria del canvas y conserva 960 × 540 exactos en escritorio;
- dejó a `Phaser.Scale.FIT` reducir el juego únicamente cuando la pantalla es menor, sin overflow;
- adelantó y sincronizó la carga de Silkscreen y Nunito antes de rasterizar las escenas;
- unificó la resolución interna de títulos, cuerpo, etiquetas, botones, avisos y texto de depuración;
- sustituyó la escala fraccionaria de nombres largos por un nuevo tamaño tipográfico entero;
- añadió `test/text-quality.test.js` y smoke visual en 1280 × 720 con DPR 2 y en 390 × 844.

Comprobación visual de escritorio: canvas interno 960 × 540, rectángulo CSS 960 × 540, escala física 2× en ambos ejes y ambas familias cargadas. Pruebas: 55 casos, build de producción y consola del navegador sin errores.

## Contexto documental sincronizado — 2026-10-08

Commit [`6935710`](https://github.com/jorgegalindocruces/Babitos/commit/6935710):

- añadió `INTERACTIONS.md` como referencia canónica de controles, escenas, menús, gameplay, animación, guardado, audio y rutas QA;
- separó contenido jugable, avances y roadmap en todos los documentos;
- corrigió el stack actual a JavaScript y la ruta completa con Intro y Mapa;
- convirtió las regresiones de terreno, botones, foco, pausa y animación en criterios verificables;
- enlazó código, datos, assets y fichas de producción con cada contrato;
- añadió `test/documentation.test.js` para detectar rutas locales inexistentes, contexto obsoleto y omisiones críticas;
- validó el resultado con 48 pruebas (`npm test`), build de producción (`npm run build`) y `git diff --check`.

## Fondos de fases finales — 2026-10-08

Commit [`c870692`](https://github.com/jorgegalindocruces/Babitos/commit/c870692):

- añadió el fondo 16:9 de la arena de Babito Corrupto;
- añadió el fondo 16:9 de Ciudad Bicharraca a su pantalla y previsualización;
- mantuvo fallbacks procedurales si un raster no carga;
- documentó procedencia, referencias y prompts en [boss-arena-v1.md](../art/production/boss-arena-v1.md) y [ciudad-bicharraca-v1.md](../art/production/ciudad-bicharraca-v1.md);
- añadió comprobaciones automáticas de dimensiones y registro de assets.

Assets: [boss-arena-v1.webp](../public/assets/backgrounds/boss-arena-v1.webp) y [ciudad-bicharraca-v1.webp](../public/assets/backgrounds/ciudad-bicharraca-v1.webp).

## Animaciones y menús fiables — 2026-10-08

Commit [`4e7dcfc`](https://github.com/jorgegalindocruces/Babitos/commit/4e7dcfc):

- incorporó estados animados distintos para idle, caminar, saltar, caer, atacar, recibir daño y KO del Babito;
- incorporó clips legibles por estado para COME, VUELA y DA VUELTAS y poses de patrón para el boss;
- aseguró que la pausa congela animación y simulación;
- amplió y normalizó las zonas activas de botones;
- corrigió foco, activación con teclado, capas modales y catálogo de tienda;
- reservó `Espacio` para saltar durante gameplay sin perder navegación accesible.

Pruebas relacionadas: `test/babito-animation.test.js`, `test/character-animation.test.js`, `test/boss-animator.test.js` y `test/button-geometry.test.js`.

## Fidelidad visual y estabilidad jugable — 2026-10-07

Commit [`f2e6ad5`](https://github.com/jorgegalindocruces/Babitos/commit/f2e6ad5):

- restauró la lectura del pixel art y los personajes canónicos;
- estabilizó colisiones y plataformas de Babilandia y del boss;
- separó proyectiles de terreno: un poder se destruye al colisionar, nunca destruye la plataforma;
- mejoró la interacción de menús, overlays y controles;
- añadió estados de daño, checkpoint, caída, game over y recuperación coherentes.

## Pulido audiovisual — 2026-10-07

Commit [`36e167e`](https://github.com/jorgegalindocruces/Babitos/commit/36e167e):

- integró el fondo raster de Babilandia con fallback procedural;
- añadió música y efectos sintetizados con Web Audio;
- añadió control de mute persistente y feedback audiovisual;
- actualizó la separación de licencias entre código y material artístico.

La procedencia del fondo se movió fuera del build público en [`b34da6b`](https://github.com/jorgegalindocruces/Babitos/commit/b34da6b) y está documentada en [babilandia-v2.md](../art/production/babilandia-v2.md). Asset: [babilandia-v2.webp](../public/assets/backgrounds/babilandia-v2.webp).

## Vertical slice jugable — 2026-10-07

Commit [`5b85f0d`](https://github.com/jorgegalindocruces/Babitos/commit/5b85f0d):

- creó el flujo Título → Creador → Poder → Intro → Babilandia → Boss → Tienda → Mapa;
- añadió los tres poderes, seis encuentros, monedas, checkpoints y guardado versionado;
- implementó Babito Corrupto, su recompensa única y el catálogo de cosméticos;
- dejó La Jungla y Ciudad Bicharraca como avances de roadmap;
- configuró pruebas, build de Vite y despliegue en GitHub Pages.

## Política de actualización

Un cambio no se considera documentado hasta actualizar las referencias afectadas:

| Si cambia… | Actualizar como mínimo |
|---|---|
| Control, botón, transición o regla jugable | `INTERACTIONS.md`, `ACCEPTANCE_CRITERIA.md` y esta entrada |
| Arquitectura, stack, datos o persistencia | `IMPLEMENTATION_SPEC.md`, README y esta entrada |
| Alcance actual o roadmap | `GAME_DESIGN.md`, README e `INTERACTIONS.md` |
| Diseño canónico o asset | `ART_BIBLE.md`, su ficha en `art/production/` y esta entrada |
| Flujo de trabajo para Codex | `CODEX_MASTER_PROMPT.md` |

Antes de cerrar una iteración se ejecutan `npm test`, `npm run build` y `git diff --check`.
