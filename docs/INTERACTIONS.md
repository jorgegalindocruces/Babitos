# Interacciones del juego

Esta es la referencia canónica de las interacciones disponibles en BABITOS 0.2. Describe lo que se puede jugar hoy; el diseño futuro de los tres mundos se mantiene separado en [GAME_DESIGN.md](GAME_DESIGN.md). Los cambios observables de cada iteración se registran en [CHANGELOG.md](CHANGELOG.md).

## Alcance actual

```text
Boot
  └─ Título
      ├─ Creador → Poder → Intro → Babilandia → Babito Corrupto → Tienda → Mapa
      ├─ Continuar → última pantalla guardada
      └─ Controles

Mapa
  ├─ Rejugar Babilandia
  ├─ Tienda
  ├─ Avance estático de La Jungla → Mapa
  ├─ Avance estático de Ciudad Bicharraca → Mapa
  └─ Título
```

Solo Babilandia y Babito Corrupto son contenido jugable. La Jungla y Ciudad Bicharraca tienen pantallas de avance, no niveles interactivos. La Oscuridad, Boss Total y el final pertenecen al roadmap.

## Entradas globales

| Acción | Teclado | Ratón o toque |
|---|---|---|
| Mover | `A` / `D` o `←` / `→` | Pads `◀` y `▶` en dispositivos táctiles |
| Saltar | `W`, `↑` o `Espacio` | Pad `↑` en dispositivos táctiles |
| Atacar | `J` o `X` | Pad `✦` en dispositivos táctiles |
| Pausar o reanudar gameplay | `P` o `Esc` | `PAUSA` abre la capa; `CONTINUAR` la cierra |
| Silenciar o activar audio | `M` | Botón `AUDIO` exterior al lienzo |
| Saltar la introducción | `S` | `SALTAR INTRO` o `ENTRAR EN BABILANDIA` |
| Recorrer botones | `Tab` / `Mayús + Tab` | Apuntar o tocar |
| Activar el botón enfocado | `Enter` o `Espacio` | Clic principal o toque |

Los pads virtuales solo aparecen cuando el navegador comunica capacidad táctil o un puntero grueso. Su zona activa es mayor que el círculo dibujado (radio 42 frente a 30), de modo que un pulgar que se desliza un poco no suelta el control, y el aviso inicial de Babilandia muestra los pads en lugar de las teclas. Durante el gameplay, `Espacio` pertenece al salto: el botón `PAUSA` del HUD no captura ese atajo. `Enter` y `Espacio` respetan el control HTML enfocado; salto, ataque y `M` también ignoran eventos nacidos en campos o botones. El movimiento y `P`/`Esc` siguen siendo atajos globales en una escena jugable.

## Contrato de botones y menús

Todos los botones de Phaser comparten el comportamiento de [Button.js](../src/ui/Button.js):

- toda el área dibujada, incluida la sombra, responde; el objetivo mínimo es de 48 × 32 píxeles y tiene 4 píxeles adicionales de tolerancia;
- admiten clic principal, toque, `Tab`, `Mayús + Tab`, `Enter` y `Espacio` cuando los atajos están habilitados;
- muestran estados normal, hover, pulsado, foco y deshabilitado;
- soltar el puntero fuera cancela la activación;
- un botón deshabilitado no se puede pulsar ni enfocar;
- cada botón tiene un espejo HTML accesible con nombre; las transiciones relevantes se anuncian en una región viva;
- los modales de Título y las capas de pausa/Game Over deshabilitan los controles que quedan debajo y mueven el foco a una acción superior;
- al cerrar un modal, reanudar o reintentar se limpia la entrada retenida para evitar acciones involuntarias.

## Legibilidad y escalado

