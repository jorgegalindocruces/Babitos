# Especificación de implementación

Especificación vigente del vertical slice 0.2. El comportamiento observable completo está en [INTERACTIONS.md](INTERACTIONS.md) y sus comprobaciones en [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md).

## Runtime

- JavaScript con módulos ES, Phaser 3, Vite y `localStorage`; sin backend.
- Resolución lógica efectiva: 960 × 540, `Phaser.Scale.FIT`, centrado, `autoRound: true`, `pixelArt: true` y `roundPixels: true`.
- En escritorio, el área jugable no se amplía por encima de 960 × 540 CSS px: así cada píxel lógico conserva una escala entera. Por debajo de ese tamaño, `FIT` reduce el lienzo manteniendo 16:9 y sin overflow.
- Física Arcade con gravedad global de 1350 y cuatro punteros activos para multitouch.
- Build estático con `base: './'` y despliegue en GitHub Pages. El dominio canónico es `https://babitos.es/`; la URL de proyecto bajo `/Babitos/` es el origen técnico y redirige al dominio personalizado mientras está activo. Las rutas relativas mantienen compatibilidad con previews bajo subruta.
- Node.js 24 en CI; `npm ci`, `npm test` y `npm run build` son la puerta de entrega.

`index.html` es la landing page del juego. [main.js](../src/main.js) solo gestiona la landing (diálogos de juego y de arte, y la activación de la hoja de fuentes) y pesa unos pocos kB. Al pulsar cualquier botón `JUGAR` abre el `<dialog id="play-dialog">` y, la primera vez, importa dinámicamente [gameBoot.js](../src/gameBoot.js), que espera a las fuentes, crea el audio y arranca Phaser dentro de `#game`. `startGame()` devuelve `setActive()`. Al cerrar el diálogo pone en pausa la escena jugable si la hay, duerme el bucle de Phaser, suspende el contexto de audio y desactiva el teclado del juego, para que flechas y Espacio vuelvan a desplazar la página. Si se cierra mientras la primera importación sigue pendiente, el controlador recién creado se desactiva antes de poder avanzar o tomar foco. Al reabrirlo restaura todo y llama a `scale.refresh()`. El evento `cancel` del diálogo se anula porque `Esc` es la pausa del juego. `#jugar` en la URL, o `?qa=` solo en desarrollo, abre el diálogo al cargar. El arte de la landing son 23 derivados optimizados inventariados en [landing-web-v1.md](../art/production/landing-web-v1.md). El workflow en [deploy-pages.yml](../.github/workflows/deploy-pages.yml). Al publicar mediante Actions, el dominio se guarda en la configuración Pages del repositorio y no en un archivo `CNAME` del artefacto.

## Escenas y flujo

`BootScene` carga assets, genera texturas temporales, registra animaciones, crea `SaveStore` y abre la escena solicitada:

```text
TitleScene → CreatorScene → PowerScene → IntroScene
           → GameScene(babilandia) → BossScene → ShopScene → WorldMapScene
WorldMapScene → GameScene(jungla) → DarknessBossScene → ShopScene → WorldMapScene
              └→ ComingSoonScene(city)
```

`WorldMapScene` también vuelve a Tienda o Título. `GameScene` recibe `{ level: 'babilandia' | 'jungla' }`; sin dato, resuelve el nivel a partir de `progress.scene`, de modo que `CONTINUAR` reanuda el nivel guardado. `ComingSoonScene` presenta únicamente Ciudad y vuelve al mapa; una llamada heredada con `world: 'jungle' | 'jungla'` redirige a `GameScene({ level: 'jungla' })` en lugar de mostrar la preview retirada. Las escenas dejan como estados estables `creator`, `power`, `intro`, `babilandia`, `boss1`, `jungla`, `boss2`, `shop`, `map` y `city`; [progressionFlow.js](../src/state/progressionFlow.js) persiste `map` al salir de Tienda, `babilandia` o `jungla` con `checkpoint: 'start'` antes de iniciar cada fase desde el mapa, y expone `isJungleUnlocked()`. Título conserva aliases de compatibilidad como `game`, `boss`, `jungle` y `world-map`.

## Datos y estado

