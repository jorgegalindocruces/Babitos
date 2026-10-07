import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { PlayerController } from '../game/PlayerController.js';
import { createTextures, TEXTURE_KEYS } from '../game/createTextures.js';
import {
  getPower,
  isPowerProjectile,
  launchPower,
  makeImpact,
} from '../game/PowerSystem.js';
import { createButton } from '../ui/Button.js';
import {
  addPixelBackground,
  announce,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
} from '../ui/sceneHelpers.js';
import {
  createAmbientMotes,
  fadeIn,
  flashScreen,
  showToast,
  transitionToScene,
} from '../ui/effects.js';

const ARENA_WIDTH = 960;
const ARENA_HEIGHT = 540;
const FLOOR_TOP = 482;

function prefersTouchControls() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
}

function setWorldBodySize(sprite, width, height) {
  const scaleX = Math.max(0.001, Math.abs(sprite.scaleX));
  const scaleY = Math.max(0.001, Math.abs(sprite.scaleY));
  sprite.body.setSize(width / scaleX, height / scaleY, true);
}

const BOSS_STATE = Object.freeze({
  INTRO: 'INTRO',
  FIREBALL: 'FIREBALL',
  FROM_ABOVE: 'FROM_ABOVE',
  FURY_CHARGE: 'FURY_CHARGE',
  RECOVER: 'RECOVER',
  PURIFIED: 'PURIFIED',
});

const STATE_COPY = Object.freeze({
  [BOSS_STATE.INTRO]: 'LA CORRUPCIÓN DESPIERTA',
  [BOSS_STATE.FIREBALL]: 'BOLA DE FUEGO · ¡SALTA!',
  [BOSS_STATE.FROM_ABOVE]: 'ATAQUE SUPERIOR · ¡MIRA LA MARCA!',
  [BOSS_STATE.FURY_CHARGE]: 'EMBESTIDA FURIOSA · ¡APÁRTATE!',
  [BOSS_STATE.RECOVER]: 'RECOVER · ¡ATACA AHORA!',
  [BOSS_STATE.PURIFIED]: 'PURIFICADO',
});

const ATTACK_TINT = Object.freeze({
  [BOSS_STATE.FIREBALL]: 0xff704d,
  [BOSS_STATE.FROM_ABOVE]: 0xe35cff,
  [BOSS_STATE.FURY_CHARGE]: 0xff376d,
  [BOSS_STATE.RECOVER]: 0x91ffc2,
});

