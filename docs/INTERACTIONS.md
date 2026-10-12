# Interacciones del juego

Esta es la referencia canónica de las interacciones disponibles en BABITOS 0.3. Describe lo que se puede jugar hoy; el diseño futuro de los tres mundos se mantiene separado en [GAME_DESIGN.md](GAME_DESIGN.md). Los cambios observables de cada iteración se registran en [CHANGELOG.md](CHANGELOG.md).

## Alcance actual

```text
Landing (index.html)
  ├─ Historia · Crea tu Babito · Mundos · Personajes · Del papel al píxel · Arte conceptual · Créditos
  └─ JUGAR → diálogo con el juego
Boot
  └─ Título
      ├─ Creador → Poder → Intro → Babilandia → Babito Corrupto → Tienda → Mapa
      ├─ Continuar → última pantalla guardada (también La Jungla o La Oscuridad)
      └─ Controles

Mapa
  ├─ Rejugar Babilandia
  ├─ La Jungla → La Oscuridad → Tienda → Mapa   (tras completar la Fase 1)
  ├─ Ciudad Bicharraca → PRÓXIMAMENTE: BOSS TOTAL → Mapa o Título   (tras completar la Fase 2)
  ├─ Tienda
  └─ Título
```

Son jugables Babilandia con Babito Corrupto (Fase 1), La Jungla con La Oscuridad (Fase 2) y Ciudad Bicharraca (Fase 3). Boss Total y el final pertenecen al roadmap.

## Landing page

La portada de `babitos.es` presenta el juego antes de jugar: hero con el logo y un Babito que salta, la historia del Árbol de Poder en tres pasos, el creador y los tres poderes, los tres mundos jugables, personajes, catorce comparativas «Del papel al píxel», doce láminas conceptuales y un cierre de créditos. Garbanzo Loco, Árbol Pocho y Sapo Pota se identifican como **Jugable · Fase 2**; Drone Bot, Robot Elice e IVE Robot, como **Jugable · Fase 3**. La frase visible «Los robots de la Ciudad Bicharraca han sido imaginados y dibujados por Momo.» preserva la autoría. Los retratos son editoriales; el juego carga spritesheets transparentes independientes.

- Todos los botones `JUGAR` abren un diálogo modal con el juego. La primera apertura carga el motor (`Cargando BABITOS…`); las siguientes son inmediatas. Si se cierra antes de terminar esa primera carga, el runtime se desactiva en cuanto queda listo y nunca avanza ni toma foco detrás de la portada.
- `Esc` dentro del diálogo pausa el juego, como siempre; solo el botón `✕` cierra el diálogo. Cerrar congela la pantalla actual, suspende música y reloj y, si se hizo durante gameplay, al volver espera el panel `PAUSA`; en Título, Creador y otros menús reanuda esa misma pantalla.
- `⛶` pone el juego a pantalla completa. En móvil el diálogo ocupa toda la pantalla y, en vertical, sugiere girar el teléfono.
- Con el diálogo cerrado, flechas, Espacio y `M` vuelven a comportarse como en cualquier página. Al cerrar, el foco vuelve al botón que lo abrió.
- Un enlace a `https://babitos.es/#jugar` abre el juego directamente.
- `#creditos` aparece después del último CTA y antes del pie técnico. Reconoce a Lola y Momo como autores de las ideas y los dibujos y como directores creativos y ejecutivos de BABITOS; su lámina completa se amplía en el mismo visor, mientras la atribución y los cargos permanecen también como texto HTML visible.
- Las tarjetas distinguen tres familias jugables: COME, VUELA y DA VUELTAS permanecen en Babilandia; Garbanzo Loco, Árbol Pocho y Sapo Pota pertenecen a La Jungla; Drone Bot, Robot Elice e IVE Robot, a Ciudad Bicharraca. Las fichas y retratos son contenido editorial, pero los seis personajes de Fases 2 y 3 tienen sprites, animaciones y comportamiento propios.

## Entradas globales

| Acción | Teclado | Ratón o toque |
|---|---|---|
| Mover | `A` / `D` o `←` / `→` | Pads `◀` y `▶` en dispositivos táctiles |
| Saltar | `W`, `↑` o `Espacio` | Pad `↑` en dispositivos táctiles |
| Bajar de una plataforma elevada | `S` o `↓` | Pad `▼` en dispositivos táctiles |
| Atacar | `J` o `X` | Pad `✦` en dispositivos táctiles |
| Pausar o reanudar gameplay | `P` o `Esc` | `PAUSA` abre la capa; `CONTINUAR` la cierra |
| Silenciar o activar audio | `M` | Botón `AUDIO` exterior al lienzo |
| Cambiar el estilo musical | — | Botón `♫ AVENTURA` / `♫ CALMA` / `♫ ARCADE` junto a `AUDIO` |
| Saltar la introducción | `S` | `SALTAR INTRO` o `ENTRAR EN BABILANDIA` |
| Recorrer botones | `Tab` / `Mayús + Tab` | Apuntar o tocar |
| Activar el botón enfocado | `Enter` o `Espacio` | Clic principal o toque |