- El juego conserva una resolución lógica de 960 × 540. En un escritorio con espacio suficiente se muestra a 960 × 540 CSS px exactos, sin ampliación fraccionaria; en pantallas menores se reduce en 16:9 sin desbordar la ventana.
- Silkscreen y Nunito se solicitan antes de dibujar la primera escena. Si la red retrasa una fuente, la interfaz usa un fallback temporal y vuelve a rasterizar el texto cuando termina la carga.
- Títulos, cuerpo, etiquetas, botones y avisos comparten la misma política de resolución para evitar que unos controles se vean más borrosos que otros.
- Limitar un nombre o título a una anchura reduce su tamaño tipográfico a un entero; no estira ni encoge la textura ya dibujada.

## Pantalla por pantalla

### Título

- `JUGAR` abre el Creador cuando no existe una aventura iniciada.
- Con progreso guardado, `NUEVA AVENTURA` abre una confirmación y `CONTINUAR · …` vuelve a la última pantalla válida.
- Una nueva aventura reinicia historia, checkpoint y poder, pero conserva nombre, aspecto, tamaño, monedas y cosméticos. También conserva los identificadores de recompensas ya cobradas para impedir duplicarlas.
- En la confirmación, `SEGUIR AQUÍ` cancela y `REINICIAR` confirma la nueva aventura.
- `CONTROLES` abre un modal resumido; `VOLVER` lo cierra. `Esc` cierra tanto ese modal como la confirmación.

### Creador de Babitos

- El nombre admite hasta 24 caracteres y se guarda al escribir.
- Las siete capas son independientes: `body`, `eyes`, `mouth`, `arms`, `headAccessory`, `glasses` y `neckAccessory`.
- Las flechas anterior/siguiente recorren únicamente opciones desbloqueadas y equipan la elección al instante.
- Pequeño, normal y grande muestran el atlas en cajas de 64, 80 y 96 px; comparten la hitbox física de 28 × 40, daño, velocidad y ventajas.
- `¡BABITO LOCO!` randomiza solo elementos desbloqueados.
- `TÍTULO` vuelve al inicio; `CONTINUAR` guarda y abre la selección de poder.

### Selección de poder

- Se elige una tarjeta de Fuego, Rayo o Roca. La elección se guarda y desbloquea ese poder.
- El botón para entrar en la aventura permanece deshabilitado hasta que exista una selección.
- Fuego es lineal y equilibrado; Rayo es lineal, más rápido y de menor duración; Roca describe una parábola, tarda más entre disparos y causa 2 puntos de daño.
- El poder activo no se cambia durante una fase. La configuración numérica vive en [game-data.json](../src/data/game-data.json).
- `CREADOR` vuelve atrás; `ENTRAR EN LA AVENTURA` abre la Intro.

### Intro

- Presenta el robo de las Manzanas de Poder y la misión del Babito.
- `S`, `SALTAR INTRO` y `ENTRAR EN BABILANDIA` conducen a la Fase 1.
- Si se entra sin un poder válido, el flujo vuelve automáticamente a la selección de poder.

### Babilandia

El nivel, sus seis encuentros, plataformas, Babicoins colocadas, checkpoints y portal se definen en [babilandia.json](../src/data/levels/babilandia.json); la orquestación está en [GameScene.js](../src/scenes/GameScene.js).

Babilandia se recorre en tres tramos separados por checkpoints, con dificultad creciente:

1. **Mercado** (`start` → `market_gate`): enseña a saltar con monedas sobre una plataforma baja y en arco, presenta a COME y ofrece una plataforma refugio sobre su zona de mordisco.
2. **Puente** (`market_gate` → `fountain`): presenta a VUELA en solitario y en pareja; un camino alto de dos plataformas premia con monedas y deja disparar a un VUELA que flota a esa altura.
3. **Fuente y portal** (`fountain` → portal): combina DA VUELTAS y COME alrededor de una plataforma refugio, de modo que hay que esquivar el giro mientras COME persigue, y termina con una ruta alta de tres plataformas antes del portal.

Los cinco carteles tutoriales también se definen allí sin coordenada vertical manual. Cada poste se apoya exactamente en la superficie física más alta bajo su posición y el texto queda contenido dentro de su tabla de madera; si no existe soporte, el cartel no se dibuja en el aire. El aviso de DA VUELTAS está separado tanto del enemigo como del checkpoint.

