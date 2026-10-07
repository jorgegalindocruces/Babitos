# BABITOS - Game Design v1.0

## Premisa

Plataformas 2D familiar y colorido. Los Bicharracos roban las Manzanas
de Poder del Árbol de Poder. El jugador crea un Babito, elige un poder
inicial y atraviesa tres mundos para recuperarlas.

## Flujo

Título -\> Babito Creator -\> Elegir poder -\> Intro -\> Babilandia -\>
Babito Corrupto -\> Tienda -\> Jungla -\> La Oscuridad -\> Tienda -\>
Ciudad Bicharraca -\> Boss Total -\> Final.

## Creator

Capas independientes: body/skin, eyes, mouth, arms, headAccessory,
glasses, neckAccessory. Ojos y bocas NUNCA son una cara prefabricada.
Catálogos ampliables con opciones gratuitas y otras comprables. Tamaños
small/normal/large son cosméticos: mismo hitbox, daño, velocidad y
ventajas. `¡BABITO LOCO!` randomiza opciones desbloqueadas.

## Poder inicial

FUEGO: proyectil recto equilibrado. RAYO: rápido, alcance moderado.
ROCA: parábola, lento y potente. Poderes no se compran. Monedas =
apariencia; Manzanas = progresión/poder.

## Enemigos canónicos

COME: rojo, boca enorme, ojos saltones, más grande que el Babito,
terrestre y muerde. VUELA: murcielaguito morado, más pequeño que el
Babito, aparece solo o en parejas, vuela y ataca en picado. DA VUELTAS:
bola verde con pinchos, rueda/rebota y después queda mareado. Cada uno
puede soltar 0, 1 o 2 monedas.

## Bosses

1.  BABITO CORRUPTO: Babito corrompido; fuego/energía, proyectiles y
    embestida; al perder vuelve a ser normal.
2.  LA OSCURIDAD: entidad de sombra; viaja por oscuridad y se vuelve
    vulnerable con luz.
3.  BOSS TOTAL: jefe de los Bicharracos; combina poderes y pierde
    capacidades al perder manzanas.

## Tienda

Señor Empanadilla y Señor Pingüino son BUENOS y son tenderos. Nunca son
enemigos ni bosses. Venden cosméticos y permiten equiparlos.

## Mundos

1.  Babilandia atacada: ciudad de Babitos, luminosa pero dañada.
2.  Jungla: ramas, lianas, ruinas, verticalidad y progresión hacia
    oscuridad.
3.  Ciudad Bicharraca: industrial, máquinas, tuberías, trampas y
    fortaleza final.

`worlds_environment_reference_only.png` define SOLO entorno/paleta. Sus
enemigos dibujados no son canónicos.

## Árbol de Poder

Sin poder: muy triste, copa apagada, ramas caídas, huecos vacíos, cara
triste y ambiente desaturado. Con poder: luminoso, verde, feliz y con
manzanas recuperadas.

## Moneda

Circular, basada en `coin_original.jpeg`, B central y marcas laterales.
Rebota al caer y da feedback al recoger.

## HUD y estados

HUD: corazones, monedas, poder activo y barra de boss cuando proceda.
Daño: breve invulnerabilidad y parpadeo. Muerte: respawn en checkpoint
sin violencia gráfica. Pausa: continuar, controles, título. Game over:
reintentar.

## Final

Árbol restaurado, celebración en Babilandia y Babito con su
personalización actual.
