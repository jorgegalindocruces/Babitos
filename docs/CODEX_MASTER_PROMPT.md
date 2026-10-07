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
Título → Creador → Fuego/Rayo/Roca → Intro → Babilandia
       → COME/VUELA/DA VUELTAS → Babito Corrupto → Tienda → Mapa
```

La Jungla y Ciudad Bicharraca solo tienen avances estáticos. La Oscuridad, Boss Total y el Final son roadmap, no gameplay actual.

## Reglas no negociables

- Señor Empanadilla y Señor Pingüino son aliados y tenderos.
- Los bosses canónicos son Babito Corrupto, La Oscuridad y Boss Total; solo el primero está implementado.
- COME es mayor que el Babito; VUELA es menor y aparece solo o en pareja; DA VUELTAS es la bola verde con pinchos y solo es vulnerable mareado.
- No rediseñar personajes canónicos ni inventar sustitutos para los tres enemigos.
- Ojos y boca son capas separadas dentro de siete categorías.
- Pequeño, normal y grande no alteran hitbox ni estadísticas.
- Los poderes no se compran con Babicoins.
- `worlds_environment_reference_only.png` define entorno y atmósfera, nunca enemigos.
- Fondos, render de plataformas y cuerpos de colisión son capas distintas. Un proyectil puede destruirse contra terreno; nunca puede destruir el terreno.
- La victoria purifica a Babito Corrupto y su recompensa de monedas es única.

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
