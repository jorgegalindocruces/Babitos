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

const POWER_COPY = Object.freeze({
  fire: 'Un proyectil recto, fiable y equilibrado para cualquier situación.',
  lightning: 'El disparo más veloz. Recorre una distancia moderada en un instante.',
  rock: 'Una roca pesada que describe una parábola y golpea con el doble de fuerza.',
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

    createTitle(this, 'ELIGE TU PODER', 480, 38, {
      fontSize: 36,
      color: UI_COLORS.white,
      depth: 20,
    });
    createBodyText(this, 'Será tu forma de atacar desde el comienzo de la aventura.', 480, 76, {
      fontSize: 15,
      color: '#bdefff',
      wordWrapWidth: 680,
      depth: 20,
    });

    createButton(this, {
      x: 72,
      y: 42,
      width: 110,
      height: 34,
      label: '‹ CREATOR',
      fontSize: '9px',
      variant: 'ghost',
      onPress: () => transitionToScene(this, 'CreatorScene'),
    });

    const miniAvatarHost = this.add.container(880, 49).setScale(1.55).setDepth(25);
    miniAvatarHost.add(new BabitoAvatar(
      this,
      0,
      0,
      this.save.appearance,
      this.save.size,
    ));

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
    const x = 176 + index * 304;
    const panel = createPanel(this, x, 281, 276, 350, {
      depth: 9,
      fillColor: 0x0b2745,
      fillAlpha: 0.96,
      strokeColor: 0x2b688e,
      strokeAlpha: 0.9,
    });
    const outline = this.add.graphics().setDepth(13);
    const badge = createLabel(this, '✓ ELEGIDO', x, 124, {
      fontSize: 10,
      color: UI_COLORS.yellow,
      depth: 22,
    }).setVisible(false);

    createTitle(this, power.name.toUpperCase(), x, 159, {
      fontSize: 25,
      color: power.color,
      strokeThickness: 5,
      depth: 20,
    });

    const projectile = this.add.image(x, 215, `projectile_${power.id}`)
      .setScale(power.id === 'lightning' ? 2.1 : 2.5)
      .setDepth(20);
    this.tweens.add({
      targets: projectile,
      x: x + 9,
      duration: 720 + index * 90,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    createLabel(this, power.tagline.toUpperCase(), x, 257, {
      fontSize: 9,
      color: power.color,
      wordWrapWidth: 220,
      depth: 20,
    });
    createBodyText(this, POWER_COPY[power.id] ?? power.tagline, x, 297, {
      fontSize: 13,
      color: '#e8f8ff',
      wordWrapWidth: 220,
      lineSpacing: 1,
      depth: 20,
    });
    createLabel(this, powerType(power), x, 339, {
      fontSize: 8,
      color: 0x9fc7d9,
      depth: 20,
    });
    createLabel(this, `DAÑO ${power.damage}  ·  VELOCIDAD ${power.speed}  ·  ${power.cooldownMs} ms`, x, 361, {
      fontSize: 8,
      color: UI_COLORS.white,
      depth: 20,
    });

    const button = createButton(this, {
      x,
      y: 411,
      width: 196,
      height: 42,
      label: 'ELEGIR',
      fontSize: '14px',
      variant: 'secondary',
      accessibleLabel: `Elegir poder ${power.name}. ${power.tagline}`,
      onPress: () => this.selectPower(power.id),
    });

    this.cards.set(power.id, { power, panel, outline, badge, button, x });
  }

  selectPower(powerId) {
    const card = this.cards.get(powerId);
    if (!card) return;

    this.selectedPowerId = powerId;
    this.store.setSelectedPower(powerId);
    this.refreshSelection();
    this.enterButton.setEnabled(true).setLabel('ENTRAR EN LA AVENTURA ›');

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
        .setVariant(selected ? 'accent' : 'secondary')
        .setLabel(
          selected ? 'SELECCIONADO' : 'ELEGIR',
          `${selected ? 'Poder seleccionado' : 'Elegir poder'} ${card.power.name}. ${card.power.tagline}`,
        );

      card.outline.clear();
      if (selected) {
        card.outline.lineStyle(5, UI_COLORS.yellow, 1);
        card.outline.strokeRoundedRect(card.x - 138, 106, 276, 350, 15);
        card.outline.lineStyle(2, 0xffffff, 0.3);
        card.outline.strokeRoundedRect(card.x - 130, 114, 260, 334, 11);
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
