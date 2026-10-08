import Phaser from 'phaser';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { TEXTURE_KEYS, createTextures } from '../game/createTextures.js';
import { isJungleUnlocked, replayPhaseOne, startPhaseTwo } from '../state/progressionFlow.js';
import { createButton } from '../ui/Button.js';
import {
  addPixelBackground,
  announce,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
  CHARACTER_ASSETS,
  UI_COLORS,
} from '../ui/sceneHelpers.js';
import {
  createAmbientMotes,
  fadeIn,
  showToast,
  transitionToScene,
} from '../ui/effects.js';

export class WorldMapScene extends Phaser.Scene {
  constructor() {
    super('WorldMapScene');
  }

  create() {
    createTextures(this);
    this.store = this.registry.get('saveStore');
    if (!this.store?.getState) {
      throw new Error('WorldMapScene requires saveStore in the Phaser registry.');
    }

    let snapshot = this.store.getState();
    if (snapshot.progress.boss1Defeated && !snapshot.progress.phase1Complete) {
      this.store.setProgress({ phase1Complete: true, scene: 'map' });
      snapshot = this.store.getState();
    } else {
      this.store.setProgress({ scene: 'map' });
      snapshot = this.store.getState();
    }
    this.snapshot = snapshot;
    this.phaseComplete = snapshot.progress.phase1Complete;
    this.jungleUnlocked = isJungleUnlocked(snapshot.progress);
    this.phaseTwoComplete = snapshot.progress.phase2Complete === true;

    addPixelBackground(this, 'babilandia', {
      musicTheme: this.phaseComplete ? 'ending' : 'babilandia',
    });
    createAmbientMotes(this, {
      count: 20,
      color: 0xffcf3c,
      minAlpha: 0.16,
      maxAlpha: 0.55,
      depth: 2,
      seed: 'world-map',
    });

    createTitle(this, 'MAPA DE BABILANDIA', 480, 37, { fontSize: 36, depth: 40 });
    createBodyText(
      this,
      this.phaseTwoComplete
        ? 'FASE 2 COMPLETA · La Jungla vuelve a brillar. Ciudad Bicharraca aguarda.'
        : (this.phaseComplete
          ? 'FASE 1 COMPLETA · La primera luz ha regresado. ¡La Jungla te espera!'
          : 'FASE 1 DISPONIBLE · Babilandia necesita un pequeño héroe.'),
      480,
      78,
      {
        fontSize: 14,
        color: this.phaseComplete ? '#fff0a1' : '#d7f5ff',
        wordWrapWidth: 720,
        depth: 40,
      },
    );

    this.createCoinHud();
    this.drawRoute();
    this.createWorldCards();
    this.createNavigation();

    announce(
      this.phaseTwoComplete
        ? 'Mapa de mundos. Fases uno y dos completadas. Ciudad Bicharraca muestra un avance.'
        : (this.phaseComplete
          ? 'Mapa de mundos. Fase uno completada. La Jungla está disponible.'
          : 'Mapa de mundos. Babilandia está disponible.'),
    );
    fadeIn(this);
  }

  createCoinHud() {
    createPanel(this, 858, 39, 178, 46, {
      depth: 43,
      fillColor: 0x17334c,
      strokeColor: 0xffcf3c,
      radius: 11,
    });
    this.add.image(798, 39, TEXTURE_KEYS.coin).setScale(1.05).setDepth(45);
    createLabel(this, `${this.snapshot.coins} MONEDAS`, 878, 39, {
      fontSize: 12,
      color: UI_COLORS.yellow,
      depth: 45,
    });
  }

