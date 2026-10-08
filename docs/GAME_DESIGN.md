# BABITOS — Game Design v1.1

## Premisa

Plataformas 2D familiar y colorido. Los Bicharracos roban las Manzanas de Poder del Árbol de Poder. El jugador crea un Babito, elige un poder inicial y atraviesa tres mundos para recuperarlas.

## Estado del diseño

Este documento define la visión completa. No todo el flujo está implementado todavía:

| Contenido | Estado en 0.2 |
|---|---|
| Título, Creador, selección de poder e Intro | Implementado |
| Babilandia, seis encuentros y checkpoints | Jugable |
| Babito Corrupto | Jugable |
| Tienda y Mapa | Implementado |
| La Jungla y Ciudad Bicharraca | Pantallas de avance estáticas |
| La Oscuridad, Boss Total y Final | Roadmap, sin gameplay |

El comportamiento implementado se documenta en [INTERACTIONS.md](INTERACTIONS.md); su historial está en [CHANGELOG.md](CHANGELOG.md).

## Flujo actual

Título → Creador → Poder → Intro → Babilandia → Babito Corrupto → Tienda → Mapa. La tienda ofrece `CONTINUAR AL MAPA` como salida principal. Desde el mapa se puede rejugar Babilandia desde el inicio sin perder la colección ni la finalización, visitar la tienda, volver al título o ver los avances de Jungla y Ciudad.

## Flujo objetivo

Título → Creador → Poder → Intro → Babilandia → Babito Corrupto → Tienda → Jungla → La Oscuridad → Tienda → Ciudad Bicharraca → Boss Total → Final.

## Creador

Capas independientes: `body`, `eyes`, `mouth`, `arms`, `headAccessory`, `glasses` y `neckAccessory`. Ojos y bocas nunca son una cara prefabricada. Los catálogos son ampliables, con opciones gratuitas y otras comprables. Pequeño, normal y grande son cosméticos: mismo hitbox, daño, velocidad y ventajas. `¡BABITO LOCO!` randomiza opciones desbloqueadas.

## Poder inicial

- Fuego: proyectil recto equilibrado.
- Rayo: proyectil recto rápido y de duración moderada.
- Roca: parábola más lenta y potente.

Los poderes no se compran. Babicoins equivalen a apariencia; Manzanas de Poder equivalen a progresión y nuevos poderes en el diseño completo.

## Enemigos canónicos

- COME: rojo, boca enorme, ojos saltones, mayor que el Babito, terrestre y muerde.
- VUELA: murciélago morado, menor que el Babito, aparece solo o en pareja, vuela y ataca en picado.
- DA VUELTAS: bola verde con pinchos, rueda y después queda mareado. Solo es vulnerable durante ese estado.

Cada enemigo puede soltar 0, 1 o 2 monedas. En Babilandia, solo el ataque activo de cada enemigo causa daño y el portal se abre al superar los seis encuentros. DA VUELTAS apunta su giro hacia el Babito para que el peligro sea legible.

## Jefes

1. Babito Corrupto — implementado: proyectil, ataque superior y embestida; se vuelve vulnerable en `RECOVER` y al perder vuelve a ser normal.
2. La Oscuridad — roadmap: entidad de sombra; viaja por oscuridad y se vuelve vulnerable con luz.
3. Boss Total — roadmap: jefe de los Bicharracos; combina poderes y pierde capacidades al perder manzanas.

## Tienda

Señor Empanadilla y Señor Pingüino son aliados y tenderos. Nunca son enemigos ni bosses. Venden cosméticos y permiten equiparlos.

## Mundos

1. Babilandia atacada — jugable: ciudad de Babitos, luminosa pero dañada. Funciona como tutorial en tres tramos: Mercado enseña a saltar y presenta a COME; Puente presenta a VUELA y premia el camino alto; Fuente y portal combina DA VUELTAS y COME alrededor de una plataforma refugio. El suelo base es continuo, de modo que el reto vertical procede de plataformas útiles, refugios y monedas, no de fosos.
2. Jungla — avance/roadmap: ramas, lianas, ruinas, verticalidad y progresión hacia oscuridad.
3. Ciudad Bicharraca — avance/roadmap: industrial, máquinas, tuberías, trampas y fortaleza final.

`worlds_environment_reference_only.png` define solo entorno, composición, paleta y atmósfera. Sus enemigos dibujados no son canónicos.

## Árbol de Poder

Sin poder: muy triste, copa apagada, ramas caídas, huecos vacíos, cara triste y ambiente desaturado. Con poder: luminoso, verde, feliz y con manzanas recuperadas.

## Moneda

Circular, basada en `coin_original.jpeg`, B central y marcas laterales. Rebota al caer y da feedback al recoger. Además de las que sueltan los enemigos, Babilandia esconde 25 Babicoins colocadas que se cobran una sola vez por guardado y que premian la exploración y los saltos arriesgados.

## HUD y estados

HUD: corazones, monedas, poder activo, encuentros y pausa; durante el boss añade su barra, vida y estado.

- Daño: retroceso, breve invulnerabilidad y parpadeo.
- Checkpoint: guarda posición y restaura la vida.
- Caída no fatal en Babilandia: intenta restar un corazón y reaparece en el último checkpoint; la invulnerabilidad evita daño repetido inmediato.
- Game Over en Babilandia: reintenta desde el checkpoint con vida completa.
- Game Over contra el boss: reinicia el encuentro completo.
- Pausa: congela simulación y animaciones; permite continuar o volver al título.

El suelo y las plataformas son cuerpos de colisión independientes de los fondos. El suelo base es sólido; las plataformas elevadas son unidireccionales, se atraviesan desde abajo y sostienen al caer desde arriba. Los poderes solo pueden destruir su propio proyectil al impactar; nunca eliminan terreno.

## Sensación de control

El Babito debe sentirse preciso y ágil sin dejar de ser familiar: arranca y frena casi al instante, gira sin derrapar, conserva algo de inercia en el aire, salta más de tres veces su altura y permite saltos cortos soltando el botón. La caída es algo más rápida que la subida. El *coyote time*, el *jump buffer* y un pequeño margen al aterrizar en bordes perdonan errores de un frame. Los golpes se leen con retroceso, una pausa breve y parpadeo. Cada ataque enemigo y de boss tiene un aviso que deja tiempo de reacción: un golpe debe sentirse como un error propio, nunca como una trampa.

## Interacción y accesibilidad

Teclado, ratón y toque forman parte del alcance actual. Los menús admiten `Tab`, `Mayús + Tab`, `Enter` y `Espacio`, y los botones tienen equivalentes HTML accesibles. Esta versión no promete soporte de mando ni accesibilidad completa para toda la narrativa dibujada dentro del canvas. Véase [INTERACTIONS.md](INTERACTIONS.md).

## Final

Objetivo de roadmap: Árbol restaurado, celebración en Babilandia y Babito con su personalización actual.
