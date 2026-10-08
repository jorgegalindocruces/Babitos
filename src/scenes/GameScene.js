import Phaser from 'phaser';
import { getGroundSpans, getLevel, PLATFORM_STYLE_TEXTURES } from '../data/levels/index.js';
import gameData from '../data/game-data.json';
import { EnemyController } from '../game/EnemyController.js';
import { enemyUsesPlatformCollision } from '../game/EnemyAnimations.js';
import { BABITO_ANIMATION_CLIPS } from '../game/BabitoAnimations.js';
import { PlayerController } from '../game/PlayerController.js';
import { createJungleScenery } from '../game/jungleScenery.js';
import { shouldCollideWithTerrain } from '../game/platformCollision.js';
import { isPowerProjectile, makeImpact } from '../game/PowerSystem.js';
import {
  findSupportingSurface,
  placeOnSurface,
  TUTORIAL_SIGN_STYLE,
} from '../game/surfaceAnchoring.js';
import { createButton, focusGameCanvas } from '../ui/Button.js';
import { createTouchControls, prefersTouchControls } from '../ui/touchControls.js';
import { TEXT_METRICS_REFRESH_EVENT } from '../ui/textQuality.js';
import {
  addPixelBackground,
  announce,
  BACKGROUND_ASSETS,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
} from '../ui/sceneHelpers.js';
import { approach } from '../game/playerMovement.js';
import {
  dismissToast,
  hitStop,
  prefersReducedMotion,
  showToast,
  spawnDust,
  transitionToScene,
} from '../ui/effects.js';

