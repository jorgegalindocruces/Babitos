# Fondo de La Jungla v1

`public/assets/backgrounds/jungla-v1.webp` es la capa raster de producción de La Jungla, la Fase 2 jugable.

- Resolución: 1672 × 941 (16:9).
- Asset runtime: `background_jungle_v1`.
- Fuente aprobada: `art/approved/jungla_background_v1.png`, aportada directamente para esta iteración el 12 de octubre de 2026.
- Derivado web: WebP de alta calidad (`q=92`, `sharp_yuv`) para conservar el pixel art con un peso adecuado para GitHub Pages.
- Integración: escalado *cover*, paneo suave con la cámara y fallback procedural `jungle` si el archivo no puede cargarse.
- Capas preservadas: agua, cascada, lianas, ruinas, maleza, luciérnagas y velo de oscuridad continúan dibujándose en espacio de mundo sobre el raster.
- Interacción: la ilustración es estrictamente decorativa. Suelo, plataformas, puentes, pilares, fosos y agua jugable conservan geometría y colisiones independientes en [jungla.json](../../src/data/levels/jungla.json).

La imagen incluye vegetación, agua, cascadas, montañas y ruinas como profundidad visual. Ninguna cornisa pintada se considera transitable ni modifica la ruta del nivel.

Este archivo es material artístico de BABITOS y queda fuera de la licencia MIT del código, según el aviso de `LICENSE`.

Contratos relacionados: [Art Bible](../../docs/ART_BIBLE.md), [interacciones de La Jungla](../../docs/INTERACTIONS.md#la-jungla) y [registro de cambios](../../docs/CHANGELOG.md#fondo-raster-de-la-jungla--2026-10-12).
