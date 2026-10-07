import Phaser from 'phaser';
import levelData from '../data/levels/babilandia.json';
import gameData from '../data/game-data.json';
import { EnemyController } from '../game/EnemyController.js';
import { PlayerController } from '../game/PlayerController.js';
import { isPowerProjectile, makeImpact } from '../game/PowerSystem.js';
import { createButton } from '../ui/Button.js';
import {
  addPixelBackground,
  announce,
  BACKGROUND_ASSETS,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
} from '../ui/sceneHelpers.js';
import { flashScreen, showToast, transitionToScene } from '../ui/effects.js';

function prefersTouchControls() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  create() {
    this.store = this.registry.get('saveStore');
    this.save = this.store.getState();
    if (!this.save.selectedPower) {
      this.scene.start('PowerScene');
      return;
    }

    this.level = levelData;
    this.qaCombat = false;
    if (import.meta.env.DEV && typeof location !== 'undefined') {
      this.qaCombat = new URLSearchParams(location.search).get('qaCombat') === '1';
    }
    this.enemyControllers = [];
    this.defeatedEnemies = 0;
    this.paused = false;
    this.transitioning = false;
    this.fallRecoveryPending = false;

    this.physics.world.setBounds(0, 0, this.level.worldWidth, 620);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, 540);
    this.cameras.main.setBackgroundColor('#7cccf1');
    this.background = addPixelBackground(this, 'babilandia', {
      depth: -50,
      assetKey: BACKGROUND_ASSETS.babilandiaV2.key,
      assetOverscan: 1.1,
    });
    this.createWorldDecoration({ showSkyline: !this.background.assetKey });
    this.createPlatforms();
    this.createCheckpoints();

    const savedCheckpoint = this.qaCombat
      ? this.level.checkpoints[0]
      : (this.level.checkpoints.find((entry) => entry.id === this.save.progress.checkpoint)
        ?? this.level.checkpoints[0]);
    this.projectiles = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.enemySprites = this.physics.add.group();

    this.player = new PlayerController(this, {
      x: savedCheckpoint.x,
      y: savedCheckpoint.y - 20,
      save: this.save,
      platforms: this.platforms,
      projectiles: this.projectiles,
      onHealth: (health, maxHealth) => this.updateHealthHud(health, maxHealth),
      onGameOver: () => this.showGameOver(),
    });
    this.player.setCheckpoint(savedCheckpoint.x, savedCheckpoint.y - 20);
    this.cameras.main.startFollow(this.player.body, true, 0.09, 0.09, -120, 40);
    this.cameras.main.setDeadzone(180, 100);

    this.createEnemies();
    if (this.qaCombat) {
      const firstEnemy = this.enemyControllers[0];
      firstEnemy.health = 1;
      firstEnemy.home.x = 350;
      firstEnemy.sprite.setX(350);
    }
    this.createBossPortal();
    this.createPhysicsInteractions();
    this.createHud();
    if (prefersTouchControls()) this.createTouchControls();
    this.createPauseKeys();

    this.store.setProgress({ scene: 'babilandia', checkpoint: savedCheckpoint.id });
    announce('Babilandia. Muévete, salta, derrota a los Bicharracos y recoge monedas.');
    showToast(this, 'A/D o ←/→ para moverte · W/↑/ESPACIO para saltar · J/X para atacar', {
      duration: 4200,
      y: 82,
    });
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    for (const platform of this.level.platforms) {
      const texture = platform.kind === 'ground' ? 'tile_ground' : 'tile_platform';
      const tile = this.add.tileSprite(platform.x, platform.y, platform.width, platform.height, texture)
        .setDepth(4);
      tile.setData({ isPlatform: true, kind: platform.kind });
      this.platforms.add(tile);
    }
  }

  createWorldDecoration({ showSkyline = true } = {}) {
    if (showSkyline) {
      const skyline = this.add.graphics().setDepth(-5);
      for (let x = 180; x < this.level.worldWidth; x += 520) {
        const height = 85 + (x % 130);
        skyline.fillStyle(0xf5f0dc, 0.92);
        skyline.fillRect(x, 420 - height, 105, height);
        skyline.fillStyle(0xe7ddd0, 1);
        skyline.fillRect(x + 72, 420 - height - 28, 35, height + 28);
        skyline.fillStyle(0xf46855, 1);
        skyline.fillCircle(x + 52, 420 - height, 52);
        skyline.fillCircle(x + 90, 420 - height - 28, 20);
        skyline.fillStyle(0x2979bd, 1);
        skyline.fillRect(x + 20, 380 - height, 12, 24);
        skyline.fillRect(x + 76, 365 - height, 10, 20);
      }
    }
    const labels = [
      [325, 352, 'MUÉVETE Y SALTA'],
      [1160, 330, 'COME MUERDE DE CERCA'],
      [2050, 300, 'VUELA PUEDE VENIR EN PAREJA'],
      [3260, 338, 'ATACA A DA VUELTAS CUANDO ESTÉ MAREADO'],
      [4610, 306, 'DERROTA A TODOS PARA ABRIR EL PORTAL'],
    ];
    labels.forEach(([x, y, text]) => {
      const sign = this.add.image(x, y + 50, 'prop_sign').setDepth(6).setScale(1.35);
      createLabel(this, text, x, y, {
        fontSize: '9px',
        wordWrapWidth: 220,
        depth: 7,
        scrollFactor: 1,
        color: 0xffffff,
      });
      sign.setData('decoration', true);
    });
    for (let x = 100; x < this.level.worldWidth; x += 260) {
      this.add.image(x, 467, 'prop_flower').setDepth(7).setScale(x % 520 === 0 ? 1.2 : 0.85);
    }
  }

  createCheckpoints() {
    this.checkpointSprites = this.physics.add.staticGroup();
    this.level.checkpoints.forEach((checkpoint) => {
      // Keep the flag beside the respawn point rather than directly on top of
      // the Babito. The trigger remains close enough to activate on approach.
      const sprite = this.checkpointSprites.create(checkpoint.x - 42, checkpoint.y, 'checkpoint')
        .setOrigin(0.5, 1)
        .setDepth(8)
        .setData('checkpoint', checkpoint);
      sprite.refreshBody();
    });
  }

  createEnemies() {
    for (const definition of this.level.enemies) {
      const controller = new EnemyController(
        this,
        definition,
        this.player.body,
        (enemy, dropCount) => this.handleEnemyDefeat(enemy, dropCount),
      );
      this.enemyControllers.push(controller);
      this.enemySprites.add(controller.sprite);
      this.physics.add.collider(controller.sprite, this.platforms);
    }
  }

  createBossPortal() {
    const { x, y } = this.level.bossPortal;
    this.portal = this.physics.add.staticImage(x, y, 'portal')
      .setOrigin(0.5, 1)
      .setDepth(8);
    this.portal.refreshBody();
    this.portal.body.setSize(54, 74).setOffset(5, 4);
    this.portalLabel = createLabel(this, 'PORTAL SELLADO', x, y - 104, {
      fontSize: '11px', color: 0xff779b, depth: 15, scrollFactor: 1,
    });
  }

  createPhysicsInteractions() {
    this.physics.add.collider(this.coins, this.platforms);
    this.physics.add.collider(this.projectiles, this.platforms, (first, second) => {
      const projectile = isPowerProjectile(first) ? first : (isPowerProjectile(second) ? second : null);
      if (!projectile?.active) return;
      makeImpact(this, projectile.x, projectile.y, 0xffcf3c);
      projectile.destroy();
    }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second));
    this.physics.add.overlap(this.projectiles, this.enemySprites, (first, second) => {
      const projectile = isPowerProjectile(first) ? first : (isPowerProjectile(second) ? second : null);
      const enemySprite = projectile === first ? second : first;
      if (!projectile?.active || !enemySprite?.active) return;
      if (!projectile.active || projectile.getData('owner') !== 'player') return;
      const controller = enemySprite.getData('controller');
      const damaged = controller?.takeDamage(projectile.getData('damage') ?? 1, projectile.x);
      makeImpact(this, projectile.x, projectile.y, damaged ? 0xffffff : 0x83d8ff);
      if (!damaged && controller?.type === 'da_vueltas') {
        showToast(this, '¡Sus pinchos lo protegen! Espera a que quede MAREADO.', {
          type: 'warning', duration: 1100, y: 92,
        });
      }
      projectile.destroy();
    }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second));
    this.physics.add.overlap(this.player.body, this.enemySprites, (_playerBody, enemySprite) => {
      const controller = enemySprite.getData('controller');
      if (controller?.canHurtPlayer()) this.player.takeDamage(enemySprite.x, controller.config.damage);
    });
    this.physics.add.overlap(this.player.body, this.coins, (_playerBody, coin) => this.collectCoin(coin));
    this.physics.add.overlap(this.player.body, this.checkpointSprites, (_playerBody, flag) => {
      this.activateCheckpoint(flag.getData('checkpoint'), flag);
    });
    this.physics.add.overlap(this.player.body, this.portal, () => this.tryEnterBoss());
  }

  handleEnemyDefeat(enemy, dropCount) {
    if (this.qaCombat) dropCount = 2;
    this.defeatedEnemies += 1;
    this.enemySprites.remove(enemy.sprite, false, false);
    for (let index = 0; index < dropCount; index += 1) {
      const coin = this.coins.create(enemy.sprite.x + (index - 0.5) * 12, enemy.sprite.y - 10, 'coin')
        .setDepth(12)
        .setBounce(0.62)
        .setCollideWorldBounds(true)
        .setVelocity(Phaser.Math.Between(-85, 85), Phaser.Math.Between(-300, -220));
      coin.body.setCircle(9, 1, 1);
    }
    if (dropCount === 0) showToast(this, `${enemy.config.name} no soltó monedas esta vez.`, { duration: 900 });
    if (this.defeatedEnemies === this.level.enemies.length) {
      this.portalLabel.setText('PORTAL ABIERTO').setColor('#8ff3a9');
      this.portal.setTint(0xb4ffff);
      this.cameras.main.flash(260, 113, 229, 255);
      showToast(this, '¡Todos los encuentros superados! El portal del boss está abierto.', {
        type: 'success', duration: 2600,
      });
    }
  }

  collectCoin(coin) {
    if (!coin.active) return;
    const x = coin.x;
    const y = coin.y;
    coin.disableBody(true, true);
    this.store.addCoins(1);
    this.registry.get('audio')?.play('coin');
    this.save = this.store.getState();
    this.updateCoinHud();
    flashScreen(this, { color: 0xffcf3c, duration: 55 });
    const pop = createLabel(this, '+1', x, y - 4, {
      fontSize: '12px', color: 0xffe36e, scrollFactor: 1, depth: 50,
    });
    this.tweens.add({ targets: pop, y: y - 36, alpha: 0, duration: 520, onComplete: () => pop.destroy() });
  }

  activateCheckpoint(checkpoint, flag) {
    if (!checkpoint || this.activeCheckpointId === checkpoint.id) return;
    this.activeCheckpointId = checkpoint.id;
    this.player.setCheckpoint(checkpoint.x, checkpoint.y - 20);
    this.player.restoreHealth();
    this.registry.get('audio')?.play('checkpoint');
    this.store.setProgress({ checkpoint: checkpoint.id, scene: 'babilandia' });
    this.checkpointSprites.children.iterate((entry) => entry?.clearTint());
    flag.setTint(0xffe36e);
    showToast(this, '✓ Checkpoint guardado · corazones restaurados', { type: 'success', duration: 1500 });
  }

  createHud() {
    const hud = this.add.container(0, 0).setDepth(1000).setScrollFactor(0);
    const panel = createPanel(this, 480, 31, 610, 48, {
      depth: 999, radius: 10, fillAlpha: 0.9, shadow: false,
    });
    hud.add(panel);
    this.healthText = createLabel(this, '♥ ♥ ♥', 230, 31, { fontSize: '16px', color: 0xff557b, depth: 1001 });
    this.coinText = createLabel(this, `●B  ${this.save.coins}`, 390, 31, { fontSize: '14px', color: 0xffcf3c, depth: 1001 });
    const power = gameData.powers.find((entry) => entry.id === this.save.selectedPower);
    this.powerText = createLabel(this, `${power?.name?.toUpperCase() ?? 'PODER'}  ·  J / X`, 575, 31, {
      fontSize: '12px', color: Number.parseInt((power?.color ?? '#71e5ff').slice(1), 16), depth: 1001,
    });
    this.progressText = createLabel(this, `ENCUENTROS  0/${this.level.enemies.length}`, 748, 31, {
      fontSize: '10px', color: 0xbdefff, depth: 1001,
    });
    hud.add([this.healthText, this.coinText, this.powerText, this.progressText]);

    this.pauseButton = createButton(this, {
      x: 894,
      y: 31,
      width: 104,
      height: 34,
      label: 'Ⅱ PAUSA',
      fontSize: '9px',
      variant: 'ghost',
      depth: 1002,
      accessibleLabel: 'Pausar el juego',
      keyboardShortcuts: false,
      onPress: () => this.togglePause(),
    });
  }

  updateHealthHud(health, maxHealth) {
    this.healthText?.setText(`${'♥ '.repeat(health)}${'♡ '.repeat(Math.max(0, maxHealth - health))}`.trim());
  }

  updateCoinHud() {
    this.coinText?.setText(`●B  ${this.store.getState().coins}`);
  }

  createTouchControls() {
    const createPad = (x, label, control) => {
      const pad = this.add.circle(x, 477, 27, 0x071326, 0.44)
        .setStrokeStyle(2, 0x71e5ff, 0.46)
        .setDepth(900)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      createLabel(this, label, x, 477, { fontSize: '14px', color: 0xffffff, depth: 901 });
      const down = () => this.player.setVirtualControl(control, true);
      const up = () => this.player.setVirtualControl(control, false);
      pad.on('pointerdown', down).on('pointerup', up).on('pointerout', up).on('pointerupoutside', up);
      return pad;
    };
    createPad(56, '◀', 'left');
    createPad(120, '▶', 'right');
    createPad(840, '↑', 'jump');
    createPad(906, '✦', 'attack');
  }

  createPauseKeys() {
    this.pauseHandler = (event) => {
      if (event?.repeat) return;
      this.togglePause();
    };
    this.input.keyboard?.on('keydown-P', this.pauseHandler);
    this.input.keyboard?.on('keydown-ESC', this.pauseHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-P', this.pauseHandler);
      this.input.keyboard?.off('keydown-ESC', this.pauseHandler);
    });
  }

  tryEnterBoss() {
    if (this.transitioning) return;
    if (this.defeatedEnemies < this.level.enemies.length) {
      const remaining = this.level.enemies.length - this.defeatedEnemies;
      showToast(this, `El portal sigue sellado: quedan ${remaining} Bicharracos.`, {
        type: 'warning', duration: 1200,
      });
      this.player.body.setVelocityX(-180);
      return;
    }
    this.transitioning = true;
    this.player.setEnabled(false);
    this.store.setProgress({ scene: 'boss1', checkpoint: 'boss_gate' });
    transitionToScene(this, 'BossScene', {}, { announcement: 'Comienza el combate contra Babito Corrupto' });
  }

  togglePause() {
    if (this.gameOverContainer || this.transitioning) return;
    this.paused = !this.paused;
    if (this.paused) this.showPauseOverlay();
    else this.closePauseOverlay();
  }

  showPauseOverlay() {
    this.physics.world.pause();
    this.player.setEnabled(false);
    this.pauseButton?.setEnabled(false);
    this.pauseOverlay = this.add.container(0, 0).setDepth(3000).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x020814, 0.76).setInteractive();
    const panel = createPanel(this, 480, 270, 520, 360, { depth: 3001 });
    const title = createTitle(this, 'PAUSA', 480, 150, { fontSize: 34, depth: 3002 });
    const controls = createBodyText(this,
      'Mover: A/D o ←/→\nSaltar: W / ↑ / Espacio\nAtacar: J / X\nPausa: P / Esc',
      480,
      238,
      { fontSize: 18, depth: 3002, lineSpacing: 9 },
    );
    const resume = createButton(this, {
      x: 480, y: 338, width: 250, height: 48, label: 'CONTINUAR', variant: 'primary', depth: 3003,
      onPress: () => this.closePauseOverlay(),
    });
    const titleButton = createButton(this, {
      x: 480, y: 405, width: 280, height: 44, label: 'VOLVER AL TÍTULO', fontSize: '12px', variant: 'ghost', depth: 3003,
      onPress: () => {
        this.physics.world.resume();
        transitionToScene(this, 'TitleScene');
      },
    });
    this.pauseOverlay.add([shade, panel, title, controls, resume, titleButton]);
    announce('Juego en pausa.');
  }

  closePauseOverlay() {
    this.paused = false;
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
    this.physics.world.resume();
    this.player.setEnabled(true);
    this.pauseButton?.setEnabled(true);
    announce('Juego reanudado.');
  }

  showGameOver() {
    if (this.gameOverContainer) return;
    this.fallRecoveryPending = false;
    this.physics.world.pause();
    this.pauseButton?.setEnabled(false);
    this.gameOverContainer = this.add.container(0, 0).setDepth(4000).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x020814, 0.82).setInteractive();
    const panel = createPanel(this, 480, 270, 500, 300, { depth: 4001, strokeColor: 0xff557b });
    const title = createTitle(this, '¡ÁNIMO, BABITO!', 480, 185, { fontSize: 30, depth: 4002 });
    const copy = createBodyText(this, 'Tu checkpoint sigue a salvo. Respira y vuelve a intentarlo.', 480, 245, {
      fontSize: 17, depth: 4002, wordWrapWidth: 400,
    });
    const retry = createButton(this, {
      x: 480, y: 322, width: 240, height: 48, label: 'REINTENTAR', variant: 'primary', depth: 4003,
      onPress: () => {
        this.gameOverContainer.destroy(true);
        this.gameOverContainer = null;
        this.fallRecoveryPending = false;
        this.physics.world.resume();
        this.player.respawn();
        this.pauseButton?.setEnabled(true);
      },
    });
    const titleButton = createButton(this, {
      x: 480, y: 386, width: 240, height: 42, label: 'TÍTULO', variant: 'ghost', depth: 4003,
      onPress: () => {
        this.physics.world.resume();
        transitionToScene(this, 'TitleScene');
      },
    });
    this.gameOverContainer.add([shade, panel, title, copy, retry, titleButton]);
    announce('Sin corazones. Reintenta desde el último checkpoint.');
  }

  handleFall() {
    if (this.fallRecoveryPending || this.gameOverContainer) return;
    this.fallRecoveryPending = true;
    this.player.takeDamage(this.player.body.x, 1);
    if (this.player.health > 0) {
      this.player.setEnabled(false);
      this.player.body.setVelocity(0);
      this.fallRecoveryTimer = this.time.delayedCall(380, () => {
        if (!this.scene.isActive() || this.gameOverContainer) {
          this.fallRecoveryPending = false;
          return;
        }
        this.player.respawn({ restoreHealth: false });
        this.fallRecoveryPending = false;
      });
    }
  }

  update(time) {
    if (this.paused || this.gameOverContainer || this.transitioning) return;

    this.player?.update(time);
    this.enemyControllers.forEach((enemy) => enemy.update());
    if (this.player?.body.y > 575) this.handleFall();
    this.progressText?.setText(`ENCUENTROS  ${this.defeatedEnemies}/${this.level.enemies.length}`);
  }
}
