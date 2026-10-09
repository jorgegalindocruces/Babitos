# Contexto maestro para Codex

El proyecto ya existe y es un vertical slice funcional. Mantén y amplía la implementación actual en JavaScript, Phaser 3 y Vite; no reinicialices el repositorio.

## Orden de lectura

1. [README.md](../README.md) para alcance, ejecución y arquitectura.
2. [INTERACTIONS.md](INTERACTIONS.md) para todo comportamiento observable vigente.
3. [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) para los resultados que no deben romperse.
4. [IMPLEMENTATION_SPEC.md](IMPLEMENTATION_SPEC.md) para contratos técnicos.
5. [GAME_DESIGN.md](GAME_DESIGN.md) para visión, canon y roadmap.
6. [ART_BIBLE.md](ART_BIBLE.md), `art/approved/` y `art/production/` para dirección y procedencia visual.
7. `src/data/*.json`, `src/data/levels/*.json` y el código afectado antes de modificar reglas.
8. [CHANGELOG.md](CHANGELOG.md) para entender qué introdujo cada iteración.

Si un texto histórico contradice la aplicación, comprueba código y datos, corrige la documentación y deja el cambio referenciado en el registro.

## Alcance actual

```text
Landing → JUGAR → diálogo → Boot → Título
  → Creador → Fuego/Rayo/Roca → Intro → Babilandia
  → COME/VUELA/DA VUELTAS → Babito Corrupto → Tienda → Mapa
  → La Jungla → La Oscuridad → Tienda → Mapa
```

`src/main.js` controla la portada y sus diálogos; importa `src/gameBoot.js` solo al abrir el juego. `gameBoot.js` crea Phaser y el audio, y suspende o reactiva el runtime al cerrar o reabrir el diálogo. Ciudad Bicharraca solo tiene un avance estático; `ComingSoonScene` es exclusivo de Ciudad y cualquier llamada heredada a su antigua preview de Jungla redirige a la Fase 2 jugable. Boss Total y el Final son roadmap, no gameplay actual.

## Reglas no negociables

- Señor Empanadilla y Señor Pingüino son aliados y tenderos.
- Los bosses canónicos son Babito Corrupto, La Oscuridad y Boss Total; los dos primeros están implementados. La Oscuridad es intangible en la sombra y solo la luz la vuelve vulnerable.
- COME es mayor que el Babito; VUELA es menor y aparece solo o en pareja; DA VUELTAS es la bola verde con pinchos y solo es vulnerable mareado.
- No rediseñar personajes canónicos ni inventar sustitutos para los tres enemigos.
- El [Babito v4](../art/production/babito-v4.md) conserva de la referencia aprobada la silueta, el rostro y las proporciones: diseño lógico de 48 unidades rasterizado a 64 px reales dentro de una celda fuente de 80 px, cuerpo rasterizado 47 × 45 px con corona plana, ojos 4 × 9 px, cara compacta, aletas largas y caídas, pies visibles y paleta cian canónica. Su banda inferior queda expresamente supersedida: nunca pintar `palette.shade` en el cuerpo; barriga, raíces de los pies y pies comparten `palette.main`, y el contorno inferior se abre en dos raíces estrechas sin crear cinturilla, calzoncillo o pantalón. Animar o equipar cosméticos no autoriza a estrecharlo, volver a crear un ápice en la cabeza, convertirlo en rectangular ni agrandar sus rasgos base.
- Ojos y boca son capas separadas dentro de siete categorías.
- Pequeño, normal y grande no alteran hitbox ni estadísticas.
- Los poderes no se compran con Babicoins.
- `worlds_environment_reference_only.png` define entorno y atmósfera, nunca enemigos.
- Fondos, render de plataformas y cuerpos de colisión son capas distintas. Un proyectil puede destruirse contra terreno; nunca puede destruir el terreno.
- El suelo base es sólido. Las plataformas elevadas son unidireccionales: personajes y monedas las atraviesan al ascender desde abajo y aterrizan al descender, y el jugador puede dejarse caer con `↓`; los proyectiles siguen chocando con ellas.
- La victoria purifica a Babito Corrupto y disipa a La Oscuridad en luciérnagas; cada recompensa de monedas es única.
- La portada no carga Phaser hasta `JUGAR`; cerrar durante la primera carga también debe dejar el runtime suspendido y nunca ejecutándose detrás de la landing.
- El arte pixel usa nearest, pero las texturas de texto usan linear persistente. No introduzcas texto visible menor de 12 px ni contornos de 2 px en tipografía de 12–15 px.

## Forma de trabajar

- Haz un plan breve y pasa a una implementación comprobable.
- Preserva IDs de assets, saves y catálogos; añade migración antes de cambiar un contrato persistido.
- Prefiere datos para contenido y estados, sin duplicar configuración en escenas.
- Usa placeholders programáticos con claves estables solo donde siga faltando arte final.
- Mantén teclado, ratón, toque, foco accesible y limpieza de entrada en cualquier flujo nuevo.
- Conserva los fondos como arte no colisionable y verifica el fallback.
- Añade o actualiza pruebas en proporción a la regresión que se evita.
- Ejecuta `npm test`, `npm run build` y `git diff --check` antes de entregar.

## Documentación obligatoria por cambio

- Si cambia una interacción, transición, control o estado: actualiza `INTERACTIONS.md` y `ACCEPTANCE_CRITERIA.md`.
- Si cambia stack, arquitectura, datos o persistencia: actualiza `IMPLEMENTATION_SPEC.md` y README.
- Si cambia alcance o narrativa futura: actualiza `GAME_DESIGN.md` sin presentar roadmap como implementado.
- Si cambia arte: actualiza `ART_BIBLE.md` y su ficha en `art/production/`.
- Registra siempre el resultado observable, las referencias afectadas y el commit final en `CHANGELOG.md`.