Los pads virtuales solo aparecen cuando el navegador comunica capacidad táctil o un puntero grueso. Su zona activa es mayor que el círculo dibujado (radio 42 frente a 30), de modo que un pulgar que se desliza un poco no suelta el control, y el aviso inicial de Babilandia muestra los pads en lugar de las teclas. Durante el gameplay, `Espacio` pertenece al salto: el botón `PAUSA` del HUD no captura ese atajo. `Enter` y `Espacio` respetan el control HTML enfocado; salto, bajada, ataque y `M` también ignoran eventos nacidos en campos o botones. El movimiento y `P`/`Esc` siguen siendo atajos globales en una escena jugable. Los dos controles de sonido conservan la activación nativa por teclado sin transmitir `Enter` o `Espacio` a Phaser.

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
- El arte conserva nearest. Las texturas Canvas de texto usan filtro linear y resolución interna de hasta 2×; ambas propiedades se restauran después de cada cambio de contenido, color o tamaño para que paginación, HUD y contadores no vuelvan a verse borrosos.
- Ningún texto visible de escenas, menús, HUD, carteles o avisos se configura por debajo de 12 px. Las etiquetas de 12–15 px usan como máximo 1 px de contorno y las mayores, 2 px; los cuerpos pequeños evitan contorno.
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
- Pequeño, normal y grande muestran el atlas en cajas de 54, 80 y 106 px; comparten la hitbox física de 28 × 40, daño, velocidad y ventajas.
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
- Todas las plataformas elevadas de Babilandia y de La Jungla son alcanzables desde el suelo, desde otra plataforma o desde una seta saltarina con ese salto.
- Un golpe quita un corazón, aplica retroceso con un pequeño salto, congela la acción 80 ms para que se lea el impacto, bloquea el control horizontal 220 ms y concede 1050 ms de invulnerabilidad con parpadeo.
- La cámara mira unos 110 px por delante en la dirección en que se mueve el Babito y desplaza ese margen suavemente al girar.
- Saltar y aterrizar con fuerza levantan unas motas de polvo; acertar a un enemigo congela la acción 35 ms y derrotarlo, 70 ms, con una pequeña sacudida. La preferencia de movimiento reducido elimina las partículas.
- El ataque sale en la dirección en que mira el Babito y respeta el cooldown del poder.
- El suelo base es completamente sólido. Las plataformas elevadas son unidireccionales en Babilandia, La Jungla, Ciudad y las dos arenas de jefe: su cara inferior y sus laterales se atraviesan al ascender o al llegar desde abajo, y su cara superior sostiene al Babito, enemigos terrestres y monedas cuando descienden desde arriba. Pulsar `S`, `↓` o el pad `▼` estando de pie sobre una plataforma elevada deja caer al Babito a través de ella con un pequeño impulso hacia abajo; la plataforma se ignora solo hasta que los pies quedan claramente por debajo de su cara superior, y vuelve a sostenerlo si salta de nuevo encima. Sobre el suelo base no hace nada. La pulsación se encola como el salto, así que un toque muy breve no se pierde, y anula el *coyote time* de la plataforma abandonada. La primera vez que el Babito descansa sobre una plataforma en un nivel (pasado el aviso inicial y si aún no ha bajado nunca) aparece un aviso breve: «S/↓ para bajar de la plataforma» o «▼» en táctil. Las pausas de las tres fases y de ambos bosses lo recuerdan junto a «Mover».
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

### La Jungla

La Fase 2 reutiliza la escena de nivel ([GameScene.js](../src/scenes/GameScene.js)) con los datos de [jungla.json](../src/data/levels/jungla.json); el registro [levels/index.js](../src/data/levels/index.js) indica qué fondo, texturas, recompensas y jefe corresponden a cada nivel. Se abre desde el Mapa en cuanto la Fase 1 está completa y empieza siempre en `start`. Las reglas de movimiento, daño, poderes, checkpoints, pausa, Babicoins colocadas y portal son las de Babilandia. Los enemigos sueltan igualmente 0, 1 o 2 Babicoins y reciben Fuego, Rayo o Roca mediante el mismo sistema; La Jungla sustituye por completo los tipos de Fase 1 con estas diferencias:

- **Fosos del río**: el suelo se interrumpe. Caer al agua cuesta un corazón y devuelve al último checkpoint, como cualquier caída. Todos los fosos miden como mucho 160 px (un salto en carrera cubre unos 230) o se cruzan por puentes de cuerda o un tronco intermedio.
- **Seis secuencias de combate con diez enemigos**, repartidas entre los cuatro checkpoints (`start`, `lianas`, `ruinas`, `penumbra`):
  1. Garbanzo Loco se presenta solo al inicio para enseñar su persecución y su lanza.
  2. Árbol Pocho aparece camuflado entre la vegetación y despierta cuando el Babito se acerca.
  3. Sapo Pota presenta desde la laguna su aparición y una primera vomitera de un proyectil.
  4. Garbanzo Loco y Árbol Pocho se combinan en las ruinas.
  5. Sapo Pota y Garbanzo Loco se combinan al comenzar la penumbra; el sapo dispara una ráfaga de dos.
  6. Antes del portal aparecen juntos Garbanzo Loco, Árbol Pocho y Sapo Pota; este último dispara una ráfaga de tres.
- **Garbanzo Loco**: patrulla y persigue, entra en `ATTACK_WINDUP` (520 ms, tinte ámbar) cuando el Babito está a menos de 96 px y a su misma altura, ejecuta una estocada horizontal durante `SPEAR_ATTACK` y termina en `RECOVER`. La dirección de la estocada se fija al empezar la anticipación: saltar por encima de él hasta su espalda es una esquiva real. El área de daño termina en la punta pintada de la lanza (82 px desde su centro). Lanza y escudo-vaina forman parte de todas sus poses; solo la estocada activa alcanza al Babito. Nunca ataca a un Babito situado en una cornisa por encima ni persigue a uno que esté fuera de su tramo (al otro lado de un pilar o de un foso).
- **Árbol Pocho**: permanece fijo y camuflado en `TREE_IDLE`; proximidad (250 px) activa `WAKE_UP` y `ANGRY_IDLE`. Con el Babito a menos de 96 px se compromete a golpear: mantiene 300 ms los brazos alzados con tinte ámbar y después ejecuta `PUNCH_LEFT` o `PUNCH_RIGHT` según el lado del Babito. La rama solo alcanza hasta el puño pintado (62 px desde el tronco), así que retroceder durante la anticipación la hace fallar. Queda vulnerable en `RECOVER` (980 ms); los impactos recibidos durante esa ventana no la alargan. No bloquea el paso: el Babito puede atravesarlo.
- **Sapo Pota**: espera con los ojos en `UNDERWATER`, emerge, anticipa y ejecuta `TOXIC_VOMIT`; cada globo sale de la boca, hace un ajuste vertical corto y visible (máximo 48 px) hacia la altura actual del Babito y continúa en línea horizontal. Atraviesa los puentes de cuerda y las ramas, pero desaparece contra suelo sólido, el Babito o al agotar su vida. Los encuentros avanzados lanzan 2 y 3 proyectiles espaciados. Es el más resistente, no persigue al Babito y permanece en su zona de agua: su cuerpo queda medio sumergido detrás de la capa del río y de los puentes, y bajo el agua solo asoman los ojos, sobre la superficie. Mientras está sumergido los disparos del Babito pasan por encima; cada sapo ataca en todo el radio en el que se deja ver. Sus drops se trasladan al menos 32 px dentro del puente u orilla alcanzable más cercana.
- **Setas saltarinas**: caer sobre su sombrero lanza al Babito hasta 250–270 px si se mantiene el salto; soltándolo sube al menos el 60 % y después corta el impulso como un salto normal. Caminar contra el tallo no hace nada.
- **Pilares de ruinas**: son suelo sólido elevado; bloquean el paso lateral y los disparos, y hay que saltarlos.
- **Pasarelas finas**: en La Jungla los puentes de cuerda y las ramas sostienen al Babito desde arriba, pero ningún proyectil se detiene en ellas (ni los del Babito, incluida la roca en arco, ni la vomitera). En Babilandia las plataformas siguen deteniendo los disparos.
- **Enemigos y fosos**: Garbanzo Loco no sale del tramo de suelo donde aparece y se da la vuelta en bordes o pilares. Árbol Pocho y Sapo Pota son estacionarios; los tres sapos están colocados en fosos reales y se anclan a la línea de agua. Sus proyectiles tóxicos salen de la boca, entran en una calle horizontal alcanzable y desaparecen al impactar con el Babito, suelo sólido o al agotar su tiempo de vida. Las Babicoins de un sapo derrotado aparecen sobre el puente u orilla más cercanos para no perderse en el río. Todas las monedas soltadas por enemigos frenan solas al rebotar, de modo que ninguna se desliza hasta un foso.
- **Checkpoints seguros**: ningún checkpoint queda dentro del radio de detección de un Árbol o un Sapo, ni del alcance de un Garbanzo que pueda llegar hasta él. `lianas` está a 270 px del primer Árbol, `ruinas` (x = 3830) queda detrás de las ruinas ya superadas y `penumbra` (x = 5220) a 230 px del último Sapo.
- **La luz se apaga**: poco después del checkpoint `ruinas`, desde x = 4000, un velo oscuro crece hasta x = 6000 junto al portal y un halo cálido sigue al Babito para mantenerlo legible.
- Derrotar a los diez enemigos de las seis secuencias abre el portal hacia La Oscuridad. Hay 30 Babicoins colocadas con identificadores `jungla:coin:<id>`, independientes de las de Babilandia.
- Ambientación: fondo raster panorámico de selva, montañas, cascadas y templo con paneo suave; sobre él permanecen el agua animada de cada foso, la cascada del recorrido, lianas que se mecen, ruinas, maleza y luciérnagas. Si el raster no carga, reaparece el fondo procedural `jungle`. La imagen nunca aporta colisión.

