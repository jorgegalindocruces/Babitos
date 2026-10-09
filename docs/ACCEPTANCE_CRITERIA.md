# Criterios de aceptación

Estos criterios validan el vertical slice 0.2 descrito en [INTERACTIONS.md](INTERACTIONS.md); [CHANGELOG.md](CHANGELOG.md) relaciona cada ampliación con su commit. La Jungla y La Oscuridad (Fase 2) son jugables; Ciudad Bicharraca, Boss Total y el final no forman parte del contenido jugable exigido en esta versión.

## Build y arranque

- `npm ci`, `npm test` y `npm run build` terminan sin errores.
- La compilación abre desde una ruta relativa de GitHub Pages y carga sin backend.
- La landing carga sin Phaser (menos de 10 kB de JavaScript propio) y sin overflow horizontal a 390 px; todas sus imágenes resuelven y reservan sus dimensiones reales. `JUGAR` abre el diálogo y arranca el juego; `Esc` pausa sin cerrar; `✕` congela el estado y devuelve el teclado a la página; cerrar durante la primera carga no deja el juego avanzando ni tomando foco detrás de la portada. Reabrir gameplay espera en `PAUSA`; reabrir un menú continúa ese mismo menú.
- El visor de arte abre cada marco ampliable, actualiza imagen/caption y se cierra con `✕`, `Esc` nativo o clic en el backdrop. El control `⛶` solicita pantalla completa; en móvil el diálogo ocupa el viewport y en vertical muestra la recomendación de girar.
- Con espacio suficiente, el canvas interno y su rectángulo CSS miden exactamente 960 × 540; no existe ampliación fraccionaria de escritorio. En una pantalla menor conserva 16:9 sin overflow horizontal o vertical.
- Silkscreen y Nunito se solicitan antes de crear Phaser. Títulos, cuerpo, etiquetas, botones y avisos usan resolución interna de hasta 2× y filtro linear, incluso después de `setText`, `setColor`, `setFontSize` o la llegada tardía de una fuente; el arte conserva nearest.
- Ningún `fontSize` visible de escenas, menús, HUD, carteles, botones o avisos es menor de 12 px. Entre 12 y 15 px el contorno automático no supera 1 px, y el texto sigue dentro de su panel al cambiar de página o estado.
- Si un fondo raster no carga, su escena conserva un fallback visible y jugable.
- Una partida ausente, antigua o parcialmente inválida se normaliza sin impedir el arranque.

## Flujo y persistencia

- El recorrido completo funciona: Landing → diálogo → Título → Creador → Poder → Intro → Babilandia → Babito Corrupto → Tienda → Mapa → La Jungla → La Oscuridad → Tienda → Mapa.
- `CONTINUAR` abre la última pantalla válida guardada.
- `NUEVA AVENTURA` exige confirmación; reinicia historia, checkpoint y poder, pero conserva Babito, nombre, tamaño, monedas, cosméticos y recompensas ya cobradas.
- La selección de poder, checkpoint, monedas, compras, equipamiento y progreso sobreviven a una recarga.
- La recompensa de 30 monedas de Babito Corrupto solo se puede reclamar una vez, incluso al comenzar otra aventura.
- Tienda muestra `CONTINUAR AL MAPA` como CTA principal y persiste `map` antes de iniciar la transición.
- Mapa presenta Babilandia como una acción jugable, permite rejugarla desde `start` sin borrar poder, finalización ni colección, vuelve a Tienda o Título y abre el avance estático de Ciudad, que permite volver al Mapa.
- La Jungla aparece bloqueada hasta completar la Fase 1; después se juega desde `start`. `CONTINUAR` reanuda La Jungla en su checkpoint guardado o La Oscuridad desde el inicio del combate.
- Vencer a La Oscuridad guarda `boss2Defeated` y `phase2Complete`, concede 40 monedas una sola vez y lleva a Tienda y Mapa, donde La Jungla figura como completa y rejugable.

## La Jungla y La Oscuridad

