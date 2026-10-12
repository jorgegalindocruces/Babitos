# Ciudad Bicharraca v1

`public/assets/backgrounds/ciudad-bicharraca-v1.webp` es el fondo raster oficial del Mundo 3 y la imagen dominante de la Fase 3 jugable. La tarjeta del mapa conserva un icono procedural.

- Resolución: 1672 × 941, proporción 16:9.
- Asset runtime: `background_city_v1`.
- Fuente canónica: [city_background_v1.png](../approved/city_background_v1.png), entregada expresamente por el usuario como background de la Fase 3 el 12 de octubre de 2026.
- Integración: fondo completo a escala *cover* y fallback procedural si el archivo no puede cargarse; [cityScenery.js](../../src/game/cityScenery.js) añade por encima tres capas transparentes y discretas de tráfico, vapor, luces y cables.
- Compresión: WebP de alta calidad para conservar el pixel art con un peso apto para web.
- Interacción: ambienta Entrada, Fábricas y Fortaleza durante 7200 px. Las pasarelas, carteles, puertas y estructuras pintadas forman parte del escenario y no contienen colisión; suelo, plataformas, tuberías y peligros eléctricos jugables son entidades separadas y se dibujan por encima.

## Tratamiento

No se ha regenerado ni reinterpretado el dibujo. El PNG aprobado se conserva completo y se exporta a WebP de alta calidad (`q94`, `sharp_yuv`) con sus 1672 × 941 px originales. La imagen incluye la fortaleza central, los letreros «FASE 3 · TERRITORIO DE LOS BICHARRACOS» y «ROBOT CITY», plataformas industriales, tráfico aéreo y reflejos rojos. Las capas procedurales anteriores dejaron de pintar edificios opacos para no ocultar estos elementos.

Este archivo es material artístico de BABITOS y queda fuera de la licencia MIT del código, según el aviso de `LICENSE`.

Contratos relacionados: [Art Bible](../../docs/ART_BIBLE.md), [Ciudad Bicharraca](../../docs/INTERACTIONS.md#ciudad-bicharraca) y [registro de cambios](../../docs/CHANGELOG.md#fase-3--ciudad-de-los-bicharracos--2026-10-12).