### Ciudad Bicharraca

La Fase 3 reutiliza [GameScene.js](../src/scenes/GameScene.js) con [city.json](../src/data/levels/city.json). Se desbloquea al completar la Fase 2, admite Fuego, Rayo o Roca y conserva movimiento, daño, plataformas unidireccionales, checkpoints, pausa, drops y persistencia de las fases anteriores.

- El recorrido ocupa 7200 px y se divide visual y mecánicamente en **Entrada de la Ciudad** (0–1800), **Fábricas** (1800–4000) y **Fortaleza** (4000–7200). Hay cuatro checkpoints: `start`, `factory_gate`, `assembly_line` y `fortress_gate`.
- El fondo raster industrial se desplaza con la cámara. [cityScenery.js](../src/game/cityScenery.js) añade siluetas lejanas, fábricas intermedias y estructuras cercanas con factores de parallax distintos; ninguna capa visual aporta colisión.
- Plataformas de metal y tuberías conservan el contrato unidireccional. Tres plataformas móviles crean rutas verticales, y los peligros eléctricos restan un corazón sin destruir ni modificar terreno. Los huecos principales mantienen una ruta legible y checkpoints antes de las combinaciones difíciles.
- Hay 36 Babicoins colocadas con identificadores `city:coin:<id>`. Cada una se cobra una vez; las ya obtenidas reaparecen translúcidas en una rejugada.
- **Drone Bot**, de aproximadamente 1,5 Babitos de alto, vuela sin gravedad y recorre `IDLE → PATROL → DETECT → CHARGE → ELECTRIC_ATTACK → RECOVER`. Su carga cian avisa antes de crear un rayo vertical bajo su cuerpo. Solo el rayo activo daña; `HURT` interrumpe el peligro y `EXPLODE` cierra la derrota con una explosión eléctrica.
- **Robot Elice**, de aproximadamente 2 Babitos de alto, permanece siempre en tierra y recorre `PATROL → DETECT → SPIN_WINDUP → SPIN_ATTACK → SPIN_RECOVER → VULNERABLE`. Durante `SPIN_ATTACK` hace daño y bloquea los disparos; después queda vulnerable. `HURT` y `DEFEAT` son reacciones independientes. Nunca se le asigna vuelo.
- **IVE Robot**, de aproximadamente 3 Babitos de alto, permanece sobre suelo o plataforma y conserva visible el corazón roto del pecho. Recorre `IDLE → PATROL → DETECT` y elige entre `SCYTHE_WINDUP → SCYTHE_ATTACK`, `GRAB_ATTACK` y, en encuentros avanzados, doble guadaña. El agarre aplica retroceso fuerte; `RECOVER` abre la respuesta, y `HURT`/`DEFEAT` interrumpen el ataque.
- La dificultad presenta primero Drone Bot, después Robot Elice en las fábricas, luego IVE Robot en la fortaleza y termina combinando los tres. Los once robots deben caer para abrir el portal.
- Los tres poderes completan la fase: ningún enemigo exige un poder concreto, las ventanas vulnerables duran lo suficiente para sus distintos cooldowns y el rayo enemigo no se confunde con el proyectil del poder Rayo.
- Al cruzar el portal se guarda `phase3Complete` y se abre [ComingSoonScene.js](../src/scenes/ComingSoonScene.js) con el título exacto `PRÓXIMAMENTE: BOSS TOTAL`. Esa pantalla no simula el boss y permite `VOLVER AL MAPA` o `VOLVER AL TÍTULO`.