- La Jungla conserva 6400 px de ancho, cuatro checkpoints (`start`, `lianas`, `ruinas`, `penumbra`), ocho encuentros, 30 Babicoins colocadas, dos setas, siete carteles y el portal en x = 6230; el velo crece de x = 4000 a x = 6000.
- Todos los fosos de La Jungla se saltan (≤ 160 px) o se cruzan por puentes; caer al agua resta un corazón y devuelve al último checkpoint.
- COME y DA VUELTAS nunca caen a un foso ni se atascan contra un pilar de ruinas; un enemigo que acabara bajo el mundo vuelve a su posición inicial.
- Una seta saltarina lanza al Babito al caer sobre ella: unos 250–270 px manteniendo el salto y al menos el 60 % sin mantenerlo. Toda plataforma elevada es alcanzable.
- El velo de oscuridad del último tramo nunca oculta al Babito: un halo lo acompaña.
- La Oscuridad solo recibe daño mientras está `EXPUESTA`; en la sombra los disparos la atraviesan sin consumirse. Un farolillo encendido no bloquea disparos.
- Cada patrón muestra un aviso previo; los meteoritos conservan 150 px entre centros (al menos 90 px libres entre sus marcas) también junto a los bordes, donde se desplaza la tanda completa sin comprimirla, y la zona oscura avisa antes de brotar.
- Un bot con 250 ms de reacción vence el combate con Fuego, Rayo y Roca, y completa La Jungla con los tres poderes.

## Menús e input

- Cada botón responde en toda su superficie visible con clic principal y toque; soltar fuera cancela la acción y un botón deshabilitado no activa nada.
- `Tab` y `Mayús + Tab` recorren los botones expuestos; `Enter` y `Espacio` activan el botón enfocado.
- El foco es visible, los botones tienen nombre accesible y los cambios principales se anuncian en la región viva.
- En los modales de Título y las capas de pausa/Game Over, los controles inferiores quedan inactivos y el foco pasa a una acción superior; al cerrarlos vuelve al menú o al gameplay.
- Teclas mantenidas o usadas para cerrar/reanudar no provocan un salto, ataque o clic adicional al regresar al gameplay.
- El campo de nombre acepta un máximo de 24 caracteres y escribir en él no activa atajos del juego.
- `M` alterna el audio fuera de campos editables; el botón `AUDIO` refleja el mute, conserva la preferencia y muestra `AUDIO N/D` si Web Audio no está disponible.
- En dispositivos táctiles aparecen cinco pads: izquierda, derecha, bajar (`▼`), salto y ataque. No se exigen controles de mando en esta versión.

## Creador y poder

- Ojos y boca son capas distintas; se pueden combinar las siete categorías de apariencia.
- Los selectores recorren solo opciones desbloqueadas y equipan el resultado inmediatamente.
- Pequeño, normal y grande muestran cajas de render de 64, 80 y 96 px mediante escalas exactas `0.8`, `1` y `1.2` sobre una fuente de 80 px; el tamaño normal conserva los píxeles fuente 1:1. Nunca cambian la hitbox de 28 × 40 ni las estadísticas y conservan una línea de pies común.
- `¡BABITO LOCO!` usa solo cosméticos desbloqueados.
- Fuego, Rayo y Roca se pueden seleccionar y sus diferencias de velocidad, trayectoria, cooldown y daño coinciden con [game-data.json](../src/data/game-data.json).
- No se puede continuar sin elegir un poder y los poderes no se compran con Babicoins.
- `S`, `SALTAR INTRO` y `ENTRAR EN BABILANDIA` llegan a la Fase 1; entrar en Intro sin poder devuelve a la selección.

## Babilandia

