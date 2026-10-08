# Criterios de aceptación

Estos criterios validan el vertical slice 0.2 descrito en [INTERACTIONS.md](INTERACTIONS.md); [CHANGELOG.md](CHANGELOG.md) relaciona cada ampliación con su commit. La Jungla, Ciudad Bicharraca, La Oscuridad, Boss Total y el final no forman parte del contenido jugable exigido en esta versión.

## Build y arranque

- `npm ci`, `npm test` y `npm run build` terminan sin errores.
- La compilación abre desde una ruta relativa de GitHub Pages y carga sin backend.
- Con espacio suficiente, el canvas interno y su rectángulo CSS miden exactamente 960 × 540; no existe ampliación fraccionaria de escritorio. En una pantalla menor conserva 16:9 sin overflow horizontal o vertical.
- Silkscreen y Nunito se solicitan antes de crear Phaser. Títulos, cuerpo, etiquetas, botones y avisos usan la política común de resolución de texto.
- Si un fondo raster no carga, su escena conserva un fallback visible y jugable.
- Una partida ausente, antigua o parcialmente inválida se normaliza sin impedir el arranque.

## Flujo y persistencia

- El recorrido nuevo funciona: Título → Creador → Poder → Intro → Babilandia → Babito Corrupto → Tienda → Mapa.
- `CONTINUAR` abre la última pantalla válida guardada.
- `NUEVA AVENTURA` exige confirmación; reinicia historia, checkpoint y poder, pero conserva Babito, nombre, tamaño, monedas, cosméticos y recompensas ya cobradas.
- La selección de poder, checkpoint, monedas, compras, equipamiento y progreso sobreviven a una recarga.
- La recompensa de 30 monedas de Babito Corrupto solo se puede reclamar una vez, incluso al comenzar otra aventura.
- Mapa permite rejugar Babilandia, volver a Tienda o Título y abrir los avances estáticos de Jungla y Ciudad; cada avance permite volver al Mapa.

## Menús e input

- Cada botón responde en toda su superficie visible con clic principal y toque; soltar fuera cancela la acción y un botón deshabilitado no activa nada.
- `Tab` y `Mayús + Tab` recorren los botones expuestos; `Enter` y `Espacio` activan el botón enfocado.
- El foco es visible, los botones tienen nombre accesible y los cambios principales se anuncian en la región viva.
- En los modales de Título y las capas de pausa/Game Over, los controles inferiores quedan inactivos y el foco pasa a una acción superior; al cerrarlos vuelve al menú o al gameplay.
- Teclas mantenidas o usadas para cerrar/reanudar no provocan un salto, ataque o clic adicional al regresar al gameplay.
- El campo de nombre acepta un máximo de 24 caracteres y escribir en él no activa atajos del juego.
- `M` alterna el audio fuera de campos editables; el botón `AUDIO` refleja el mute, conserva la preferencia y muestra `AUDIO N/D` si Web Audio no está disponible.
- En dispositivos táctiles aparecen pads de izquierda, derecha, salto y ataque. No se exigen controles de mando en esta versión.

## Creador y poder

- Ojos y boca son capas distintas; se pueden combinar las siete categorías de apariencia.
- Los selectores recorren solo opciones desbloqueadas y equipan el resultado inmediatamente.
- Pequeño, normal y grande cambian el render, nunca hitbox o estadísticas.
- `¡BABITO LOCO!` usa solo cosméticos desbloqueados.
- Fuego, Rayo y Roca se pueden seleccionar y sus diferencias de velocidad, trayectoria, cooldown y daño coinciden con [game-data.json](../src/data/game-data.json).
- No se puede continuar sin elegir un poder y los poderes no se compran con Babicoins.
- `S`, `SALTAR INTRO` y `ENTRAR EN BABILANDIA` llegan a la Fase 1; entrar en Intro sin poder devuelve a la selección.

## Babilandia