### La Oscuridad

El combate de la Fase 2 se implementa en [DarknessBossScene.js](../src/scenes/DarknessBossScene.js).

- La Oscuridad tiene 20 puntos de vida. En la sombra es **intangible**: los disparos la atraviesan y un aviso recuerda que hay que atraerla a la luz.
- Hay tres **farolillos**: dos en el suelo, a los lados, y uno colgado en el centro que solo se alcanza disparando desde una plataforma. Un disparo los enciende durante 14 s; los últimos 3 s parpadean. Un farolillo encendido deja pasar los disparos, así que nunca la protege.
- Si La Oscuridad cruza la luz de un farolillo encendido mientras se desliza o reaparece, queda **EXPUESTA** 2,2 s: se vuelve sólida, un anillo dorado la rodea y recibe daño. Al terminar se bebe esa luz y el farolillo se apaga. El farolillo central empieza encendido, de modo que la primera sombra rasante enseña el ciclo.
- Patrones, en orden, siempre con un cartel de aviso:
  - `SOMBRA RASANTE`: cruza la arena a ras de suelo desde el lado contrario al Babito. Se esquiva saltando hacia ella o subiendo a una plataforma; solo daña mientras se desliza.
  - `METEORITOS OSCUROS`: dos tandas de tres meteoritos separados 150 px; una marca en el suelo avisa 0,76 s antes de cada uno. Cerca de un borde se desplaza la tanda completa dentro de la arena, sin comprimir el hueco entre impactos.
  - `ZONA OSCURA`: se funde en un charco que persigue al Babito por el suelo y brota bajo él tras un aviso de 0,48 s. Si el charco atraviesa la luz de cualquier farolillo encendido, sale a la fuerza y queda expuesta.
  - Cada dos patrones, si queda algún farolillo encendido, `APAGA LA LUZ`: el más cercano al Babito parpadea 1,1 s y se apaga, salvo que se le dispare a tiempo.
- Fuego y Rayo causan 1 punto; la Roca, 2. Recibir daño congela la acción 80 ms y acertar, 45 ms.
- Pausa, `GAME OVER` y `REINTENTAR` funcionan como contra Babito Corrupto.
- Al vencer, La Oscuridad se deshace en luciérnagas y devuelve la Manzana de Poder de la Jungla. Se conceden 40 Babicoins una sola vez (`boss2_reward`), se guardan `boss2Defeated` y `phase2Complete`, y `IR A LA TIENDA` continúa al catálogo y al Mapa.

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
- El puesto muestra bajo `PREMIOS DE 1.ª VICTORIA` las recompensas únicas configuradas para Babito Corrupto (+30) y La Oscuridad (+40), marcadas `PENDIENTE` o `COBRADA` según el guardado; nunca presenta ambos bosses como una recompensa repetible de 30.
- Compra, desbloqueo, equipamiento y saldo se guardan inmediatamente. El CTA principal `CONTINUAR AL MAPA` guarda el destino antes del fundido y abre el mapa.

### Mapa y avances

- La tarjeta de `BABILANDIA` muestra una acción visible para jugar o rejugar la Fase 1. Al activarla guarda `babilandia`, reinicia solo el checkpoint a `start` y entra desde el principio; conserva poder, finalización, recompensas, monedas y colección.
- La tarjeta de `LA JUNGLA` muestra `BLOQUEADA` hasta completar la Fase 1 (activarla solo avisa de cómo abrirla), después `FASE 2 DISPONIBLE` y, tras vencer a La Oscuridad, `FASE 2 COMPLETA` con el Árbol de Poder restaurado. Al jugarla guarda `jungla` con checkpoint `start` y conserva todo lo demás.
- La tarjeta de `CIUDAD BICHARRACA` muestra `BLOQUEADA` hasta completar la Fase 2, después `FASE 3 DISPONIBLE` y, al superar la fortaleza, `FASE 3 COMPLETA`. Al jugarla guarda `city` con checkpoint `start` sin borrar colección ni recompensas.
- `IR A LA TIENDA` vuelve al catálogo y `VOLVER AL TÍTULO` vuelve al inicio.
- Boss Total abre una pantalla descriptiva marcada `PRÓXIMAMENTE: BOSS TOTAL`; ofrece volver al Mapa o al Título y no se presenta como combate jugable.