const CAMERA_LOOK_AHEAD = 110;
const CAMERA_LOOK_AHEAD_SPEED = 240;
const CAMERA_VERTICAL_OFFSET = 40;
const DROP_HINT_EARLIEST_MS = 4600;
const DROP_HINT_REST_MS = 650;

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data = {}) {
    this.requestedLevelId = data?.level ?? null;
  }

  create() {
    this.store = this.registry.get('saveStore');
    this.save = this.store.getState();
    if (!this.save.selectedPower) {
      this.scene.start('PowerScene');
      return;
    }

    let qaLevelId = null;
    if (import.meta.env.DEV && typeof location !== 'undefined') {
      qaLevelId = new URLSearchParams(location.search).get('qaLevel');
    }
    // The saved progress scene decides which level CONTINUAR resumes.
    this.levelConfig = getLevel(this.requestedLevelId ?? qaLevelId ?? this.save.progress?.scene);
    this.level = this.levelConfig.data;
    this.qaCombat = false;
    this.qaCheckpointId = null;
    this.qaCheckpointActive = false;
    this.qaMotion = null;
    this.qaMotionFrame = null;
    this.qaSize = null;
    this.qaEnemyType = null;
    this.qaEnemyState = null;
    this.qaEnemyFrame = null;
    if (import.meta.env.DEV && typeof location !== 'undefined') {
      const params = new URLSearchParams(location.search);
      this.qaCombat = params.get('qaCombat') === '1';
      this.qaCheckpointId = params.get('qaCheckpoint');
      const requestedMotion = params.get('qaMotion')?.trim().toLowerCase();
      const requestedFrameParam = params.get('qaFrame');
      const requestedFrame = requestedFrameParam == null
        ? null
        : Number(requestedFrameParam);
      const requestedSize = params.get('qaSize')?.trim().toLowerCase();
      const requestedEnemyType = params.get('qaEnemy')?.trim().toLowerCase();
      const requestedEnemyState = params.get('qaEnemyState')?.trim() || null;
      const requestedEnemyFrameParam = params.get('qaEnemyFrame');
      const requestedEnemyFrame = requestedEnemyFrameParam == null
        ? null
        : Number(requestedEnemyFrameParam);
      this.qaMotion = [
        'idle', 'walk', 'run', 'jump', 'fall', 'attack', 'hurt', 'dead',
      ].includes(requestedMotion) ? requestedMotion : null;
      this.qaMotionFrame = requestedFrame != null
        && Number.isInteger(requestedFrame)
        && requestedFrame >= 0
        ? requestedFrame
        : null;
      this.qaSize = ['small', 'normal', 'large'].includes(requestedSize)
        ? requestedSize
        : null;
      this.qaEnemyType = Object.hasOwn(gameData.enemies, requestedEnemyType)
        ? requestedEnemyType
        : null;
      this.qaEnemyState = requestedEnemyState;
      this.qaEnemyFrame = requestedEnemyFrame != null
        && Number.isInteger(requestedEnemyFrame)
        && requestedEnemyFrame >= 0
        ? requestedEnemyFrame
        : null;
    }
    this.enemyControllers = [];
    this.gameplayTime = 0;
    this.defeatedEnemies = 0;
    this.paused = false;
    this.transitioning = false;
    this.fallRecoveryPending = false;
    this.hitStopRemaining = 0;
    this.cameraLookAhead = CAMERA_LOOK_AHEAD;

    this.physics.world.setBounds(0, 0, this.level.worldWidth, 620);
    this.cameras.main.setBounds(0, 0, this.level.worldWidth, 540);
    this.cameras.main.setBackgroundColor(this.levelConfig.cameraColor);
    this.background = addPixelBackground(this, this.levelConfig.theme, {
      depth: -50,
      assetKey: BACKGROUND_ASSETS[this.levelConfig.backgroundAsset]?.key,
      assetOverscan: 1.1,
      showGround: this.levelConfig.theme === 'babilandia',
    });
    this.createWorldDecoration({ showSkyline: !this.background.assetKey });
    this.createPlatforms();
    this.createSprings();
    this.createCheckpoints();

    const qaCheckpoint = this.level.checkpoints.find(
      (entry) => entry.id === this.qaCheckpointId,
    );
    this.qaCheckpointActive = Boolean(qaCheckpoint);
    const savedCheckpoint = qaCheckpoint
      ?? (this.qaCombat || this.qaEnemyType
        ? this.level.checkpoints[0]
        : (this.level.checkpoints.find((entry) => entry.id === this.save.progress.checkpoint)
          ?? this.level.checkpoints[0]));
    this.projectiles = this.physics.add.group();
    this.coins = this.physics.add.group();
    this.createPlacedCoins();
    this.enemySprites = this.physics.add.group();

    this.player = new PlayerController(this, {
      x: savedCheckpoint.x,
      y: savedCheckpoint.y - 20,
      save: this.save,
      platforms: this.platforms,
      projectiles: this.projectiles,
      onHealth: (health, maxHealth) => {
        this.updateHealthHud(health, maxHealth);
        if (health <= 0) this.pauseButton?.setEnabled(false);
      },
      onGameOver: () => this.showGameOver(),
    });
    this.player.setCheckpoint(savedCheckpoint.x, savedCheckpoint.y - 20);
    if (savedCheckpoint.id !== this.level.checkpoints[0].id) this.player.grantSpawnGrace();
    if (this.qaSize) this.player.avatar.setSizeVariant(this.qaSize);
    // The follow offset is driven every frame toward the facing direction so
    // the player always sees more of the space they are moving into.
    this.cameras.main.startFollow(
      this.player.body,
      true,
      0.1,
      0.09,
      -this.cameraLookAhead,
      CAMERA_VERTICAL_OFFSET,
    );
    this.cameras.main.setDeadzone(48, 100);

    this.createEnemies();
    if (this.qaEnemyType) {
      const qaEnemy = this.enemyControllers.find((enemy) => enemy.type === this.qaEnemyType);
      if (qaEnemy) {
        for (const enemy of this.enemyControllers) {
          if (enemy === qaEnemy) continue;
          enemy.sprite.body.enable = false;
          enemy.sprite.setActive(false).setVisible(false);
          enemy.visual.setVisible(false);
          enemy.stateBadge?.setVisible(false);
        }
        const qaX = 390;
        let qaY = qaEnemy.type === 'vuela' ? 270 : qaEnemy.sprite.y;
        if (qaEnemy.type !== 'vuela') {
          const support = findSupportingSurface(this.level.platforms, {
            x: qaX,
            width: qaEnemy.sprite.body.width,
            kinds: ['ground'],
          });
          const bodyBottomOffset = qaEnemy.sprite.body.bottom - qaEnemy.sprite.y;
          if (support) qaY = support.surfaceY - bodyBottomOffset;
        }
        qaEnemy.home.set(qaX, qaY);
        qaEnemy.sprite.setPosition(qaX, qaY);
        const applied = qaEnemy.setQaPresentation(
          this.qaEnemyState ?? qaEnemy.config.states[0],
          this.qaEnemyFrame,
        );
        if (!applied) {
          qaEnemy.setQaPresentation(qaEnemy.config.states[0], this.qaEnemyFrame);
        }
      }
    } else if (this.qaCombat) {
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

    if (!this.qaCheckpointActive && !this.qaEnemyType) {
      this.store.setProgress({ scene: this.levelConfig.progressScene, checkpoint: savedCheckpoint.id });
    }
    announce(this.levelConfig.announcement);
    const controlsHint = this.levelConfig.introToast ?? (this.touchControls
      ? '◀ ▶ para moverte · ↑ para saltar (mantén para subir más) · ✦ para atacar'
      : 'A/D o ←/→ para moverte · W/↑/ESPACIO para saltar · J/X para atacar');
    showToast(this, controlsHint, {
      duration: 4200,
      y: 82,
    });
  }

  createPlatforms() {
    this.platforms = this.physics.add.staticGroup();
    const { tiles } = this.levelConfig;
    for (const platform of this.level.platforms) {
      const texture = PLATFORM_STYLE_TEXTURES[platform.style]
        ?? (platform.kind === 'ground' ? tiles.ground : tiles.platform);
      const tile = this.add.tileSprite(platform.x, platform.y, platform.width, platform.height, texture)
        .setDepth(4);
      tile.setData({ isPlatform: true, kind: platform.kind });
      this.platforms.add(tile);
    }
  }

  createWorldDecoration({ showSkyline = true } = {}) {
    if (this.levelConfig.theme === 'jungle') {
      this.scenery = createJungleScenery(this, this.level);
      for (const definition of this.level.tutorialSigns ?? []) {
        this.createTutorialSign(definition);
      }
      return;
    }
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
    for (const definition of this.level.tutorialSigns ?? []) {
      this.createTutorialSign(definition);
    }
    for (let x = 100; x < this.level.worldWidth; x += 260) {
      this.add.image(x, 467, 'prop_flower').setDepth(7).setScale(x % 520 === 0 ? 1.2 : 0.85);
    }
  }

  createTutorialSign(definition) {
    const placement = placeOnSurface(this.level.platforms, {
      x: definition.x,
      width: TUTORIAL_SIGN_STYLE.postWidth,
      originX: 0.5,
      originY: 1,
    });
    if (!placement) {
      console.warn(`Tutorial sign "${definition.id}" has no supporting surface.`);
      return null;
    }

    const label = createLabel(this, definition.text, 0, 0, {
      fontSize: '12px',
      wordWrapWidth: TUTORIAL_SIGN_STYLE.maxBoardWidth
        - TUTORIAL_SIGN_STYLE.textPaddingX * 2,
      depth: 0,
      scrollFactor: 1,
      color: 0xffffff,
    });
    const graphics = this.add.graphics();
    const layoutSign = () => {
      const boardWidth = Math.min(
        TUTORIAL_SIGN_STYLE.maxBoardWidth,
        Math.max(
          TUTORIAL_SIGN_STYLE.minBoardWidth,
          Math.ceil(label.width) + TUTORIAL_SIGN_STYLE.textPaddingX * 2,
        ),
      );
      const boardHeight = Math.max(
        TUTORIAL_SIGN_STYLE.minBoardHeight,
        Math.ceil(label.height) + TUTORIAL_SIGN_STYLE.textPaddingY * 2,
      );
      const boardLeft = -Math.ceil(boardWidth / 2);
      const evenBoardWidth = Math.ceil(boardWidth / 2) * 2;
      const boardTop = -TUTORIAL_SIGN_STYLE.postHeight - boardHeight;

      graphics.clear();
      graphics.fillStyle(0x020814, 0.58);
      graphics.fillRect(boardLeft + 4, boardTop + 5, evenBoardWidth, boardHeight);
      graphics.fillStyle(0x071326, 1);
      graphics.fillRect(-5, -TUTORIAL_SIGN_STYLE.postHeight, 10, TUTORIAL_SIGN_STYLE.postHeight);
      graphics.fillRect(boardLeft, boardTop, evenBoardWidth, boardHeight);
      graphics.fillStyle(0x7b4327, 1);
      graphics.fillRect(-3, -TUTORIAL_SIGN_STYLE.postHeight, 6, TUTORIAL_SIGN_STYLE.postHeight);
      graphics.fillStyle(0xb96635, 1);
      graphics.fillRect(boardLeft + 3, boardTop + 3, evenBoardWidth - 6, boardHeight - 6);
      graphics.fillStyle(0xd9914f, 1);
      graphics.fillRect(boardLeft + 8, boardTop + 6, evenBoardWidth - 16, 3);
      graphics.fillStyle(0x824326, 1);
      graphics.fillRect(boardLeft + 8, boardTop + boardHeight - 9, evenBoardWidth - 16, 3);
      graphics.fillStyle(0xe8c088, 1);
      graphics.fillRect(boardLeft + 7, boardTop + 7, 3, 3);
      graphics.fillRect(boardLeft + evenBoardWidth - 10, boardTop + boardHeight - 10, 3, 3);
      label.setPosition(0, Math.round(boardTop + boardHeight / 2));
    };
    layoutSign();
    label.on(TEXT_METRICS_REFRESH_EVENT, layoutSign);

    const sign = this.add.container(placement.x, placement.y, [graphics, label])
      .setDepth(6)
      .setScrollFactor(1)
      .setData({
        decoration: true,
        tutorialSign: definition.id,
        supportKind: placement.support.platform.kind,
        surfaceY: placement.surfaceY,
      });
    return sign;
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

  createPlacedCoins() {
    this.placedCoins = this.physics.add.staticGroup();
    const claimed = new Set(this.save.progress?.claimedRewards ?? []);
    const reducedMotion = prefersReducedMotion();
    for (const definition of this.level.coins ?? []) {
      const rewardId = `${this.levelConfig.coinRewardPrefix}${definition.id}`;
      const alreadyClaimed = claimed.has(rewardId);
      const coin = this.placedCoins.create(definition.x, definition.y, 'coin')
        .setDepth(12)
        .setData({ rewardId, claimed: alreadyClaimed })
        // A coin collected in an earlier run stays as a faint marker: the
        // route remains readable on replay without paying out twice.
        .setAlpha(alreadyClaimed ? 0.32 : 1);
      coin.body.setCircle(11, -1, -1);
      coin.refreshBody();
      if (!reducedMotion) {
        this.tweens.add({
          targets: coin,
          y: definition.y - 3,
          duration: 520,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: (definition.x * 7) % 400,
        });
      }
    }
  }

  getPlacedCoinProgress() {
    const total = this.placedCoins?.getLength?.() ?? 0;
    let collected = 0;
    this.placedCoins?.children?.iterate((coin) => {
      if (coin?.getData('claimed')) collected += 1;
    });
    return { collected, total };
  }

  /** Continuous base ground under a walker, so it never steps into a pit. */
  getWalkBounds(definition) {
    if (definition.type === 'vuela') return null;
    return getGroundSpans(this.level.platforms)
      .find((span) => definition.x >= span.left && definition.x <= span.right) ?? null;
  }

  createEnemies() {
    for (const definition of this.level.enemies) {
      const controller = new EnemyController(
        this,
        { ...definition, walkBounds: this.getWalkBounds(definition) },
        this.player.body,
        (enemy, dropCount) => this.handleEnemyDefeat(enemy, dropCount),
      );
      this.enemyControllers.push(controller);
      this.enemySprites.add(controller.sprite);
      if (enemyUsesPlatformCollision(controller.type)) {
        this.physics.add.collider(
          controller.sprite,
          this.platforms,
          null,
          shouldCollideWithTerrain,
        );
      }
    }
  }

  createSprings() {
    this.springs = this.physics.add.staticGroup();
    for (const definition of this.level.springs ?? []) {
      const placement = placeOnSurface(this.level.platforms, {
        x: definition.x, width: 40, originX: 0.5, originY: 1,
      });
      if (!placement) continue;
      const spring = this.springs.create(placement.x, placement.y, 'spring_mushroom')
        .setOrigin(0.5, 1)
        .setDepth(7)
        .setData({ launchHeight: definition.launchHeight ?? 240 });
      spring.refreshBody();
      // Only the cap is bouncy: a narrow, low body reads exactly like the art.
      spring.body.setSize(38, 14).setOffset(5, 4);
    }
  }

  canBounceOnSpring(spring) {
    const body = this.player?.body?.body;
    if (!body || !spring?.active || this.player.isDead) return false;
    // Land on the cap from above; walking into the stem does nothing.
    return body.velocity.y > 0 && body.prev.y + body.height <= spring.body.top + 10;
  }

  bounceOnSpring(spring) {
    const launched = this.player.launchFromSpring(spring.getData('launchHeight'));
    if (!launched) return;
    this.registry.get('audio')?.play('jump');
    spawnDust(this, spring.x, spring.y - 18, { count: 6, spread: 18, color: 0xffb3c2, depth: 13 });
    if (!prefersReducedMotion()) {
      this.tweens.killTweensOf(spring);
      spring.setScale(1);
      this.tweens.add({
        targets: spring, scaleY: 0.72, scaleX: 1.14, duration: 70, yoyo: true, ease: 'Quad.easeOut',
      });
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
      fontSize: '13px', color: 0xff779b, depth: 15, scrollFactor: 1,
    });
  }

  createPhysicsInteractions() {
    this.physics.add.collider(
      this.coins,
      this.platforms,
      null,
      shouldCollideWithTerrain,
    );
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
      if (damaged) hitStop(this, 35);
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
    this.physics.add.overlap(
      this.player.body,
      this.placedCoins,
      (_playerBody, coin) => this.collectPlacedCoin(coin),
    );
    this.physics.add.overlap(this.player.body, this.checkpointSprites, (_playerBody, flag) => {
      this.activateCheckpoint(flag.getData('checkpoint'), flag);
    });
    this.physics.add.overlap(this.player.body, this.portal, () => this.tryEnterBoss());
    this.physics.add.overlap(
      this.player.body,
      this.springs,
      (_playerBody, spring) => this.bounceOnSpring(spring),
      (_playerBody, spring) => this.canBounceOnSpring(spring),
    );
  }

  handleEnemyDefeat(enemy, dropCount) {
    if (this.qaCombat) dropCount = 2;
    this.defeatedEnemies += 1;
    this.enemySprites.remove(enemy.sprite, false, false);
    hitStop(this, 70);
    this.cameras.main.shake(90, 0.003);
    spawnDust(this, enemy.sprite.x, enemy.sprite.body?.bottom ?? enemy.sprite.y, {
      count: 8, spread: 22, color: 0xffffff, depth: 13,
    });
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
    this.celebrateCoin(x, y, '+1');
  }

  collectPlacedCoin(coin) {
    if (!coin?.active) return;
    const x = coin.x;
    const y = coin.y;
    const rewardId = coin.getData('rewardId');
    const wasClaimed = coin.getData('claimed');
    this.tweens.killTweensOf(coin);
    coin.disableBody(true, true);
    if (wasClaimed || this.qaCheckpointActive || this.qaEnemyType) {
      // Replayed markers and QA routes give visual feedback only.
      spawnDust(this, x, y + 6, { count: 3, spread: 8, color: 0xfff1a8, depth: 13 });
      return;
    }
    const result = this.store.claimReward(rewardId, 1);
    coin.setData('claimed', true);
    this.celebrateCoin(x, y, result.claimed ? '+1' : '');
  }

  celebrateCoin(x, y, label) {
    this.registry.get('audio')?.play('coin');
    this.save = this.store.getState();
    this.updateCoinHud();
    spawnDust(this, x, y + 6, { count: 5, spread: 10, color: 0xffe36e, depth: 13 });
    if (this.coinText && !prefersReducedMotion()) {
      this.tweens.killTweensOf(this.coinText);
      this.coinText.setScale(1);
      this.tweens.add({ targets: this.coinText, scale: 1.25, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    }
    if (!label) return;
    const pop = createLabel(this, label, x, y - 4, {
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
    if (!this.qaCheckpointActive) {
      this.store.setProgress({ checkpoint: checkpoint.id, scene: this.levelConfig.progressScene });
    }
    this.checkpointSprites.children.iterate((entry) => entry?.clearTint());
    flag.setTint(0xffe36e);
    showToast(
      this,
      this.qaCheckpointActive
        ? '✓ Checkpoint QA activo · corazones restaurados'
        : '✓ Checkpoint guardado · corazones restaurados',
      { type: 'success', duration: 1500 },
    );
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
      fontSize: '12px', color: 0xbdefff, depth: 1001,
    });
    hud.add([this.healthText, this.coinText, this.powerText, this.progressText]);

    this.pauseButton = createButton(this, {
      x: 894,
      y: 31,
      width: 104,
      height: 34,
      label: 'Ⅱ PAUSA',
      fontSize: '12px',
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
    this.touchControls = createTouchControls(this, () => this.player, {
      y: 470, strokeColor: 0x71e5ff, fillAlpha: 0.44,
    });
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
      this.player.applyKnockback(-220, -160, 260);
      if (this.gameplayTime < (this.nextPortalWarningAt ?? 0)) return;
      this.nextPortalWarningAt = this.gameplayTime + 1400;
      const remaining = this.enemyControllers.filter((enemy) => !enemy.dead);
      const names = [...new Set(remaining.map((enemy) => enemy.config.name))].join(', ');
      // Every surviving encounter lies behind the portal, so point the way back.
      showToast(
        this,
        `Portal sellado: ${remaining.length === 1 ? 'queda 1 Bicharraco' : `quedan ${remaining.length} Bicharracos`} (${names}) ← atrás.`,
        { type: 'warning', duration: 1800 },
      );
      return;
    }
    this.transitioning = true;
    this.player.setEnabled(false);
    const { boss } = this.levelConfig;
    this.store.setProgress({ scene: boss.progressScene, checkpoint: boss.checkpoint });
    transitionToScene(this, boss.scene, {}, { announcement: boss.announcement });
  }

  togglePause() {
    if (
      this.gameOverContainer
      || this.transitioning
      || this.fallRecoveryPending
      || this.player?.isDead
    ) return;
    this.paused = !this.paused;
    if (this.paused) this.showPauseOverlay();
    else this.closePauseOverlay();
  }

  setGameplaySystemsPaused(paused) {
    if (paused) {
      this.physics.world.pause();
      this.tweens.pauseAll();
      this.time.paused = true;
      this.enemyControllers.forEach((enemy) => enemy.visual?.anims?.pause());
      return;
    }

    this.time.paused = false;
    this.tweens.resumeAll();
    this.physics.world.resume();
    this.enemyControllers.forEach((enemy) => enemy.visual?.anims?.resume());
  }

  showPauseOverlay() {
    this.player.setEnabled(false);
    // Toast timers run on the paused scene clock; never leave one on top.
    dismissToast(this);
    this.pauseButton?.setEnabled(false);
    this.setGameplaySystemsPaused(true);
    this.pauseOverlay = this.add.container(0, 0).setDepth(3000).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x020814, 0.76).setInteractive();
    const panel = createPanel(this, 480, 270, 520, 360, { depth: 3001 });
    const title = createTitle(this, 'PAUSA', 480, 150, { fontSize: 34, depth: 3002 });
    const coinProgress = this.getPlacedCoinProgress();
    const controls = createBodyText(this,
      'Mover: A/D o ←/→ · Bajar: S / ↓\nSaltar: W / ↑ / Espacio (mantén para más altura)\nAtacar: J / X · Pausa: P / Esc',
      480,
      226,
      { fontSize: 17, depth: 3002, lineSpacing: 8 },
    );
    const coinSummary = createLabel(
      this,
      `BABICOINS ESCONDIDAS  ${coinProgress.collected}/${coinProgress.total}`,
      480,
      288,
      { fontSize: '13px', color: 0xffcf3c, depth: 3002 },
    );
    const resume = createButton(this, {
      x: 480, y: 338, width: 250, height: 48, label: 'CONTINUAR', variant: 'primary', depth: 3003,
      onPress: () => this.closePauseOverlay(),
    });
    const titleButton = createButton(this, {
      x: 480, y: 405, width: 280, height: 44, label: 'VOLVER AL TÍTULO', fontSize: '12px', variant: 'ghost', depth: 3003,
      onPress: () => {
        this.setGameplaySystemsPaused(false);
        transitionToScene(this, 'TitleScene');
      },
    });
    this.pauseOverlay.add([shade, panel, title, controls, coinSummary, resume, titleButton]);
    resume.focusAccessible();
    announce('Juego en pausa.');
  }

  closePauseOverlay() {
    this.paused = false;
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
    this.setGameplaySystemsPaused(false);
    const canResumePlayer = !this.fallRecoveryPending && !this.player?.isDead;
    this.player.setEnabled(canResumePlayer);
    this.pauseButton?.setEnabled(canResumePlayer);
    focusGameCanvas(this);
    announce('Juego reanudado.');
  }

  showGameOver() {
    if (this.gameOverContainer) return;
    dismissToast(this);
    this.fallRecoveryPending = false;
    this.pauseButton?.setEnabled(false);
    this.setGameplaySystemsPaused(true);
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
        this.setGameplaySystemsPaused(false);
        this.player.respawn();
        this.resetEnemiesNearCheckpoint();
        this.pauseButton?.setEnabled(true);
        focusGameCanvas(this);
        announce('Reintento desde el último checkpoint.');
      },
    });
    const titleButton = createButton(this, {
      x: 480, y: 386, width: 240, height: 42, label: 'TÍTULO', variant: 'ghost', depth: 4003,
      onPress: () => {
        this.setGameplaySystemsPaused(false);
        transitionToScene(this, 'TitleScene');
      },
    });
    this.gameOverContainer.add([shade, panel, title, copy, retry, titleButton]);
    retry.focusAccessible();
    announce('Sin corazones. Reintenta desde el último checkpoint.');
  }

  resetEnemiesNearCheckpoint(radius = 700) {
    const { x } = this.player.checkpoint;
    for (const enemy of this.enemyControllers) {
      if (Math.abs(enemy.sprite.x - x) < radius || Math.abs(enemy.home.x - x) < radius) {
        enemy.resetToHome();
      }
    }
  }

  handleFall() {
    if (this.fallRecoveryPending || this.gameOverContainer) return;
    this.fallRecoveryPending = true;
    this.pauseButton?.setEnabled(false);
    this.scenery?.splash(this.player.body.x);
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
        this.resetEnemiesNearCheckpoint();
        this.fallRecoveryPending = false;
        this.pauseButton?.setEnabled(true);
      });
    }
  }

  setHitStop(durationMs) {
    if (this.paused || this.gameOverContainer || this.transitioning) return;
    this.hitStopRemaining = Math.max(this.hitStopRemaining, Math.max(0, Number(durationMs) || 0));
    if (this.hitStopRemaining > 0 && !this.physics.world.isPaused) this.physics.world.pause();
  }

  updateCameraLookAhead(deltaMs) {
    if (!this.player?.body?.active) return;
    const moving = Math.abs(this.player.body.body.velocity.x) > 40;
    const target = moving ? this.player.facing * CAMERA_LOOK_AHEAD : this.cameraLookAhead;
    this.cameraLookAhead = approach(
      this.cameraLookAhead,
      target,
      CAMERA_LOOK_AHEAD_SPEED * (deltaMs / 1000),
    );
    this.cameras.main.setFollowOffset(-this.cameraLookAhead, CAMERA_VERTICAL_OFFSET);
  }

  /** Teaches ↓ the first time the player rests on a platform, once per visit. */
  updateDropHint(frameDelta) {
    if (this.dropHintShown || !this.player?.enabled) return;
    if (this.player.hasDroppedThrough) {
      this.dropHintShown = true;
      return;
    }
    // Never replace the opening controls toast.
    if (this.gameplayTime < DROP_HINT_EARLIEST_MS) return;
    const resting = this.player.isStandingOnOneWayPlatform();
    this.platformRestMs = resting ? (this.platformRestMs ?? 0) + frameDelta : 0;
    if (this.platformRestMs < DROP_HINT_REST_MS) return;
    this.dropHintShown = true;
    showToast(this, this.touchControls ? '▼ para bajar de la plataforma' : 'S/↓ para bajar de la plataforma', {
      duration: 1800,
      y: 82,
    });
  }

  update(_time, delta) {
    if (this.paused || this.gameOverContainer || this.transitioning) return;

    const frameDelta = Math.max(0, Number(delta) || 0);
    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= frameDelta;
      if (this.hitStopRemaining > 0) return;
      this.hitStopRemaining = 0;
      this.physics.world.resume();
    }

    this.gameplayTime += frameDelta;

    this.player?.update(this.gameplayTime);
    if (this.qaMotion) {
      const qaVelocity = this.qaMotion === 'run'
        ? { x: 280, y: 0 }
        : (this.qaMotion === 'walk'
          ? { x: 135, y: 0 }
          : { x: 0, y: this.qaMotion === 'jump' ? -260 : 220 });
      this.player.avatar.setMotion(this.qaMotion, qaVelocity);
      if (this.qaMotionFrame != null) {
        const clip = BABITO_ANIMATION_CLIPS[this.qaMotion];
        const localFrame = Math.min(this.qaMotionFrame, clip.frameCount - 1);
        this.player.avatar.motionElapsedMs = (localFrame * 1000) / clip.fps;
      }
    }
    this.enemyControllers.forEach((enemy) => enemy.update());
    this.updateCameraLookAhead(frameDelta);
    this.updateDropHint(frameDelta);
    this.scenery?.update(this.cameras.main);
    if (this.player?.body.y > 575) this.handleFall();
    this.progressText?.setText(`ENCUENTROS  ${this.defeatedEnemies}/${this.level.enemies.length}`);
  }

  getGameplayTime() {
    return this.gameplayTime ?? 0;
  }
}