- [game-data.json](../src/data/game-data.json): jugador, tamaños, poderes, enemigos y bosses.
- [cosmetics.json](../src/data/cosmetics.json): siete categorías, claves de asset, desbloqueo inicial y precios.
- [babilandia.json](../src/data/levels/babilandia.json): geometría, spawn, cuatro checkpoints, seis enemigos, 25 Babicoins colocadas (`coins`, con `id`, `x` e `y`) y portal.
- [jungla.json](../src/data/levels/jungla.json): mismo formato más `springs` (`id`, `x`, `launchHeight`), `darkness` (`startX`, `endX`, `maxAlpha`) y `style` opcional por plataforma (`branch`, `bridge`, `ruin`, `stone`). Los huecos entre segmentos de suelo son fosos; el suelo con `style` es un pilar sólido elevado.
- [levels/index.js](../src/data/levels/index.js): registro de niveles (tema, fondo, color de cámara, texturas, prefijo de recompensas, anuncio y jefe de destino), `resolveLevelId()` y `getGroundSpans()`, que fusiona segmentos de suelo contiguos en tramos caminables.
- Los carteles tutoriales de cada nivel solo guardan `id`, `x` y texto. [surfaceAnchoring.js](../src/game/surfaceAnchoring.js) obtiene la superficie física superior, y `GameScene` compone tabla, texto y poste como una sola decoración apoyada.
- [SaveStore.js](../src/state/SaveStore.js): normalización, migración y persistencia; el progreso incluye `boss2Defeated` y `phase2Complete`.

El guardado versionado `babitos.save.v1` contiene nombre, tamaño, apariencia, poder seleccionado/desbloqueado, monedas, cosméticos desbloqueados/comprados y progreso. `restartAdventure()` conserva colección, apariencia, saldo e IDs de recompensas cobradas, y reinicia poder, checkpoint y relato. El mute se guarda aparte en `babitos.audio.v1`.

## Input e interfaz

[Button.js](../src/ui/Button.js) centraliza hit area, estados visuales, registro por escena, foco y espejo HTML. El contrato admite puntero/toque y, cuando `keyboardShortcuts` no se desactiva, `Tab`, `Mayús + Tab`, `Enter` y `Espacio`. Los botones de pausa del HUD usan `keyboardShortcuts: false` para no competir con el salto.

[fontLoading.js](../src/ui/fontLoading.js) solicita Silkscreen y Nunito antes de crear `Phaser.Game`; si exceden el tiempo de espera, el juego arranca con fallback y vuelve a rasterizar los textos cuando terminan. [textQuality.js](../src/ui/textQuality.js) aplica resolución interna limitada a 2×, sincroniza `frame.source.resolution` y cambia solo las texturas `Phaser.Text` a filtro linear. Como `pixelArt: true` vuelve a imponer nearest cada vez que Phaser ejecuta `updateText()`, el helper envuelve esa operación una vez por objeto y restaura la calidad tras `setText`, `setColor`, `setFontSize` o una recarga de fuente; sprites y fondos siguen en nearest. `Button` y `createLabel` calculan el contorno según tamaño (0 px hasta 10, 1 px entre 11 y 15, 2 px desde 16), y el contenido visible autorado tiene un suelo de 12 px. Los textos que deben caber en un ancho se regeneran con un tamaño de fuente entero en vez de escalar su textura de forma fraccionaria.

`PlayerController` acepta teclado y cinco controles virtuales booleanos: izquierda, derecha, bajar, saltar y atacar. Salto, bajada y ataque filtran eventos nacidos en `button`, `input`, `textarea`, `select`, enlace o elemento editable; `M` aplica un filtro equivalente. El movimiento y los handlers `P`/`Esc` son globales mientras la escena jugable está activa. Al pausar, reanudar, morir o reintentar se borran edges y teclas retenidas.

## Jugador

Implementado en [PlayerController.js](../src/game/PlayerController.js):

- hitbox fija de 28 × 40 para los tres tamaños visuales;
- 3 puntos de vida; coyote time 110 ms y buffer 130 ms;
- invulnerabilidad de 1050 ms tras daño y 1500 ms tras respawn o al cargar un checkpoint intermedio;
- dirección persistente y un único ataque sujeto al cooldown del poder.

El modelo de movimiento es puro y está en [playerMovement.js](../src/game/playerMovement.js); el controlador le pasa el delta del reloj de gameplay y aplica el resultado. Todo el tuning vive en `player.movement` de [game-data.json](../src/data/game-data.json):