## Animación y feedback

- El Babito tiene 54 poses sincronizadas entre sus siete capas: `idle` (6 frames), `walk` (8), `run` (8), `jump` (6), `fall` (6), `land` (3), `attack` (6), `hurt` (5) y `dead` (6). Caminar y correr son ciclos diferentes; `land` muestra impacto, asentamiento y recuperación; cada estado cambia apoyo de pies, brazos, expresión y silueta sin alterar la hitbox.
- La prioridad visual es `dead` → `hurt` → `attack` → aire (`jump` al ascender y `fall` al descender) → `land` → locomoción (`idle`/`walk`/`run`). Por eso la velocidad residual nunca borra un KO, una reacción de daño o un ataque. Saltar —también desde una seta—, atacar, recibir daño, morir o aterrizar activa su *one-shot* en ese mismo frame desde la primera pose; un nuevo salto, ataque o golpe reinicia el clip inmediatamente aunque ese estado siguiera visible.
- Cada descriptor de brazos conserva una silueta pixelada propia y los muelles siguen los mismos destinos sin perder su zigzag. Los pies cambian de geometría entre apoyo, punta, elevación, recogida, caída, impacto y KO. En los estados de suelo, el pie de contacto permanece sobre una baseline común después de aplicar squash e inclinación; ninguna pose altera el cuerpo físico.
- Su construcción base es la misma en Creador, HUD, gameplay y landing y sigue las [láminas de anatomía](../art/production/babito-v5.md): cuerpo de gominola de 47 × 47 px con corona plana, ojos ovalados brillantes, sonrisa abierta con lengua, mejillas rosas, brazos en muñón y dos pies cortos separados. El cian usa `#48D9F5`, luz `#91F1FF`, sombra `#229CCB` solo en el flanco derecho y contorno `#182334`; la sombra nunca cruza la barriga ni toca los pies. Las variantes de color heredan la misma geometría y distribución tonal durante los 54 frames. Al moverse, saltar o atacar el Babito mantiene la cara elegida en el Creador; al recibir daño cierra los ojos («> <») con estrellas sobre la cabeza y al caer derrotado muestra ojos en X. Los sombreros quedan sobre la corona sin tapar los ojos. La opción inicial no equipa sombrero, sin modificar los guardados que ya tengan otro accesorio.
- La animación se selecciona después de resolver movimiento y física en el mismo frame. Los tamaños pequeño, normal y grande aplican escalas `0.675`, `1` y `1.325` a `BABITO_RENDER_SIZE = 80` y producen cajas de render enteras de 54, 80 y 106 px. El tamaño normal conserva los píxeles fuente 1:1; la baseline fuente de 30 px se compensa a 20 px de mundo para que los tres tamaños compartan línea de suelo sin cambiar el cuerpo físico.
- COME tiene `idle`, `walk`, `windup`, `attack`, `hurt` y `defeat` sobre su spritesheet raster. `WINDUP` recorre la preparación y `BITE` empieza en la pose de mordisco sin reiniciar una fila ofensiva completa; todos los clips se anclan por los pies a la superficie física.
- VUELA tiene `idle`, `fly`, `dive`, `attack`, `hurt` y `defeat` en un atlas raster de 36 poses; `dive`, `attack`, `hurt` y `defeat` no vuelven del último frame al primero. DA VUELTAS mantiene `idle`, `roll`, `windup`, `hurt` y `defeat` en su hoja procedural.
- Garbanzo Loco anima patrulla/persecución, anticipación, estocada, recuperación, daño y derrota. Árbol Pocho diferencia árbol quieto, despertar, enfado, puñetazo izquierdo, puñetazo derecho, recuperación, daño y derrota. Sapo Pota diferencia ojos sumergidos, salida del agua, espera, anticipación, vomitera, recuperación, daño, inmersión y derrota. Cada uno usa una hoja transparente de 1024 × 512 con ocho celdas de 256 × 256; la máquina de estados elige clips semánticos y un impacto interrumpe la ventana peligrosa hacia su reacción `HURT`.
- Drone Bot, Robot Elice e IVE Robot usan hojas transparentes 4 × 2 de 1772 × 886, con ocho celdas de 443 × 443. Cada celda conserva el personaje completo y un pivote estable; nunca se usa la lámina conceptual como sprite. Sus mappings cubren todos los estados descritos en Ciudad, incluidos carga/rayo/explosión, giro/ventana vulnerable y guadaña/agarre/corazón expuesto.
- Babito Corrupto cambia de pose en intro, los tres patrones, `RECOVER` y su forma purificada. La Oscuridad es un sprite procedural fiel a su referencia canónica (masa negra de borde violeta, tentáculos y ojos rasgados) que ondula, se desvanece al viajar por la sombra y se ilumina con un anillo dorado al quedar expuesta.
- Las capas del Babito se dibujan a su tamaño nativo y se amplían después sin suavizado, con píxeles totalmente opacos o transparentes: en Título y Creador se ve nítido, sin franjas ni bordes borrosos.
- Pausar congela también los relojes de animación.

