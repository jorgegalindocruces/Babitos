# Registro de cambios

Este archivo relaciona las iteraciones entregadas con sus cambios observables, código, arte y comprobaciones. El detalle funcional vigente está en [INTERACTIONS.md](INTERACTIONS.md); este registro explica cuándo y por qué cambió.

## Próxima iteración

- Mantener sincronizados `README.md`, `INTERACTIONS.md`, `GAME_DESIGN.md`, `IMPLEMENTATION_SPEC.md` y `ACCEPTANCE_CRITERIA.md` cuando cambien flujo, controles, estados, persistencia o contenido jugable.
- Añadir una entrada aquí por cada cambio observable, con el commit final y las pruebas realizadas.

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
- mantuvo `base: './'` para servir el juego desde el dominio raíz sin romper la URL técnica bajo `/Babitos/`;
- documentó los cuatro registros IPv4, los cuatro IPv6, el alias `www` y el TXT de verificación;
- dejó explícito que los despliegues mediante GitHub Actions ignoran el archivo `CNAME` del artefacto y usan la configuración Pages del repositorio;
- añadió una regresión documental para evitar que la URL canónica o los DNS de GitHub desaparezcan por accidente.

Pruebas: 64 casos automáticos, compilación de producción y `git diff --check`.

Seguimiento del 8 de octubre de 2026: los cuatro registros `A`, los cuatro `AAAA` y el alias `www` ya resuelven públicamente a GitHub Pages; el dominio raíz sirve el despliegue de `main` y `www` redirige al raíz. GitHub sigue aprovisionando el certificado (`The certificate does not exist yet`), por lo que **Enforce HTTPS** se activará cuando termine la emisión, sin modificar de nuevo los DNS correctos.

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
