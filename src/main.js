import Phaser from 'phaser';
import './styles.css';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CreatorScene } from './scenes/CreatorScene.js';
import { PowerScene } from './scenes/PowerScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { GameScene } from './scenes/GameScene.js';
import { BossScene } from './scenes/BossScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { ComingSoonScene } from './scenes/ComingSoonScene.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#071a33',
  pixelArt: true,
  roundPixels: true,
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1350 },
      debug: false,
    },
  },
  input: {
    activePointers: 4,
  },
  scene: [
    BootScene,
    TitleScene,
    CreatorScene,
    PowerScene,
    IntroScene,
    GameScene,
    BossScene,
    ShopScene,
    WorldMapScene,
    ComingSoonScene,
  ],
};

const game = new Phaser.Game(config);

window.addEventListener('beforeunload', () => game.destroy(true));
