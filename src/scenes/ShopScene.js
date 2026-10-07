import Phaser from 'phaser';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { TEXTURE_KEYS, createTextures } from '../game/createTextures.js';
import { CREATOR_CATEGORIES, getCategoryItems } from '../state/catalog.js';
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
  flashScreen,
  showToast,
  transitionToScene,
} from '../ui/effects.js';

const ITEMS_PER_PAGE = 6;

const CATEGORY_LABELS = Object.freeze({
  body: 'COLOR',
  eyes: 'OJOS',
  mouth: 'BOCA',
  arms: 'BRAZOS',
  headAccessory: 'CABEZA',
  glasses: 'GAFAS',
  neckAccessory: 'CUELLO',
});

export class ShopScene extends Phaser.Scene {
  constructor() {
    super('ShopScene');
  }

  create() {
    createTextures(this);
    this.store = this.registry.get('saveStore');
    if (!this.store?.getState) {
      throw new Error('ShopScene requires saveStore in the Phaser registry.');
    }

    this.page = 0;
    this.catalogObjects = [];
    this.catalogItems = this.buildCatalogItems();
    this.pageCount = Math.max(1, Math.ceil(this.catalogItems.length / ITEMS_PER_PAGE));

    addPixelBackground(this, 'shop');
    createAmbientMotes(this, {
      count: 17,
      color: 0xffd45f,
      minAlpha: 0.12,
      maxAlpha: 0.42,
      depth: 2,
      seed: 'shop-lanterns',
    });

    createTitle(this, 'LA TIENDA BABITA', 480, 35, { fontSize: 34, depth: 30 });
    createBodyText(this, 'Compra un tesoro y el Señor Empanadilla lo equipa al instante.', 480, 70, {
      fontSize: 14,
      color: '#c9efff',
      depth: 30,
      wordWrapWidth: 700,
    });

    this.createCoinHud();
    this.createShopCounter();
    this.createCatalogPanel();
    this.renderCatalogPage();

    createButton(this, {
      x: 151,
      y: 500,
      width: 232,
      height: 42,
      label: '‹ VOLVER AL MAPA',
      variant: 'ghost',
      fontSize: '13px',
      autoFocus: false,
      accessibleLabel: 'Volver al mapa de mundos',
      onPress: () => transitionToScene(this, 'WorldMapScene', {}, {
        announcement: 'Volviendo al mapa de mundos',
      }),
    });

    announce(`Tienda Babita. ${this.catalogItems.length} cosméticos en ${this.pageCount} páginas.`);
    fadeIn(this);
  }

  buildCatalogItems() {
    const snapshot = this.store.getState();
    const categoryOrder = new Map(CREATOR_CATEGORIES.map((category, index) => [category, index]));
    const items = CREATOR_CATEGORIES.flatMap((category) => (
      getCategoryItems(category).map((item) => ({ ...item, category }))
    ));

    // Put purchasable, affordable choices first so the boss's 30-coin reward
    // always demonstrates the complete purchase flow on page one.
    return items.sort((left, right) => {
      const leftLocked = !snapshot.unlockedCosmetics[left.category]?.includes(left.id);
      const rightLocked = !snapshot.unlockedCosmetics[right.category]?.includes(right.id);
      if (leftLocked !== rightLocked) return leftLocked ? -1 : 1;
      if (leftLocked && left.price !== right.price) return left.price - right.price;
      const categoryDifference = categoryOrder.get(left.category) - categoryOrder.get(right.category);
      if (categoryDifference !== 0) return categoryDifference;
      return left.id.localeCompare(right.id);
    });
  }

  createCoinHud() {
    createPanel(this, 848, 40, 190, 48, {
      depth: 34,
      fillColor: 0x132d48,
      strokeColor: 0xffcf3c,
      radius: 12,
    });
    this.add.image(782, 40, TEXTURE_KEYS.coin).setScale(1.25).setDepth(36);
    this.coinText = createLabel(this, '', 870, 40, {
      fontSize: 14,
      color: UI_COLORS.yellow,
      depth: 36,
    });
    this.refreshCoinHud();
  }

  refreshCoinHud() {
    const coins = this.store.getState().coins;
    this.coinText.setText(`${coins} MONEDAS`);
  }

