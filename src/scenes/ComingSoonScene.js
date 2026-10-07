import Phaser from 'phaser';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { TEXTURE_KEYS, createTextures } from '../game/createTextures.js';
import { createButton } from '../ui/Button.js';
import {
  addPixelBackground,
  announce,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
  CHARACTER_ASSETS,
} from '../ui/sceneHelpers.js';
import { createAmbientMotes, fadeIn, transitionToScene } from '../ui/effects.js';

const WORLDS = Object.freeze({
  jungle: Object.freeze({
    theme: 'jungle',
    title: 'LA JUNGLA',
    number: 'MUNDO 2',
    tagline: 'NATURALEZA, MISTERIO Y ALTURA',
    description: 'Lianas, cascadas y ruinas antiguas esconden la siguiente manzana de poder.',
    features: ['PUENTES DE CUERDA', 'CASCADAS', 'RUINAS ANTIGUAS'],
    accent: 0x89e85c,
    mote: 0xc9ff77,
  }),
  city: Object.freeze({
    theme: 'city',
    title: 'CIUDAD BICHARRACA',
    number: 'MUNDO 3',
    tagline: 'TECNOLOGÍA, CONTAMINACIÓN Y CAOS',
    description: 'Una ciudad de fábricas, láseres y máquinas aguarda tras el humo de neón.',
    features: ['TUBERÍAS Y ENGRANAJES', 'LÁSERES', 'GRÚAS Y NEÓN'],
    accent: 0xff6686,
    mote: 0x42e8ec,
  }),
});

export class ComingSoonScene extends Phaser.Scene {
  constructor() {
    super('ComingSoonScene');
  }

  init(data = {}) {
    this.worldId = data.world === 'city' || data.world === 'jungle' ? data.world : null;
  }

  create() {
    createTextures(this);
    this.store = this.registry.get('saveStore');
    if (!this.store?.getState) {
      throw new Error('ComingSoonScene requires saveStore in the Phaser registry.');
    }

    const snapshot = this.store.getState();
    if (!this.worldId) this.worldId = snapshot.progress.scene === 'city' ? 'city' : 'jungle';
    const world = WORLDS[this.worldId];

    addPixelBackground(this, world.theme);
    createAmbientMotes(this, {
      count: this.worldId === 'city' ? 24 : 19,
      color: world.mote,
      minAlpha: 0.14,
      maxAlpha: 0.52,
      depth: 2,
      seed: `coming-soon-${this.worldId}`,
    });

    createTitle(this, world.title, 480, 40, {
      fontSize: this.worldId === 'city' ? 34 : 40,
      depth: 40,
    });
    createLabel(this, `${world.number} · PRÓXIMAMENTE`, 480, 82, {
      fontSize: 14,
      color: world.accent,
      depth: 40,
    });

    createPanel(this, 480, 283, 814, 356, {
      depth: 10,
      fillColor: this.worldId === 'city' ? 0x19182f : 0x0d3028,
      fillAlpha: 0.94,
      strokeColor: world.accent,
      highlightColor: world.mote,
      radius: 18,
    });
    createPanel(this, 286, 284, 350, 284, {
      depth: 13,
      fillColor: this.worldId === 'city' ? 0x111a2b : 0x123b2d,
      fillAlpha: 0.9,
      strokeColor: this.worldId === 'city' ? 0x5c486d : 0x487f4f,
      radius: 14,
    });

    if (this.worldId === 'city') {
      this.createCityPreview(snapshot);
    } else {
      this.createJunglePreview(snapshot);
    }

    createLabel(this, world.tagline, 666, 159, {
      fontSize: 12,
      color: world.accent,
      wordWrapWidth: 315,
      depth: 35,
    });
    createBodyText(this, world.description, 666, 211, {
      fontSize: 18,
      color: '#f1f8ff',
      wordWrapWidth: 300,
      lineSpacing: 5,
      depth: 35,
    });

    world.features.forEach((feature, index) => {
      const y = 284 + index * 42;
      const bullet = this.add.rectangle(535, y, 8, 8, world.accent).setDepth(35);
      bullet.setStrokeStyle(2, 0xffffff, 0.55);
      createLabel(this, feature, 553, y, {
        fontSize: 10,
        originX: 0,
        color: 0xd8f5ff,
        depth: 35,
      });
    });

    createBodyText(this, 'La aventura de esta versión termina en la Fase 1.\n¡La luz seguirá viajando muy pronto!', 666, 405, {
      fontSize: 13,
      color: '#b8d5df',
      wordWrapWidth: 300,
      depth: 35,
    });

    createButton(this, {
      x: 480,
      y: 498,
      width: 270,
      height: 46,
      label: '‹ VOLVER AL MAPA',
      variant: 'primary',
      fontSize: '14px',
      accessibleLabel: 'Volver al mapa de mundos',
      onPress: () => transitionToScene(this, 'WorldMapScene', {}, {
        announcement: 'Volviendo al mapa de mundos',
      }),
    });

    announce(`${world.title}, ${world.number}. Próximamente.`);
    fadeIn(this);
  }

