# Especificación de implementación

Especificación vigente del vertical slice 0.2. El comportamiento observable completo está en [INTERACTIONS.md](INTERACTIONS.md) y sus comprobaciones en [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md).

## Runtime

- JavaScript con módulos ES, Phaser 3, Vite y `localStorage`; sin backend.
- Resolución lógica efectiva: 960 × 540, `Phaser.Scale.FIT`, centrado, `autoRound: true`, `pixelArt: true` y `roundPixels: true`.
- En escritorio, el área jugable no se amplía por encima de 960 × 540 CSS px: así cada píxel lógico conserva una escala entera. Por debajo de ese tamaño, `FIT` reduce el lienzo manteniendo 16:9 y sin overflow.
- Física Arcade con gravedad global de 1350 y cuatro punteros activos para multitouch.
- Build estático con `base: './'` y despliegue en GitHub Pages.
- Node.js 24 en CI; `npm ci`, `npm test` y `npm run build` son la puerta de entrega.

La configuración de arranque está en [main.js](../src/main.js) y el workflow en [deploy-pages.yml](../.github/workflows/deploy-pages.yml).

## Escenas y flujo

`BootScene` carga assets, genera texturas temporales, registra animaciones, crea `SaveStore` y abre la escena solicitada:

```text
TitleScene → CreatorScene → PowerScene → IntroScene
           → GameScene → BossScene → ShopScene → WorldMapScene
                                                    └→ ComingSoonScene
```

`WorldMapScene` también vuelve a Tienda, Título o `GameScene`. `ComingSoonScene` recibe `world: 'jungle' | 'city'` y solo ofrece volver al mapa. Las escenas dejan como estados estables `creator`, `power`, `intro`, `babilandia`, `boss1`, `shop`, `map`, `jungle` y `city`; el mapa escribe además `game` durante la transición a Babilandia. Título reconoce ambas variantes y aliases de compatibilidad como `boss` y `world-map`.

## Datos y estado

- [game-data.json](../src/data/game-data.json): jugador, tamaños, poderes, enemigos y boss.
- [cosmetics.json](../src/data/cosmetics.json): siete categorías, claves de asset, desbloqueo inicial y precios.
- [babilandia.json](../src/data/levels/babilandia.json): geometría, spawn, cuatro checkpoints, seis enemigos y portal.
- Los carteles tutoriales de `babilandia.json` solo guardan `id`, `x` y texto. [surfaceAnchoring.js](../src/game/surfaceAnchoring.js) obtiene la superficie física superior, y `GameScene` compone tabla, texto y poste como una sola decoración apoyada.
- [SaveStore.js](../src/state/SaveStore.js): normalización, migración y persistencia.

El guardado versionado `babitos.save.v1` contiene nombre, tamaño, apariencia, poder seleccionado/desbloqueado, monedas, cosméticos desbloqueados/comprados y progreso. `restartAdventure()` conserva colección, apariencia, saldo e IDs de recompensas cobradas, y reinicia poder, checkpoint y relato. El mute se guarda aparte en `babitos.audio.v1`.

## Input e interfaz

[Button.js](../src/ui/Button.js) centraliza hit area, estados visuales, registro por escena, foco y espejo HTML. El contrato admite puntero/toque y, cuando `keyboardShortcuts` no se desactiva, `Tab`, `Mayús + Tab`, `Enter` y `Espacio`. Los botones de pausa del HUD usan `keyboardShortcuts: false` para no competir con el salto.

[fontLoading.js](../src/ui/fontLoading.js) solicita Silkscreen y Nunito antes de crear `Phaser.Game`; si exceden el tiempo de espera, el juego arranca con fallback y vuelve a rasterizar los textos cuando terminan. [textQuality.js](../src/ui/textQuality.js) aplica la misma resolución interna, limitada a 2×, a títulos, cuerpo, etiquetas, botones, avisos y texto de depuración. Los textos que deben caber en un ancho se regeneran con un tamaño de fuente entero en vez de escalar su textura de forma fraccionaria.

`PlayerController` acepta teclado y cuatro controles virtuales booleanos. Salto y ataque filtran eventos nacidos en `button`, `input`, `textarea`, `select`, enlace o elemento editable; `M` aplica un filtro equivalente. El movimiento y los handlers `P`/`Esc` son globales mientras la escena jugable está activa. Al pausar, reanudar, morir o reintentar se borran edges y teclas retenidas.

## Jugador

Implementado en [PlayerController.js](../src/game/PlayerController.js):

- hitbox fija de 28 × 40 para los tres tamaños visuales;
- 3 puntos de vida, gravedad global, velocidad máxima 360 × 760, aceleración horizontal 1450 y drag 1350;
- salto 490, coyote time 110 ms, buffer 120 ms y corte de altura al soltar;
- invulnerabilidad de 1050 ms tras daño y 1500 ms tras respawn;
- dirección persistente y un único ataque sujeto al cooldown del poder.

