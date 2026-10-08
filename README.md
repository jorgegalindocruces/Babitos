# BABITOS

**Pequeños Babitos, grandes aventuras.**

BABITOS es un plataformas 2D familiar hecho con JavaScript, Phaser 3 y Vite. En este primer *vertical slice* puedes crear un Babito por capas, elegir un poder y recorrer Babilandia para enfrentarte a COME, VUELA, DA VUELTAS y al Babito Corrupto. Las monedas del juego, llamadas Babicoins, sirven para comprar cosméticos en la tienda del Señor Empanadilla y el Señor Pingüino.

El juego funciona completamente en el navegador, sin backend ni base de datos. La partida se guarda en `localStorage` bajo la clave versionada `babitos.save.v1`.

Juega en: [https://babitos.es/](https://babitos.es/)

Documentación vigente:

- [Interacciones del juego](docs/INTERACTIONS.md): controles, flujo, menús, combate, persistencia y accesibilidad implementada.
- [Registro de cambios](docs/CHANGELOG.md): iteraciones, commits, assets y comprobaciones asociadas.
- [Diseño y roadmap](docs/GAME_DESIGN.md): visión completa y separación entre contenido actual y futuro.
- [Especificación técnica](docs/IMPLEMENTATION_SPEC.md) y [criterios de aceptación](docs/ACCEPTANCE_CRITERIA.md).

## Recorrido jugable

1. Título.
2. Creador de Babitos: cuerpo, ojos, boca, brazos y accesorios son capas independientes.
3. Elección de Fuego, Rayo o Roca.
4. Intro de las Manzanas de Poder.
5. Babilandia, que también funciona como tutorial.
6. Seis encuentros con COME, VUELA y DA VUELTAS; cada enemigo puede soltar entre cero y dos monedas.
7. Combate contra el Babito Corrupto.
8. Tienda de cosméticos.
9. Mapa con rejuego de Babilandia y avances estáticos de La Jungla y Ciudad Bicharraca.

Los tamaños pequeño, normal y grande son puramente visuales: usan el mismo *hitbox* y las mismas estadísticas.

## Controles

| Acción | Teclado |
|---|---|
| Mover | `A` / `D` o `←` / `→` |
| Saltar | `W`, `↑` o `Espacio` |
| Atacar con el poder activo | `J` o `X` |
| Pausa | `P` o `Esc` |
| Activar o silenciar audio | `M` |
| Saltar la intro | `S` |
| Navegar por botones | `Tab` / `Mayús + Tab` |
| Activar el botón enfocado | `Enter` o `Espacio` |

También se puede usar ratón o pantalla táctil en los menús. Los pads virtuales de movimiento, salto y ataque aparecen durante la partida cuando el navegador detecta una pantalla táctil o puntero grueso. `Espacio` salta mientras el foco está en el gameplay y activa un botón cuando el foco accesible está sobre ese control. El botón `AUDIO` permanece disponible junto al lienzo y recuerda la preferencia local de mute.

La descripción exhaustiva, incluidas las reglas de foco, pausa, reintento y vulnerabilidad, está en [Interacciones del juego](docs/INTERACTIONS.md).

## Iteración 0.2 · Pulido audiovisual

- Babilandia utiliza un nuevo fondo pixel art panorámico basado exclusivamente en la arquitectura, paleta y atmósfera de la lámina oficial. Si el asset no puede cargarse, el juego vuelve automáticamente al fondo procedural.
- La arena de Babito Corrupto tiene un fondo 16:9 propio: Babilandia en ruinas al atardecer, basado en el ejemplo canónico del boss y con una zona de juego limpia para conservar la lectura de ataques y plataformas.
- Ciudad Bicharraca, el último mundo del mapa, muestra ya su paisaje industrial 16:9 como fondo y recorte interior de su pantalla de avance estática; la tarjeta del mapa mantiene un icono procedural.
- Música ambiental y efectos para interfaz, salto, ataque, daño, monedas, checkpoints, boss y compras se sintetizan en el navegador mediante Web Audio, sin archivos ni dependencias adicionales.
- El Babito usa un atlas por capas de 64 px y 51 poses: `idle`, caminar, correr, saltar, caer, atacar, recibir daño y KO. Cada ciclo mueve silueta, pies, brazos y expresión sin perder la personalización. COME, VUELA, DA VUELTAS y Babito Corrupto también cambian de animación o pose según su estado.
- El Babito ocupa ahora cajas visuales de 64, 80 y 96 px en pequeño, normal y grande, manteniendo una única hitbox de 28 × 40 y la misma línea de apoyo. COME ancla sus pies al cuerpo físico para no hundirse en suelo o plataformas durante caminar, anticipar o morder.
- El suelo base sigue siendo sólido; las plataformas elevadas de Babilandia y de la arena del boss son unidireccionales: se atraviesan al subir desde abajo y sostienen al personaje al caer. Los proyectiles continúan impactando contra todo el terreno.
- VUELA usa un atlas raster de 36 poses fiel al diseño canónico. Sus ciclos de vuelo, picado, anticipación, daño y derrota son independientes; un impacto interrumpe un ataque peligroso antes de reanudar la IA.
- Los botones responden en toda su superficie visible a ratón y toque, y ofrecen foco, estado deshabilitado y activación por teclado mediante controles HTML accesibles.
- `Espacio` queda reservado para saltar durante el gameplay; los botones del HUD siguen disponibles con ratón, toque o navegación accesible mediante `Tab`.
- El canvas conserva 960 × 540 exactos en escritorio para no deformar la cuadrícula de píxel; fuentes, botones y avisos se cargan y rasterizan con una política de resolución común.
- Los carteles tutoriales de Babilandia forman una sola pieza de tabla, texto y poste, y se anclan a plataformas reales en lugar de usar alturas decorativas manuales.

## Ejecutar en local

Necesitas una versión reciente de Node.js (se recomienda Node.js 24) y npm.

```bash
npm install
npm run dev
```

Vite mostrará la URL local, normalmente `http://localhost:5173`.

Comandos disponibles:

```bash
# Ejecutar las pruebas con node:test
npm test

# Generar la versión de producción en dist/
npm run build

# Revisar localmente la compilación de producción
npm run preview
```

Antes de enviar un cambio, ejecuta al menos `npm test` y `npm run build`.

## Arquitectura

```text
src/
├── data/       Catálogos y definición de niveles en JSON
├── game/       Jugador, poderes, enemigos, avatar y texturas
├── scenes/     Flujo de pantallas y fases de Phaser
├── state/      Catálogo normalizado y guardado versionado
└── ui/         Botones, efectos y utilidades de interfaz
art/
├── approved/          Dirección artística canónica
├── original_drawings/ Dibujos originales de referencia
└── production/        Procedencia, prompts y proceso de assets finales
docs/                  Interacciones, cambios, diseño, arte, implementación y aceptación
test/                  Pruebas automáticas sin navegador real
```

La configuración se mantiene fuera de las escenas siempre que es posible:

- `src/data/cosmetics.json` contiene categorías, IDs, nombres, claves de asset, desbloqueo inicial y precios.
- `src/data/game-data.json` define jugador, tamaños, poderes, enemigos y bosses.
- `src/data/levels/` contiene la geometría y entidades de cada fase.
- `src/state/SaveStore.js` valida, migra y persiste la partida.
- `src/game/createTextures.js` mantiene claves de textura estables mientras se sustituyen los gráficos temporales.
- `docs/INTERACTIONS.md` es el contrato humano del comportamiento observable; los datos y el código enlazados allí son la fuente ejecutable.

Este enfoque permite ampliar BABITOS sin introducir casos particulares en la interfaz o en la lógica de guardado.

## Crea tu propio Babito

Cada Babito se compone de siete categorías independientes: `body`, `eyes`, `mouth`, `arms`, `headAccessory`, `glasses` y `neckAccessory`. Ojos y boca nunca se combinan en una única “cara”.

Para añadir unos ojos, una boca, una skin o un accesorio:

1. Añade o carga una textura con una clave estable. Mientras el proyecto use arte generado, puedes crearla en `src/game/createTextures.js`; un PNG definitivo debe registrarse en la carga de assets con esa misma clave.
2. Añade una entrada en la categoría correspondiente de `src/data/cosmetics.json`:

   ```json
   {
     "id": "eyes_example",
     "label": "Ojos de ejemplo",
     "assetKey": "eyes_example",
     "unlocked": false,
     "price": 20
   }
   ```

3. Conserva un `id` único dentro de la categoría. El campo `assetKey` debe coincidir con la clave de la textura.
4. Usa `unlocked: true` y `price: 0` para una opción inicial. Las opciones bloqueadas se compran con monedas.
5. Ejecuta `npm test` y `npm run build`.

El Creador, la tienda, el guardado y `¡BABITO LOCO!` leen el catálogo automáticamente. El randomizador solo utiliza elementos desbloqueados.

Para crear un nivel, añade sus datos a `src/data/levels/` y una escena que los consuma. Para un enemigo nuevo en futuras expansiones, mantén su comportamiento configurable y evita acoplarlo a un nivel concreto.

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` se ejecuta al enviar cambios a `main` o manualmente. Instala dependencias con `npm ci`, ejecuta las pruebas, compila el juego y despliega `dist/` mediante las acciones oficiales de GitHub Pages.

Configuración inicial del repositorio:

1. Abre **Settings → Pages** en GitHub.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Envía los cambios a `main` o ejecuta el workflow **Deploy BABITOS to GitHub Pages** desde la pestaña **Actions**.
4. Cuando termine, el sitio se publica en [https://babitos.es/](https://babitos.es/). La URL técnica `https://jorgegalindocruces.github.io/Babitos/` queda como origen de GitHub Pages.

Vite usa rutas relativas (`base: './'`), por lo que imágenes, módulos y demás recursos funcionan tanto en `/` como bajo `/Babitos/`.

### Dominio `babitos.es`

El dominio canónico se configura en **Settings → Pages → Custom domain**. Como el proyecto publica mediante un workflow personalizado de GitHub Actions, GitHub ignora los archivos `CNAME` del artefacto: la configuración efectiva vive en Pages y no requiere `public/CNAME`.

Registros que debe tener el proveedor DNS:

| Tipo | Host | Valor |
|---|---|---|
| `A` | `@` | `185.199.108.153` |
| `A` | `@` | `185.199.109.153` |
| `A` | `@` | `185.199.110.153` |
| `A` | `@` | `185.199.111.153` |
| `AAAA` | `@` | `2606:50c0:8000::153` |
| `AAAA` | `@` | `2606:50c0:8001::153` |
| `AAAA` | `@` | `2606:50c0:8002::153` |
| `AAAA` | `@` | `2606:50c0:8003::153` |
| `CNAME` | `www` | `jorgegalindocruces.github.io` |

No se usan comodines. Cualquier registro `A`, `AAAA`, `ALIAS` o `ANAME` adicional en `@`, o un `CNAME` distinto en `www`, debe retirarse para no bloquear el certificado. Tras propagarse el DNS, GitHub emite el certificado y permite activar **Enforce HTTPS**. La verificación de propiedad es independiente: GitHub genera un token que debe conservarse como `TXT` en `_github-pages-challenge-jorgegalindocruces`.

## Placeholders actuales

Las láminas de `art/approved/` son dirección artística, no *spritesheets* finales. El estado actual es:

- Babilandia, la arena de Babito Corrupto y Ciudad Bicharraca tienen fondos raster con fallback procedural.
- COME y VUELA usan hojas raster de producción.
- Logo, Babito Corrupto, tenderos y Árbol de Poder tienen PNG raster; las poses del boss se componen en runtime.
- Las capas y cosméticos del Babito, la hoja de DA VUELTAS, la moneda, proyectiles, plataformas, props y HUD siguen siendo pixel art generado por código con claves definitivas.

Los placeholders deben sustituirse gradualmente por sprites y animaciones finales sin cambiar sus IDs ni la lógica. El audio actual es procedural: funciona como primera dirección sonora, pero todavía debe sustituirse o ampliarse con música y efectos producidos. La Jungla y Ciudad Bicharraca son pantallas de avance; sus niveles y bosses completos pertenecen a iteraciones posteriores.

El estado exacto y la procedencia de los assets se describen en [ART_BIBLE.md](docs/ART_BIBLE.md) y `art/production/`.

`worlds_environment_reference_only.png` sirve únicamente para escenarios, paleta y atmósfera. Los enemigos canónicos son los de `enemies_canonical.png`.

## Contribuir

Las contribuciones son bienvenidas:

1. Haz un *fork* y crea una rama descriptiva.
2. Mantén el proyecto en JavaScript y evita dependencias innecesarias.
3. Conserva los IDs y diseños canónicos; usa datos en lugar de hardcodear catálogos.
4. Añade o actualiza pruebas cuando cambie la lógica.
5. Actualiza [INTERACTIONS.md](docs/INTERACTIONS.md), los criterios y el [registro de cambios](docs/CHANGELOG.md) cuando cambie el comportamiento observable.
6. Comprueba `npm test` y `npm run build` antes de abrir un pull request.

Puedes proponer nuevos Babitos, cosméticos, niveles o enemigos para futuras expansiones. Los tres enemigos normales del vertical slice —COME, VUELA y DA VUELTAS— no deben sustituirse ni rediseñarse.

## Licencia

El código fuente se distribuye bajo la [licencia MIT](LICENSE).

El contenido de `art/` y `public/assets/` **no** se publica bajo MIT. Es material artístico del proyecto BABITOS y su copia, modificación, redistribución o reutilización requiere permiso previo de sus titulares.