  createJunglePreview(snapshot) {
    const jungle = this.add.graphics().setDepth(20);
    jungle.fillStyle(0x0a251d, 1);
    jungle.fillRect(128, 156, 316, 254);
    jungle.fillStyle(0x23663e, 1);
    jungle.fillRect(144, 168, 29, 185);
    jungle.fillRect(397, 173, 29, 180);
    jungle.fillStyle(0x69c948, 1);
    jungle.fillCircle(153, 165, 45);
    jungle.fillCircle(209, 154, 54);
    jungle.fillCircle(365, 155, 52);
    jungle.fillCircle(420, 169, 42);
    jungle.fillStyle(0x2e8d4f, 1);
    jungle.fillCircle(281, 145, 62);
    jungle.fillStyle(0x64dcef, 0.9);
    jungle.fillRect(340, 189, 29, 161);
    jungle.fillStyle(0xb9f4ff, 0.65);
    jungle.fillRect(346, 189, 7, 156);
    jungle.lineStyle(5, 0x315d31, 1);
    jungle.beginPath();
    jungle.moveTo(192, 139);
    jungle.lineTo(202, 245);
    jungle.moveTo(388, 137);
    jungle.lineTo(376, 246);
    jungle.strokePath();

    this.add.tileSprite(286, 365, 316, 32, TEXTURE_KEYS.tilePlatform)
      .setDepth(24);
    const treeTexture = this.textures.exists(CHARACTER_ASSETS.powerTreeSadV2.key)
      ? CHARACTER_ASSETS.powerTreeSadV2.key
      : TEXTURE_KEYS.powerTreeSad;
    this.add.image(381, 318, treeTexture)
      .setDisplaySize(82, 82)
      .setDepth(25);
    this.add.image(172, 337, TEXTURE_KEYS.propFlower)
      .setScale(0.8)
      .setDepth(26);

    const avatar = new BabitoAvatar(this, 247, 337, snapshot.appearance, snapshot.size)
      .setDepth(30);
    avatar.setFacing(1).setMotion('idle');
    this.add.image(316, 255, TEXTURE_KEYS.enemyVuela)
      .setDisplaySize(54, 54)
      .setAlpha(0.85)
      .setDepth(29);
  }

  createCityPreview(snapshot) {
    const city = this.add.graphics().setDepth(20);
    city.fillStyle(0x111525, 1);
    city.fillRect(128, 156, 316, 254);
    city.fillStyle(0x252a41, 1);
    city.fillRect(139, 222, 67, 142);
    city.fillRect(213, 183, 77, 181);
    city.fillRect(300, 207, 54, 157);
    city.fillRect(361, 169, 72, 195);
    city.fillStyle(0xff4f6f, 0.9);
    for (let x = 151; x <= 412; x += 29) {
      city.fillRect(x, 246, 8, 14);
      city.fillRect(x, 277, 8, 14);
    }
    city.lineStyle(5, 0x42e8ec, 0.85);
    city.beginPath();
    city.moveTo(138, 314);
    city.lineTo(432, 314);
    city.strokePath();
    city.lineStyle(6, 0x6a314f, 1);
    city.beginPath();
    city.moveTo(157, 198);
    city.lineTo(157, 166);
    city.lineTo(239, 166);
    city.strokePath();

    this.add.tileSprite(286, 365, 316, 32, TEXTURE_KEYS.tileStone).setDepth(24);
    this.add.image(362, 306, TEXTURE_KEYS.portal).setScale(0.72).setDepth(28);
    this.add.image(160, 337, TEXTURE_KEYS.propCrate).setScale(0.86).setDepth(27);
    this.add.image(205, 349, TEXTURE_KEYS.propSpikes).setScale(0.7).setDepth(27);

    const avatar = new BabitoAvatar(this, 264, 337, snapshot.appearance, snapshot.size)
      .setDepth(30);
    avatar.setFacing(1).setMotion('idle');
    this.add.image(408, 337, TEXTURE_KEYS.enemyDaVueltas)
      .setDisplaySize(54, 54)
      .setAlpha(0.88)
      .setDepth(29);
  }
}

export default ComingSoonScene;
