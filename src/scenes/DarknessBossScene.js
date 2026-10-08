import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { PlayerController } from '../game/PlayerController.js';
import { shouldCollideWithTerrain } from '../game/platformCollision.js';
import { createTextures, TEXTURE_KEYS } from '../game/createTextures.js';
import { ensureSoftLightTexture } from '../game/jungleScenery.js';
import {
  getPower,
  isPowerProjectile,
  makeImpact,
} from '../game/PowerSystem.js';
import { createButton, focusGameCanvas } from '../ui/Button.js';
import { createTouchControls, prefersTouchControls } from '../ui/touchControls.js';
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
  dismissToast,
  fadeIn,
  flashScreen,
  hitStop,
  prefersReducedMotion,
  showToast,
  spawnDust,
  transitionToScene,
} from '../ui/effects.js';

const ARENA_WIDTH = 960;
const ARENA_HEIGHT = 540;
const FLOOR_TOP = 482;
const PLAYER_START_X = 160;

// La Oscuridad glides at the height of a standing Babito: jump it or climb.
const GLIDE_Y = 438;
const GLIDE_SPEED = 175;
const HOVER_Y = 250;
const RAIN_Y = 150;
const LIGHT_RADIUS = 140;
const WAVE_SPEED = 230;
const WAVE_MAX_MS = 1900;
const WAVE_WARN_MS = 480;
const ERUPTION_MS = 360;
const RAIN_WARN_MS = 760;
const RAIN_SPACING = 150;
const EXTINGUISH_WARN_MS = 1100;
const FADE_MS = 320;

const STATE = Object.freeze({
  INTRO: 'INTRO',
  SHIFT: 'SHIFT',
  SHADOW_GLIDE: 'SHADOW_GLIDE',
  SHADOW_RAIN: 'SHADOW_RAIN',
  DARK_WAVE: 'DARK_WAVE',
  EXTINGUISH: 'EXTINGUISH',
  EXPOSED: 'EXPOSED',
  DISPELLED: 'DISPELLED',
});

const STATE_COPY = Object.freeze({
  [STATE.INTRO]: 'LA OSCURIDAD SE AGITA',
  [STATE.SHIFT]: 'SE DESLIZA ENTRE SOMBRAS',
  [STATE.SHADOW_GLIDE]: 'SOMBRA RASANTE · ¡SALTA O SUBE!',
  [STATE.SHADOW_RAIN]: 'METEORITOS OSCUROS · ¡MIRA LAS MARCAS!',
  [STATE.DARK_WAVE]: 'ZONA OSCURA · ¡MUÉVETE!',
  [STATE.EXTINGUISH]: 'APAGA LA LUZ · ¡DISPARA AL FAROLILLO!',
  [STATE.EXPOSED]: 'EXPUESTA A LA LUZ · ¡ATACA!',
  [STATE.DISPELLED]: 'LUZ RECUPERADA',
});

// The three lanterns: two on the floor, one hanging over the centre that can
// only be lit from a platform. Hit areas are generous for straight shots.
const LANTERNS = Object.freeze([
  Object.freeze({ id: 'left', x: 92, y: 444, chain: false }),
  Object.freeze({ id: 'center', x: 480, y: 330, chain: true }),
  Object.freeze({ id: 'right', x: 868, y: 444, chain: false }),
]);

function setWorldBodySize(sprite, width, height) {
  const scaleX = Math.max(0.001, Math.abs(sprite.scaleX));
  const scaleY = Math.max(0.001, Math.abs(sprite.scaleY));
  sprite.body.setSize(width / scaleX, height / scaleY, true);
}