#### Movimiento, vida y ataque

- El Babito tiene 3 corazones. Alcanza su velocidad máxima de 320 px/s en unos 0,13 s, frena en unos 19 px y gira sin derrapar; en el aire conserva más inercia, pero puede corregir la trayectoria.
- El salto máximo sube unos 138 px (algo más de tres veces la hitbox) en 0,4 s. Soltar el botón antes corta el salto de forma suave (un toque sube aproximadamente la mitad), el vértice flota un instante y la caída es más rápida que la subida. Se conservan 110 ms de *coyote time* y 130 ms de *jump buffer*. Al aterrizar sobre una plataforma unidireccional, el Babito admite 10 px de margen bajo el borde superior.
- El movimiento horizontal y la gravedad del Babito se calculan con el tiempo real de cada frame, por lo que se sienten igual a 60, 120 o 144 Hz. El tuning vive en `player.movement` de [game-data.json](../src/data/game-data.json).
- Todas las plataformas elevadas de Babilandia son alcanzables desde el suelo o desde otra plataforma con ese salto.
- Un golpe quita un corazón, aplica retroceso con un pequeño salto, congela la acción 80 ms para que se lea el impacto, bloquea el control horizontal 220 ms y concede 1050 ms de invulnerabilidad con parpadeo.
- La cámara mira unos 110 px por delante en la dirección en que se mueve el Babito y desplaza ese margen suavemente al girar.
- Saltar y aterrizar con fuerza levantan unas motas de polvo; acertar a un enemigo congela la acción 35 ms y derrotarlo, 70 ms, con una pequeña sacudida. La preferencia de movimiento reducido elimina las partículas.
- El ataque sale en la dirección en que mira el Babito y respeta el cooldown del poder.
- El suelo base es completamente sólido. Las plataformas elevadas son unidireccionales: su cara inferior y sus laterales se atraviesan al ascender o al llegar desde abajo, y su cara superior sostiene al Babito, enemigos terrestres y monedas cuando descienden desde arriba. No existe todavía un comando para dejarse caer con `↓`.
- Los proyectiles desaparecen al tocar terreno. Invariante crítico: un poder nunca destruye, oculta ni desactiva suelo o plataformas; el fondo es decorativo y no tiene colisión.
- El HUD muestra corazones, Babicoins, poder y teclas de ataque, encuentros derrotados y pausa.

#### Checkpoints, caídas y reintento

- Activar un checkpoint lo guarda y restaura toda la vida.
- Caer intenta quitar un corazón y devuelve al último checkpoint conservando la vida restante. Durante la invulnerabilidad del respawn no aplica un segundo daño.
- Llegar a cero abre `GAME OVER`. `REINTENTAR` devuelve al último checkpoint con la vida completa; `TÍTULO` sale de la fase.
- Al reaparecer, los enemigos vivos a menos de 700 px del checkpoint vuelven a su posición inicial en estado neutro: un checkpoint nunca deja al Babito dentro de un ataque. Cargar la partida en un checkpoint intermedio concede la misma invulnerabilidad de 1500 ms que un respawn.
- Las monedas recogidas y el checkpoint quedan persistidos.

#### Babicoins colocadas

- Babilandia contiene 25 Babicoins flotantes sobre plataformas, arcos de salto y rutas altas, además de las que sueltan los enemigos.
- Cada una se cobra una sola vez por guardado mediante su identificador de recompensa (`babilandia:coin:<id>`). En una rejugada, o tras `NUEVA AVENTURA`, las ya cobradas aparecen translúcidas, marcan la ruta y no vuelven a sumar.
- Recoger una moneda suena, levanta unas chispas doradas, muestra `+1` y hace latir el contador del HUD; ya no destella toda la pantalla.
- La pausa muestra `BABICOINS ESCONDIDAS x/25`.

#### Enemigos y portal