- `A`/`D` o flechas mueven; `W`, `↑` o `Espacio` saltan; `S` o `↓` bajan de una plataforma elevada; `J` o `X` atacan.
- El salto conserva coyote time (110 ms), buffer (130 ms) y altura variable: el salto completo sube unos 138 px, un toque aproximadamente la mitad y la caída es más rápida que la subida. Cambiar de dirección no produce derrape y soltar la dirección en el suelo frena en menos de 24 px.
- Movimiento y salto miden lo mismo a 60 y a 144 Hz.
- Todas las plataformas elevadas de Babilandia son alcanzables desde el suelo o desde otra plataforma, con al menos un 10 % de margen de altura.
- El daño aplica retroceso con un pequeño salto, una breve congelación, bloqueo horizontal de 220 ms, parpadeo e invulnerabilidad temporal.
- El HUD muestra 3 corazones máximos, Babicoins, poder y teclas, encuentros y pausa.
- El suelo base permanece sólido al saltar, caer o aproximarse de lado.
- Una plataforma elevada se atraviesa desde abajo durante el ascenso, no bloquea lateralmente a un cuerpo que ya está debajo y sostiene al Babito al descender desde arriba o permanecer quieto sobre ella. Con `S`, `↓` o el pad `▼` el Babito cae a través de la plataforma en la que está de pie, incluso con un toque de un solo frame; sobre el suelo base no ocurre nada, y la plataforma vuelve a sostenerlo al saltar de nuevo encima.
- Un proyectil que toca terreno se destruye. Ningún poder destruye, oculta, desplaza ni desactiva el suelo o las plataformas.
- El fondo es decorativo: la colisión depende exclusivamente de plataformas físicas independientes.
- Cada cartel tutorial tiene una superficie física bajo el poste, su base coincide exactamente con esa superficie y el texto queda dentro de la tabla. Ninguno atraviesa terreno, flota o queda oculto por DA VUELTAS/checkpoints.
- COME es mayor que el Babito, apoya sus pies exactamente sobre suelo o plataforma en `walk`, `WINDUP` y `BITE`, y solo daña al morder; VUELA es menor, aparece solo y en pareja y solo daña en picado; DA VUELTAS solo daña al girar y solo recibe daño mientras está mareado.
- Un enemigo en `hurt` termina su reacción antes de reanudar la IA: no cambia a un ataque, no daña ni recibe impactos repetidos durante ese intervalo. Golpear a COME o VUELA durante una acción ofensiva conduce a `RECOVER` o `RETURN`.
- VUELA atraviesa las plataformas durante `DIVE` y `RETURN`, conserva los límites del mundo y nunca queda bloqueado bajo geometría de terreno.
- Cada enemigo puede soltar 0, 1 o 2 monedas y recoger una suma exactamente una.
- El portal permanece cerrado hasta derrotar los seis encuentros e informa cuántos faltan.
- Abrir la pausa o `GAME OVER` retira cualquier aviso flotante que pudiera quedar encima del panel.
- Un checkpoint cura por completo y se guarda.
- Reaparecer en un checkpoint devuelve a su origen a los enemigos vivos cercanos; ningún checkpoint está dentro de la patrulla más el rango de persecución de un COME.
- Las 25 Babicoins colocadas suman una vez por guardado; en una rejugada aparecen translúcidas y no suman. La pausa muestra cuántas se han encontrado.
- DA VUELTAS se orienta hacia el Babito durante su anticipación y solo la inicia a menos de 460 px.
- Tocar el portal sellado indica cuántos enemigos faltan, de qué tipo y que están detrás.
- Una caída fuera de invulnerabilidad resta un corazón y reaparece en el checkpoint con la vida restante. Durante la invulnerabilidad de respawn no resta otro; llegar a cero abre Game Over y `REINTENTAR` reaparece con vida completa.

## Pausa

- `P`, `Esc` y el botón del HUD pausan Babilandia, La Jungla y ambos combates de boss cuando no hay muerte o transición en curso.
- Pausar congela física, tweens, temporizadores, animaciones y reloj de gameplay.
- `CONTINUAR` reanuda el mismo estado; `TÍTULO` abandona la fase.
- `Espacio` sigue reservado al salto en gameplay y no activa accidentalmente `PAUSA`.

## Babito Corrupto

- La arena conserva suelo y plataformas estables antes, durante y después de disparar; su suelo es sólido y las plataformas elevadas se atraviesan al ascender y sostienen al caer.
- El boss se llama Babito Corrupto, tiene 16 de vida y ejecuta `FIREBALL`, `FROM_ABOVE` y `FURY_CHARGE` con avisos previos legibles.
- Cada bola de `FIREBALL` se carga 300 ms de forma visible, viaja a la altura de los pies del boss y deja tiempo para aterrizar antes de la siguiente; ninguna bola castiga un salto pedido por el aviso.
- La embestida no daña por contacto cuando el boss ya está detenido.
- Al terminar cada patrón entra 1,9 s en `RECOVER`. Solo entonces recibe daño; fuera de esa ventana el impacto se bloquea con feedback.
- Fuego y Rayo restan 1; Roca resta 2.
- El HUD muestra corazones, poder, barra/vida, estado actual del boss y pausa.
- Llegar a cero corazones y elegir `REINTENTAR` reinicia el combate completo. El suelo continuo y los límites impiden una caída fuera de la arena.
- Ganar purifica al boss, reproduce el cierre, concede la recompensa idempotente y permite continuar a Tienda.