| Parámetro | Valor | Efecto |
|---|---:|---|
| `maxRunSpeed` | 320 | Velocidad horizontal máxima |
| `groundAcceleration` / `groundDeceleration` / `turnAcceleration` | 2600 / 3200 / 4400 | Arranque en ~0,13 s, frenada en ~19 px, giro sin derrape |
| `airAcceleration` / `airDeceleration` / `airTurnAcceleration` | 1900 / 900 / 2800 | Control aéreo que conserva inercia |
| `jumpHeight` / `jumpTimeToApex` | 138 px / 0,4 s | Se derivan velocidad de salto (690) y gravedad de subida (1725) |
| `fallGravityMultiplier` | 1,55 | Caída más rápida que la subida |
| `jumpCutGravityMultiplier` | 2,6 | Soltar el botón corta el salto con gravedad mayor, sin multiplicar la velocidad por frame |
| `apexHangVelocity` / `apexGravityMultiplier` | 70 / 0,6 | Breve flotación en el vértice si se mantiene el botón |
| `maxFallSpeed` | 720 | Velocidad terminal |
| `hurtControlLockMs` | 220 | Bloqueo horizontal durante el retroceso |
| `landingTolerancePx` | 10 | Margen de aterrizaje del Babito sobre plataformas unidireccionales (enemigos y monedas usan 4) |

La gravedad del Babito se aplica como gravedad propia del cuerpo menos la global de 1350, de modo que enemigos, monedas y boss mantienen su física. El corte de salto solo actúa sobre un salto iniciado por el jugador; el retroceso usa la gravedad de subida completa para que el golpe se lea como un pequeño salto. `applyKnockback()` permite a una escena empujar al Babito sin que el control instantáneo lo anule, y `grantSpawnGrace()` replica la invulnerabilidad de respawn. [player-movement.test.js](../test/player-movement.test.js) verifica aceleración, giro, inercia aérea, corte de salto, independencia del framerate, que todas las plataformas elevadas sean alcanzables y que cada moneda colocada quede a tiro desde una superficie.

[BabitoPresentation.js](../src/game/BabitoPresentation.js) es la fuente runtime de las escalas `0.8`, `1` y `1.2`, que convierten `BABITO_RENDER_SIZE = 80` en cajas visibles de 64, 80 y 96 px. [game-data.json](../src/data/game-data.json) replica esos valores para catálogo y documentación; una regresión exige que ambos contratos coincidan. El tamaño normal conserva una relación fuente:pantalla de 1:1. El offset compensa `BABITO_ART_BASELINE = 30` hasta `BABITO_BASELINE = 20` en coordenadas de mundo, de modo que cambiar el tamaño no mueve los pies ni la hitbox.

El antiguo `moveSpeed`, que no se usaba, y `jumpVelocity` se sustituyeron por el bloque `movement`: el tuning del jugador ya es completamente data-driven.

## Poderes y colisiones

| Poder | Trayectoria | Velocidad | Daño | Cooldown | Vida |
|---|---:|---:|---:|---:|---:|
| Fuego | Lineal | 520 | 1 | 420 ms | 1250 ms |
| Rayo | Lineal | 720 | 1 | 320 ms | 720 ms |
| Roca | Arco, gravedad total 680 (≈300 px de alcance) | 390 | 2 | 650 ms | 1800 ms |

[PowerSystem.js](../src/game/PowerSystem.js) marca cada proyectil con identidad positiva antes de participar en colisiones. La gravedad de un poder en arco es la total: se le resta la gravedad global al asignarla al cuerpo. Antes se sumaban (680 + 1350) y la Roca solo alcanzaba unos 120 px. Los callbacks de [GameScene.js](../src/scenes/GameScene.js), [BossScene.js](../src/scenes/BossScene.js) y [DarknessBossScene.js](../src/scenes/DarknessBossScene.js) destruyen únicamente el objeto reconocido como proyectil.

Invariante: ningún disparo puede destruir, desactivar o esconder terreno. Fondos raster, plataformas visuales y cuerpos de colisión tienen responsabilidades separadas.

