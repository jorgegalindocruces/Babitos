# VUELA · spritesheet v4

`public/assets/characters/enemy-vuela-sheet-v4.png` es el atlas raster de producción de VUELA.

- Resolución: 1536 × 1536, con 6 columnas × 6 filas de celdas cuadradas de 256 px.
- Asset runtime: `enemy_vuela_sheet_v4`.
- Filas: `idle`, `fly`, `dive`, `attack`, `hurt` y `defeat`.
- Referencias bloqueadas: `public/assets/characters/enemy-vuela-v2.png` y el panel de VUELA de `art/approved/enemies_canonical.png`.
- Generación y dirección: herramienta integrada ImageGen, 8 de octubre de 2026.
- Normalización: [normalize-vuela-atlas.mjs](../../scripts/normalize-vuela-atlas.mjs) elimina la neblina semitransparente, convierte el alpha a píxel opaco/transparente y centra las 36 poses en celdas exactas sin recortar alas, antenas, estrellas ni derrota.
- Integración: render a 64 × 64, escala exacta de 1/4 y filtro nearest. La hoja visual no modifica la hitbox invisible ni la lógica de vuelo.

## Prompt de producción

> Crea una hoja de sprites PNG transparente de producción para VUELA en BABITOS. Conserva exactamente la identidad de la referencia: cuerpo redondo morado, dos ojos blancos expresivos, colmillos pequeños, membranas magenta, alas violetas, antenas, contorno negro pixel art y expresión enfadada juguetona. No rediseñes el personaje. Usa exactamente 6 columnas por 6 filas, 36 poses completas, centradas sobre un pivote coherente, con margen seguro y sin recortes, texto, divisores, sombras ni escenario. Filas: `idle` con flotación y parpadeo; `fly` con ciclo alto-medio-bajo-bajo-medio-alto; `dive` con alas progresivamente recogidas y cuerpo vertical; `attack` desde anticipación hasta golpe; `hurt` con retroceso y estrellas; `defeat` no cíclico hasta terminar aplastado con ojos en X. Mantén escala, paleta y silueta constantes, pixel art nítido y fondo realmente transparente.

La salida supervisada conservó la cuadrícula y las poses, pero incluía RGB de fondo bajo alpha parcial. Por eso el archivo runtime no usa el resultado bruto: pasa por la normalización determinista anterior y por pruebas que exigen 36 celdas pobladas, alpha exclusivamente 0/255 y margen transparente en cada borde.

Este archivo es material artístico de BABITOS y queda fuera de la licencia MIT del código, según el aviso de `LICENSE`.

Contratos relacionados: [Art Bible](../../docs/ART_BIBLE.md), [animación e interacción](../../docs/INTERACTIONS.md#animación-y-feedback) y [registro de cambios](../../docs/CHANGELOG.md#estados-de-enemigos-y-vuela-raster--2026-10-08).
