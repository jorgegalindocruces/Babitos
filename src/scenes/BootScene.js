import Phaser from 'phaser';
import { createTextures } from '../game/createTextures.js';
import { SaveStore } from '../state/SaveStore.js';
import { BACKGROUND_ASSETS, CHARACTER_ASSETS } from '../ui/sceneHelpers.js';

const DEV_QA_SCENES = new Set([
  'TitleScene',
  'CreatorScene',
  'PowerScene',
  'IntroScene',
  'GameScene',
  'BossScene',
  'ShopScene',
  'WorldMapScene',
  'ComingSoonScene',
]);

function getDevQaLaunch() {
  if (!import.meta.env.DEV || typeof location === 'undefined') return null;
  const params = new URLSearchParams(location.search);
  const scene = params.get('qa');
  if (!DEV_QA_SCENES.has(scene)) return null;
  const requestedCoins = Number.parseInt(params.get('qaCoins') ?? '', 10);
  return {
    scene,
    coins: Number.isFinite(requestedCoins) ? Phaser.Math.Clamp(requestedCoins, 0, 999) : null,
    completePhaseOne: params.get('qaComplete') === '1',
    data: scene === 'ComingSoonScene'
      ? { world: params.get('world') === 'city' ? 'city' : 'jungle' }
      : {},
  };
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    for (const asset of [
      ...Object.values(BACKGROUND_ASSETS),
      ...Object.values(CHARACTER_ASSETS),
    ]) {
      if (!this.textures.exists(asset.key)) {
        this.load.image(asset.key, `${import.meta.env.BASE_URL}${asset.url}`);
      }
    }
  }

  create() {
    createTextures(this);

    const saveStore = new SaveStore();
    this.registry.set('saveStore', saveStore);

    // Tiny read-only-ish hook for automated smoke tests and community mods.
    globalThis.__BABITOS__ = {
      version: '0.2.0',
      get scene() {
        return this.game?.scene?.getScenes(true)?.at(-1)?.scene?.key ?? null;
      },
      get save() {
        return saveStore.getState();
      },
      game: this.game,
    };

    this.input.keyboard?.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
    ]);

    const qaLaunch = getDevQaLaunch();
    if (qaLaunch) {
      if (!saveStore.getState().selectedPower) saveStore.setSelectedPower('fire');
      if (qaLaunch.coins !== null) {
        const missingCoins = qaLaunch.coins - saveStore.getState().coins;
        if (missingCoins > 0) saveStore.addCoins(missingCoins);
      }
      if (qaLaunch.completePhaseOne) {
        saveStore.setProgress({ boss1Defeated: true, phase1Complete: true });
      }
      this.scene.start(qaLaunch.scene, qaLaunch.data);
      return;
    }

    this.scene.start('TitleScene');
  }
}