[platformCollision.js](../src/game/platformCollision.js) discrimina terreno por `kind`. `ground` y geometría sin clasificar son sólidos. Para `platform`, el *process callback* acepta separación solo si la velocidad vertical no es ascendente y el borde inferior del paso anterior estaba como máximo 4 px por debajo de la cara superior. Así se atraviesan cara inferior y laterales, pero se aterriza y permanece sobre la cara superior. El proceso se comparte entre jugador, enemigos terrestres, monedas y boss; VUELA continúa sin collider. Los colliders de proyectiles son independientes y siguen consumiendo el proyectil contra cualquier terreno. El collider del jugador pasa además `ignore`, el conjunto de plataformas que está atravesando con `↓`: `findOneWayPlatformsUnder()` elige las plataformas bajo sus pies al pulsar y `hasClearedPlatform()` las retira del conjunto cuando los pies superan la tolerancia de aterrizaje o deja de solaparlas en horizontal.

## Enemigos

- COME: `PATROL → CHASE → WINDUP → BITE → RECOVER`; solo `BITE` daña.
- VUELA: `AIR_PATROL → TARGET → WINDUP → DIVE → RETURN`; solo `DIVE` daña y el nivel incluye una aparición individual y una pareja.
- DA VUELTAS: `PATROL → WINDUP → SPIN → DIZZY`; solo `SPIN` daña y solo `DIZZY` acepta impactos.

Los drops se eligen entre 0, 1 o 2 monedas. Cada moneda usa overlap y suma una. Las monedas colocadas forman un grupo estático propio; al recogerlas se llama a `claimReward('<prefijo del nivel><id>', 1)` (`babilandia:coin:` o `jungla:coin:`), por lo que cada una paga una vez por guardado y `restartAdventure()` conserva su estado como el de cualquier recompensa. Las rutas QA (`qaCheckpoint`, `qaEnemy`) no las cobran. El portal se habilita cuando `defeatedEnemies === level.enemies.length`.

DA VUELTAS entra en `WINDUP` solo con el Babito a menos de 460 px, se orienta hacia él durante la anticipación y gira 1,7 s. `GameScene` pasa a COME y DA VUELTAS `walkBounds`, el tramo de suelo continuo donde aparecen; `keepInsideWalkBounds()` los detiene en el borde (o invierte patrulla y giro), y en patrulla también se dan la vuelta al quedar bloqueados por un pilar. Si un enemigo cae por debajo de y = 600, vuelve a su origen. `EnemyController.resetToHome()` devuelve un enemigo vivo a su origen en el primer estado de su máquina; `GameScene` lo aplica a los enemigos a menos de 700 px del checkpoint en cada respawn.

Las reacciones de daño son interrupciones temporales, no un clip decorativo superpuesto: usan la duración real de `hurt`, suspenden el reloj de estado, desactivan daño/impactos repetidos y conducen los ataques de COME y VUELA a `RECOVER`/`RETURN`. VUELA no registra collider con plataformas, de modo que un picado no puede quedar atrapado debajo de una plataforma durante `RETURN`. [EnemyBehavior.js](../src/game/EnemyBehavior.js) resuelve límites y rebotes con direcciones deterministas para evitar inversión cada frame.

[EnemyPresentation.js](../src/game/EnemyPresentation.js) separa el anclaje visual del cuerpo físico. COME usa origen inferior y sigue `body.bottom`, por lo que sus 118 px visuales nunca se centran dentro de una hitbox de solo 68 px de alto ni se hunden al aplicar *squash/stretch*. VUELA y DA VUELTAS conservan origen central.

## Boss

Babito Corrupto tiene 16 de vida. Su ciclo es `FIREBALL → FROM_ABOVE → FURY_CHARGE`; después de cada patrón, `RECOVER` habilita daño durante 1900 ms. `FIREBALL` usa constantes con nombre (`FIREBALL_GAP_MS`, `FIREBALL_CHARGE_MS`, `FIREBALL_FEET_OFFSET`): cada bola se telegrafía con un orbe de 300 ms, sale a la altura de los pies del boss y respeta una separación que permite aterrizar entre bolas (900 ms, o 850 ms con tres bolas en la segunda mitad). El boss no se gira mientras carga. El contacto en `FURY_CHARGE` exige al menos 120 px/s de velocidad horizontal. Fuera de esa ventana el proyectil se consume con feedback de bloqueo. La victoria llama a `claimReward('boss1_reward', 30)`, marca la fase y abre Tienda; el ID evita duplicar el premio.