## Persistencia

[SaveStore.js](../src/state/SaveStore.js) valida y guarda la partida en `babitos.save.v1`:

- nombre, tamaño y siete capas equipadas;
- poder seleccionado y poderes desbloqueados;
- Babicoins;
- cosméticos desbloqueados y comprados;
- pantalla, checkpoint, derrota de cada boss, fin de Fase 1, Fase 2 y Fase 3 y recompensas ya reclamadas.

El mute usa por separado la clave heredada `babitos.audio.v1`; el arreglo musical usa `babitos.music.v1`. Una preferencia musical ausente o inválida vuelve a `AVENTURA` sin alterar el mute. Si `localStorage` no está disponible, el juego sigue funcionando y conserva ambas decisiones durante la sesión actual.

## Audio

- `M` y el botón HTML `AUDIO` alternan mute; el atajo se ignora mientras se escribe o cuando se usan modificadores.
- El botón musical situado junto a `AUDIO` recorre tres arreglos que afectan a todo el juego: `AVENTURA` —equilibrado y valor inicial—, `CALMA` —más lento, suave y espaciado— y `ARCADE` —más rápido, denso y marcadamente chiptune—. El cambio se aplica al tema actual, se anuncia en la región viva y no desmutea el juego.
- La primera interacción desbloquea Web Audio. Si el navegador no lo ofrece, los controles quedan deshabilitados como `AUDIO N/D` y `MÚSICA N/D`, y el juego continúa.
- Siete composiciones procedurales originales de 32 pasos cubren título/Creador/Poder (`title`), Babilandia/Intro y el mapa aún en progreso (`babilandia`), Babito Corrupto (`boss`), tienda (`shop`), La Jungla (`jungle`), La Oscuridad (`darkness`) y el mapa completado/avances (`ending`).
- Cada composición combina melodía, arpegio, bajo y ritmo mediante un *scheduler* Web Audio con planificación anticipada; los temas y arreglos cambian sin reiniciar la partida. Los efectos de UI, salto, ataque, daño, moneda, checkpoint, boss y compra siguen su propia capa de mezcla.
- Música y efectos son síntesis en tiempo real: no se descargan archivos de audio externos y esta versión no expone un control de volumen continuo.

## Límites de interacción actuales

- No hay navegación de menús con flechas ni soporte de mando.
- Los botones y mensajes principales exponen controles HTML y anuncios; parte de la narrativa y textos secundarios dibujados en canvas no tiene todavía un equivalente DOM completo.
- Los overlays no se declaran como diálogos modales formales. El soporte de teclado y lector es parcial y no se presenta como conformidad de accesibilidad completa.
- Los diálogos finales de los dos jefes enfocan `IR A LA TIENDA`, pero el botón de pausa —ya inerte— permanece todavía en el orden de tabulación.
- La preferencia de movimiento reducido cubre transiciones, flashes, toasts y motas, pero no todos los tweens decorativos.

## Accesos de QA en desarrollo

Solo con el servidor de desarrollo, `BootScene` admite rutas para revisar pantallas; la landing no las abre y `BootScene` no las procesa en producción:

