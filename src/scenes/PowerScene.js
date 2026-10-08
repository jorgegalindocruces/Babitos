import Phaser from 'phaser';
import gameData from '../data/game-data.json';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { createButton } from '../ui/Button.js';
import {
  addPixelBackground,
  announce,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
  UI_COLORS,
} from '../ui/sceneHelpers.js';
import {
  createAmbientMotes,
  fadeIn,
  showToast,
  transitionToScene,
} from '../ui/effects.js';

const POWER_VISUALS = Object.freeze({
  fire: Object.freeze({
    accent: 0xff5548,
    accentSoft: 0xffc447,
    panel: 0x351022,
    showcase: 0x5a1525,
    button: 0x8e2635,
    buttonHover: 0xb73743,
    tagline: 'DISPARA BOLAS DE FUEGO',
    copy: 'Clásico y fiable.\nBuen alcance y fácil de usar.',
    ratings: Object.freeze({ reach: 3, speed: 3, damage: 3 }),
    iconScale: 1.75,
    projectileScale: 1.9,
  }),
  lightning: Object.freeze({
    accent: 0x34d9ff,
    accentSoft: 0xa2f3ff,
    panel: 0x08294c,
    showcase: 0x0a4677,
    button: 0x0c6f9c,
    buttonHover: 0x168dbd,
    tagline: 'LANZA RAYOS ELÉCTRICOS',
    copy: 'El más rápido.\nIdeal contra rivales ágiles.',
    ratings: Object.freeze({ reach: 3, speed: 5, damage: 2 }),
    iconScale: 1.45,
    projectileScale: 1.75,
  }),
  rock: Object.freeze({
    accent: 0xe99b55,
    accentSoft: 0xffd293,
    panel: 0x3b251e,
    showcase: 0x664126,
    button: 0x8c572f,
    buttonHover: 0xb16d3a,
    tagline: 'LANZA ROCAS',
    copy: 'Lenta, pero muy potente.\nIdeal contra rivales grandes.',
    ratings: Object.freeze({ reach: 4, speed: 2, damage: 4 }),
    iconScale: 2.05,
    projectileScale: 2.05,
  }),
});

function powerType(power) {
  return power.kind === 'arc' ? 'TRAYECTORIA: PARÁBOLA' : 'TRAYECTORIA: RECTA';
}

export class PowerScene extends Phaser.Scene {
  constructor() {
    super('PowerScene');
  }

  create() {
    this.store = this.registry.get('saveStore');
    this.save = this.store.getState();
    this.selectedPowerId = gameData.powers.some((power) => power.id === this.save.selectedPower)
      ? this.save.selectedPower
      : null;
    this.cards = new Map();

    addPixelBackground(this, 'title', { groundHeight: 34 });
    createAmbientMotes(this, {
      count: 26,
      color: UI_COLORS.yellow,
      depth: 1,
      seed: 'power-selection',
      minAlpha: 0.12,
      maxAlpha: 0.52,
    });

    createTitle(this, 'ELIGE TU PODER', 438, 34, {
      fontSize: 34,
      color: UI_COLORS.white,
      depth: 20,
    });
    const titleRule = this.add.graphics().setDepth(19);
    titleRule.fillStyle(0xf24b99, 1);
    titleRule.fillRect(315, 59, 246, 5);
    titleRule.fillStyle(0xff8fc1, 0.45);
    titleRule.fillRect(315, 59, 246, 1);

    createBodyText(this, 'Elige el poder con el que quieres empezar tu aventura.', 438, 79, {
      fontSize: 13,
      color: '#bdefff',
      wordWrapWidth: 510,
      depth: 20,
    });

    createButton(this, {
      x: 80,
      y: 42,
      width: 132,
      height: 34,
      label: '‹ CREADOR',
      fontSize: '12px',
      variant: 'ghost',
      autoFocus: false,
      onPress: () => transitionToScene(this, 'CreatorScene'),
    });

    createPanel(this, 824, 51, 250, 72, {
      depth: 12,
      radius: 10,
      fillColor: 0x0a2948,
      fillAlpha: 0.97,
      strokeColor: 0x4c83a8,
      highlightColor: UI_COLORS.cyan,
      shadowAlpha: 0.45,
    });
    createLabel(this, 'MÁS ADELANTE', 716, 34, {
      fontSize: 12,
      originX: 0,
      color: UI_COLORS.yellow,
      depth: 20,
    });
    createBodyText(this, 'MANZANAS = NUEVOS\nPODERES', 716, 58, {
      fontSize: 12,
      originX: 0,
      color: '#dff7ff',
      align: 'left',
      lineSpacing: 1,
      wordWrapWidth: 132,
      depth: 20,
    });
    const miniAvatarHost = this.add.container(914, 57).setScale(1.12).setDepth(25);
    const miniAvatar = new BabitoAvatar(
      this,
      0,
      0,
      this.save.appearance,
      this.save.size,
    );
    miniAvatar.setFacing(-1).setMotion('idle');
    miniAvatarHost.add(miniAvatar);

    gameData.powers.forEach((power, index) => this.createPowerCard(power, index));

    this.enterButton = createButton(this, {
      x: 480,
      y: 497,
      width: 360,
      height: 50,
      label: this.selectedPowerId ? 'ENTRAR EN LA AVENTURA ›' : 'ELIGE UN PODER',
      fontSize: '16px',
      variant: 'primary',
      enabled: Boolean(this.selectedPowerId),
      accessibleLabel: 'Entrar en la aventura con el poder elegido',
      onPress: () => this.enterAdventure(),
    });

    this.refreshSelection();
    announce('Elige un poder inicial: Fuego, Rayo o Roca.');
    fadeIn(this);
  }