function colorNumber(cssColor, fallback = 0xffffff) {
  if (typeof cssColor !== 'string') return fallback;
  const parsed = Number.parseInt(cssColor.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export class BossScene extends Phaser.Scene {
  constructor() {
    super('BossScene');
  }

  create() {
    createTextures(this);

    this.store = this.registry.get('saveStore');
    if (!this.store) {
      throw new Error('BossScene requires saveStore in the Phaser registry.');
    }

    const persistedSave = this.store.getState();
    this.save = {
      ...persistedSave,
      selectedPower: persistedSave.selectedPower ?? gameData.powers[0].id,
    };
    this.qaOneHit = false;
    if (import.meta.env.DEV && typeof location !== 'undefined') {
      this.qaOneHit = new URLSearchParams(location.search).get('qaOneHit') === '1';
    }
    this.bossConfig = gameData.bossData.babito_corrupto;
    this.bossHealth = this.qaOneHit ? 1 : this.bossConfig.health;
    this.bossState = BOSS_STATE.INTRO;
    this.bossVulnerable = false;
    this.patternIndex = 0;
    this.stateNonce = 0;
    this.encounterTimers = new Set();
    this.physicsLinks = [];
    this.nextBlockedFeedbackAt = 0;
    this.nextContactDamageAt = 0;
    this.paused = false;
    this.encounterSuspended = false;
    this.gameOverShown = false;
    this.transitioning = false;
    this.bossDefeated = false;
    this.aboveDropping = false;
    this.furyCharging = false;

    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBackgroundColor('#26143f');

    addPixelBackground(this, 'babilandia', {
      depth: -100,
      showGround: false,
      musicTheme: 'boss',
    });
    this.registry.get('audio')?.play('boss');
    this.createCorruptedBackdrop();
    this.createArena();

    this.playerProjectiles = this.physics.add.group();
    this.bossProjectiles = this.physics.add.group();
    this.bossHazards = this.physics.add.group();

    this.player = new PlayerController(this, {
      x: 145,
      y: FLOOR_TOP - 38,
      save: this.save,
      platforms: this.platforms,
      projectiles: this.playerProjectiles,
      onHealth: (health, maxHealth) => this.updateHealthHud(health, maxHealth),
      onGameOver: () => this.showGameOver(),
    });
    this.player.setCheckpoint(145, FLOOR_TOP - 38);

    this.createBoss();
    if (this.qaOneHit) this.boss.setX(350);
    this.createPhysicsInteractions();
    this.createHud();
    if (prefersTouchControls()) this.createTouchControls();
    this.createPauseKeys();

    this.store.setProgress({ scene: 'boss1', checkpoint: 'boss_gate' });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    fadeIn(this, { duration: 280 });
    announce('Combate contra Babito Corrupto. Tras cada patrón entra en RECOVER y queda vulnerable.');
    showToast(this, 'Esquiva el patrón · Ataca solo cuando aparezca RECOVER', {
      type: 'warning',
      duration: 3600,
      y: 102,
    });

    this.schedule(this.qaOneHit ? 120 : 1250, () => {
      if (this.qaOneHit) this.enterRecover();
      else this.startNextPattern();
    });
  }

  createCorruptedBackdrop() {
    const veil = this.add.graphics().setDepth(-20);
    veil.fillStyle(0x2f124d, 0.34);
    veil.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    veil.fillStyle(0x5f226f, 0.32);
    for (let x = 55; x < ARENA_WIDTH; x += 125) {
      const height = 55 + ((x * 7) % 100);
      veil.fillTriangle(x - 32, FLOOR_TOP, x, FLOOR_TOP - height, x + 34, FLOOR_TOP);
    }

    const portal = this.add.graphics().setDepth(-8);
    portal.fillStyle(0x150d2e, 0.9);
    portal.fillEllipse(790, 305, 184, 246);
    portal.lineStyle(7, 0xc74dff, 0.42);
    portal.strokeEllipse(790, 305, 184, 246);
    portal.lineStyle(3, 0x7ce7ff, 0.2);
    portal.strokeEllipse(790, 305, 145, 205);

    createAmbientMotes(this, {
      seed: 'boss-corruption',
      count: 26,
      color: 0xe074ff,
      minAlpha: 0.16,
      maxAlpha: 0.48,
      minSpeed: 5,
      maxSpeed: 16,
      depth: -7,
    });
  }

  createArena() {
    this.platformDefinitions = [
      { x: 480, y: 511, width: 960, height: 58, texture: TEXTURE_KEYS.tileStone, floor: true },
      { x: 288, y: 376, width: 176, height: 20, texture: TEXTURE_KEYS.tilePlatform },
      { x: 666, y: 352, width: 170, height: 20, texture: TEXTURE_KEYS.tilePlatform },
    ];
    this.platforms = this.physics.add.staticGroup();

    for (const definition of this.platformDefinitions) {
      const platform = this.add.tileSprite(
        definition.x,
        definition.y,
        definition.width,
        definition.height,
        definition.texture,
      ).setDepth(4).setData('isPlatform', true);
      this.platforms.add(platform);
      definition.gameObject = platform;
    }

    const edge = this.add.graphics().setDepth(5);
    edge.fillStyle(0xb04be6, 0.72);
    edge.fillRect(0, FLOOR_TOP, ARENA_WIDTH, 5);
    edge.fillStyle(0xffffff, 0.12);
    edge.fillRect(0, FLOOR_TOP + 5, ARENA_WIDTH, 3);

    createLabel(this, 'ARENA DEL PORTAL', 480, 116, {
      fontSize: '11px',
      color: 0xf0bdff,
      depth: 7,
      scrollFactor: 1,
    });
  }

  createBoss() {
    this.boss = this.physics.add.sprite(790, FLOOR_TOP - 48, TEXTURE_KEYS.bossCorrupt)
      .setDepth(14)
      .setDisplaySize(132, 132)
      .setCollideWorldBounds(true);
    setWorldBodySize(this.boss, 76, 84);
    this.bossBaseScale = { x: this.boss.scaleX, y: this.boss.scaleY };
    this.boss.body.setMaxVelocity(650, 1000);
    this.boss.setDataEnabled();
    this.boss.setData({ boss: true, health: this.bossHealth });

    this.bossAura = this.add.circle(this.boss.x, this.boss.y, 53, 0xc84fff, 0.12)
      .setStrokeStyle(3, 0xf19aff, 0.38)
      .setDepth(13);
    this.tweens.add({
      targets: this.bossAura,
      scale: 1.14,
      alpha: 0.22,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createPhysicsInteractions() {
    this.physicsLinks.push(
      this.physics.add.collider(this.boss, this.platforms, () => this.handleBossLanding()),
      this.physics.add.collider(this.playerProjectiles, this.platforms, (first, second) => {
        const projectile = isPowerProjectile(first) ? first : (isPowerProjectile(second) ? second : null);
        if (!projectile?.active) return;
        makeImpact(this, projectile.x, projectile.y, 0xffcf3c);
        projectile.destroy();
      }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second)),
      this.physics.add.collider(this.bossProjectiles, this.platforms, (first, second) => {
        const projectile = isPowerProjectile(first) ? first : (isPowerProjectile(second) ? second : null);
        if (!projectile?.active) return;
        makeImpact(this, projectile.x, projectile.y, 0xff5a36);
        projectile.destroy();
      }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second)),
      this.physics.add.overlap(this.playerProjectiles, this.boss, (first, second) => {
        const projectile = isPowerProjectile(first) ? first : (isPowerProjectile(second) ? second : null);
        const boss = projectile === first ? second : first;
        this.handleBossHit(projectile, boss);
      }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second)),
      this.physics.add.overlap(this.player.body, this.bossProjectiles, (_body, projectile) => {
        this.hitPlayerWithObject(projectile);
      }),
      this.physics.add.overlap(this.player.body, this.bossHazards, (_body, hazard) => {
        this.hitPlayerWithObject(hazard);
      }),
      this.physics.add.overlap(this.player.body, this.boss, () => this.handleBossContact()),
    );
  }

  createHud() {
    createPanel(this, 480, 42, 930, 74, {
      depth: 998,
      radius: 10,
      fillColor: 0x120f2d,
      fillAlpha: 0.94,
      strokeColor: 0xa84fda,
      shadow: false,
    });

    this.playerPortrait = new BabitoAvatar(
      this,
      53,
      42,
      this.save.appearance,
      this.save.size,
    );
    this.playerPortrait.setScale(0.64).setDepth(1002).setScrollFactor(0);

    this.healthText = createLabel(this, '', 132, 29, {
      fontSize: '16px', color: 0xff668d, depth: 1002,
    });
    const power = getPower(this.save.selectedPower);
    this.powerText = createLabel(this, `${power.name.toUpperCase()} · J / X`, 160, 57, {
      fontSize: '10px',
      color: colorNumber(power.color, 0x71e5ff),
      depth: 1002,
    });
    this.bossNameText = createLabel(this, this.bossConfig.name, 620, 20, {
      fontSize: '12px', color: 0xffc2ee, depth: 1002,
    });
    this.bossBar = this.add.graphics().setDepth(1002).setScrollFactor(0);
    this.bossHealthText = createLabel(this, '', 620, 46, {
      fontSize: '10px', color: 0xffffff, depth: 1003,
    });
    this.stateText = createLabel(this, STATE_COPY[BOSS_STATE.INTRO], 620, 66, {
      fontSize: '9px', color: 0xffcf63, depth: 1003,
    });
    createLabel(this, 'P / ESC · PAUSA', 881, 65, {
      fontSize: '8px', color: 0xa9d8ef, depth: 1002,
    });
    this.pauseButton = createButton(this, {
      x: 898,
      y: 91,
      width: 104,
      height: 32,
      label: 'Ⅱ PAUSA',
      fontSize: '9px',
      variant: 'ghost',
      depth: 1004,
      accessibleLabel: 'Pausar el combate',
      keyboardShortcuts: false,
      onPress: () => this.togglePause(),
    });

    this.updateHealthHud(this.player.health, gameData.player.maxHealth);
    this.drawBossBar();
  }

  drawBossBar() {
    if (!this.bossBar) return;
    const x = 368;
    const y = 36;
    const width = 504;
    const height = 19;
    const ratio = Phaser.Math.Clamp(this.bossHealth / this.bossConfig.health, 0, 1);
    const fill = this.bossVulnerable ? 0x55df83 : 0xe24d96;

    this.bossBar.clear();
    this.bossBar.fillStyle(0x030715, 1);
    this.bossBar.fillRoundedRect(x, y, width, height, 5);
    this.bossBar.fillStyle(0x4c244a, 1);
    this.bossBar.fillRoundedRect(x + 3, y + 3, width - 6, height - 6, 3);
    if (ratio > 0) {
      this.bossBar.fillStyle(fill, 1);
      this.bossBar.fillRoundedRect(x + 3, y + 3, (width - 6) * ratio, height - 6, 3);
    }
    this.bossBar.lineStyle(2, 0xffc4ef, 0.8);
    this.bossBar.strokeRoundedRect(x, y, width, height, 5);
    this.bossHealthText?.setText(`${this.bossHealth} / ${this.bossConfig.health}`);
  }

  updateHealthHud(health, maxHealth) {
    const full = '♥ '.repeat(Math.max(0, health));
    const empty = '♡ '.repeat(Math.max(0, maxHealth - health));
    this.healthText?.setText(`${full}${empty}`.trim());
  }

  createTouchControls() {
    const createPad = (x, label, control) => {
      const pad = this.add.circle(x, 444, 27, 0x071326, 0.48)
        .setStrokeStyle(2, 0xc66cff, 0.52)
        .setDepth(900)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });
      const text = createLabel(this, label, x, 444, {
        fontSize: '14px', color: 0xffffff, depth: 901,
      });
      const down = () => this.player?.setVirtualControl(control, true);
      const up = () => this.player?.setVirtualControl(control, false);
      pad.on('pointerdown', down)
        .on('pointerup', up)
        .on('pointerout', up)
        .on('pointerupoutside', up);
      this.touchControls ??= [];
      this.touchControls.push(pad, text);
    };

    createPad(55, '◀', 'left');
    createPad(119, '▶', 'right');
    createPad(841, '↑', 'jump');
    createPad(907, '✦', 'attack');
  }

  createPauseKeys() {
    this.pauseHandler = (event) => {
      if (event?.repeat) return;
      this.togglePause();
    };
    this.input.keyboard?.on('keydown-P', this.pauseHandler);
    this.input.keyboard?.on('keydown-ESC', this.pauseHandler);
  }

  setBossState(state) {
    this.bossState = state;
    this.stateNonce += 1;
    this.stateText?.setText(STATE_COPY[state] ?? state);
    this.boss?.clearTint();
    if (ATTACK_TINT[state]) this.boss?.setTint(ATTACK_TINT[state]);
    this.drawBossBar();
    return this.stateNonce;
  }

  schedule(delay, callback) {
    let timer;
    timer = this.time.delayedCall(Math.max(0, delay), () => {
      this.encounterTimers.delete(timer);
      if (!this.sys.isActive()) return;
      callback();
    });
    this.encounterTimers.add(timer);
    return timer;
  }

  scheduleForState(nonce, delay, callback) {
    return this.schedule(delay, () => {
      if (
        nonce !== this.stateNonce
        || this.encounterSuspended
        || this.bossDefeated
      ) return;
      callback();
    });
  }

  startNextPattern() {
    if (this.encounterSuspended || this.bossDefeated || !this.boss?.active) return;
    this.bossVulnerable = false;
    this.clearAttackObjects();
    this.boss
      .setAngle(0)
      .setAlpha(1)
      .setScale(this.bossBaseScale.x, this.bossBaseScale.y);
    this.boss.body.checkCollision.none = false;
    this.boss.body.allowGravity = true;
    this.boss.setVelocity(0);

    const patterns = this.bossConfig.patterns;
    const pattern = patterns[this.patternIndex % patterns.length];
    this.patternIndex += 1;
    if (pattern === BOSS_STATE.FIREBALL) this.runFireballPattern();
    else if (pattern === BOSS_STATE.FROM_ABOVE) this.runFromAbovePattern();
    else this.runFuryChargePattern();
  }

  runFireballPattern() {
    const nonce = this.setBossState(BOSS_STATE.FIREBALL);
    this.faceBossTowardPlayer();
    this.boss.setVelocityX(0);
    this.showPatternCue('BOLA DE FUEGO', 'Salta sobre las bolas horizontales', 0xff7254);

    this.tweens.add({
      targets: this.boss,
      scaleX: this.bossBaseScale.x * 1.12,
      scaleY: this.bossBaseScale.y * 0.9,
      duration: 180,
      yoyo: true,
      repeat: 2,
    });

    const extraShot = this.bossHealth <= Math.ceil(this.bossConfig.health / 2);
    this.scheduleForState(nonce, 620, () => this.spawnBossFireball(-7));
    this.scheduleForState(nonce, 970, () => this.spawnBossFireball(15));
    if (extraShot) this.scheduleForState(nonce, 1300, () => this.spawnBossFireball(-18));
    this.scheduleForState(nonce, extraShot ? 1940 : 1650, () => this.enterRecover());
  }

  spawnBossFireball(yOffset = 0) {
    if (!this.boss?.active) return;
    this.faceBossTowardPlayer();
    const facing = this.bossFacing;
    const projectile = launchPower(this, this.bossProjectiles, {
      x: this.boss.x + facing * 48,
      y: this.boss.y + yOffset,
      facing,
      powerId: 'fire',
      owner: 'boss',
    });
    projectile.setScale(1.28);
    projectile.setVelocityX((this.bossHealth <= 8 ? 450 : 390) * facing);
    projectile.body.allowGravity = false;
    projectile.setData('damage', 1);
    flashScreen(this, { color: 0xff5a36, duration: 45 });
  }

  runFromAbovePattern() {
    const nonce = this.setBossState(BOSS_STATE.FROM_ABOVE);
    this.showPatternCue('ATAQUE SUPERIOR', 'La marca enseña dónde va a caer', 0xd876ff);
    const targetX = Phaser.Math.Clamp(this.player.body.x, 80, ARENA_WIDTH - 80);
    const landingY = this.getLandingSurfaceY(targetX);
    this.createLandingMarker(targetX, landingY);

    this.boss.setVelocity(0);
    this.boss.body.allowGravity = false;
    this.boss.body.checkCollision.none = true;
    this.boss.setAlpha(0.46);
    this.tweens.add({
      targets: this.boss,
      x: targetX,
      y: 96,
      duration: 470,
      ease: 'Quad.easeOut',
    });

    this.scheduleForState(nonce, 720, () => {
      this.boss.setPosition(targetX, 74).setAlpha(1);
      this.boss.body.checkCollision.none = false;
      this.boss.body.allowGravity = true;
      this.boss.setVelocity(0, 880);
      this.aboveDropping = true;
      this.landingMarker?.setData('armed', true);
      this.cameras.main.shake(90, 0.004);
    });

    this.scheduleForState(nonce, 2300, () => {
      if (!this.aboveDropping) return;
      this.aboveDropping = false;
      this.boss.setPosition(targetX, landingY - 48).setVelocity(0);
      this.finishFromAboveLanding(nonce);
    });
  }

  createLandingMarker(x, y) {
    this.destroyLandingMarker();
    const marker = this.add.container(x, y - 6).setDepth(11);
    const outer = this.add.ellipse(0, 0, 112, 28, 0x5b123f, 0.3)
      .setStrokeStyle(4, 0xff59b4, 0.85);
    const inner = this.add.ellipse(0, 0, 54, 14, 0xff4d9c, 0.38)
      .setStrokeStyle(2, 0xffffff, 0.8);
    const crossH = this.add.rectangle(0, 0, 88, 3, 0xffffff, 0.68);
    const crossV = this.add.rectangle(0, 0, 3, 25, 0xffffff, 0.68);
    marker.add([outer, inner, crossH, crossV]);
    marker.setDataEnabled();
    this.tweens.add({ targets: marker, scale: 1.18, alpha: 0.42, duration: 240, yoyo: true, repeat: -1 });
    this.landingMarker = marker;
  }

  getLandingSurfaceY(x) {
    let surfaceY = FLOOR_TOP;
    for (const platform of this.platformDefinitions) {
      if (platform.floor) continue;
      const left = platform.x - platform.width / 2;
      const right = platform.x + platform.width / 2;
      if (x >= left && x <= right) {
        surfaceY = Math.min(surfaceY, platform.y - platform.height / 2);
      }
    }
    return surfaceY;
  }

  handleBossLanding() {
    if (!this.aboveDropping || this.bossState !== BOSS_STATE.FROM_ABOVE) return;
    if (!this.boss.body.blocked.down && !this.boss.body.touching.down) return;
    this.aboveDropping = false;
    this.finishFromAboveLanding(this.stateNonce);
  }

  finishFromAboveLanding(nonce) {
    if (nonce !== this.stateNonce || this.encounterSuspended) return;
    this.boss.setVelocity(0);
    this.destroyLandingMarker();
    makeImpact(this, this.boss.x, this.boss.y + 38, 0xf089ff);
    flashScreen(this, { color: 0xd45cff, duration: 95 });
    this.cameras.main.shake(160, 0.009);
    this.spawnShockwave(-1);
    this.spawnShockwave(1);
    this.scheduleForState(nonce, 620, () => this.enterRecover());
  }

  spawnShockwave(direction) {
    const hazard = this.physics.add.image(
      this.boss.x + direction * 38,
      this.boss.y + 33,
      TEXTURE_KEYS.projectileRock,
    ).setDepth(12).setTint(0xe569ff).setScale(1.1, 0.65);
    hazard.body.allowGravity = false;
    hazard.setVelocityX(direction * 335);
    hazard.setDataEnabled();
    hazard.setData({ damage: 1, ignorePlatforms: true });
    this.bossHazards.add(hazard);
    this.schedule(920, () => hazard?.active && hazard.destroy());
  }

  runFuryChargePattern() {
    const nonce = this.setBossState(BOSS_STATE.FURY_CHARGE);
    this.faceBossTowardPlayer();
    const direction = this.bossFacing;
    this.showPatternCue('EMBESTIDA FURIOSA', 'Salta o corre al otro lado', 0xff4f86);
    this.boss.setVelocityX(0);

    this.tweens.add({
      targets: this.boss,
      angle: { from: -7 * direction, to: 7 * direction },
      duration: 75,
      yoyo: true,
      repeat: 5,
    });

    this.scheduleForState(nonce, 610, () => {
      this.furyCharging = true;
      this.boss.setAngle(0);
      this.boss.setVelocityX(direction * (this.bossHealth <= 8 ? 610 : 535));
      this.boss.setVelocityY(-55);
      this.cameras.main.shake(100, 0.005);
    });
    this.scheduleForState(nonce, 1450, () => {
      this.furyCharging = false;
      this.boss.setVelocityX(0);
      this.enterRecover();
    });
  }

  showPatternCue(title, hint, color) {
    if (this.patternCue?.scene) this.patternCue.destroy(true);
    const cue = this.add.container(480, 142).setDepth(800).setScrollFactor(0);
    const plate = this.add.rectangle(0, 0, 440, 52, 0x09091d, 0.78)
      .setStrokeStyle(2, color, 0.92);
    const heading = createLabel(this, title, 0, -9, {
      fontSize: '12px', color, depth: 801,
    }).setScrollFactor(1);
    const copy = createLabel(this, hint, 0, 12, {
      fontSize: '8px', color: 0xffffff, depth: 801,
    }).setScrollFactor(1);
    cue.add([plate, heading, copy]);
    cue.setAlpha(0).setScale(0.92);
    this.tweens.add({
      targets: cue,
      alpha: 1,
      scale: 1,
      duration: 140,
      yoyo: true,
      hold: 720,
      onComplete: () => cue?.scene && cue.destroy(true),
    });
    this.patternCue = cue;
    announce(`${title}. ${hint}`);
  }

  enterRecover() {
    if (this.encounterSuspended || this.bossDefeated || !this.boss?.active) return;
    this.aboveDropping = false;
    this.furyCharging = false;
    this.destroyLandingMarker();
    this.clearAttackObjects();
    this.bossVulnerable = true;
    const nonce = this.setBossState(BOSS_STATE.RECOVER);
    this.boss.setVelocityX(0);
    this.boss.body.allowGravity = true;
    this.boss.body.checkCollision.none = false;
    this.boss.setAngle(-7);
    this.drawBossBar();
    showToast(this, `¡RECOVER! Ataca durante ${this.bossConfig.vulnerableMs / 1000} s`, {
      type: 'success',
      duration: 1250,
      y: 102,
    });
    announce('RECOVER. Babito Corrupto está vulnerable. Ataca ahora.', { politeness: 'assertive' });

    this.scheduleForState(nonce, this.bossConfig.vulnerableMs, () => {
      this.bossVulnerable = false;
      this.boss.setAngle(0);
      this.startNextPattern();
    });
  }

  handleBossHit(projectile) {
    if (!projectile?.active || projectile.getData('owner') !== 'player' || this.bossDefeated) return;
    const impactX = projectile.x;
    const impactY = projectile.y;

    if (!this.bossVulnerable || this.bossState !== BOSS_STATE.RECOVER) {
      makeImpact(this, impactX, impactY, 0x8cdfff);
      projectile.destroy();
      this.tweens.add({ targets: this.boss, alpha: 0.55, duration: 65, yoyo: true });
      if (this.time.now >= this.nextBlockedFeedbackAt) {
        this.nextBlockedFeedbackAt = this.time.now + 950;
        showToast(this, 'La corrupción bloquea el golpe. Espera a RECOVER.', {
          type: 'warning', duration: 900, y: 102,
        });
      }
      return;
    }

    const damage = Math.max(1, Number(projectile.getData('damage')) || 1);
    projectile.destroy();
    this.bossHealth = Math.max(0, this.bossHealth - damage);
    this.boss.setData('health', this.bossHealth);
    makeImpact(this, impactX, impactY, 0xffffff);
    flashScreen(this, { color: 0xffffff, duration: 55 });
    this.cameras.main.shake(70, 0.004);
    this.tweens.add({ targets: this.boss, alpha: 0.34, duration: 70, yoyo: true });
    this.drawBossBar();

    if (this.bossHealth <= 0) this.purifyBoss();
  }

  hitPlayerWithObject(object) {
    if (!object?.active || this.encounterSuspended || this.bossDefeated) return;
    const damaged = this.player.takeDamage(object.x, object.getData('damage') ?? 1);
    makeImpact(this, object.x, object.y, damaged ? 0xff648c : 0x8d5cb7);
    object.destroy();
  }

  handleBossContact() {
    if (
      this.encounterSuspended
      || this.bossDefeated
      || (!this.aboveDropping && !this.furyCharging)
      || this.time.now < this.nextContactDamageAt
    ) return;
    if (this.player.takeDamage(this.boss.x, 1)) {
      this.nextContactDamageAt = this.time.now + 600;
      makeImpact(this, this.player.body.x, this.player.body.y, 0xff4f86);
    }
  }

  faceBossTowardPlayer() {
    if (!this.player?.body || !this.boss) return;
    this.bossFacing = this.player.body.x < this.boss.x ? -1 : 1;
    this.boss.setFlipX(this.bossFacing > 0);
  }

  purifyBoss() {
    if (this.bossDefeated) return;
    this.bossDefeated = true;
    this.registry.get('audio')?.play('checkpoint');
    this.encounterSuspended = true;
    this.bossVulnerable = false;
    this.stateNonce += 1;
    this.cancelEncounterTimers();
    this.clearAttackObjects();
    this.destroyLandingMarker();
    this.patternCue?.destroy(true);
    this.patternCue = null;
    this.player.setEnabled(false);
    this.boss.setVelocity(0).setAngle(0).setAlpha(1).clearTint();
    this.boss.body.allowGravity = true;
    this.boss.body.checkCollision.none = false;
    this.boss.setTexture(TEXTURE_KEYS.bossCured);
    this.boss.setDisplaySize(72, 72);
    setWorldBodySize(this.boss, 44, 48);
    this.bossState = BOSS_STATE.PURIFIED;
    this.stateText.setText(STATE_COPY[BOSS_STATE.PURIFIED]).setColor('#91ffc2');
    this.bossAura.setFillStyle(0x79ffd0, 0.16).setStrokeStyle(3, 0xb5ffe5, 0.62);
    this.drawBossBar();

    this.store.setProgress({
      boss1Defeated: true,
      phase1Complete: true,
      scene: 'shop',
    });
    const reward = this.store.claimReward('boss1_reward', this.bossConfig.rewardCoins);
    const rewardCopy = reward.claimed
      ? `Recompensa: +${this.bossConfig.rewardCoins} Babicoins`
      : 'La recompensa de este combate ya estaba guardada.';

    flashScreen(this, { color: 0xb8ffe6, duration: 330, force: true });
    this.cameras.main.shake(220, 0.006);
    this.createPurificationBurst();
    announce('Babito Corrupto ha sido purificado. No ha muerto: vuelve a ser un Babito normal.', {
      politeness: 'assertive',
    });
    this.schedule(560, () => this.showPurificationDialogue(rewardCopy));
  }

  createPurificationBurst() {
    for (let index = 0; index < 18; index += 1) {
      const mote = this.add.image(this.boss.x, this.boss.y, TEXTURE_KEYS.particleDot)
        .setDepth(25)
        .setTint(index % 2 === 0 ? 0x8dffcf : 0xffffff)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.7));
      const angle = (Math.PI * 2 * index) / 18;
      const distance = Phaser.Math.Between(55, 125);
      this.tweens.add({
        targets: mote,
        x: mote.x + Math.cos(angle) * distance,
        y: mote.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: Phaser.Math.Between(520, 850),
        ease: 'Quad.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
  }

  showPurificationDialogue(rewardCopy) {
    if (!this.sys.isActive() || this.purificationPanel) return;
    const container = this.add.container(0, 0).setDepth(3500).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x030517, 0.45).setInteractive();
    const panel = createPanel(this, 480, 389, 720, 252, {
      depth: 3501,
      fillColor: 0x103b38,
      strokeColor: 0x8fffd4,
      fillAlpha: 0.97,
    });
    const title = createTitle(this, '¡PURIFICADO!', 480, 302, {
      fontSize: '29px', color: 0xbaffdf, depth: 3502,
    });
    const dialogue = createBodyText(
      this,
      '«Gracias… La oscuridad ya no decide por mí.»\nBabito Corrupto no muere: recupera su forma normal.',
      480,
      357,
      { fontSize: '17px', wordWrapWidth: 620, lineSpacing: 6, depth: 3502 },
    );
    const reward = createLabel(this, rewardCopy, 480, 410, {
      fontSize: '11px', color: 0xffdf68, depth: 3502,
    });
    const continueButton = createButton(this, {
      x: 480,
      y: 469,
      width: 290,
      height: 50,
      label: 'IR A LA TIENDA',
      accessibleLabel: 'Continuar a la tienda',
      variant: 'primary',
      depth: 3503,
      onPress: () => this.goToShop(),
    });
    container.add([shade, panel, title, dialogue, reward, continueButton]);
    this.purificationPanel = container;
  }

  goToShop() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player?.setEnabled(false);
    transitionToScene(this, 'ShopScene', {}, {
      announcement: 'La purificación está completa. Entrando en la tienda.',
      duration: 260,
    });
  }

  togglePause() {
    if (
      this.gameOverShown
      || this.bossDefeated
      || this.transitioning
      || this.encounterSuspended
      || (this.player?.health ?? 0) <= 0
    ) return;
    if (this.paused) this.closePauseOverlay();
    else this.showPauseOverlay();
  }

  showPauseOverlay() {
    if (this.pauseOverlay) return;
    this.paused = true;
    this.player.setEnabled(false);
    this.pauseButton?.setEnabled(false);
    this.physics.world.pause();
    this.tweens.pauseAll();

    const overlay = this.add.container(0, 0).setDepth(4000).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x020414, 0.8).setInteractive();
    const panel = createPanel(this, 480, 270, 530, 356, { depth: 4001, strokeColor: 0xb75ee6 });
    const title = createTitle(this, 'PAUSA', 480, 150, { fontSize: '34px', depth: 4002 });
    const controls = createBodyText(
      this,
      'Mover: A/D o ←/→\nSaltar: W / ↑ / Espacio\nAtacar: J / X\nSolo RECOVER recibe daño',
      480,
      232,
      { fontSize: '18px', lineSpacing: 8, depth: 4002 },
    );
    const resume = createButton(this, {
      x: 480, y: 337, width: 255, height: 48, label: 'CONTINUAR', variant: 'primary', depth: 4003,
      onPress: () => this.closePauseOverlay(),
    });
    const titleButton = createButton(this, {
      x: 480, y: 402, width: 280, height: 43, label: 'VOLVER AL TÍTULO', fontSize: '12px', variant: 'ghost', depth: 4003,
      onPress: () => this.leaveForTitle(),
    });
    overlay.add([shade, panel, title, controls, resume, titleButton]);
    this.pauseOverlay = overlay;
    this.time.paused = true;
    announce('Combate en pausa.');
  }

  closePauseOverlay() {
    if (!this.paused) return;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.physics.world.resume();
    this.pauseOverlay?.destroy(true);
    this.pauseOverlay = null;
    this.paused = false;
    this.player.setEnabled(true);
    this.pauseButton?.setEnabled(true);
    announce('Combate reanudado.');
  }

  showGameOver() {
    if (this.gameOverShown || this.bossDefeated) return;
    this.gameOverShown = true;
    this.encounterSuspended = true;
    this.pauseButton?.setEnabled(false);
    this.physics.world.pause();
    this.tweens.pauseAll();

    const overlay = this.add.container(0, 0).setDepth(4500).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x020414, 0.84).setInteractive();
    const panel = createPanel(this, 480, 270, 520, 315, {
      depth: 4501, strokeColor: 0xff527f, fillColor: 0x281027,
    });
    const title = createTitle(this, '¡ÁNIMO, BABITO!', 480, 177, {
      fontSize: '30px', depth: 4502,
    });
    const copy = createBodyText(
      this,
      'Ya conoces sus patrones. Esquiva, espera a RECOVER y vuelve a intentarlo.',
      480,
      241,
      { fontSize: '17px', wordWrapWidth: 420, depth: 4502 },
    );
    const retry = createButton(this, {
      x: 480, y: 322, width: 245, height: 50, label: 'REINTENTAR', variant: 'primary', depth: 4503,
      onPress: () => this.restartFight(),
    });
    const titleButton = createButton(this, {
      x: 480, y: 388, width: 245, height: 43, label: 'TÍTULO', variant: 'ghost', depth: 4503,
      onPress: () => this.leaveForTitle(),
    });
    overlay.add([shade, panel, title, copy, retry, titleButton]);
    this.gameOverContainer = overlay;
    this.time.paused = true;
    announce('Sin corazones. Puedes reintentar el combate.', { politeness: 'assertive' });
  }

  restartFight() {
    this.time.paused = false;
    this.tweens.resumeAll();
    this.physics.world.resume();
    this.scene.restart();
  }

  leaveForTitle() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.time.paused = false;
    this.tweens.resumeAll();
    this.physics.world.resume();
    transitionToScene(this, 'TitleScene', {}, {
      announcement: 'Volviendo al título.',
      duration: 220,
    });
  }

  clearAttackObjects() {
    this.bossProjectiles?.clear(true, true);
    this.bossHazards?.clear(true, true);
  }

  destroyLandingMarker() {
    if (!this.landingMarker) return;
    this.tweens.killTweensOf(this.landingMarker);
    this.landingMarker.destroy(true);
    this.landingMarker = null;
  }

  cancelEncounterTimers() {
    for (const timer of this.encounterTimers) timer?.remove(false);
    this.encounterTimers.clear();
  }

  update(time) {
    if (
      this.paused
      || this.gameOverShown
      || this.transitioning
      || this.bossDefeated
      || this.encounterSuspended
    ) return;

    this.player?.update(time);
    if (this.bossAura?.active && this.boss?.active) {
      this.bossAura.setPosition(this.boss.x, this.boss.y);
    }
    if (
      this.bossState !== BOSS_STATE.FURY_CHARGE
      && this.bossState !== BOSS_STATE.FROM_ABOVE
      && this.bossState !== BOSS_STATE.RECOVER
    ) {
      this.faceBossTowardPlayer();
    }
    if (this.furyCharging && (this.boss.body.blocked.left || this.boss.body.blocked.right)) {
      this.boss.setVelocityX(0);
    }
  }

  cleanup() {
    this.input.keyboard?.off('keydown-P', this.pauseHandler);
    this.input.keyboard?.off('keydown-ESC', this.pauseHandler);
    this.time.paused = false;
    this.physics?.world?.resume();
    this.tweens?.resumeAll();
    this.cancelEncounterTimers();
    this.destroyLandingMarker();
    for (const link of this.physicsLinks ?? []) link?.destroy();
    this.physicsLinks = [];
    for (const group of [this.playerProjectiles, this.bossProjectiles, this.bossHazards]) {
      if (group?.children) group.clear(true, true);
    }
    this.player?.destroy();
    this.player = null;
  }
}
