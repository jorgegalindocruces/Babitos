# Enemigos de La Jungla · spritesheets v2

Atlas runtime de los tres enemigos de la Fase 2:

- [`enemy-garbanzo-loco-sheet-v2.png`](../../public/assets/characters/enemy-garbanzo-loco-sheet-v2.png)
- [`enemy-arbol-pocho-sheet-v2.png`](../../public/assets/characters/enemy-arbol-pocho-sheet-v2.png)
- [`enemy-sapo-pota-sheet-v2.png`](../../public/assets/characters/enemy-sapo-pota-sheet-v2.png)

La v2 **no redibuja ninguna pose**: procede píxel a píxel de las hojas v1 descritas en [jungle-enemy-sheets-v1.md](jungle-enemy-sheets-v1.md), archivadas en [`sources/`](sources/) y ya no publicadas. La reconstrucción es reproducible con [`tools/repair_jungle_enemy_sheets.py`](tools/repair_jungle_enemy_sheets.py) (Pillow, numpy y scipy).

## Defectos de la v1 corregidos

La v1 se cortó con una rejilla fija de 256 px y varias poses no cabían en su celda:

| Hoja | Defecto v1 | Corrección v2 |
| --- | --- | --- |
| Garbanzo Loco | La punta de la lanza de `attack` quedaba cortada y aparecía suelta en la celda de `hurt`. | La punta vuelve a `attack`; `hurt` queda limpio. |
| Árbol Pocho | La copa de `defeat` estaba cortada en vertical y una astilla de esa copa aparecía en `hurt`. Los puñetazos y el daño desplazaban las raíces 16-23 px. | La astilla vuelve a `defeat`; todas las poses apoyan las raíces en el mismo punto. |
| Sapo Pota | El cuerpo de `vomit` estaba partido por la mitad: la espalda aparecía dentro de `hurt`. Un dedo de `defeat` quedaba en `submerge`. La pose `vomit` estaba desplazada ~100 px respecto a `idle`. | Los fragmentos vuelven a su pose y el cuerpo sentado comparte pivote en todas las poses. |

Cada fragmento se identificó como componente conexo y se reubicó cerrando el canal transparente de 8 px que la v1 había dejado en el corte. Las costuras continúan la silueta con un error de 0 a 3 px.

## Formato

Cada hoja tiene **2 filas × 4 columnas**, celdas de **256 px de alto** y alpha binario 0/255. Las celdas son más anchas que altas para que ninguna pose larga se corte, y cada pose está centrada en un **pivote horizontal común** (el centro de la celda), de modo que cambiar de clip nunca desplaza al personaje lateralmente. La posición vertical es exactamente la de la v1: la última fila opaca está en `y = 244` (Garbanzo, Sapo) o `y = 248` (Árbol).

| Hoja | Tamaño | Celda | Escala runtime | Pivote |
| --- | --- | --- | --- | --- |
| Garbanzo Loco | 1408 × 512 | 352 × 256 | 1/2 exacta | Centro del cuerpo-garbanzo |
| Árbol Pocho | 1152 × 512 | 288 × 256 | 172/256 | Raíces y tronco |
| Sapo Pota | 1600 × 512 | 400 × 256 | 148/256 | Ojos al emerger/sumergirse; cuerpo sentado en el resto |

## Orden real de frames

| Enemigo | Fila 0: 0 · 1 · 2 · 3 | Fila 1: 0 · 1 · 2 · 3 |
| --- | --- | --- |
| Garbanzo Loco | `idle` · `walkA` · `walkB` · `windup` | `attack` · `hurt` · `recover` · `defeat` |
| Árbol Pocho | `idle` · `wake` · `angry` · `punchRight` | `punchLeft` · `recover` · `hurt` · `defeat` |
| Sapo Pota | `underwater` · `emerge` · `idle` · `windup` | `vomit` · `hurt` · `submerge` · `defeat` |

El Árbol nunca se refleja: `punchRight` (fila 0, columna 3) golpea a la derecha y `punchLeft` (fila 1, columna 0) a la izquierda. Garbanzo mira a la derecha en origen y Sapo a la izquierda; ambos se reflejan en runtime según su dirección.

## Medidas usadas por el gameplay

Medidas sobre la v2 a escala runtime, desde el centro del cuerpo:

- Punta de la lanza de Garbanzo: 82 px. La ventana de daño de `SPEAR_ATTACK` termina en 85 px (`spearReach: 60` más medio cuerpo).
- Puño del Árbol: 62 px a cada lado. La ventana de `PUNCH_LEFT`/`PUNCH_RIGHT` termina en 67 px (`punchReach: 34`).
- Boca abierta del Sapo: 52 px sobre su línea base; la vomitera nace ahí.

Este material artístico queda fuera de la licencia MIT del código, según el aviso de `LICENSE`.