  drawRoute() {
    const route = this.add.graphics().setDepth(12);
    route.lineStyle(8, 0x062039, 0.75);
    route.beginPath();
    route.moveTo(190, 277);
    route.lineTo(480, 277);
    route.lineTo(770, 277);
    route.strokePath();
    route.lineStyle(3, this.phaseComplete ? 0xffcf3c : 0x71e5ff, 0.95);
    route.beginPath();
    route.moveTo(190, 277);
    route.lineTo(480, 277);
    route.lineTo(770, 277);
    route.strokePath();

    for (const x of [335, 625]) {
      route.fillStyle(0x071326, 1);
      route.fillCircle(x, 277, 10);
      route.fillStyle(0xffcf3c, 1);
      route.fillRect(x - 3, 274, 6, 6);
    }
  }

  createWorldCards() {
    const babilandiaButton = createButton(this, {
      x: 190,
      y: 281,
      width: 250,
      height: 242,
      radius: 16,
      label: this.phaseComplete
        ? '✓ FASE 1 COMPLETA\nBABILANDIA\nREJUGAR DESDE EL INICIO'
        : '▶ FASE 1 DISPONIBLE\nBABILANDIA\nJUGAR DESDE EL INICIO',
      variant: this.phaseComplete ? 'primary' : 'secondary',
      fontSize: '13px',
      accessibleLabel: this.phaseComplete
        ? 'Fase 1 completada. Rejugar Babilandia desde el inicio.'
        : 'Fase 1 disponible. Jugar Babilandia desde el inicio.',
      onPress: () => {
        replayPhaseOne(this.store);
        transitionToScene(this, 'GameScene', {}, {
          announcement: 'Entrando en Babilandia desde el inicio',
        });
      },
    });
    babilandiaButton.labelText.setY(72);

    const jungleLabel = this.phaseTwoComplete
      ? '✓ FASE 2 COMPLETA\nLA JUNGLA\nREJUGAR DESDE EL INICIO'
      : (this.jungleUnlocked
        ? '▶ FASE 2 DISPONIBLE\nLA JUNGLA\nJUGAR DESDE EL INICIO'
        : 'BLOQUEADA\nLA JUNGLA\nCOMPLETA LA FASE 1');
    const jungleButton = createButton(this, {
      x: 480,
      y: 281,
      width: 250,
      height: 242,
      radius: 16,
      label: jungleLabel,
      variant: 'secondary',
      style: {
        fill: 0x1b5a3b,
        hover: 0x28764a,
        pressed: 0x12462e,
        border: 0x89e85c,
        shadow: 0x08321f,
      },
      fontSize: '13px',
      accessibleLabel: this.jungleUnlocked
        ? 'La Jungla, mundo 2. Jugar desde el inicio.'
        : 'La Jungla, mundo 2, bloqueada hasta completar la fase 1.',
      onPress: () => {
        if (!this.jungleUnlocked) {
          showToast(this, 'Purifica a Babito Corrupto para abrir La Jungla', { type: 'warning', duration: 1600 });
          return;
        }
        startPhaseTwo(this.store);
        transitionToScene(this, 'GameScene', { level: 'jungla' }, {
          announcement: 'Entrando en La Jungla',
        });
      },
    });
    jungleButton.labelText.setY(72);

    const cityButton = createButton(this, {
      x: 770,
      y: 281,
      width: 250,
      height: 242,
      radius: 16,
      label: 'PRÓXIMAMENTE\nCIUDAD BICHARRACA\nMUNDO 3',
      variant: 'danger',
      style: {
        fill: 0x3a244c,
        hover: 0x58305e,
        pressed: 0x281a39,
        border: 0xff6b87,
        shadow: 0x1b102a,
      },
      fontSize: '14px',
      accessibleLabel: 'Ciudad Bicharraca, mundo 3, ver avance próximamente',
      onPress: () => {
        this.store.setProgress({ scene: 'city' });
        transitionToScene(this, 'ComingSoonScene', { world: 'city' }, {
          announcement: 'Avance de Ciudad Bicharraca',
        });
      },
    });
    cityButton.labelText.setY(72);

    this.createBabilandiaIcon(190, 225);
    this.createJungleIcon(480, 224);
    this.createCityIcon(770, 224);
  }