La arena usa cuerpos estáticos propios con `kind: ground|platform`; el suelo es sólido y las plataformas elevadas comparten el proceso unidireccional con Babilandia. La lógica completa está en [BossScene.js](../src/scenes/BossScene.js).

La Oscuridad (`bossData.la_oscuridad`: 20 de vida, `exposedMs` 2200, `lanternLitMs` 14000, 40 monedas) vive en [DarknessBossScene.js](../src/scenes/DarknessBossScene.js). Flota sin gravedad y se mueve con `moveBossTo()` y `shadowStep()` (fundido, recolocación y reaparición). Mientras `bossIntangible` es verdadero los proyectiles la atraviesan sin consumirse y su cuerpo físico es bajo (70 × 50) para que su sombra rasante se pueda saltar; expuesta crece a 78 × 86 para que también acierte el arco de la Roca. `checkExposure()` comprueba en `SHADOW_GLIDE` y `SHIFT` si su centro está a menos de 140 px de un farolillo encendido; `ZONA OSCURA` hace la misma comprobación con el charco. La exposición usa la misma programación por `stateNonce` que el primer boss, y al terminar apaga el farolillo que la causó. Los farolillos son cuerpos estáticos: un proyectil enciende uno apagado o que parpadea y atraviesa uno encendido. Las tandas de meteoritos se calculan con [bossPatternGeometry.js](../src/game/bossPatternGeometry.js): el grupo completo se desplaza dentro de la arena y conserva 150 px entre centros incluso junto a los bordes. La victoria llama a `claimReward('boss2_reward', 40)` y guarda `boss2Defeated`/`phase2Complete`.

## Pausa, caída y reintento

Cada escena jugable mantiene un reloj de gameplay descontando el tiempo pausado. Pausa detiene Arcade Physics, tweens, temporizadores y animaciones de jugador/enemigos/boss, y retira el aviso flotante activo mediante `dismissToast()`.

`GameScene` y las dos escenas de jefe implementan `setHitStop(ms)`, que [effects.js](../src/ui/effects.js) invoca con `hitStop()`: pausa Arcade Physics y deja de avanzar el reloj de gameplay durante unos milisegundos, sin abrir la pausa. Si un combate termina durante un hit-stop, su cierre reanuda la física. `spawnDust()` genera motas cortas en los pies o los impactos y respeta el movimiento reducido. Los pads táctiles se comparten en [touchControls.js](../src/ui/touchControls.js).

- Babilandia y La Jungla: una caída (por un foso, en La Jungla) intenta aplicar daño y respawnea en checkpoint; la invulnerabilidad puede impedir el descuento de un segundo corazón. Game Over reintenta desde allí con vida completa.
- Bosses: ambas arenas tienen suelo continuo y límites físicos. Llegar a cero corazones abre Game Over; reintentar reconstruye el encuentro correspondiente desde el principio.

## Animación