  createPowerCard(power, index) {
    const visual = POWER_VISUALS[power.id];
    const x = 172 + index * 308;
    const panel = createPanel(this, x, 286, 286, 362, {
      depth: 9,
      radius: 13,
      fillColor: visual.panel,
      fillAlpha: 0.98,
      strokeColor: visual.accent,
      strokeWidth: 4,
      highlightColor: visual.accentSoft,
      highlightAlpha: 0.34,
    });
    const outline = this.add.graphics().setDepth(13);
    const badge = createLabel(this, '✓ ELEGIDO', x, 116, {
      fontSize: 12,
      color: UI_COLORS.yellow,
      depth: 22,
    }).setVisible(false);

    const headerGlow = this.add.graphics().setDepth(15);
    headerGlow.fillStyle(visual.accent, 0.13);
    headerGlow.fillCircle(x - 91, 157, 31);
    headerGlow.lineStyle(2, visual.accent, 0.45);
    headerGlow.strokeCircle(x - 91, 157, 27);
    this.add.image(x - 91, 157, `projectile_${power.id}`)
      .setScale(visual.iconScale)
      .setDepth(20);

    createTitle(this, power.name.toUpperCase(), x - 53, 143, {
      fontSize: 23,
      originX: 0,
      color: visual.accentSoft,
      strokeThickness: 5,
      depth: 20,
    });
    createLabel(this, visual.tagline, x - 53, 174, {
      fontSize: 12,
      originX: 0,
      color: visual.accent,
      wordWrapWidth: 184,
      depth: 20,
    });

    this.createAttackShowcase(power, visual, x, index);

    createBodyText(this, visual.copy, x, 296, {
      fontSize: 13,
      color: '#e8f8ff',
      wordWrapWidth: 242,
      lineSpacing: 0,
      depth: 20,
    });
    createLabel(this, powerType(power), x, 323, {
      fontSize: 12,
      color: visual.accentSoft,
      depth: 20,
    });

    this.createRatingBars(x, visual);

    const buttonVariant = Object.freeze({
      fill: visual.button,
      hover: visual.buttonHover,
      pressed: visual.panel,
      border: visual.accent,
      shadow: 0x050c18,
      text: '#ffffff',
    });

    const button = createButton(this, {
      x,
      y: 435,
      width: 212,
      height: 38,
      label: 'ELEGIR',
      fontSize: '12px',
      variant: buttonVariant,
      accessibleLabel: `Elegir poder ${power.name}. ${power.tagline}`,
      autoFocus: index === 0 && !this.selectedPowerId,
      onPress: () => this.selectPower(power.id),
    });

    this.cards.set(power.id, {
      power,
      panel,
      outline,
      badge,
      button,
      buttonVariant,
      x,
    });
  }

  createAttackShowcase(power, visual, x, index) {
    const frame = this.add.graphics().setDepth(14);
    frame.fillStyle(visual.showcase, 0.94);
    frame.fillRoundedRect(x - 126, 190, 252, 86, 9);
    frame.lineStyle(2, visual.accent, 0.72);
    frame.strokeRoundedRect(x - 125, 191, 250, 84, 8);

    // Tiny stage strip echoes the in-game examples in the approved selector.
    frame.fillStyle(0x76c83d, 1);
    frame.fillRect(x - 124, 264, 248, 5);
    frame.fillStyle(0x294f2d, 1);
    frame.fillRect(x - 124, 269, 248, 5);
    for (let step = 0; step < 12; step += 1) {
      frame.fillStyle(step % 2 === 0 ? 0xa2e34c : 0x53a83b, 1);
      frame.fillRect(x - 119 + step * 20, 261 - (step % 3), 8, 5 + (step % 3));
    }

    this.drawPowerTrail(frame, power.id, visual, x);

    const avatarHost = this.add.container(x - 76, 241).setScale(1.24).setDepth(20);
    const avatar = new BabitoAvatar(
      this,
      0,
      0,
      this.save.appearance,
      this.save.size,
    );
    avatar.setFacing(1).setMotion('attack', { x: 1, y: 0 });
    avatarHost.add(avatar);
    this.tweens.add({
      targets: avatarHost,
      y: 239,
      duration: 720 + index * 80,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    const startX = x + 18;
    const baseY = 235;
    const projectile = this.add.image(startX, baseY, `projectile_${power.id}`)
      .setScale(visual.projectileScale)
      .setDepth(21);
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: power.id === 'lightning' ? 520 : power.id === 'rock' ? 980 : 760,
      repeat: -1,
      repeatDelay: 220,
      ease: power.id === 'lightning' ? 'Quad.Out' : 'Linear',
      onUpdate: (tween) => {
        const progress = tween.getValue();
        projectile.x = startX + progress * 76;
        projectile.y = baseY - (power.id === 'rock'
          ? Math.sin(progress * Math.PI) * 23
          : Math.sin(progress * Math.PI * 2) * 2);
        projectile.setAlpha(1 - Math.max(0, progress - 0.82) / 0.18);
      },
      onRepeat: () => {
        projectile.setAlpha(1);
        avatar.setMotion('attack', { x: 1, y: 0 }, { restart: true });
      },
    });
  }