- `A`/`D` o flechas mueven; `W`, `↑` o `Espacio` saltan; `J` o `X` atacan.
- El salto conserva coyote time, buffer y altura variable; el daño aplica retroceso, parpadeo e invulnerabilidad temporal.
- El HUD muestra 3 corazones máximos, Babicoins, poder y teclas, encuentros y pausa.
- Un proyectil que toca terreno se destruye. Ningún poder destruye, oculta, desplaza ni desactiva el suelo o las plataformas.
- El fondo es decorativo: la colisión depende exclusivamente de plataformas físicas independientes.
- Cada cartel tutorial tiene una superficie física bajo el poste, su base coincide exactamente con esa superficie y el texto queda dentro de la tabla. Ninguno atraviesa terreno, flota o queda oculto por DA VUELTAS/checkpoints.
- COME es mayor que el Babito y solo daña al morder; VUELA es menor, aparece solo y en pareja y solo daña en picado; DA VUELTAS solo daña al girar y solo recibe daño mientras está mareado.
- Un enemigo en `hurt` termina su reacción antes de reanudar la IA: no cambia a un ataque, no daña ni recibe impactos repetidos durante ese intervalo. Golpear a COME o VUELA durante una acción ofensiva conduce a `RECOVER` o `RETURN`.
- VUELA atraviesa las plataformas durante `DIVE` y `RETURN`, conserva los límites del mundo y nunca queda bloqueado bajo geometría de terreno.
- Cada enemigo puede soltar 0, 1 o 2 monedas y recoger una suma exactamente una.
- El portal permanece cerrado hasta derrotar los seis encuentros e informa cuántos faltan.
- Un checkpoint cura por completo y se guarda.
- Una caída fuera de invulnerabilidad resta un corazón y reaparece en el checkpoint con la vida restante. Durante la invulnerabilidad de respawn no resta otro; llegar a cero abre Game Over y `REINTENTAR` reaparece con vida completa.

## Pausa

- `P`, `Esc` y el botón del HUD pausan Babilandia y el boss cuando no hay muerte o transición en curso.
- Pausar congela física, tweens, temporizadores, animaciones y reloj de gameplay.
- `CONTINUAR` reanuda el mismo estado; `TÍTULO` abandona la fase.
- `Espacio` sigue reservado al salto en gameplay y no activa accidentalmente `PAUSA`.

## Babito Corrupto

- La arena conserva suelo y plataformas estables antes, durante y después de disparar.
- El boss se llama Babito Corrupto, tiene 16 de vida y ejecuta `FIREBALL`, `FROM_ABOVE` y `FURY_CHARGE` con avisos previos legibles.
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

## Animación y arte

- El Babito distingue `idle`, `walk`, `run`, `jump`, `fall`, `attack`, `hurt` y `dead` mediante poses y siluetas diferentes, sin cambiar su hitbox, perder sus capas equipadas ni despegarse del suelo al cambiar de tamaño.
- Sus siete capas permanecen sincronizadas durante los 51 frames; caminar no reutiliza las poses de correr y ataque, daño y KO terminan en un frame final legible.
- Cada estado de COME, VUELA y DA VUELTAS tiene un mapping explícito a un clip existente. Cambiar entre estados que comparten clip no lo reinicia; `hurt` y `defeat` son one-shot, y anticipación/mordisco de COME no recorren la misma secuencia desde el principio. El boss cambia de pose entre patrones, `RECOVER` y purificación.
- El atlas raster de VUELA contiene 36 celdas de 256 × 256 con contenido, margen transparente y alpha 0/255; se renderiza a 64 × 64 sin escala fraccionaria ni deformación.
- Pausar congela el frame de animación y reanudar continúa sin desincronizarlo.
- Babilandia, arena del boss y Ciudad Bicharraca respetan el encuadre 16:9 y no dibujan falsos suelos interactivos en el primer plano.

## Límites conocidos aceptados

- Jungla y Ciudad son avances, no fases jugables; Boss 2, Boss 3 y final son roadmap.
- DA VUELTAS mantiene un spritesheet procedural; VUELA y COME ya usan arte raster de producción.
- Audio se genera con Web Audio y no incluye control de volumen.
- Los botones y anuncios principales tienen soporte de teclado/lector, pero no se declara conformidad de accesibilidad completa para todo el texto dibujado en canvas.
