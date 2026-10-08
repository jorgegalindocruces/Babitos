# Registro de cambios

Este archivo relaciona las iteraciones entregadas con sus cambios observables, código, arte y comprobaciones. El detalle funcional vigente está en [INTERACTIONS.md](INTERACTIONS.md); este registro explica cuándo y por qué cambió.

## Próxima iteración

- Mantener sincronizados `README.md`, `INTERACTIONS.md`, `GAME_DESIGN.md`, `IMPLEMENTATION_SPEC.md` y `ACCEPTANCE_CRITERIA.md` cuando cambien flujo, controles, estados, persistencia o contenido jugable.
- Añadir una entrada aquí por cada cambio observable, con el commit final y las pruebas realizadas.

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
