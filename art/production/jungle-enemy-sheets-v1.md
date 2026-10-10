# Enemigos de La Jungla · spritesheets v1

> **Sustituida por [jungle-enemy-sheets-v2.md](jungle-enemy-sheets-v2.md).** La v1 cortaba varias poses; se conserva como registro de procedencia y sus PNG están archivados en [`sources/`](sources/).

Los tres enemigos exclusivos de la Fase 2 usan atlas raster transparentes de producción:

- [`enemy-garbanzo-loco-sheet-v1.png`](sources/enemy-garbanzo-loco-sheet-v1.png)
- [`enemy-arbol-pocho-sheet-v1.png`](sources/enemy-arbol-pocho-sheet-v1.png)
- [`enemy-sapo-pota-sheet-v1.png`](sources/enemy-sapo-pota-sheet-v1.png)

Cada PNG mide **1024 × 512 px**, distribuido en **4 columnas × 2 filas** de celdas exactas de **256 × 256 px**. Los límites son `x = [0, 256, 512, 768, 1024]` e `y = [0, 256, 512]`. Cada pose conserva un margen transparente mínimo de 4 px respecto a su celda. El alpha del asset runtime es binario (`0` o `255`) y se normalizó con muestreo *nearest-neighbour* para que el escalado en Phaser permanezca nítido.

Después de normalizar escala y transparencia, cada frame se trasladó verticalmente —sin redibujar ni reescalar la pose— hasta compartir una baseline de píxel estable. El último píxel opaco queda en `y = 244` para Garbanzo Loco y Sapo Pota, y en `y = 248` para Árbol Pocho. Así `idle`, locomoción, ataques, daño, recuperación y derrota no flotan ni saltan al cambiar de fila en el atlas.

## Orden de frames

| Enemigo | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Garbanzo Loco | `idle` | `walkA` | `walkB` | `windup` | `attack` | `hurt` | `recover` | `defeat` |
| Árbol Pocho | `idle` | `wake` | `angry` | `punchRight` | `punchLeft` | `recover` | `hurt` | `defeat` |
| Sapo Pota | `underwater` | `emerge` | `idle` | `windup` | `vomit` | `hurt` | `submerge` | `defeat` |

## Referencias y proceso

Se usó la herramienta integrada ImageGen, con fondo transparente, tomando como referencias de identidad los paneles aprobados y los dibujos originales:

- [`jungle_garbanzo_loco.png`](../approved/jungle_garbanzo_loco.png) y [`enemy_garbanzo_loco_original.png`](../original_drawings/enemy_garbanzo_loco_original.png).
- [`jungle_arbol_pocho.png`](../approved/jungle_arbol_pocho.png) y [`enemy_arbol_pocho_original.png`](../original_drawings/enemy_arbol_pocho_original.png).
- [`jungle_sapo_pota.png`](../approved/jungle_sapo_pota.png) y [`enemy_sapo_pota_original.png`](../original_drawings/enemy_sapo_pota_original.png).

Los másteres generados incluían RGB bajo alpha parcial. El Árbol Pocho recibió además una edición dirigida de extracción de fondo para retirar el degradado y los halos sin alterar las ocho poses. Los tres atlas runtime se dividieron por pose, se ajustaron proporcionalmente dentro de su celda, se remuestrearon por vecino más cercano y convirtieron a transparencia binaria con umbral de alpha `192`. De este modo no se usa como sprite ninguna ficha conceptual completa ni queda niebla semitransparente alrededor de las siluetas.

La comprobación visual final detectó que ImageGen materializó los dos puñetazos del Árbol en el orden espacial inverso al solicitado: la celda 3 golpea a la derecha y la 4 a la izquierda. La tabla y el mapping runtime documentan el contenido real del atlas para que la rama visible y la hitbox siempre coincidan. El frame de vomitera del Sapo mira a la izquierda de origen; `EnemyPresentation` invierte la hoja únicamente cuando el objetivo queda a su derecha.

## Prompts de producción

**Garbanzo Loco**

> Hoja de sprites 4 × 2 con ocho poses completas y separadas de Garbanzo Loco, fiel al panel aprobado y al dibujo original: guerrero garbanzo con brazos y piernas verdes, tres plumas, lanza y escudo de vaina. Orden: `idle`, `walkA`, `walkB`, `windup`, `attack`, `hurt`, `recover`, `defeat`. Pixel art nítido, escala y paleta constantes, pivote de suelo coherente, sin texto, paneles, divisores, escenario, sombra ni recortes, sobre transparencia real.

**Árbol Pocho**

> Hoja de sprites 4 × 2 con ocho poses completas y separadas del Árbol Pocho, fiel al panel aprobado y al dibujo original: árbol corrupto de copa verde, tronco expresivo, ojo azul y ramas-brazo. Orden: `idle`, `wake`, `angry`, `punchLeft`, `punchRight`, `recover`, `hurt`, `defeat`. Pixel art nítido, escala y paleta constantes, pivote de suelo coherente, sin texto, paneles, divisores, escenario, sombra ni recortes, sobre transparencia real.

Edición de fondo aplicada al máster del Árbol Pocho:

> Elimina únicamente el degradado verde-marrón, los halos de color y cualquier fondo opaco. Conserva exactamente las ocho poses, su orden 4 × 2, escala, separación, contornos, colores, caras, hojas, marcas de movimiento, arcos blancos y alertas rojas. No rediseñes, muevas ni redimensiones los sprites; no añadas texto, cuadrícula, paneles, sombras ni elementos nuevos. Devuelve alpha realmente transparente y bordes pixel art nítidos.

**Sapo Pota**

> Hoja de sprites 4 × 2 con ocho poses completas y separadas de Sapo Pota, fiel al panel aprobado y al dibujo original: sapo gigante verde de pantano, ojos prominentes, vientre amarillo y vómito tóxico. Orden: `underwater`, `emerge`, `idle`, `windup`, `vomit`, `hurt`, `submerge`, `defeat`. Pixel art nítido, escala y paleta constantes, pivote acuático coherente, sin texto, paneles, divisores, escenario, sombra ni recortes, sobre transparencia real.

Este material artístico queda fuera de la licencia MIT del código, según el aviso de `LICENSE`.