- [BabitoAnimations.js](../src/game/BabitoAnimations.js) define el contrato puro de 51 poses: `idle`, `walk`, `run`, `jump`, `fall`, `attack`, `hurt` y `dead`, con duraciones y selección de locomoción verificables sin Phaser.
- [BabitoAvatar.js](../src/game/BabitoAvatar.js) compone las siete capas sobre celdas fuente de 80 px, muestrea el mismo frame para todas y aplica las escalas de [BabitoPresentation.js](../src/game/BabitoPresentation.js) sobre una línea de suelo común. El cuerpo físico nunca cambia. La apariencia por defecto usa `headAccessory: 'none'`; los guardados existentes conservan su selección. `POST_UPDATE` aplica el estado después de que `PlayerController` resuelva la física para evitar un frame visual de retraso.
- [createTextures.js](../src/game/createTextures.js) mantiene el diseño lógico en 48 unidades y usa `BABITO_DETAIL_SCALE = 4 / 3` para dibujarlo sobre una rejilla raster real de 64 px dentro de `BABITO_TEXTURE_SIZE = 80`. `BABITO_CANONICAL_GEOMETRY` bloquea el cuerpo raster de 47 × 45 px (`rx = ry = 23` y puntas verticales recortadas), los ojos de 4 × 9 con separación 11, pies visibles y aletas caídas; `BABITO_PALETTES.cyan` es la fuente de la paleta y el swatch `body_cyan` de [cosmetics.json](../src/data/cosmetics.json) usa el mismo `#7CDBF9`. `drawBabitoBody()` rellena vientre y pies con `palette.main` y limita `palette.shade` al lateral lejano, sin banda inferior que parezca un pantalón. `drawBabitoCompositeFrame()` reutiliza el renderer Canvas determinista de capas para derivados editoriales; no interviene ImageGen. [babito.png](../public/assets/landing/babito.png) es su exportación transparente de 320 × 320 con nearest 4×. La ficha de producción es [babito-v4.md](../art/production/babito-v4.md).
- [EnemyAnimations.js](../src/game/EnemyAnimations.js): hojas, subclips, duración, mapeo de estados y resolución QA para COME, VUELA y DA VUELTAS. VUELA usa [enemy-vuela-sheet-v4.png](../public/assets/characters/enemy-vuela-sheet-v4.png), 36 celdas raster de 256 px mostradas a escala exacta de 1/4.
- [BossAnimator.js](../src/game/BossAnimator.js): poses escalonadas para intro, tres patrones, `RECOVER` y purificación.
- Las capas del Babito se autoran en coordenadas lógicas de 48 unidades y se dibujan a detalle 4/3 sobre un lienzo auxiliar raster de 64 px; después se componen dentro de la celda fuente de 80 px con muestreo *nearest* bajo la transformación de cada pose. `snapPixelAlpha()` deja cada píxel totalmente opaco o transparente. El render normal es 1:1 y las otras cajas usan escalas exactas, evitando mezclas de color o halos en Título y Creador.

## Arte y audio

Los fondos de Babilandia, arena del boss y Ciudad son raster 16:9 con escala *cover* y fallback procedural. La Jungla y su arena usan el fondo procedural `jungle`; [jungleScenery.js](../src/game/jungleScenery.js) añade agua animada en los fosos, cascada, lianas, ruinas, maleza, luciérnagas, el velo de oscuridad en espacio de pantalla y el halo aditivo del Babito. Losetas (`tile_jungle_ground`, `tile_branch`, `tile_bridge`, `tile_ruin`), seta, farolillos, Manzana de Poder y el sprite de La Oscuridad se generan en [createTextures.js](../src/game/createTextures.js). Su inventario y procedencia están en [ART_BIBLE.md](ART_BIBLE.md) y `art/production/`. Las colisiones nunca se derivan de estos fondos.

AudioSystem sintetiza música y efectos con Web Audio (con temas `jungle` y `darkness` para la Fase 2), desbloquea el contexto tras interacción y tolera falta de soporte. No hay archivos de audio ni control de volumen en 0.2.

## QA y extensión

En desarrollo, `BootScene` acepta `?qa=<Scene>` —incluida `DarknessBossScene`—, `qaCoins` y `qaComplete=1`; `ComingSoonScene` usa Ciudad por defecto y `world=jungle|jungla` solo conserva la redirección heredada a `GameScene(jungla)`. `GameScene` añade `qaLevel=jungla`, `qaCombat=1`, `qaCheckpoint=<id>`, `debugAI=1`, `qaMotion=idle|walk|run|jump|fall|attack|hurt|dead`, `qaFrame=<n>` y `qaSize=small|normal|large`. Para enemigos, `qaEnemy=come|vuela|da_vueltas` aísla el tipo, `qaEnemyState=<estado-o-clip>` fija su presentación y `qaEnemyFrame=<n>` congela un frame local; ese aislamiento desactiva su daño. `qaCheckpoint` evita persistir el punto temporal y, junto con `qaEnemy`, evita cobrar las monedas colocadas; otros modos pueden preparar o actualizar el guardado local de desarrollo, y `BootScene` selecciona Fuego si faltaba un poder. `BossScene` y `DarknessBossScene` añaden `qaOneHit=1`. En producción ni la landing abre el diálogo por `?qa` ni `BootScene` procesa estas rutas. `globalThis.__BABITOS__` expone versión, escena y una copia del save para smoke tests y mods.

Para extender el juego se conservan IDs estables, lógica data-driven y fallbacks. Un cambio de interacción debe actualizar [INTERACTIONS.md](INTERACTIONS.md), [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) y [CHANGELOG.md](CHANGELOG.md).
