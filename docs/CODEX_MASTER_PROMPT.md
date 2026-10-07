# CODEX MASTER PROMPT

Usa este paquete como fuente de verdad. Lee primero
`docs/GAME_DESIGN.md`, `docs/ART_BIBLE.md`,
`docs/IMPLEMENTATION_SPEC.md`, `docs/ACCEPTANCE_CRITERIA.md`,
`src/data/*.json` y luego `art/approved/`.

Haz un plan breve y EMPIEZA A PROGRAMAR. No te quedes en análisis.

## Objetivo

Vertical slice ejecutable: Título -\> Babito Creator -\> Fuego/Rayo/Roca
-\> Fase 1 Babilandia -\> COME/VUELA/DA VUELTAS -\> monedas -\> Babito
Corrupto -\> tienda.

## Reglas no negociables

-   Empanadilla y Pingüino son tenderos buenos.
-   Bosses: Babito Corrupto, La Oscuridad, Boss Total.
-   COME es mayor que Babito; VUELA menor y puede aparecer solo o en
    pareja; DA VUELTAS es bola verde con pinchos.
-   No rediseñar personajes canónicos.
-   Ojos y bocas son capas separadas.
-   Small/normal/large no altera hitbox ni estadísticas.
-   Poderes no se compran con monedas.
-   La lámina de mundos NO define enemigos.
-   No inventar sustitutos para los tres enemigos.

## Implementación

Si no existe proyecto, inicializa TypeScript + Phaser 3 + Vite.
Configura escenas, input, física, cámara, datos y persistencia. Usa
placeholders programáticos/temporales donde falten sprites individuales,
con claves estables para reemplazarlos. Haz catálogos data-driven.
Ejecuta `npm run build` y corrige errores. Configura GitHub Pages y
README. No esperes a sprites finales: el juego debe empezar a funcionar
ya.
