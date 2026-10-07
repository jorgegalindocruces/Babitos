# BABITOS

**Pequeños Babitos, grandes aventuras.**

BABITOS es un plataformas 2D familiar hecho con JavaScript, Phaser 3 y Vite. En este primer *vertical slice* puedes crear un Babito por capas, elegir un poder y recorrer Babilandia para enfrentarte a COME, VUELA, DA VUELTAS y al Babito Corrupto. Las monedas sirven para comprar cosméticos en la tienda del Señor Empanadilla y el Señor Pingüino.

El juego funciona completamente en el navegador, sin backend ni base de datos. La partida se guarda en `localStorage` bajo la clave versionada `babitos.save.v1`.

Juega en: [https://jorgegalindocruces.github.io/Babitos/](https://jorgegalindocruces.github.io/Babitos/)

## Recorrido jugable

1. Título.
2. Creador de Babitos: cuerpo, ojos, boca, brazos y accesorios son capas independientes.
3. Elección de Fuego, Rayo o Roca.
4. Babilandia, que también funciona como tutorial.
5. Encuentros con COME, VUELA y DA VUELTAS; cada enemigo puede soltar entre cero y dos monedas.
6. Combate contra el Babito Corrupto.
7. Tienda de cosméticos y acceso a los adelantos de las siguientes fases.

Los tamaños pequeño, normal y grande son puramente visuales: usan el mismo *hitbox* y las mismas estadísticas.

## Controles

| Acción | Teclado |
|---|---|
| Mover | `A` / `D` o `←` / `→` |
| Saltar | `W`, `↑` o `Espacio` |
| Atacar con el poder activo | `J` o `X` |
| Pausa | `P` o `Esc` |
| Activar o silenciar audio | `M` |
| Navegar por botones | `Tab` / `Mayús + Tab` |
| Activar el botón enfocado | `Enter` o `Espacio` |

También se puede usar ratón o pantalla táctil en los menús y los controles virtuales durante la partida. El botón `AUDIO` permanece disponible junto al lienzo y recuerda la preferencia local de mute.

## Iteración 0.2 · Pulido audiovisual

- Babilandia utiliza un nuevo fondo pixel art panorámico basado exclusivamente en la arquitectura, paleta y atmósfera de la lámina oficial. Si el asset no puede cargarse, el juego vuelve automáticamente al fondo procedural.
- La arena de Babito Corrupto tiene un fondo 16:9 propio: Babilandia en ruinas al atardecer, basado en el ejemplo canónico del boss y con una zona de juego limpia para conservar la lectura de ataques y plataformas.
- Ciudad Bicharraca, el último mundo del mapa, muestra ya su paisaje industrial 16:9 tanto en el fondo de la pantalla como en su avance jugable.
- Música ambiental y efectos para interfaz, salto, ataque, daño, monedas, checkpoints, boss y compras se sintetizan en el navegador mediante Web Audio, sin archivos ni dependencias adicionales.
- El Babito conserva poses legibles de ataque y daño, y reacciona al salto y al aterrizaje sin modificar su hitbox.
- `Espacio` queda reservado para saltar durante el gameplay; los botones del HUD siguen disponibles con ratón, toque o navegación accesible mediante `Tab`.

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
└── original_drawings/ Dibujos originales de referencia
docs/                  Diseño, arte, implementación y aceptación
test/                  Pruebas automáticas sin navegador real
```

La configuración se mantiene fuera de las escenas siempre que es posible:

- `src/data/cosmetics.json` contiene categorías, IDs, nombres, claves de asset, desbloqueo inicial y precios.
- `src/data/game-data.json` define jugador, tamaños, poderes, enemigos y bosses.
- `src/data/levels/` contiene la geometría y entidades de cada fase.
- `src/state/SaveStore.js` valida, migra y persiste la partida.
- `src/game/createTextures.js` mantiene claves de textura estables mientras se sustituyen los gráficos temporales.

Este enfoque permite ampliar BABITOS sin introducir casos particulares en la interfaz o en la lógica de guardado.

## Create your own Babito

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

El Creator, la tienda, el guardado y `¡BABITO LOCO!` leen el catálogo automáticamente. El randomizador solo utiliza elementos desbloqueados.

Para crear un nivel, añade sus datos a `src/data/levels/` y una escena que los consuma. Para un enemigo nuevo en futuras expansiones, mantén su comportamiento configurable y evita acoplarlo a un nivel concreto.

## GitHub Pages

El workflow `.github/workflows/deploy-pages.yml` se ejecuta al enviar cambios a `main` o manualmente. Instala dependencias con `npm ci`, ejecuta las pruebas, compila el juego y despliega `dist/` mediante las acciones oficiales de GitHub Pages.

Configuración inicial del repositorio:

1. Abre **Settings → Pages** en GitHub.
2. En **Build and deployment → Source**, selecciona **GitHub Actions**.
3. Envía los cambios a `main` o ejecuta el workflow **Deploy BABITOS to GitHub Pages** desde la pestaña **Actions**.
4. Cuando termine, el sitio estará previsto en [https://jorgegalindocruces.github.io/Babitos/](https://jorgegalindocruces.github.io/Babitos/).

Vite usa rutas relativas (`base: './'`), por lo que imágenes, módulos y demás recursos funcionan tanto en `/` como bajo `/Babitos/`.

## Placeholders actuales

Las láminas de `art/approved/` son dirección artística, no *spritesheets* finales. Babilandia, la arena de Babito Corrupto y Ciudad Bicharraca ya disponen de fondos raster integrados en `public/assets/backgrounds/`, con fallback procedural. El resto del vertical slice utiliza texturas pixel art generadas por código con claves definitivas para:

- capas del Babito y cosméticos;
- COME, VUELA y DA VUELTAS;
- Babito Corrupto, tenderos, moneda y Árbol de Poder;
- proyectiles, plataformas, props y elementos del HUD.

Estas texturas deben sustituirse gradualmente por sprites y animaciones finales sin cambiar sus IDs ni la lógica. El audio actual es procedural: funciona como primera dirección sonora, pero todavía debe sustituirse o ampliarse con música y efectos producidos. La Jungla y Ciudad Bicharraca son adelantos navegables; sus niveles y bosses completos pertenecen a iteraciones posteriores.

`worlds_environment_reference_only.png` sirve únicamente para escenarios, paleta y atmósfera. Los enemigos canónicos son los de `enemies_canonical.png`.

## Contribuir

Las contribuciones son bienvenidas:

1. Haz un *fork* y crea una rama descriptiva.
2. Mantén el proyecto en JavaScript y evita dependencias innecesarias.
3. Conserva los IDs y diseños canónicos; usa datos en lugar de hardcodear catálogos.
4. Añade o actualiza pruebas cuando cambie la lógica.
5. Comprueba `npm test` y `npm run build` antes de abrir un pull request.

Puedes proponer nuevos Babitos, cosméticos, niveles o enemigos para futuras expansiones. Los tres enemigos normales del vertical slice —COME, VUELA y DA VUELTAS— no deben sustituirse ni rediseñarse.

## Licencia

El código fuente se distribuye bajo la [licencia MIT](LICENSE).

El contenido de `art/` y `public/assets/` **no** se publica bajo MIT. Es material artístico del proyecto BABITOS y su copia, modificación, redistribución o reutilización requiere permiso previo de sus titulares.
