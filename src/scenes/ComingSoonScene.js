import Phaser from 'phaser';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { resolveComingSoonRequest } from '../state/progressionFlow.js';
import { TEXTURE_KEYS, createTextures } from '../game/createTextures.js';
import { createButton } from '../ui/Button.js';
import {
  BACKGROUND_ASSETS,
  addPixelBackground,
  announce,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
} from '../ui/sceneHelpers.js';
import { createAmbientMotes, fadeIn, transitionToScene } from '../ui/effects.js';

const CITY = Object.freeze({
  theme: 'city',
  title: 'CIUDAD BICHARRACA',
  number: 'MUNDO 3',
  tagline: 'TECNOLOGÍA, CONTAMINACIÓN Y CAOS',
  description: 'Una ciudad de fábricas, láseres y máquinas aguarda tras el humo de neón.',
  features: ['TUBERÍAS Y ENGRANAJES', 'LÁSERES', 'GRÚAS Y NEÓN'],
  accent: 0xff6686,
  mote: 0x42e8ec,
});

export class ComingSoonScene extends Phaser.Scene {
  constructor() {
    super('ComingSoonScene');
  }

  init(data = {}) {
    this.request = resolveComingSoonRequest(data.world);
  }

  create() {
    if (this.request.kind === 'redirect') {
      this.scene.start(this.request.scene, this.request.data);
      return;
    }

    createTextures(this);
    this.store = this.registry.get('saveStore');
    if (!this.store?.getState) {
      throw new Error('ComingSoonScene requires saveStore in the Phaser registry.');
    }

    const snapshot = this.store.getState();
    const world = CITY;

    addPixelBackground(this, world.theme, {
      assetKey: BACKGROUND_ASSETS.cityV1.key,
      assetOverscan: 1,
    });
    createAmbientMotes(this, {
      count: 24,
      color: world.mote,
      minAlpha: 0.14,
      maxAlpha: 0.52,
      depth: 2,
      seed: 'coming-soon-city',
    });

    createTitle(this, world.title, 480, 40, {
      fontSize: 34,
      depth: 40,
    });
    createLabel(this, `${world.number} · PRÓXIMAMENTE`, 480, 82, {
      fontSize: 14,
      color: world.accent,
      depth: 40,
    });

    createPanel(this, 480, 283, 814, 356, {
      depth: 10,
      fillColor: 0x19182f,
      fillAlpha: 0.94,
      strokeColor: world.accent,
      highlightColor: world.mote,
      radius: 18,
    });
    createPanel(this, 286, 284, 350, 284, {
      depth: 13,
      fillColor: 0x111a2b,
      fillAlpha: 0.9,
      strokeColor: 0x5c486d,
      radius: 14,
    });

    this.createCityPreview(snapshot);

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
        fontSize: 12,
        originX: 0,
        color: 0xd8f5ff,
        depth: 35,
      });
    });

    createBodyText(this, 'Las Fases 1 y 2 ya están disponibles.\n¡La aventura continúa muy pronto!', 666, 405, {
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

  createCityPreview(snapshot) {
    const cityAsset = BACKGROUND_ASSETS.cityV1.key;
    if (this.textures.exists(cityAsset)) {
      const targetWidth = 316;
      const targetHeight = 254;
      const image = this.add.image(286, 283, cityAsset).setDepth(20);
      const sourceWidth = image.frame.realWidth;
      const sourceHeight = image.frame.realHeight;
      const cropWidth = Math.round(sourceHeight * (targetWidth / targetHeight));
      image
        .setDisplaySize(targetHeight * (sourceWidth / sourceHeight), targetHeight)
        .setCrop(Math.round((sourceWidth - cropWidth) / 2), 0, cropWidth, sourceHeight);
      this.add.rectangle(286, 283, targetWidth, targetHeight, 0x111525, 0.2)
        .setDepth(21);
    } else {
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
    }

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