  drawPowerTrail(graphics, powerId, visual, x) {
    if (powerId === 'lightning') {
      graphics.lineStyle(4, visual.accentSoft, 0.92);
      graphics.beginPath();
      graphics.moveTo(x - 20, 235);
      graphics.lineTo(x - 5, 225);
      graphics.lineTo(x + 8, 242);
      graphics.lineTo(x + 22, 220);
      graphics.lineTo(x + 38, 239);
      graphics.lineTo(x + 56, 222);
      graphics.strokePath();
      return;
    }

    const points = powerId === 'rock'
      ? [[-18, 236], [1, 222], [23, 213], [47, 215], [69, 226]]
      : [[-16, 236], [3, 232], [22, 238], [41, 230], [61, 236]];
    points.forEach(([offsetX, offsetY], pointIndex) => {
      const size = powerId === 'rock' ? 4 : 3 + (pointIndex % 2) * 2;
      graphics.fillStyle(pointIndex % 2 ? visual.accentSoft : visual.accent, 0.72);
      graphics.fillRect(x + offsetX, offsetY, size, size);
    });
  }

  createRatingBars(x, visual) {
    const rows = [
      ['ALCANCE', visual.ratings.reach],
      ['VELOCIDAD', visual.ratings.speed],
      ['DAÑO', visual.ratings.damage],
    ];
    const bars = this.add.graphics().setDepth(20);

    rows.forEach(([label, rating], rowIndex) => {
      const y = 345 + rowIndex * 23;
      createLabel(this, label, x - 111, y, {
        fontSize: 12,
        originX: 0,
        color: '#dff7ff',
        depth: 21,
      });
      for (let barIndex = 0; barIndex < 5; barIndex += 1) {
        const barX = x - 23 + barIndex * 23;
        bars.fillStyle(barIndex < rating ? visual.accent : 0x10243b, barIndex < rating ? 1 : 0.92);
        bars.fillRoundedRect(barX, y - 5, 18, 10, 2);
        bars.lineStyle(1, visual.accentSoft, barIndex < rating ? 0.72 : 0.2);
        bars.strokeRoundedRect(barX + 0.5, y - 4.5, 17, 9, 2);
      }
    });
  }

  selectPower(powerId) {
    const card = this.cards.get(powerId);
    if (!card) return;

    this.selectedPowerId = powerId;
    this.store.setSelectedPower(powerId);
    this.refreshSelection();
    this.enterButton.setEnabled(true).setLabel('ENTRAR EN LA AVENTURA ›');
    this.enterButton.focusAccessible();

    showToast(this, `${card.power.name}: ${card.power.tagline}`, {
      type: 'success',
      duration: 1450,
      y: 78,
    });
    announce(`${card.power.name} seleccionado. Ya puedes entrar en la aventura.`);
  }

  refreshSelection() {
    for (const [powerId, card] of this.cards) {
      const selected = powerId === this.selectedPowerId;
      card.badge.setVisible(selected);
      card.button
        .setVariant(selected ? 'accent' : card.buttonVariant)
        .setLabel(
          selected ? 'SELECCIONADO' : 'ELEGIR',
          `${selected ? 'Poder seleccionado' : 'Elegir poder'} ${card.power.name}. ${card.power.tagline}`,
        );

      card.outline.clear();
      if (selected) {
        card.outline.lineStyle(5, UI_COLORS.yellow, 1);
        card.outline.strokeRoundedRect(card.x - 143, 105, 286, 362, 14);
        card.outline.lineStyle(2, 0xffffff, 0.3);
        card.outline.strokeRoundedRect(card.x - 135, 113, 270, 346, 10);
      }
    }
  }

  enterAdventure() {
    if (!this.selectedPowerId) {
      showToast(this, 'Elige Fuego, Rayo o Roca antes de continuar.', {
        type: 'warning',
      });
      return;
    }

    // Persist again at the boundary so a restored tab always has a coherent
    // selected/unlocked power even if it was closed immediately after a click.
    this.store.setSelectedPower(this.selectedPowerId);
    this.store.setProgress({ scene: 'intro' });
    transitionToScene(this, 'IntroScene', {}, {
      announcement: 'Comienza la historia de Babilandia',
    });
  }
}
