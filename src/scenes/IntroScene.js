import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { TEXTURE_KEYS } from '../game/createTextures.js';
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
  transitionToScene,
} from '../ui/effects.js';

export class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    this.store = this.registry.get('saveStore');
    this.save = this.store.getState();
    this.enteringGame = false;

    if (!this.save.selectedPower) {
      this.store.setProgress({ scene: 'power' });
      this.scene.start('PowerScene');
      return;
    }

    this.store.setProgress({ scene: 'intro' });
    addPixelBackground(this, 'babilandia', { groundHeight: 42 });
    this.add.rectangle(480, 270, 960, 540, 0x061129, 0.46).setDepth(0);
    createAmbientMotes(this, {
      count: 24,
      color: 0xffcf3c,
      depth: 2,
      seed: 'stolen-apples',
      minAlpha: 0.1,
      maxAlpha: 0.42,
      minSpeed: 2,
      maxSpeed: 7,
    });

    createTitle(this, 'LAS MANZANAS DE PODER', 480, 46, {
      fontSize: 34,
      color: UI_COLORS.white,
      depth: 20,
    });
    createLabel(this, 'ALGO TERRIBLE HA OCURRIDO EN BABILANDIA…', 480, 84, {
      fontSize: 12,
      color: UI_COLORS.yellow,
      depth: 20,
    });

    this.createTreeStory();
    this.createBabitoStory();

    createButton(this, {
      x: 853,
      y: 40,
      width: 162,
      height: 34,
      label: 'SALTAR INTRO ›',
      fontSize: '12px',
      variant: 'ghost',
      accessibleLabel: 'Saltar introducción y entrar en Babilandia',
      onPress: () => this.enterBabilandia(),
    });
    createButton(this, {
      x: 480,
      y: 493,
      width: 344,
      height: 50,
      label: 'ENTRAR EN BABILANDIA ›',
      fontSize: '16px',
      variant: 'primary',
      accessibleLabel: 'Entrar en Babilandia y comenzar a jugar',
      onPress: () => this.enterBabilandia(),
    });

    this.skipHandler = (event) => {
      if (event?.repeat) return;
      this.enterBabilandia();
    };
    this.input.keyboard?.on('keydown-S', this.skipHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-S', this.skipHandler);
    });

    announce('Los Bicharracos han robado las Manzanas de Poder. El Árbol necesita tu ayuda.');
    fadeIn(this, { duration: 300 });
  }

  createTreeStory() {
    createPanel(this, 274, 287, 386, 370, {
      depth: 8,
      fillColor: 0x10263a,
      fillAlpha: 0.95,
      strokeColor: 0x738090,
      strokeAlpha: 0.85,
    });
    createLabel(this, 'EL ÁRBOL DE PODER', 274, 128, {
      fontSize: 13,
      color: 0xb8c0cc,
      depth: 18,
    });

    const treeTexture = this.textures.exists(CHARACTER_ASSETS.powerTreeSadV2.key)
      ? CHARACTER_ASSETS.powerTreeSadV2.key
      : TEXTURE_KEYS.powerTreeSad;
    const tree = this.add.image(274, 280, treeTexture)
      .setDisplaySize(258, 258)
      .setDepth(16);
    this.tweens.add({
      targets: tree,
      y: 285,
      alpha: { from: 0.9, to: 1 },
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    createBodyText(this, 'Sin sus manzanas, sus ramas han caído\ny Babilandia ha perdido su brillo.', 274, 426, {
      fontSize: 14,
      color: '#d7e0e8',
      wordWrapWidth: 330,
      lineSpacing: 3,
      depth: 18,
    });
  }

  createBabitoStory() {
    createPanel(this, 694, 287, 410, 370, {
      depth: 8,
      fillColor: 0x0b2745,
      fillAlpha: 0.96,
      strokeColor: UI_COLORS.cyan,
      strokeAlpha: 0.68,
    });
    createLabel(this, 'TU MISIÓN', 694, 128, {
      fontSize: 13,
      color: UI_COLORS.cyan,
      depth: 18,
    });

    createBodyText(
      this,
      'Los Bicharracos han robado las Manzanas de Poder.\n\nRecorre Babilandia, protege a sus habitantes y recupera la primera manzana.',
      694,
      211,
      {
        fontSize: 16,
        color: '#f2fbff',
        wordWrapWidth: 342,
        lineSpacing: 4,
        depth: 18,
      },
    );

    const avatarHost = this.add.container(646, 365).setScale(2.25).setDepth(20);
    avatarHost.add(new BabitoAvatar(
      this,
      0,
      0,
      this.save.appearance,
      this.save.size,
    ));
    this.tweens.add({
      targets: avatarHost,
      y: 360,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const power = gameData.powers.find((candidate) => candidate.id === this.save.selectedPower)
      ?? gameData.powers[0];
    const projectile = this.add.image(766, 355, `projectile_${power.id}`)
      .setScale(2.1)
      .setDepth(20);
    this.tweens.add({
      targets: projectile,
      x: 785,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
    createLabel(this, `${this.save.name.toUpperCase()} · PODER ${power.name.toUpperCase()}`, 713, 423, {
      fontSize: 12,
      color: power.color,
      wordWrapWidth: 320,
      depth: 20,
    });
  }

  enterBabilandia() {
    if (this.enteringGame) return;
    this.enteringGame = true;
    this.store.setProgress({
      scene: 'babilandia',
      checkpoint: 'start',
    });
    transitionToScene(this, 'GameScene', { fromIntro: true }, {
      announcement: 'Entrando en Babilandia',
      duration: 260,
    });
  }
}