  createShopCounter() {
    createPanel(this, 158, 279, 276, 360, {
      depth: 9,
      fillColor: 0x10283b,
      fillAlpha: 0.95,
      strokeColor: 0xdba34f,
      highlightColor: 0xffe09a,
    });

    const stall = this.add.graphics().setDepth(13);
    stall.fillStyle(0x3d291f, 1);
    stall.fillRect(37, 196, 242, 211);
    stall.fillStyle(0x8a4b2a, 1);
    stall.fillRect(43, 204, 230, 195);
    stall.fillStyle(0x4e2d22, 1);
    stall.fillRect(32, 311, 252, 19);
    stall.fillStyle(0xd9863d, 1);
    stall.fillRect(38, 313, 240, 10);

    // Red-and-cream market awning from the approved shop direction.
    const awningColors = [0xf5dfbf, 0xd94c50];
    for (let index = 0; index < 8; index += 1) {
      stall.fillStyle(awningColors[index % 2], 1);
      stall.fillRect(37 + index * 30, 181, 30, 26);
      stall.fillCircle(52 + index * 30, 207, 15);
    }
    stall.lineStyle(4, 0x251923, 1);
    stall.strokeRect(36, 180, 244, 28);

    stall.fillStyle(0x5b3825, 1);
    stall.fillRoundedRect(67, 101, 182, 56, 8);
    stall.fillStyle(0xf1c77e, 1);
    stall.fillRoundedRect(72, 106, 172, 46, 6);
    stall.lineStyle(3, 0x5b3825, 1);
    stall.strokeRoundedRect(72, 106, 172, 46, 6);

    createLabel(this, '¡MIRA QUIÉN LLEGA\nCON MONEDAS!', 158, 128, {
      fontSize: 11,
      color: 0x402318,
      stroke: 0xf1c77e,
      strokeThickness: 0,
      depth: 18,
      wordWrapWidth: 165,
    });

    this.empanadilla = this.add.image(102, 263, TEXTURE_KEYS.merchantEmpanadilla)
      .setDisplaySize(104, 104)
      .setDepth(20);
    this.pinguino = this.add.image(219, 265, TEXTURE_KEYS.merchantPinguino)
      .setDisplaySize(104, 104)
      .setDepth(20);

    this.tweens.add({
      targets: [this.empanadilla, this.pinguino],
      y: '-=3',
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
      delay: (_target, _key, _value, index) => index * 240,
    });

    const snapshot = this.store.getState();
    this.avatarHost = this.add.container(159, 383).setScale(1.38).setDepth(22);
    this.avatar = new BabitoAvatar(this, 0, 0, snapshot.appearance, snapshot.size);
    this.avatarHost.add(this.avatar);
    createLabel(this, snapshot.name.toUpperCase(), 159, 429, {
      fontSize: 10,
      color: UI_COLORS.cyan,
      depth: 23,
    });
    createBodyText(this, 'DERROTA AL BOSS: +30 MONEDAS', 158, 449, {
      fontSize: 10,
      color: '#ffd97b',
      wordWrapWidth: 230,
      depth: 23,
    });
  }

  createCatalogPanel() {
    createPanel(this, 630, 278, 630, 370, {
      depth: 9,
      fillColor: 0x0b2239,
      fillAlpha: 0.96,
      strokeColor: 0x3f7da2,
    });
    createLabel(this, `CATÁLOGO · ${this.catalogItems.length} OBJETOS`, 630, 111, {
      fontSize: 13,
      color: UI_COLORS.cyan,
      depth: 25,
    });

    this.previousButton = createButton(this, {
      x: 429,
      y: 437,
      width: 72,
      height: 34,
      label: '‹',
      variant: 'ghost',
      fontSize: '18px',
      autoFocus: false,
      accessibleLabel: 'Página anterior del catálogo',
      onPress: () => this.changePage(-1),
    });
    this.nextButton = createButton(this, {
      x: 831,
      y: 437,
      width: 72,
      height: 34,
      label: '›',
      variant: 'ghost',
      fontSize: '18px',
      autoFocus: false,
      accessibleLabel: 'Página siguiente del catálogo',
      onPress: () => this.changePage(1),
    });
    this.pageText = createLabel(this, '', 630, 437, {
      fontSize: 10,
      color: 0xbdefff,
      depth: 25,
    });
  }

  changePage(direction) {
    this.page = Phaser.Math.Wrap(this.page + direction, 0, this.pageCount);
    this.renderCatalogPage();
    announce(`Página ${this.page + 1} de ${this.pageCount} del catálogo.`);
  }