function colorNumber(cssColor, fallback = 0xffffff) {
  if (typeof cssColor !== 'string') return fallback;
  const parsed = Number.parseInt(cssColor.replace('#', ''), 16);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Boss of La Jungla. La Oscuridad is intangible in the dark; lit lanterns make
 * her solid and vulnerable for a moment, after which she drinks that light.
 */
export class DarknessBossScene extends Phaser.Scene {
  constructor() {
    super('DarknessBossScene');
  }

  create() {
    createTextures(this);
    ensureSoftLightTexture(this);

    this.store = this.registry.get('saveStore');
    if (!this.store) throw new Error('DarknessBossScene requires saveStore in the Phaser registry.');
    const persistedSave = this.store.getState();
    this.save = {
      ...persistedSave,
      selectedPower: persistedSave.selectedPower ?? gameData.powers[0].id,
    };
    this.qaOneHit = false;
    if (import.meta.env.DEV && typeof location !== 'undefined') {
      this.qaOneHit = new URLSearchParams(location.search).get('qaOneHit') === '1';
    }
    this.bossConfig = gameData.bossData.la_oscuridad;
    this.bossHealth = this.qaOneHit ? 1 : this.bossConfig.health;
    this.bossState = STATE.INTRO;
    this.stateNonce = 0;
    this.patternIndex = 0;
    this.patternsSinceExtinguish = 0;
    this.encounterTimers = new Set();
    this.physicsLinks = [];
    this.paused = false;
    this.encounterSuspended = false;
    this.gameOverShown = false;
    this.transitioning = false;
    this.bossDefeated = false;
    this.gameplayTime = 0;
    this.hitStopRemaining = 0;
    this.nextPassThroughHintAt = 0;
    this.nextContactDamageAt = 0;
    this.moveTarget = null;
    this.wave = null;
    this.fades = [];

    this.physics.world.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBounds(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
    this.cameras.main.setBackgroundColor('#0b1a24');

    addPixelBackground(this, 'jungle', {
      depth: -100,
      showGround: false,
      musicTheme: 'darkness',
    });
    this.registry.get('audio')?.play('boss');
    this.createBackdrop();
    this.createArena();
    this.createLanterns();

    this.playerProjectiles = this.physics.add.group();
    this.bossHazards = this.physics.add.group({ allowGravity: false });

    this.player = new PlayerController(this, {
      x: PLAYER_START_X,
      y: FLOOR_TOP - 38,
      save: this.save,
      platforms: this.platforms,
      projectiles: this.playerProjectiles,
      onHealth: (health, maxHealth) => this.updateHealthHud(health, maxHealth),
      onGameOver: () => this.showGameOver(),
    });
    this.player.setCheckpoint(PLAYER_START_X, FLOOR_TOP - 38);

    this.createBoss();
    this.createPhysicsInteractions();
    this.createHud();
    if (prefersTouchControls()) this.createTouchControls();
    this.createPauseKeys();

    this.store.setProgress({ scene: 'boss2', checkpoint: 'portal_oscuro' });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    fadeIn(this, { duration: 280 });
    announce('Combate contra La Oscuridad. Enciende los farolillos disparándoles: la luz la vuelve sólida y vulnerable.');
    showToast(this, 'Dispara a los farolillos: su luz vuelve sólida a La Oscuridad', {
      type: 'warning',
      duration: 2200,
      y: 102,
    });

    // The centre lantern starts lit so the first glide teaches the loop.
    this.lightLantern(this.lanterns.find((lantern) => lantern.id === 'center'), { silent: true });
    this.schedule(this.qaOneHit ? 200 : 2300, () => {
      if (this.qaOneHit) this.enterExposed(null);
      else this.startNextPattern();
    });
  }

  createBackdrop() {
    const veil = this.add.rectangle(0, 0, ARENA_WIDTH, ARENA_HEIGHT, 0x050818, 0.62)
      .setOrigin(0)
      .setDepth(-40);
    const ruins = this.add.graphics().setDepth(-35);
    ruins.fillStyle(0x16242a, 1);
    for (const [x, height] of [[40, 300], [190, 220], [740, 250], [880, 320]]) {
      ruins.fillRect(x, FLOOR_TOP - height, 46, height);
      ruins.fillRect(x - 8, FLOOR_TOP - height, 62, 16);
    }
    ruins.fillRect(300, 120, 360, 22);
    ruins.fillRect(312, 142, 30, 60);
    ruins.fillRect(618, 142, 30, 60);
    this.backdrop = [veil, ruins];

    createAmbientMotes(this, {
      seed: 'darkness-arena',
      count: 24,
      color: 0x9c7cff,
      minAlpha: 0.12,
      maxAlpha: 0.4,
      minSpeed: 4,
      maxSpeed: 10,
      depth: -30,
    });
  }

  createArena() {
    const definitions = [
      { x: 480, y: 511, width: 960, height: 58, texture: TEXTURE_KEYS.tileRuin, kind: 'ground' },
      { x: 300, y: 380, width: 170, height: 20, texture: TEXTURE_KEYS.tileStone, kind: 'platform' },
      { x: 660, y: 380, width: 170, height: 20, texture: TEXTURE_KEYS.tileStone, kind: 'platform' },
    ];
    this.platforms = this.physics.add.staticGroup();
    for (const definition of definitions) {
      const platform = this.add.tileSprite(
        definition.x,
        definition.y,
        definition.width,
        definition.height,
        definition.texture,
      ).setDepth(4).setData({ isPlatform: true, kind: definition.kind });
      this.platforms.add(platform);
    }
  }

  createLanterns() {
    this.lanternGroup = this.physics.add.staticGroup();
    this.lanterns = LANTERNS.map((definition) => {
      const decor = this.add.graphics().setDepth(5);
      if (definition.chain) {
        decor.fillStyle(0x2b2f3a, 1);
        for (let y = 120; y < definition.y - 20; y += 10) decor.fillRect(definition.x - 2, y, 4, 7);
      } else {
        decor.fillStyle(0x3b2a20, 1);
        decor.fillRect(definition.x - 4, definition.y + 18, 8, FLOOR_TOP - definition.y - 18);
      }
      const glow = this.add.image(definition.x, definition.y, 'jungle_soft_light')
        .setDepth(-20)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale((LIGHT_RADIUS * 2.3) / 128)
        .setAlpha(0);
      const sprite = this.lanternGroup.create(definition.x, definition.y, TEXTURE_KEYS.lanternOff)
        .setDepth(6)
        .setScale(1.4);
      sprite.refreshBody();
      sprite.body.setSize(46, 72).setOffset((sprite.width - 46) / 2, (sprite.height - 72) / 2);
      const lantern = {
        ...definition,
        sprite,
        glow,
        decor,
        lit: false,
        litUntil: 0,
        flickering: false,
      };
      sprite.setData('lantern', lantern);
      return lantern;
    });
  }

  createBoss() {
    this.boss = this.physics.add.sprite(800, HOVER_Y, TEXTURE_KEYS.bossDarkness)
      .setDepth(14)
      .setDisplaySize(124, 124);
    this.boss.body.allowGravity = false;
    this.boss.setCollideWorldBounds(true);
    this.bossFacing = -1;
    this.bossAura = this.add.circle(this.boss.x, this.boss.y, 58, 0x5b3aa8, 0.16)
      .setStrokeStyle(2, 0x9c7cff, 0.32)
      .setDepth(13);
    this.exposedGlow = this.add.image(this.boss.x, this.boss.y, 'jungle_soft_light')
      .setDepth(15)
      .setScale(1.6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.55)
      .setVisible(false);
    if (!prefersReducedMotion()) {
      this.bossWobble = this.tweens.add({
        targets: this.boss,
        scaleX: this.boss.scaleX * 1.05,
        scaleY: this.boss.scaleY * 0.95,
        duration: 520,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
    this.setBossIntangible(true);
  }

  createPhysicsInteractions() {
    this.physicsLinks.push(
      this.physics.add.collider(this.playerProjectiles, this.platforms, (first, second) => {
        const projectile = isPowerProjectile(first) ? first : (isPowerProjectile(second) ? second : null);
        if (!projectile?.active) return;
        makeImpact(this, projectile.x, projectile.y, 0xffcf3c);
        projectile.destroy();
      }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second)),
      this.physics.add.overlap(this.playerProjectiles, this.lanternGroup, (first, second) => {
        const projectile = isPowerProjectile(first) ? first : second;
        const sprite = projectile === first ? second : first;
        this.handleLanternHit(projectile, sprite.getData('lantern'));
      }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second)),
      this.physics.add.overlap(this.playerProjectiles, this.boss, (first, second) => {
        const projectile = isPowerProjectile(first) ? first : (isPowerProjectile(second) ? second : null);
        this.handleBossHit(projectile);
      }, (first, second) => isPowerProjectile(first) || isPowerProjectile(second)),
      this.physics.add.overlap(this.player.body, this.bossHazards, (_body, hazard) => {
        this.hitPlayerWithHazard(hazard);
      }),
      this.physics.add.overlap(this.player.body, this.boss, () => this.handleBossContact()),
    );
  }

  createHud() {
    createPanel(this, 480, 42, 930, 74, {
      depth: 998,
      radius: 10,
      fillColor: 0x0d1424,
      fillAlpha: 0.94,
      strokeColor: 0x7e62d8,
      shadow: false,
    });
    this.playerPortrait = new BabitoAvatar(this, 53, 42, this.save.appearance, this.save.size);
    this.playerPortrait.setScale(0.64).setDepth(1002).setScrollFactor(0);
    this.healthText = createLabel(this, '', 132, 29, { fontSize: '16px', color: 0xff668d, depth: 1002 });
    const power = getPower(this.save.selectedPower);
    this.powerText = createLabel(this, `${power.name.toUpperCase()} · J / X`, 160, 57, {
      fontSize: '10px', color: colorNumber(power.color, 0x71e5ff), depth: 1002,
    });
    createLabel(this, this.bossConfig.name, 620, 20, { fontSize: '12px', color: 0xcbb8ff, depth: 1002 });
    this.bossBar = this.add.graphics().setDepth(1002).setScrollFactor(0);
    this.bossHealthText = createLabel(this, '', 620, 46, { fontSize: '10px', color: 0xffffff, depth: 1003 });
    this.stateText = createLabel(this, STATE_COPY[STATE.INTRO], 620, 66, {
      fontSize: '9px', color: 0xffcf63, depth: 1003,
    });
    createLabel(this, 'P / ESC · PAUSA', 881, 65, { fontSize: '8px', color: 0xa9d8ef, depth: 1002 });
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
    const fill = this.bossState === STATE.EXPOSED ? 0xffe27a : 0x7e62d8;
    this.bossBar.clear();
    this.bossBar.fillStyle(0x030715, 1);
    this.bossBar.fillRoundedRect(x, y, width, height, 5);
    this.bossBar.fillStyle(0x261d47, 1);
    this.bossBar.fillRoundedRect(x + 3, y + 3, width - 6, height - 6, 3);
    if (ratio > 0) {
      this.bossBar.fillStyle(fill, 1);
      this.bossBar.fillRoundedRect(x + 3, y + 3, (width - 6) * ratio, height - 6, 3);
    }
    this.bossBar.lineStyle(2, 0xcbb8ff, 0.8);
    this.bossBar.strokeRoundedRect(x, y, width, height, 5);
    this.bossHealthText?.setText(`${this.bossHealth} / ${this.bossConfig.health}`);
  }

  updateHealthHud(health, maxHealth) {
    const full = '♥ '.repeat(Math.max(0, health));
    const empty = '♡ '.repeat(Math.max(0, maxHealth - health));
    this.healthText?.setText(`${full}${empty}`.trim());
  }

  createTouchControls() {
    this.touchControls = createTouchControls(this, () => this.player, {
      y: 444, strokeColor: 0x9c7cff, fillAlpha: 0.48,
    });
  }

  createPauseKeys() {
    this.pauseHandler = (event) => {
      if (event?.repeat) return;
      this.togglePause();
    };
    this.input.keyboard?.on('keydown-P', this.pauseHandler);
    this.input.keyboard?.on('keydown-ESC', this.pauseHandler);
  }

  // ---------------------------------------------------------------- timing

  setBossState(state) {
    this.bossState = state;
    this.stateNonce += 1;
    this.stateText?.setText(STATE_COPY[state] ?? state);
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
      if (nonce !== this.stateNonce || this.encounterSuspended || this.bossDefeated) return;
      callback();
    });
  }

  // --------------------------------------------------------------- lanterns

  lightLantern(lantern, { silent = false } = {}) {
    if (!lantern) return;
    const wasLit = lantern.lit;
    lantern.lit = true;
    lantern.flickering = false;
    lantern.litUntil = this.gameplayTime + this.bossConfig.lanternLitMs;
    lantern.sprite.setTexture(TEXTURE_KEYS.lanternOn).setAlpha(1);
    lantern.glow.setAlpha(0.85);
    if (!wasLit && !silent) {
      this.registry.get('audio')?.play('checkpoint');
      spawnDust(this, lantern.x, lantern.y, { count: 6, spread: 16, color: 0xffe9a0, depth: 15 });
    }
  }

  extinguishLantern(lantern) {
    if (!lantern?.lit) return;
    lantern.lit = false;
    lantern.flickering = false;
    lantern.sprite.setTexture(TEXTURE_KEYS.lanternOff).setAlpha(1);
    lantern.glow.setAlpha(0);
    spawnDust(this, lantern.x, lantern.y - 10, { count: 5, spread: 12, color: 0x6b5aa8, depth: 15 });
  }

  handleLanternHit(projectile, lantern) {
    if (!projectile?.active || projectile.getData('owner') !== 'player' || !lantern) return;
    // A steadily lit lantern lets shots through, so it never shields her.
    if (lantern.lit && !lantern.flickering) {
      lantern.litUntil = Math.max(lantern.litUntil, this.gameplayTime + this.bossConfig.lanternLitMs * 0.5);
      return;
    }
    makeImpact(this, projectile.x, projectile.y, 0xffe9a0);
    projectile.destroy();
    this.lightLantern(lantern);
  }

  updateLanterns() {
    for (const lantern of this.lanterns) {
      if (!lantern.lit) continue;
      const remaining = lantern.litUntil - this.gameplayTime;
      if (remaining <= 0) {
        this.extinguishLantern(lantern);
        continue;
      }
      // The last seconds flicker so the player knows to re-light it.
      const fading = remaining < 3000 || lantern.flickering;
      const flicker = fading ? (Math.floor(this.gameplayTime / 110) % 2 === 0 ? 0.35 : 0.85) : 0.85;
      lantern.glow.setAlpha(flicker);
    }
  }

  /** The lit lantern whose light currently touches a point, if any. */
  lanternLightingPoint(x, y) {
    return this.lanterns.find((lantern) => (
      lantern.lit && Phaser.Math.Distance.Between(x, y, lantern.x, lantern.y) <= LIGHT_RADIUS
    )) ?? null;
  }

  // ----------------------------------------------------------------- boss

  setBossIntangible(intangible) {
    this.bossIntangible = intangible;
    // Low and wide while gliding (fair to jump); her whole body once exposed,
    // so arcing Rock shots connect as well as straight ones.
    if (intangible) setWorldBodySize(this.boss, 70, 50);
    else setWorldBodySize(this.boss, 78, 86);
    this.boss.setAlpha(intangible ? 0.78 : 1);
    if (intangible) this.boss.clearTint();
    // Exposed, a warm ring and a light halo make the solid body unmistakable.
    this.bossAura
      ?.setFillStyle(intangible ? 0x5b3aa8 : 0xffe27a, intangible ? 0.16 : 0.3)
      .setStrokeStyle(intangible ? 2 : 4, intangible ? 0x9c7cff : 0xfff3b0, intangible ? 0.32 : 0.95);
    this.exposedGlow?.setVisible(!intangible);
  }

  moveBossTo(x, y, speed, onArrive) {
    this.moveTarget = { x, y, speed, onArrive };
  }

  updateBossMovement() {
    if (!this.moveTarget || !this.boss?.active) return;
    const { x, y, speed, onArrive } = this.moveTarget;
    const distance = Phaser.Math.Distance.Between(this.boss.x, this.boss.y, x, y);
    const step = (speed * (this.frameDeltaMs ?? 16.67)) / 1000;
    if (distance <= Math.max(4, step)) {
      this.boss.setPosition(x, y).setVelocity(0, 0);
      this.moveTarget = null;
      onArrive?.();
      return;
    }
    this.physics.moveTo(this.boss, x, y, speed);
    if (Math.abs(this.boss.body.velocity.x) > 1) this.setBossFacing(Math.sign(this.boss.body.velocity.x));
  }

  setBossFacing(direction) {
    this.bossFacing = direction < 0 ? -1 : 1;
    this.boss.setFlipX(this.bossFacing > 0);
  }

  /** Fades out and reappears elsewhere: she travels through darkness. */
  shadowStep(x, y, onDone) {
    const nonce = this.setBossState(STATE.SHIFT);
    this.moveTarget = null;
    this.boss.setVelocity(0, 0);
    this.stopFades();
    this.fades.push(this.tweens.add({
      targets: [this.boss, this.bossAura],
      alpha: 0,
      duration: FADE_MS,
      onComplete: () => {
        if (nonce !== this.stateNonce || this.bossDefeated) return;
        this.boss.setPosition(x, y);
        this.bossAura.setPosition(x, y);
        this.setBossFacing(this.player.body.x < x ? -1 : 1);
        this.fades.push(
          this.tweens.add({ targets: this.boss, alpha: 0.78, duration: FADE_MS }),
          this.tweens.add({ targets: this.bossAura, alpha: 1, duration: FADE_MS }),
        );
        this.scheduleForState(nonce, FADE_MS + 60, onDone);
      },
    }));
  }

  stopFades() {
    for (const tween of this.fades ?? []) tween?.stop();
    this.fades = [];
  }

  startNextPattern() {
    if (this.encounterSuspended || this.bossDefeated || !this.boss?.active) return;
    this.clearHazards();
    this.setBossIntangible(true);
    const litCount = this.lanterns.filter((lantern) => lantern.lit).length;
    if (this.patternsSinceExtinguish >= 2 && litCount > 0) {
      this.patternsSinceExtinguish = 0;
      this.runExtinguish();
      return;
    }
    this.patternsSinceExtinguish += 1;
    const patterns = this.bossConfig.patterns;
    const pattern = patterns[this.patternIndex % patterns.length];
    this.patternIndex += 1;
    if (pattern === STATE.SHADOW_GLIDE) this.runGlide();
    else if (pattern === STATE.SHADOW_RAIN) this.runRain();
    else this.runWave();
  }

  runGlide() {
    // Start on the side away from the Babito so the glide is readable.
    const fromLeft = this.player.body.x > ARENA_WIDTH / 2;
    const startX = fromLeft ? 70 : ARENA_WIDTH - 70;
    const endX = fromLeft ? ARENA_WIDTH - 70 : 70;
    this.shadowStep(startX, GLIDE_Y, () => {
      const nonce = this.setBossState(STATE.SHADOW_GLIDE);
      this.showPatternCue('SOMBRA RASANTE', 'Salta por encima o sube a una plataforma');
      this.scheduleForState(nonce, 650, () => {
        this.gliding = true;
        this.moveBossTo(endX, GLIDE_Y, GLIDE_SPEED, () => {
          this.gliding = false;
          this.scheduleForState(nonce, 350, () => this.startNextPattern());
        });
      });
    });
  }

  runRain() {
    const x = Phaser.Math.Clamp(this.player.body.x, 160, ARENA_WIDTH - 160);
    this.shadowStep(x, RAIN_Y, () => {
      const nonce = this.setBossState(STATE.SHADOW_RAIN);
      this.showPatternCue('METEORITOS OSCUROS', 'Las marcas del suelo avisan dónde caen');
      const volley = (count, delay) => this.scheduleForState(nonce, delay, () => {
        const center = Phaser.Math.Clamp(this.player.body.x, 80, ARENA_WIDTH - 80);
        const spacing = RAIN_SPACING;
        const offset = Phaser.Math.Between(-30, 30);
        for (let index = 0; index < count; index += 1) {
          const dropX = Phaser.Math.Clamp(center + offset + (index - (count - 1) / 2) * spacing, 40, ARENA_WIDTH - 40);
          this.spawnShadowDrop(nonce, dropX);
        }
      });
      volley(3, 300);
      volley(3, 1550);
      this.scheduleForState(nonce, 2900, () => this.startNextPattern());
    });
  }

  spawnShadowDrop(nonce, x) {
    const marker = this.add.ellipse(x, FLOOR_TOP - 2, 54, 12, 0x9c7cff, 0.5).setDepth(6);
    this.bossHazards.add(marker);
    marker.body.enable = false;
    this.tweens.add({ targets: marker, scaleX: 1.25, alpha: 0.85, duration: RAIN_WARN_MS, ease: 'Quad.easeIn' });
    this.scheduleForState(nonce, RAIN_WARN_MS, () => {
      marker.destroy();
      const drop = this.add.ellipse(x, RAIN_Y + 30, 26, 34, 0x1a0f2e, 1)
        .setStrokeStyle(2, 0x9c7cff, 0.9)
        .setDepth(15);
      this.physics.add.existing(drop);
      this.bossHazards.add(drop);
      drop.body.allowGravity = false;
      drop.body.setVelocityY(760);
      drop.setData('damage', 1);
      drop.setData('kind', 'drop');
    });
  }

  runWave() {
    const startX = this.player.body.x > ARENA_WIDTH / 2 ? 120 : ARENA_WIDTH - 120;
    this.shadowStep(startX, FLOOR_TOP - 30, () => {
      const nonce = this.setBossState(STATE.DARK_WAVE);
      this.showPatternCue('ZONA OSCURA', 'La sombra repta por el suelo y brota bajo tus pies');
      // She melts into a puddle that hunts the Babito along the floor.
      this.fades.push(this.tweens.add({ targets: [this.boss, this.bossAura], alpha: 0, duration: 220 }));
      const puddle = this.add.ellipse(startX, FLOOR_TOP - 3, 92, 16, 0x1a0f2e, 0.95)
        .setStrokeStyle(2, 0x9c7cff, 0.8)
        .setDepth(6);
      this.wave = { puddle, nonce, startedAt: this.gameplayTime, erupting: false };
    });
  }

  updateWave() {
    const wave = this.wave;
    if (!wave || wave.erupting) return;
    if (wave.nonce !== this.stateNonce) {
      this.destroyWave();
      return;
    }
    const step = (WAVE_SPEED * (this.frameDeltaMs ?? 16.67)) / 1000;
    const dx = this.player.body.x - wave.puddle.x;
    wave.puddle.x += Phaser.Math.Clamp(dx, -step, step);
    this.boss.setPosition(wave.puddle.x, FLOOR_TOP - 30);
    // A floor lantern's light forces her out of the ground.
    const lantern = this.lanternLightingPoint(wave.puddle.x, FLOOR_TOP - 30);
    if (lantern) {
      this.destroyWave();
      this.boss.setAlpha(1);
      this.bossAura.setAlpha(1);
      this.enterExposed(lantern);
      return;
    }
    const elapsed = this.gameplayTime - wave.startedAt;
    if (Math.abs(dx) < 18 || elapsed > WAVE_MAX_MS) this.eruptWave();
  }

  eruptWave() {
    const wave = this.wave;
    if (!wave) return;
    wave.erupting = true;
    const { nonce, puddle } = wave;
    this.tweens.add({ targets: puddle, scaleX: 1.35, scaleY: 1.6, duration: WAVE_WARN_MS, ease: 'Quad.easeIn' });
    this.scheduleForState(nonce, WAVE_WARN_MS, () => {
      const pillar = this.add.rectangle(puddle.x, FLOOR_TOP - 60, 58, 120, 0x1a0f2e, 0.92)
        .setStrokeStyle(3, 0x9c7cff, 0.9)
        .setDepth(15);
      this.physics.add.existing(pillar);
      this.bossHazards.add(pillar);
      pillar.body.allowGravity = false;
      pillar.setData('damage', 1);
      pillar.setData('kind', 'pillar');
      this.cameras.main.shake(120, 0.004);
      this.scheduleForState(nonce, ERUPTION_MS, () => {
        pillar.destroy();
        this.destroyWave();
        this.boss.setPosition(puddle.x, HOVER_Y);
        this.tweens.add({ targets: this.boss, alpha: 0.78, duration: 260 });
        this.tweens.add({ targets: this.bossAura, alpha: 1, duration: 260 });
        this.scheduleForState(nonce, 600, () => this.startNextPattern());
      });
    });
  }

  destroyWave() {
    if (!this.wave) return;
    this.tweens.killTweensOf(this.wave.puddle);
    this.wave.puddle.destroy();
    this.wave = null;
  }

  runExtinguish() {
    const lit = this.lanterns.filter((lantern) => lantern.lit);
    // Target the lit lantern nearest to the Babito: it is the one they rely on.
    const target = lit.reduce((best, lantern) => (
      !best || Math.abs(lantern.x - this.player.body.x) < Math.abs(best.x - this.player.body.x) ? lantern : best
    ), null);
    const hoverX = Phaser.Math.Clamp(target.x + (target.x < ARENA_WIDTH / 2 ? 170 : -170), 120, ARENA_WIDTH - 120);
    this.shadowStep(hoverX, 200, () => {
      const nonce = this.setBossState(STATE.EXTINGUISH);
      this.showPatternCue('APAGA LA LUZ', 'Dispara al farolillo que parpadea para salvarlo');
      target.flickering = true;
      const savedAt = target.litUntil;
      this.scheduleForState(nonce, EXTINGUISH_WARN_MS, () => {
        // Hitting the lantern during the warning re-lights it and saves it.
        if (target.lit && target.litUntil === savedAt) this.extinguishLantern(target);
        else target.flickering = false;
        this.scheduleForState(nonce, 450, () => this.startNextPattern());
      });
    });
  }

  enterExposed(lantern) {
    if (this.encounterSuspended || this.bossDefeated) return;
    this.gliding = false;
    this.moveTarget = null;
    this.clearHazards();
    this.stopFades();
    this.boss.setVelocity(0, 0);
    this.bossAura.setAlpha(1);
    const nonce = this.setBossState(STATE.EXPOSED);
    this.setBossIntangible(false);
    this.boss.setTint(0xe6dcff);
    if (!prefersReducedMotion()) this.cameras.main.shake(140, 0.004);
    flashScreen(this, { color: 0xfff1b8, duration: 120 });
    this.drawBossBar();
    showToast(this, `¡EXPUESTA A LA LUZ! Ataca durante ${this.bossConfig.exposedMs / 1000} s`, {
      type: 'success', duration: 1300, y: 102,
    });
    announce('La Oscuridad está expuesta a la luz. Ataca ahora.', { politeness: 'assertive' });
    this.scheduleForState(nonce, this.bossConfig.exposedMs, () => {
      // She drinks the light that exposed her before escaping.
      this.extinguishLantern(lantern);
      this.setBossIntangible(true);
      this.bossAura.setAlpha(1);
      this.boss.clearTint();
      this.startNextPattern();
    });
  }

  checkExposure() {
    if (!this.boss?.active || !this.bossIntangible) return;
    if (this.bossState !== STATE.SHADOW_GLIDE && this.bossState !== STATE.SHIFT) return;
    if (this.boss.alpha < 0.5) return;
    const lantern = this.lanternLightingPoint(this.boss.x, this.boss.y);
    if (lantern) this.enterExposed(lantern);
  }

  showPatternCue(title, hint) {
    this.patternCue?.destroy(true);
    const cue = this.add.container(480, 150).setDepth(1500).setScrollFactor(0);
    const panel = createPanel(this, 0, 0, 420, 56, {
      depth: 1500, fillColor: 0x0d1424, strokeColor: 0x9c7cff, fillAlpha: 0.92, radius: 10, shadow: false,
    });
    const titleText = createLabel(this, title, 0, -11, { fontSize: '13px', color: 0xe6dcff, depth: 1501 });
    const hintText = createLabel(this, hint, 0, 12, { fontSize: '9px', color: 0xbfe8a0, depth: 1501 });
    cue.add([panel, titleText, hintText]);
    this.patternCue = cue;
    this.tweens.add({
      targets: cue,
      alpha: 0,
      delay: 1100,
      duration: 260,
      onComplete: () => {
        if (this.patternCue === cue) this.patternCue = null;
        cue.destroy(true);
      },
    });
    announce(`${title}. ${hint}`);
  }

  // ----------------------------------------------------------------- combat

  handleBossHit(projectile) {
    if (!projectile?.active || projectile.getData('owner') !== 'player' || this.bossDefeated) return;
    if (this.bossIntangible || this.bossState !== STATE.EXPOSED) {
      // Pure shadow: shots pass through so they can still reach a lantern.
      if (this.gameplayTime >= this.nextPassThroughHintAt && this.boss.alpha > 0.4) {
        this.nextPassThroughHintAt = this.gameplayTime + 2600;
        makeImpact(this, projectile.x, projectile.y, 0x6b5aa8);
        showToast(this, 'Es pura sombra: atráela hacia la luz de un farolillo', {
          type: 'warning', duration: 1300, y: 102,
        });
      }
      return;
    }
    const damage = Math.max(1, Number(projectile.getData('damage')) || 1);
    const impactX = projectile.x;
    const impactY = projectile.y;
    projectile.destroy();
    this.bossHealth = Math.max(0, this.bossHealth - damage);
    makeImpact(this, impactX, impactY, 0xffffff);
    flashScreen(this, { color: 0xffffff, duration: 55 });
    this.cameras.main.shake(70, 0.004);
    hitStop(this, 45);
    this.tweens.add({ targets: this.boss, alpha: 0.4, duration: 70, yoyo: true });
    this.drawBossBar();
    if (this.bossHealth <= 0) this.dispelBoss();
  }

  hitPlayerWithHazard(hazard) {
    if (!hazard?.active || !hazard.body?.enable || this.encounterSuspended || this.bossDefeated) return;
    const damaged = this.player.takeDamage(hazard.x, hazard.getData('damage') ?? 1);
    if (damaged) makeImpact(this, this.player.body.x, this.player.body.y, 0xff648c);
    if (hazard.getData('kind') === 'drop') hazard.destroy();
  }

  handleBossContact() {
    if (this.encounterSuspended || this.bossDefeated || !this.gliding) return;
    if (this.gameplayTime < this.nextContactDamageAt) return;
    if (this.player.takeDamage(this.boss.x, 1)) {
      this.nextContactDamageAt = this.gameplayTime + 700;
      makeImpact(this, this.player.body.x, this.player.body.y, 0xff4f86);
    }
  }

  updateHazards() {
    [...this.bossHazards.getChildren()].forEach((hazard) => {
      if (hazard.getData('kind') !== 'drop' || !hazard.active) return;
      if (hazard.y >= FLOOR_TOP - 14) {
        spawnDust(this, hazard.x, FLOOR_TOP - 2, { count: 5, spread: 14, color: 0x9c7cff, depth: 14 });
        hazard.destroy();
      }
    });
  }

  clearHazards() {
    this.bossHazards?.clear(true, true);
    this.destroyWave();
  }

  dispelBoss() {
    if (this.bossDefeated) return;
    this.bossDefeated = true;
    this.hitStopRemaining = 0;
    this.physics.world.resume();
    this.registry.get('audio')?.play('checkpoint');
    this.encounterSuspended = true;
    this.stateNonce += 1;
    this.cancelEncounterTimers();
    this.clearHazards();
    this.patternCue?.destroy(true);
    this.patternCue = null;
    this.moveTarget = null;
    this.gliding = false;
    this.player.setEnabled(false);
    this.bossWobble?.stop();
    this.exposedGlow?.setVisible(false);
    this.boss.setVelocity(0, 0).clearTint();
    this.setBossState(STATE.DISPELLED);
    for (const lantern of this.lanterns) this.lightLantern(lantern, { silent: true });

    this.store.setProgress({ boss2Defeated: true, phase2Complete: true, scene: 'shop' });
    const reward = this.store.claimReward('boss2_reward', this.bossConfig.rewardCoins);
    const rewardCopy = reward.claimed
      ? `Recompensa: +${this.bossConfig.rewardCoins} Babicoins`
      : 'La recompensa de este combate ya estaba guardada.';

    flashScreen(this, { color: 0xfff1b8, duration: 330, force: true });
    this.cameras.main.shake(220, 0.006);
    // She comes apart into fireflies and leaves the Power Apple behind.
    for (let index = 0; index < 22; index += 1) {
      const mote = this.add.rectangle(this.boss.x, this.boss.y, 4, 4, index % 2 ? 0xd9ff7a : 0xfff3b0, 1).setDepth(25);
      const angle = (Math.PI * 2 * index) / 22;
      this.tweens.add({
        targets: mote,
        x: mote.x + Math.cos(angle) * Phaser.Math.Between(60, 150),
        y: mote.y + Math.sin(angle) * Phaser.Math.Between(60, 150) - 40,
        alpha: 0,
        duration: Phaser.Math.Between(900, 1500),
        ease: 'Quad.easeOut',
        onComplete: () => mote.destroy(),
      });
    }
    this.tweens.add({ targets: [this.boss, this.bossAura], alpha: 0, scale: 0.2, duration: 700, ease: 'Quad.easeIn' });
    this.apple = this.add.image(this.boss.x, this.boss.y, TEXTURE_KEYS.powerApple).setDepth(26).setScale(0).setAlpha(0);
    this.tweens.add({
      targets: this.apple, scale: 2, alpha: 1, y: this.boss.y - 30, delay: 500, duration: 600, ease: 'Back.easeOut',
    });
    announce('La Oscuridad se ha disipado en luciérnagas y devuelve la Manzana de Poder.', { politeness: 'assertive' });
    this.schedule(900, () => this.showVictoryDialogue(rewardCopy));
  }

  showVictoryDialogue(rewardCopy) {
    if (!this.sys.isActive() || this.victoryPanel) return;
    const container = this.add.container(0, 0).setDepth(3500).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x030517, 0.45).setInteractive();
    const panel = createPanel(this, 480, 389, 720, 252, {
      depth: 3501, fillColor: 0x1c3a26, strokeColor: 0xd9ff7a, fillAlpha: 0.97,
    });
    const title = createTitle(this, '¡LA JUNGLA SE ILUMINA!', 480, 302, {
      fontSize: '27px', color: 0xeaffb8, depth: 3502,
    });
    const dialogue = createBodyText(
      this,
      'La Oscuridad se deshace en luciérnagas y devuelve\nla Manzana de Poder de la Jungla.',
      480,
      357,
      { fontSize: '17px', wordWrapWidth: 620, lineSpacing: 6, depth: 3502 },
    );
    const reward = createLabel(this, rewardCopy, 480, 410, { fontSize: '11px', color: 0xffdf68, depth: 3502 });
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
    this.victoryPanel = container;
    continueButton.focusAccessible();
  }

  goToShop() {
    if (this.transitioning) return;
    this.transitioning = true;
    this.player?.setEnabled(false);
    transitionToScene(this, 'ShopScene', {}, {
      announcement: 'La Jungla vuelve a tener luz. Entrando en la tienda.',
      duration: 260,
    });
  }

  // ------------------------------------------------------- pause / game over

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
    dismissToast(this);
    this.paused = true;
    this.player.setEnabled(false);
    this.pauseButton?.setEnabled(false);
    this.physics.world.pause();
    this.tweens.pauseAll();
    const overlay = this.add.container(0, 0).setDepth(4000).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x020414, 0.8).setInteractive();
    const panel = createPanel(this, 480, 270, 560, 356, { depth: 4001, strokeColor: 0x9c7cff });
    const title = createTitle(this, 'PAUSA', 480, 150, { fontSize: '34px', depth: 4002 });
    const controls = createBodyText(
      this,
      'Mover: A/D o ←/→ · Bajar: S / ↓\nSaltar: W / ↑ / Espacio · Atacar: J / X\nDispara a los farolillos para encenderlos\nSolo la luz vuelve sólida a La Oscuridad',
      480,
      232,
      { fontSize: '17px', lineSpacing: 8, depth: 4002 },
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
    resume.focusAccessible();
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
    focusGameCanvas(this);
    announce('Combate reanudado.');
  }

  showGameOver() {
    if (this.gameOverShown || this.bossDefeated) return;
    dismissToast(this);
    this.gameOverShown = true;
    this.encounterSuspended = true;
    this.pauseButton?.setEnabled(false);
    this.physics.world.pause();
    this.tweens.pauseAll();
    const overlay = this.add.container(0, 0).setDepth(4500).setScrollFactor(0);
    const shade = this.add.rectangle(480, 270, 960, 540, 0x020414, 0.84).setInteractive();
    const panel = createPanel(this, 480, 270, 520, 315, {
      depth: 4501, strokeColor: 0xff527f, fillColor: 0x1d1430,
    });
    const title = createTitle(this, '¡ÁNIMO, BABITO!', 480, 177, { fontSize: '30px', depth: 4502 });
    const copy = createBodyText(
      this,
      'Mantén los farolillos encendidos y atráela hacia la luz.',
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
    retry.focusAccessible();
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
    transitionToScene(this, 'TitleScene', {}, { announcement: 'Volviendo al título.', duration: 220 });
  }

  cancelEncounterTimers() {
    for (const timer of this.encounterTimers) timer?.remove(false);
    this.encounterTimers.clear();
  }

  // ----------------------------------------------------------------- loop

  update(_time, delta) {
    if (this.bossAura?.active && this.boss?.active) this.bossAura.setPosition(this.boss.x, this.boss.y);
    if (this.exposedGlow?.visible) this.exposedGlow.setPosition(this.boss.x, this.boss.y);
    if (this.bossDefeated) this.player?.syncBodyVisual();
    if (this.paused || this.gameOverShown || this.transitioning || this.bossDefeated || this.encounterSuspended) return;

    const frameDelta = Math.max(0, Number(delta) || 0);
    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= frameDelta;
      if (this.hitStopRemaining > 0) return;
      this.hitStopRemaining = 0;
      this.physics.world.resume();
    }
    this.frameDeltaMs = frameDelta;
    this.gameplayTime += frameDelta;
    this.player?.update(this.gameplayTime);
    this.updateLanterns();
    this.updateBossMovement();
    this.updateWave();
    this.updateHazards();
    this.checkExposure();
    if (this.bossState !== STATE.SHADOW_GLIDE && this.bossState !== STATE.DARK_WAVE && this.player?.body) {
      this.setBossFacing(this.player.body.x < this.boss.x ? -1 : 1);
    }
  }

  setHitStop(durationMs) {
    if (this.paused || this.gameOverShown || this.transitioning || this.bossDefeated) return;
    this.hitStopRemaining = Math.max(this.hitStopRemaining, Math.max(0, Number(durationMs) || 0));
    if (this.hitStopRemaining > 0 && !this.physics.world.isPaused) this.physics.world.pause();
  }

  getGameplayTime() {
    return this.gameplayTime ?? 0;
  }

  cleanup() {
    this.input.keyboard?.off('keydown-P', this.pauseHandler);
    this.input.keyboard?.off('keydown-ESC', this.pauseHandler);
    this.time.paused = false;
    this.physics?.world?.resume();
    this.tweens?.resumeAll();
    this.cancelEncounterTimers();
    for (const link of this.physicsLinks ?? []) link?.destroy();
    this.physicsLinks = [];
    for (const group of [this.playerProjectiles, this.bossHazards]) {
      if (group?.children) group.clear(true, true);
    }
    this.player?.destroy();
    this.player = null;
  }
}

export default DarknessBossScene;