## Tienda

- Señor Empanadilla y Señor Pingüino aparecen como aliados y nunca como enemigos.
- El catálogo muestra seis objetos por página, previsualiza cada uno sobre el Babito y pagina en ambas direcciones de forma circular.
- Una opción asequible se compra y equipa en una acción; una desbloqueada se equipa sin coste; si faltan monedas se informa la cantidad exacta.
- Comprar descuenta una sola vez y el estado persiste tras recargar.
- El puesto muestra `PREMIOS DE 1.ª VICTORIA`, con Babito Corrupto (+30) y La Oscuridad (+40) por separado y estado `PENDIENTE`/`COBRADA` derivado de `claimedRewards` incluso al entrar desde el Mapa; las dos líneas caben dentro del panel a 12 px.

## Animación y arte

- El Babito base sin accesorios se reconoce como el aprobado: su diseño lógico de 48 unidades se rasteriza a 64 px reales con detalle 4/3 dentro de una celda de 80 px; el cuerpo del raster mide 47 × 45 px, usa `rx = ry = 23`, recorta un píxel en cada extremo vertical y presenta una corona plana sin ápice. Los ojos normales miden 4 × 9 px con 11 px de separación, la sonrisa y las mejillas son compactas, las aletas de reposo caen a los lados con un ancho total no superior a 1,4 veces el cuerpo y los pies quedan visibles. La referencia aprobada manda en silueta, rostro y proporciones, pero no en su antigua banda inferior: en todas las paletas y los 51 frames el cuerpo omite `palette.shade`; barriga, raíces de los pies y pies comparten `palette.main`, y el contorno inferior se abre en dos raíces sin formar cinturilla, calzoncillo o pantalón. El cian usa `#7CDBF9`, luz `#A8EDFF`, rubor `#FF7196` y contorno `#07111E`; `#2BBFE5` puede seguir declarado como sombra de paleta, pero no aparece en el cuerpo.
- El Babito distingue `idle`, `walk`, `run`, `jump`, `fall`, `attack`, `hurt` y `dead` mediante poses y siluetas diferentes, sin cambiar su hitbox, perder sus capas equipadas ni despegarse del suelo al cambiar de tamaño.
- Sus siete capas permanecen sincronizadas durante los 51 frames; caminar no reutiliza las poses de correr y ataque, daño y KO terminan en un frame final legible.
- La exportación `public/assets/landing/babito.png` mide 320 × 320, usa transparencia binaria y escala nearest 4× desde la celda fuente de 80 px: cada bloque visible de 4 × 4 conserva un único RGBA y contiene la paleta canónica.
- Cada estado de COME, VUELA y DA VUELTAS tiene un mapping explícito a un clip existente. Cambiar entre estados que comparten clip no lo reinicia; `hurt` y `defeat` son one-shot, y anticipación/mordisco de COME no recorren la misma secuencia desde el principio. Babito Corrupto cambia de pose entre patrones, `RECOVER` y purificación. La Oscuridad ondula en sombra, se desvanece en `SHIFT`, anticipa rasante/meteoritos/charco/apagado, muestra anillo dorado en `EXPOSED` y se disipa en luciérnagas.
- El atlas raster de VUELA contiene 36 celdas de 256 × 256 con contenido, margen transparente y alpha 0/255; se renderiza a 64 × 64 sin escala fraccionaria ni deformación.
- Pausar congela el frame de animación y reanudar continúa sin desincronizarlo.
- Babilandia, la arena de Babito Corrupto y Ciudad Bicharraca respetan el encuadre raster 16:9; La Jungla y la arena de La Oscuridad mantienen su composición procedural. Ninguno dibuja falsos suelos interactivos en el primer plano y toda colisión procede de geometría separada.

## Límites conocidos aceptados

- Ciudad es un avance, no una fase jugable; Boss 3 y el final son roadmap.
- La Jungla y La Oscuridad usan arte procedural; la Manzana de Poder recuperada todavía no desbloquea un poder nuevo.
- DA VUELTAS mantiene un spritesheet procedural; VUELA y COME ya usan arte raster de producción.
- Audio se genera con Web Audio y no incluye control de volumen.
- Los botones y anuncios principales tienen soporte de teclado/lector, pero no se declara conformidad de accesibilidad completa para todo el texto dibujado en canvas.
