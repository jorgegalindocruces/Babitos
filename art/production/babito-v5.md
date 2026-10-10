# Babito canónico v5

## Estado

Contrato visual vigente desde el 11 de octubre de 2026. Sustituye a [Babito canónico v4](babito-v4.md), cuya ficha se conserva como historial, y alinea el personaje con las tres láminas de anatomía aprobadas:

- [babito_anatomy_1.png](../approved/babito_anatomy_1.png): base frontal/lateral/trasera, paleta, tamaños, animaciones y sistema de capas.
- [babito_anatomy_2.png](../approved/babito_anatomy_2.png): animaciones por fotograma, tamaños de 32/48/64 px y catálogo de capas.
- [babito_anatomy_3.png](../approved/babito_anatomy_3.png): ficha resumida con paleta, capas, combinaciones y composición.

Las tres coinciden en el personaje base; donde difieren en el catálogo de cosméticos, ver «Fuera de este contrato».

## Qué cambió respecto a v4

| Rasgo | v4 | v5 (láminas) |
| --- | --- | --- |
| Silueta | Círculo de 47 × 45 px | Gominola: superelipse de exponente 2,6, corona plana y flancos casi verticales, 47 × 47 px |
| Paleta cian | `#7CDBF9` / `#A8EDFF`, sin sombra pintada | CUERPO `#48D9F5`, LUZ `#91F1FF`, SOMBRA `#229CCB`, CONTORNO `#182334`, MEJILLAS `#FF91AD` |
| Ojos normales | Barras negras de 4 × 9 | Óvalos brillantes de 8 × 12 con destello blanco arriba a la derecha, 11 px de separación, más altos en la cara |
| Boca base | U fina | Sonrisa abierta con lengua rosa `#FF5D7D` |
| Brazos | Aletas largas y caídas; al caminar subían hasta parecer orejas | Muñones redondeados a media altura en todas las poses (`BABITO_ARM_NUBS`), nunca por encima de la fila 9 |
| Pies | Casi juntos (3 unidades) | Dos pies cortos con separación clara (6 unidades) y un brillo |
| Expresión en movimiento | Ceño fruncido en caminar, correr, saltar, caer, aterrizar y atacar, que además ocultaba los ojos y la boca equipados | Conserva la cara equipada; solo parpadeo, daño y derrota la sustituyen |
| Daño | Ojos en X | Ojos «> <» con tres estrellas sobre la cabeza |
| Derrota | Ojos en X | Ojos en X (sin cambios) |
| Tamaños | ×0,8 / ×1 / ×1,2 (64 / 80 / 96 px) | ×0,675 / ×1 / ×1,325 (54 / 80 / 106 px), lo más cercano a 32/48/64 de las láminas con celdas de píxel entero |

## Construcción

- Rejilla de diseño de 48 unidades rasterizada a 64 px reales (`BABITO_DETAIL_SCALE = 4 / 3`) dentro de celdas de 80 px; hitbox de 28 × 40, línea de apoyo y las 54 poses no cambian.
- `drawBabitoBodyShape()` pinta el cuerpo por píxel físico: contorno de 2 px, color principal, borde de luz en el cuarto superior izquierdo y un borde de sombra **solo en el flanco derecho**, que termina antes de los pies. La lámina pinta volumen, pero la regresión de la v4 sigue protegida: la sombra nunca cruza la barriga ni alcanza los pies, y las raíces de los pies se reabren con el color principal para no formar cinturilla.
- Dos brillos en la corona, mejillas redondeadas a la altura de la boca y un brillo en cada pie.
- Los sombreros se reposicionan sobre la corona y terminan por encima de los ojos; las gafas de sol cubren los ojos en su nueva altura.
- Las otras diez pieles conservan sus colores y heredan la misma geometría y distribución de luz y sombra.

## Fuera de este contrato

Las láminas muestran un catálogo de cosméticos más amplio que el del Creador actual (más ojos, bocas, brazos, sombreros, gafas y accesorios de cuello). v5 adapta las opciones existentes al nuevo personaje, pero no añade opciones nuevas: ampliar el catálogo afecta a la Tienda y al guardado y queda como trabajo aparte.

## Verificación

- [`babito-animation.test.js`](../../test/babito-animation.test.js) bloquea la silueta (corona plana, flancos verticales, 47 × 47, simetría), la paleta cian y los colores de contorno y mejillas, que la sombra quede en el flanco derecho sin tocar barriga ni pies en las 11 pieles y los 54 frames, que las raíces de los pies sigan abiertas, que el movimiento conserve la cara equipada y que todos los brazos sean muñones compactos por debajo de la corona.
- [`landing.test.js`](../../test/landing.test.js) comprueba la exportación [`babito.png`](../../public/assets/landing/babito.png) (320 × 320, nearest 4×) con la paleta v5.
- Revisión visual de los 54 frames, todas las pieles, ojos, bocas, brazos y sombreros, del Creador a los tres tamaños y del juego con corona, gafas y pajarita.