  renderCatalogPage() {
    this.catalogObjects.forEach((object) => object?.destroy?.());
    this.catalogObjects.length = 0;

    const snapshot = this.store.getState();
    const start = this.page * ITEMS_PER_PAGE;
    const pageItems = this.catalogItems.slice(start, start + ITEMS_PER_PAGE);
    const columns = [470, 790];
    const rows = [158, 246, 334];

    pageItems.forEach((item, index) => {
      const x = columns[index % 2];
      const y = rows[Math.floor(index / 2)];
      const unlocked = snapshot.unlockedCosmetics[item.category]?.includes(item.id) ?? false;
      const equipped = snapshot.appearance[item.category] === item.id;
      const status = equipped
        ? '✓ EQUIPADO'
        : unlocked
          ? 'PULSA PARA EQUIPAR'
          : `${item.price} MONEDAS`;
      const variant = equipped ? 'primary' : unlocked ? 'secondary' : 'accent';
      const categoryName = CATEGORY_LABELS[item.category] ?? item.category;

      const button = createButton(this, {
        x,
        y,
        width: 286,
        height: 73,
        label: `${categoryName} · ${item.label}\n${status}`,
        variant,
        fontSize: '10px',
        autoFocus: index === 0,
        accessibleLabel: `${item.label}, ${categoryName}, ${status}`,
        onPress: (_button, source) => this.selectCatalogItem(item, source),
      });
      if (
        this.catalogFocusRequest
        && this.catalogFocusRequest.category === item.category
        && this.catalogFocusRequest.id === item.id
      ) {
        this.catalogFocusTarget = button;
      }
      button.labelText.setX(28);
      this.catalogObjects.push(button);

      // Preview every layer on a real Babito. Isolated eye/mouth pixels were
      // too small to read and did not prove that a catalog choice was usable.
      const previewAppearance = {
        ...snapshot.appearance,
        [item.category]: item.id,
      };
      const preview = new BabitoAvatar(
        this,
        x - 104,
        y,
        previewAppearance,
        'normal',
      ).setScale(0.78).setDepth(120);
      preview.setMotion('idle');
      this.catalogObjects.push(preview);
    });

    this.pageText.setText(`PÁGINA ${this.page + 1} / ${this.pageCount}`);
    this.previousButton.setEnabled(this.pageCount > 1);
    this.nextButton.setEnabled(this.pageCount > 1);

    if (this.catalogFocusTarget) {
      const target = this.catalogFocusTarget;
      const request = this.catalogFocusRequest;
      this.catalogFocusTarget = null;
      this.catalogFocusRequest = null;
      if (request.source === 'pointer') target.focus();
      else target.focusAccessible();
    }
  }

  selectCatalogItem(item, source = 'programmatic') {
    const wasUnlocked = this.store.isUnlocked(item.category, item.id);
    let purchased = false;

    if (!wasUnlocked) {
      const result = this.store.purchaseCosmetic(item.category, item.id);
      if (!result.ok) {
        const missing = Math.max(0, item.price - result.coins);
        showToast(this, `Te faltan ${missing} monedas para ${item.label}.`, {
          type: 'warning',
          duration: 1900,
          y: 82,
        });
        this.tweens.add({
          targets: this.empanadilla,
          angle: { from: -4, to: 4 },
          duration: 75,
          repeat: 3,
          yoyo: true,
          onComplete: () => this.empanadilla?.setAngle(0),
        });
        return;
      }
      purchased = result.purchased;
    }

    const equipResult = this.store.equipCosmetic(item.category, item.id);
    if (!equipResult.ok) {
      showToast(this, 'No se pudo equipar ese objeto.', { type: 'error' });
      return;
    }

    const snapshot = this.store.getState();
    if (purchased) this.registry.get('audio')?.play('purchase');
    this.avatar.setAppearance(snapshot.appearance, snapshot.size);
    this.refreshCoinHud();
    this.catalogFocusRequest = { category: item.category, id: item.id, source };
    this.renderCatalogPage();
    flashScreen(this, { color: purchased ? 0xffcf3c : 0x71e5ff, duration: 100 });
    showToast(
      this,
      purchased ? `¡${item.label} comprado y equipado!` : `${item.label} equipado.`,
      { type: 'success', duration: 1500, y: 82 },
    );
  }
}

export default ShopScene;