`moveSpeed` sigue presente en `game-data.json`, pero el movimiento efectivo actual usa aceleración, drag y velocidad máxima definidos en el controlador. No se debe presentar todavía como tuning completamente data-driven.

## Poderes y colisiones

| Poder | Trayectoria | Velocidad | Daño | Cooldown | Vida |
|---|---:|---:|---:|---:|---:|
| Fuego | Lineal | 520 | 1 | 420 ms | 1250 ms |
| Rayo | Lineal | 720 | 1 | 320 ms | 720 ms |
| Roca | Arco, gravedad 680 | 390 | 2 | 650 ms | 1800 ms |

[PowerSystem.js](../src/game/PowerSystem.js) marca cada proyectil con identidad positiva antes de participar en colisiones. Los callbacks de [GameScene.js](../src/scenes/GameScene.js) y [BossScene.js](../src/scenes/BossScene.js) destruyen únicamente el objeto reconocido como proyectil.

Invariante: ningún disparo puede destruir, desactivar o esconder terreno. Fondos raster, plataformas visuales y cuerpos de colisión tienen responsabilidades separadas.

## Enemigos

- COME: `PATROL → CHASE → WINDUP → BITE → RECOVER`; solo `BITE` daña.
- VUELA: `AIR_PATROL → TARGET → WINDUP → DIVE → RETURN`; solo `DIVE` daña y el nivel incluye una aparición individual y una pareja.
- DA VUELTAS: `PATROL → WINDUP → SPIN → DIZZY`; solo `SPIN` daña y solo `DIZZY` acepta impactos.

Los drops se eligen entre 0, 1 o 2 monedas. Cada moneda usa overlap y suma una. El portal se habilita cuando `defeatedEnemies === level.enemies.length`.

## Boss

Babito Corrupto tiene 16 de vida. Su ciclo es `FIREBALL → FROM_ABOVE → FURY_CHARGE`; después de cada patrón, `RECOVER` habilita daño durante 1900 ms. Fuera de esa ventana el proyectil se consume con feedback de bloqueo. La victoria llama a `claimReward('boss1_reward', 30)`, marca la fase y abre Tienda; el ID evita duplicar el premio.

La arena usa cuerpos estáticos propios para suelo y plataformas. La lógica completa está en [BossScene.js](../src/scenes/BossScene.js).

## Pausa, caída y reintento

Cada escena jugable mantiene un reloj de gameplay descontando el tiempo pausado. Pausa detiene Arcade Physics, tweens, temporizadores y animaciones de jugador/enemigos/boss.

- Babilandia: una caída intenta aplicar daño y respawnea en checkpoint; la invulnerabilidad puede impedir el descuento de un segundo corazón. Game Over reintenta desde allí con vida completa.
- Boss: la arena tiene suelo continuo y límites físicos. Llegar a cero corazones abre Game Over; reintentar reconstruye el encuentro desde el principio.

## Animación

- [BabitoAvatar.js](../src/game/BabitoAvatar.js): clips canónicos `idle`, `walk`, `jump`, `fall`, `attack`, `hurt` y `dead`; `run` es alias de `walk`. Las siete capas muestrean el mismo frame y el cuerpo físico no cambia.
- [EnemyAnimations.js](../src/game/EnemyAnimations.js): hojas y mapeo de estados para COME, VUELA y DA VUELTAS.
- [BossAnimator.js](../src/game/BossAnimator.js): poses escalonadas para intro, tres patrones, `RECOVER` y purificación.

## Arte y audio

Los fondos de Babilandia, arena del boss y Ciudad son raster 16:9 con escala *cover* y fallback procedural. Su inventario y procedencia están en [ART_BIBLE.md](ART_BIBLE.md) y `art/production/`. Las colisiones nunca se derivan de estos fondos.

AudioSystem sintetiza música y efectos con Web Audio, desbloquea el contexto tras interacción y tolera falta de soporte. No hay archivos de audio ni control de volumen en 0.2.

## QA y extensión

En desarrollo, `BootScene` acepta `?qa=<Scene>`, `qaCoins`, `qaComplete=1` y `world=jungle|city`. `GameScene` añade `qaCombat=1`, `qaCheckpoint=<id>` y `debugAI=1`; `BossScene`, `qaOneHit=1`. Estos parámetros no se procesan en producción. `globalThis.__BABITOS__` expone versión, escena y una copia del save para smoke tests y mods.

Para extender el juego se conservan IDs estables, lógica data-driven y fallbacks. Un cambio de interacción debe actualizar [INTERACTIONS.md](INTERACTIONS.md), [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) y [CHANGELOG.md](CHANGELOG.md).
