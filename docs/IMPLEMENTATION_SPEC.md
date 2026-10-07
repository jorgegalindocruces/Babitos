# IMPLEMENTATION SPEC

Stack: TypeScript + Phaser 3 + Vite + localStorage + GitHub Pages, sin
backend. Resolución lógica recomendada: 960x540, FIT, pixelArt=true,
gameplay horizontal.

Player: idle/run/jump/fall/attack/hurt/dead. Small/normal/large cambia
render, NO hitbox. Combate: un botón usa poder activo; cooldowns y daño
configurables. Fuego lineal; Rayo lineal rápido; Roca con
parábola/gravedad.

Máquinas de estados: - COME: PATROL \> CHASE \> WINDUP \> BITE \>
RECOVER - VUELA: AIR_PATROL \> TARGET \> WINDUP \> DIVE \> RETURN;
spawner count 1 o 2 - DA_VUELTAS: PATROL \> WINDUP \> SPIN \> DIZZY

Drops: RNG configurable 0/1/2 monedas, pequeño impulso y pickup por
overlap. Persistencia versionada en `babitos.save.v1`: nombre, capas,
tamaño, poderes, monedas, desbloqueos, equipamiento y progreso.

Primer vertical slice obligatorio: Creator \> elegir poder \> Babilandia
\> tres enemigos \> monedas \> Boss 1 \> tienda. Fases 2/3 pueden
empezar como placeholders navegables.