| Enemigo | Comportamiento | Ventana de daño al jugador | Vulnerabilidad |
|---|---|---|---|
| COME | Patrulla, persigue, anticipa, muerde y se recupera | Solo durante `BITE` | Siempre |
| VUELA | Patrulla aérea, apunta, anticipa, cae en picado y vuelve | Solo durante `DIVE` | Siempre |
| DA VUELTAS | Patrulla, anticipa, rueda y queda mareado | Solo durante `SPIN` | Solo durante `DIZZY`; fuera de ella bloquea el disparo |

VUELA aparece una vez en solitario y después en pareja. DA VUELTAS solo prepara el giro cuando el Babito está a menos de 460 px; durante los 650 ms de anticipación se orienta hacia él y después rueda 1,7 s en esa dirección, por lo que el ataque se lee y se esquiva saltando o subiendo a una plataforma. Cada enemigo puede soltar 0, 1 o 2 Babicoins. El portal del boss permanece sellado hasta derrotar los seis encuentros; tocarlo antes aparta al jugador e informa cuántos faltan, de qué tipo y que están detrás.

Un impacto aceptado reproduce `hurt` completo como reacción no cíclica. Durante esa reacción el enemigo no avanza su estado, no daña al Babito y no acepta otro impacto. COME interrumpe `WINDUP`/`BITE` hacia `RECOVER`; VUELA interrumpe `TARGET`/`WINDUP`/`DIVE` hacia `RETURN`; DA VUELTAS conserva `DIZZY`. COME ancla el borde inferior de cada frame al borde inferior de su cuerpo físico, por lo que sus pies permanecen sobre suelo o plataforma también durante `WINDUP` y `BITE`. VUELA no colisiona con plataformas: las atraviesa durante picado y regreso, pero conserva límites del mundo y overlaps de combate.

#### Pausa

`P`, `Esc` o `PAUSA` abren la capa de pausa, salvo durante muerte o transición. Se congelan física, tweens, temporizadores, animaciones y reloj de gameplay. `CONTINUAR` restaura el mismo estado y `VOLVER AL TÍTULO` abandona la fase. Al abrir la pausa o `GAME OVER` se retira el aviso flotante activo, para que no quede encima del panel mientras el reloj está detenido.

### Babito Corrupto

La interacción del combate se implementa en [BossScene.js](../src/scenes/BossScene.js).

- El boss tiene 16 puntos de vida y repite `FIREBALL` → `FROM_ABOVE` → `FURY_CHARGE`.
- Cada patrón muestra una señal previa y un mensaje: saltar la bola de fuego, atender a la marca superior o apartarse de la embestida.
- `FIREBALL` lanza bolas a la altura de los pies del boss: desde el suelo siempre se saltan, y las plataformas sirven de refugio. Cada bola se carga 300 ms como un orbe visible antes de salir, con la dirección fijada. En la primera mitad son dos bolas separadas 900 ms; con la mitad de vida o menos, tres bolas más rápidas separadas 850 ms.
- La embestida solo daña mientras el boss se desplaza de verdad; detenido contra un muro ya no hace daño por contacto.
- Recibir daño congela la acción 80 ms y acertar en `RECOVER`, 45 ms.
- Tras cada patrón entra 1,9 segundos en `RECOVER`. Solo durante esa ventana recibe daño; fuera de ella la corrupción bloquea el disparo y muestra feedback.
- La Roca causa 2 puntos por impacto; Fuego y Rayo causan 1.
- El HUD muestra corazones, poder, nombre, barra y vida del boss, patrón actual y pausa.
- Pausa congela todo el encuentro. Llegar a cero corazones abre `GAME OVER`; `REINTENTAR` reinicia la pelea completa. La arena tiene suelo continuo y límites físicos, por lo que no usa la recuperación por caída de Babilandia.
- Al vencer, el boss se purifica —no muere—, se reproduce el diálogo y se conceden 30 Babicoins una sola vez. `IR A LA TIENDA` abre la tienda.
- La arena usa suelo y plataformas físicas independientes del fondo. El suelo continuo es sólido y las dos plataformas elevadas son unidireccionales para jugador y boss. Disparar nunca puede eliminar la base de la fase.

