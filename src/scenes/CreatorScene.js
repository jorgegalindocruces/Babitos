import Phaser from 'phaser';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import gameData from '../data/game-data.json';
import { CREATOR_CATEGORIES, getCategoryItems } from '../state/catalog.js';
import { createButton } from '../ui/Button.js';
import {
  addPixelBackground,
  announce,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
} from '../ui/sceneHelpers.js';
import { createAmbientMotes, fadeIn, showToast, transitionToScene } from '../ui/effects.js';

const CATEGORY_LABELS = {
  body: 'COLOR / PIEL',
  eyes: 'OJOS',
  mouth: 'BOCA',
  arms: 'BRAZOS',
  headAccessory: 'CABEZA',
  glasses: 'GAFAS',
  neckAccessory: 'CUELLO',
};

export class CreatorScene extends Phaser.Scene {
  constructor() {
    super('CreatorScene');
  }

  create() {
    this.store = this.registry.get('saveStore');
    this.save = this.store.getState();
    this.draftAppearance = { ...this.save.appearance };
    this.rowViews = new Map();

    addPixelBackground(this, 'title');
    createAmbientMotes(this, { count: 22, color: 0x71e5ff, depth: 1, seed: 'creator' });
    createTitle(this, 'CREA TU BABITO', 480, 42, { fontSize: 38, depth: 20 });
    createBodyText(this, 'Ojos y boca son capas independientes. Cada combinación cuenta tu historia.', 480, 78, {
      fontSize: 15,
      color: '#bdefff',
      depth: 20,
      wordWrapWidth: 720,
    });

    createPanel(this, 244, 292, 390, 382, { depth: 10, fillAlpha: 0.94 });
    createPanel(this, 689, 292, 455, 382, { depth: 10, fillAlpha: 0.94 });
    createLabel(this, 'TU BABITO', 244, 126, { fontSize: 17, color: 0xffcf3c, depth: 20 });

    this.previewHost = this.add.container(244, 262).setScale(3.05).setDepth(30);
    this.avatar = new BabitoAvatar(this, 0, 0, this.draftAppearance, this.save.size);
    this.previewHost.add(this.avatar);
    this.tweens.add({
      targets: this.previewHost,
      y: 257,
      duration: 1250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    createLabel(this, 'NOMBRE', 244, 347, { fontSize: 11, depth: 20 });
    this.nameInput = this.add.dom(244, 378).createFromHTML(
      `<input class="babito-name-input" maxlength="24" aria-label="Nombre de tu Babito" value="${this.escapeHtml(this.save.name)}" />`,
    ).setDepth(40);
    const input = this.nameInput.node.querySelector('input');
    input?.addEventListener('input', () => this.store.setName(input.value));

    createLabel(this, 'TAMAÑO · SOLO CAMBIA EL ASPECTO', 244, 420, {
      fontSize: 9,
      color: 0xbdefff,
      depth: 20,
    });
    const sizes = Object.entries(gameData.bodySizes);
    this.sizeButtons = sizes.map(([id, config], index) => createButton(this, {
      x: 140 + index * 104,
      y: 455,
      width: 96,
      height: 34,
      label: config.label.toUpperCase(),
      fontSize: '9px',
      variant: id === this.save.size ? 'accent' : 'ghost',
      autoFocus: false,
      onPress: (button) => this.selectSize(id, button),
      accessibleLabel: `Tamaño ${config.label}`,
    }));

    CREATOR_CATEGORIES.forEach((category, index) => this.createCategoryRow(category, index));

    this.randomButton = createButton(this, {
      x: 610,
      y: 482,
      width: 190,
      height: 42,
      label: '↻ ¡BABITO LOCO!',
      variant: 'accent',
      fontSize: '14px',
      autoFocus: false,
      onPress: () => this.randomize(),
    });
    this.continueButton = createButton(this, {
      x: 802,
      y: 482,
      width: 150,
      height: 42,
      label: 'CONTINUAR ›',
      variant: 'primary',
      fontSize: '12px',
      onPress: () => {
        if (input) this.store.setName(input.value);
        this.store.setProgress({ scene: 'power' });
        transitionToScene(this, 'PowerScene', {}, { announcement: 'Elige tu poder inicial' });
      },
    });
    createButton(this, {
      x: 72,
      y: 42,
      width: 102,
      height: 32,
      label: '‹ TÍTULO',
      variant: 'ghost',
      fontSize: '10px',
      autoFocus: false,
      onPress: () => transitionToScene(this, 'TitleScene'),
    });

    announce('Creador de Babitos. Personaliza siete capas independientes.');
    fadeIn(this);
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    })[character]);
  }

  createCategoryRow(category, index) {
    const items = getCategoryItems(category);
    const unlocked = items.filter((item) => this.store.isUnlocked(category, item.id));
    const currentId = this.draftAppearance[category];
    const currentIndex = Math.max(0, unlocked.findIndex((item) => item.id === currentId));
    const y = 135 + index * 46;

    createLabel(this, CATEGORY_LABELS[category], 510, y, {
      fontSize: '9px', originX: 0, color: 0x71e5ff, depth: 30,
    });
    createButton(this, {
      x: 670,
      y: y + 11,
      width: 34,
      height: 30,
      label: '‹',
      fontSize: '16px',
      variant: 'ghost',
      autoFocus: false,
      onPress: () => this.cycleCategory(category, -1),
      accessibleLabel: `Anterior opción de ${CATEGORY_LABELS[category]}`,
    });
    createButton(this, {
      x: 876,
      y: y + 11,
      width: 34,
      height: 30,
      label: '›',
      fontSize: '16px',
      variant: 'ghost',
      autoFocus: false,
      onPress: () => this.cycleCategory(category, 1),
      accessibleLabel: `Siguiente opción de ${CATEGORY_LABELS[category]}`,
    });
    const optionText = createBodyText(this, '', 773, y + 7, {
      fontSize: 14,
      wordWrapWidth: 158,
      depth: 30,
    });
    const metaText = createLabel(this, '', 773, y + 24, {
      fontSize: '7px', color: 0x9fc7d9, depth: 30,
    });
    this.rowViews.set(category, { unlocked, all: items, index: currentIndex, optionText, metaText });
    this.refreshCategoryRow(category);
  }

  cycleCategory(category, direction) {
    const row = this.rowViews.get(category);
    if (!row?.unlocked.length) return;
    row.index = Phaser.Math.Wrap(row.index + direction, 0, row.unlocked.length);
    const item = row.unlocked[row.index];
    this.draftAppearance[category] = item.id;
    this.store.equipCosmetic(category, item.id);
    this.avatar.setAppearance(this.draftAppearance, this.store.getState().size);
    this.refreshCategoryRow(category);
  }

  refreshCategoryRow(category) {
    const row = this.rowViews.get(category);
    const item = row?.unlocked[row.index];
    if (!row || !item) return;
    row.optionText.setText(item.label ?? item.id);
    const lockedCount = row.all.length - row.unlocked.length;
    row.metaText.setText(
      `${row.index + 1}/${row.unlocked.length} DISP.${lockedCount ? ` · TIENDA: ${lockedCount}` : ''}`,
    );
  }

  selectSize(sizeId, selectedButton) {
    this.store.setSize(sizeId);
    this.sizeButtons.forEach((button) => button.setVariant(button === selectedButton ? 'accent' : 'ghost'));
    this.avatar.setSizeVariant(sizeId);
    showToast(this, `${gameData.bodySizes[sizeId].label}: misma hitbox, mismas estadísticas.`, {
      type: 'info', duration: 1300, y: 510,
    });
  }

  randomize() {
    this.draftAppearance = this.store.randomizeAppearance();
    this.avatar.setAppearance(this.draftAppearance, this.store.getState().size);
    for (const category of CREATOR_CATEGORIES) {
      const row = this.rowViews.get(category);
      row.index = Math.max(0, row.unlocked.findIndex((item) => item.id === this.draftAppearance[category]));
      this.refreshCategoryRow(category);
    }
    this.cameras.main.flash(120, 113, 229, 255);
    showToast(this, '¡Combinación loca creada solo con elementos desbloqueados!', {
      type: 'success', duration: 1600,
    });
  }
}