  createBabilandiaIcon(x, y) {
    const castle = this.add.graphics({ x, y }).setDepth(130);
    castle.fillStyle(0xf6efe0, 1);
    castle.fillRect(-55, -13, 110, 46);
    castle.fillRect(-47, -39, 25, 32);
    castle.fillRect(22, -39, 25, 32);
    castle.fillStyle(0xe84f50, 1);
    castle.fillTriangle(-52, -39, -17, -39, -34, -58);
    castle.fillTriangle(17, -39, 52, -39, 34, -58);
    castle.fillStyle(0x2b70bf, 1);
    castle.fillRect(-7, 5, 14, 28);
    castle.fillStyle(0x68d14e, 1);
    castle.fillRect(-62, 29, 124, 9);

    const avatar = new BabitoAvatar(this, x - 61, y + 16, this.snapshot.appearance, 'small')
      .setScale(0.78)
      .setDepth(136);
    if (this.phaseComplete) avatar.setMotion('jump');
    this.add.image(x + 58, y + 14, TEXTURE_KEYS.checkpoint).setScale(0.56).setDepth(135);
  }

  createJungleIcon(x, y) {
    const jungle = this.add.graphics({ x, y }).setDepth(130);
    jungle.fillStyle(0x163e2c, 1);
    jungle.fillRect(-68, 19, 136, 20);
    jungle.fillStyle(0x65cf45, 1);
    jungle.fillCircle(-46, -27, 26);
    jungle.fillCircle(44, -25, 31);
    jungle.fillCircle(0, -42, 36);
    jungle.fillStyle(0x2a7843, 1);
    jungle.fillRect(-55, -19, 13, 52);
    jungle.fillRect(39, -18, 13, 51);
    jungle.fillStyle(0x6edcf1, 0.9);
    jungle.fillRect(-7, -13, 14, 50);
    const requestedTree = this.phaseTwoComplete
      ? CHARACTER_ASSETS.powerTreeRestoredV2.key
      : CHARACTER_ASSETS.powerTreeSadV2.key;
    const treeTexture = this.textures.exists(requestedTree)
      ? requestedTree
      : TEXTURE_KEYS.powerTreeSad;
    this.add.image(x, y + 3, treeTexture).setDisplaySize(72, 72).setDepth(134);
  }

  createCityIcon(x, y) {
    const city = this.add.graphics({ x, y }).setDepth(130);
    city.fillStyle(0x20283c, 1);
    city.fillRect(-65, -10, 35, 49);
    city.fillRect(-25, -35, 42, 74);
    city.fillRect(22, -22, 44, 61);
    city.fillStyle(0xff4f6f, 1);
    for (const windowX of [-56, -42, -17, -3, 30, 46]) {
      city.fillRect(windowX, 1, 6, 11);
      city.fillRect(windowX, 19, 6, 11);
    }
    city.lineStyle(4, 0x42e8ec, 0.9);
    city.beginPath();
    city.moveTo(-72, 35);
    city.lineTo(72, 35);
    city.strokePath();
    this.add.image(x, y - 4, TEXTURE_KEYS.portal).setScale(0.53).setDepth(134);
  }

  createNavigation() {
    createButton(this, {
      x: 205,
      y: 500,
      width: 245,
      height: 42,
      label: 'IR A LA TIENDA',
      variant: 'accent',
      fontSize: '13px',
      autoFocus: false,
      onPress: () => {
        this.store.setProgress({ scene: 'shop' });
        transitionToScene(this, 'ShopScene', {}, { announcement: 'Entrando en la Tienda Babita' });
      },
    });
    createButton(this, {
      x: 755,
      y: 500,
      width: 220,
      height: 42,
      label: 'VOLVER AL TÍTULO',
      variant: 'ghost',
      fontSize: '12px',
      autoFocus: false,
      onPress: () => transitionToScene(this, 'TitleScene', {}, {
        announcement: 'Volviendo al título',
      }),
    });
  }
}

export default WorldMapScene;