- `?qa=TitleScene`, `CreatorScene`, `PowerScene`, `IntroScene`, `GameScene`, `BossScene`, `DarknessBossScene`, `ShopScene`, `WorldMapScene` o `ComingSoonScene`;
- `ComingSoonScene` muestra Boss Total; `&world=jungle|jungla` redirige a la Fase 2 y `&world=city|ciudad` redirige a la Fase 3 jugable;
- `&qaCoins=90` para garantizar al menos ese saldo, hasta 999; no reduce monedas existentes;
- `&qaComplete=1` para marcar la Fase 1 como completada;
- `&qaLevel=jungla|city` en `GameScene` para cargar La Jungla o Ciudad; sin él se resuelve el nivel solicitado o guardado;
- `&qaCombat=1` en `GameScene` para empezar en el primer checkpoint, acercar al primer enemigo del nivel, dejarlo a un golpe y forzar drops de dos monedas;
- `&qaCheckpoint=start|market_gate|fountain|boss_gate` para Babilandia, `start|lianas|ruinas|penumbra` para La Jungla o `start|factory_gate|assembly_line|fortress_gate` para Ciudad; revisa una zona concreta sin persistir ese checkpoint ni cobrar sus monedas colocadas;
- `&qaMotion=idle|walk|run|jump|fall|land|attack|hurt|dead` activa una presentación temporal del Babito. Sin `qaFrame`, el clip avanza con su cadencia real —los ciclos repiten y los *one-shots* conservan su pose final—; `&qaFrame=<n>` congela el frame local solicitado, limitado al último disponible. Cualquier input real de movimiento, bajada, salto o ataque, por teclado o pad táctil, libera el override y devuelve el control al selector automático. `&qaSize=small|normal|large` fija el tamaño visual; estas ayudas pueden actualizar la escena/checkpoint del guardado local de desarrollo;
- `&qaEnemy=come|vuela|da_vueltas|garbanzo_loco|arbol_pocho|sapo_pota|drone_bot|robot_elice|ive_robot` para aislar una instancia, colocarla ante la cámara e inmovilizar su IA sin daño ni persistencia;
- `&qaEnemyState=<estado-o-clip>` para fijar un estado de IA (`DIVE`, `BITE`, `DIZZY`…) o un clip (`idle`, `hurt`, `defeat`); `&qaEnemyFrame=<n>` fija su frame local y limita valores altos al último disponible;
- `&qaOneHit=1` en `BossScene` coloca a Babito Corrupto a un golpe y entra pronto en `RECOVER`; en `DarknessBossScene` coloca a La Oscuridad a un golpe y adelanta su primera exposición;
- `&debugAI=1` en cualquiera de los tres niveles muestra la etiqueta del estado actual de cada enemigo.

Ejemplos: `http://localhost:5173/?qa=GameScene&qaLevel=jungla&qaCheckpoint=ruinas`, `http://localhost:5173/?qa=DarknessBossScene&qaOneHit=1` y `http://localhost:5173/?qa=GameScene&qaLevel=city&qaEnemy=ive_robot&qaEnemyState=SCYTHE_ATTACK&qaEnemyFrame=4&debugAI=1`.

## Referencias de implementación

| Contrato | Fuente principal |
|---|---|
| Landing, diálogos y carga diferida | [main.js](../src/main.js) |
| Configuración Phaser, audio y activación/suspensión | [gameBoot.js](../src/gameBoot.js) |
| Composiciones y arreglos musicales | [musicTracks.js](../src/game/musicTracks.js) |
| Secuenciador Web Audio y efectos | [AudioSystem.js](../src/game/AudioSystem.js) |
| Persistencia de mute y estilo musical | [AudioPreferences.js](../src/game/AudioPreferences.js) |
| Carga, animaciones y rutas QA | [BootScene.js](../src/scenes/BootScene.js) |
| Entrada y estado del jugador | [PlayerController.js](../src/game/PlayerController.js) |
| Proyectiles y poderes | [PowerSystem.js](../src/game/PowerSystem.js) |
| Anclaje de carteles y decoración | [surfaceAnchoring.js](../src/game/surfaceAnchoring.js) |
| Estados de enemigos | [EnemyController.js](../src/game/EnemyController.js) |
| Límites, rebotes y dirección estable de enemigos | [EnemyBehavior.js](../src/game/EnemyBehavior.js) |
| Avatar por capas y construcción canónica | [BabitoAvatar.js](../src/game/BabitoAvatar.js), [createTextures.js](../src/game/createTextures.js) y [babito-v5.md](../art/production/babito-v5.md) |
| Animaciones de enemigos | [EnemyAnimations.js](../src/game/EnemyAnimations.js) |
| Animación del boss | [BossAnimator.js](../src/game/BossAnimator.js) |
| Combate de La Oscuridad y geometría de meteoritos | [DarknessBossScene.js](../src/scenes/DarknessBossScene.js) y [bossPatternGeometry.js](../src/game/bossPatternGeometry.js) |
| Botones, foco y accesibilidad | [Button.js](../src/ui/Button.js) |
| Guardado y migración | [SaveStore.js](../src/state/SaveStore.js) |