### Tienda

- Señor Empanadilla y Señor Pingüino son aliados y tenderos.
- Al entrar, el catálogo agrupa todos los cosméticos en páginas de seis y ordena primero los bloqueados por precio, seguidos por los ya desbloqueados. Una compra conserva su posición actual hasta volver a abrir la tienda.
- Las flechas cambian de página de forma circular.
- Una opción bloqueada se compra y equipa con una sola activación si hay monedas; si faltan, se informa la cantidad necesaria.
- Una opción desbloqueada se equipa sin coste. Cada ficha previsualiza el cosmético sobre un Babito completo.
- Compra, desbloqueo, equipamiento y saldo se guardan inmediatamente. El CTA principal `CONTINUAR AL MAPA` guarda el destino antes del fundido y abre el mapa.

### Mapa y avances

- La tarjeta de `BABILANDIA` muestra una acción visible para jugar o rejugar la Fase 1. Al activarla guarda `babilandia`, reinicia solo el checkpoint a `start` y entra desde el principio; conserva poder, finalización, recompensas, monedas y colección.
- `IR A LA TIENDA` vuelve al catálogo y `VOLVER AL TÍTULO` vuelve al inicio.
- `LA JUNGLA` y `CIUDAD BICHARRACA` abren pantallas descriptivas marcadas `PRÓXIMAMENTE`; la única acción allí es `VOLVER AL MAPA`.
- Ciudad Bicharraca usa su fondo raster también en la previsualización. La Jungla mantiene por ahora una composición procedural.

## Animación y feedback

- El Babito tiene 51 poses sincronizadas entre sus siete capas: `idle` (6 frames), `walk` (8), `run` (8), `jump` (6), `fall` (6), `attack` (6), `hurt` (5) y `dead` (6). Caminar y correr son ciclos diferentes; cada estado cambia apoyo de pies, brazos, expresión y silueta sin alterar la hitbox.
- La animación se selecciona después de resolver movimiento y física en el mismo frame. Los tamaños pequeño, normal y grande producen cajas de render enteras de 64, 80 y 96 px y conservan una línea de suelo común sin cambiar el cuerpo físico.
- COME tiene `idle`, `walk`, `windup`, `attack`, `hurt` y `defeat` sobre su spritesheet raster. `WINDUP` recorre la preparación y `BITE` empieza en la pose de mordisco sin reiniciar una fila ofensiva completa; todos los clips se anclan por los pies a la superficie física.
- VUELA tiene `idle`, `fly`, `dive`, `attack`, `hurt` y `defeat` en un atlas raster de 36 poses; `dive`, `attack`, `hurt` y `defeat` no vuelven del último frame al primero. DA VUELTAS mantiene `idle`, `roll`, `windup`, `hurt` y `defeat` en su hoja procedural.
- Babito Corrupto cambia de pose en intro, los tres patrones, `RECOVER` y su forma purificada.
- Pausar congela también los relojes de animación.

## Persistencia

[SaveStore.js](../src/state/SaveStore.js) valida y guarda la partida en `babitos.save.v1`:

- nombre, tamaño y siete capas equipadas;
- poder seleccionado y poderes desbloqueados;
- Babicoins;
- cosméticos desbloqueados y comprados;
- pantalla, checkpoint, derrota del boss, fin de Fase 1 y recompensas ya reclamadas.

La preferencia de audio usa por separado `babitos.audio.v1`. Si `localStorage` no está disponible, el juego sigue funcionando durante la sesión.

## Audio

- `M` y el botón HTML `AUDIO` alternan mute; el atajo se ignora mientras se escribe o cuando se usan modificadores.
- La primera interacción desbloquea Web Audio. Si el navegador no lo ofrece, el control queda deshabilitado como `AUDIO N/D` y el juego continúa.
- Hay temas para título/Creador/Poder, Babilandia/Intro, boss, tienda y mapa/avances, más efectos de UI, salto, ataque, daño, moneda, checkpoint, boss y compra.
- Esta versión no tiene control de volumen ni archivos de audio producidos: música y efectos son síntesis runtime.

## Límites de interacción actuales

- No hay navegación de menús con flechas ni soporte de mando.
- Los botones y mensajes principales exponen controles HTML y anuncios; parte de la narrativa y textos secundarios dibujados en canvas no tiene todavía un equivalente DOM completo.
- Los overlays no se declaran como diálogos modales formales. El soporte de teclado y lector es parcial y no se presenta como conformidad de accesibilidad completa.
- El diálogo final de purificación enfoca `IR A LA TIENDA`, pero el botón de pausa —ya inerte— permanece todavía en el orden de tabulación.
- La preferencia de movimiento reducido cubre transiciones, flashes, toasts y motas, pero no todos los tweens decorativos.

## Accesos de QA en desarrollo

Solo con el servidor de desarrollo, `BootScene` admite rutas para revisar pantallas sin alterar el flujo de producción:

- `?qa=TitleScene`, `CreatorScene`, `PowerScene`, `IntroScene`, `GameScene`, `BossScene`, `ShopScene`, `WorldMapScene` o `ComingSoonScene`;
- `&world=jungle` o `&world=city` para `ComingSoonScene`;
- `&qaCoins=90` para garantizar al menos ese saldo, hasta 999; no reduce monedas existentes;
- `&qaComplete=1` para marcar la Fase 1 como completada;
- `&qaCombat=1` en `GameScene` para empezar en el primer checkpoint, acercar a COME, dejarlo a un golpe y forzar drops de dos monedas;
- `&qaCheckpoint=start|market_gate|fountain|boss_gate` en `GameScene` para revisar una zona concreta y su decoración sin persistir ese punto QA en el guardado;
- `&qaEnemy=come|vuela|da_vueltas` para aislar una instancia, colocarla ante la cámara e inmovilizar su IA sin daño ni persistencia;
- `&qaEnemyState=<estado-o-clip>` para fijar un estado de IA (`DIVE`, `BITE`, `DIZZY`…) o un clip (`idle`, `hurt`, `defeat`); `&qaEnemyFrame=<n>` fija su frame local y limita valores altos al último disponible;
- `&qaOneHit=1` en `BossScene` para colocar al boss a un golpe y entrar pronto en `RECOVER`;
- `&debugAI=1` en Babilandia para mostrar la etiqueta del estado actual de cada enemigo.

Ejemplos: `http://localhost:5173/?qa=ComingSoonScene&world=city` y `http://localhost:5173/?qa=GameScene&qaEnemy=vuela&qaEnemyState=DIVE&qaEnemyFrame=4&debugAI=1`.

## Referencias de implementación

| Contrato | Fuente principal |
|---|---|
| Configuración Phaser y audio global | [main.js](../src/main.js) |
| Carga, animaciones y rutas QA | [BootScene.js](../src/scenes/BootScene.js) |
| Entrada y estado del jugador | [PlayerController.js](../src/game/PlayerController.js) |
| Proyectiles y poderes | [PowerSystem.js](../src/game/PowerSystem.js) |
| Anclaje de carteles y decoración | [surfaceAnchoring.js](../src/game/surfaceAnchoring.js) |
| Estados de enemigos | [EnemyController.js](../src/game/EnemyController.js) |
| Límites, rebotes y dirección estable de enemigos | [EnemyBehavior.js](../src/game/EnemyBehavior.js) |
| Avatar por capas | [BabitoAvatar.js](../src/game/BabitoAvatar.js) |
| Animaciones de enemigos | [EnemyAnimations.js](../src/game/EnemyAnimations.js) |
| Animación del boss | [BossAnimator.js](../src/game/BossAnimator.js) |
| Botones, foco y accesibilidad | [Button.js](../src/ui/Button.js) |
| Guardado y migración | [SaveStore.js](../src/state/SaveStore.js) |
