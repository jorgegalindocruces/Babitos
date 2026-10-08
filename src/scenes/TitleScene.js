import Phaser from 'phaser';
import { BabitoAvatar } from '../game/BabitoAvatar.js';
import { createButton } from '../ui/Button.js';
import {
  addPixelBackground,
  announce,
  createBodyText,
  createLabel,
  createPanel,
  createTitle,
  CHARACTER_ASSETS,
  UI_COLORS,
} from '../ui/sceneHelpers.js';
import {
  createAmbientMotes,
  fadeIn,
  transitionToScene,
} from '../ui/effects.js';

const CONTINUE_DESTINATIONS = Object.freeze({
  creator: Object.freeze({ scene: 'CreatorScene', label: 'CREADOR' }),
  power: Object.freeze({ scene: 'PowerScene', label: 'PODER' }),
  intro: Object.freeze({ scene: 'IntroScene', label: 'HISTORIA' }),
  babilandia: Object.freeze({ scene: 'GameScene', label: 'BABILANDIA' }),
  game: Object.freeze({ scene: 'GameScene', label: 'BABILANDIA' }),
  boss: Object.freeze({ scene: 'BossScene', label: 'BOSS' }),
  boss1: Object.freeze({ scene: 'BossScene', label: 'BOSS' }),
  shop: Object.freeze({ scene: 'ShopScene', label: 'TIENDA' }),
  map: Object.freeze({ scene: 'WorldMapScene', label: 'MAPA' }),
  'world-map': Object.freeze({ scene: 'WorldMapScene', label: 'MAPA' }),
  worldmap: Object.freeze({ scene: 'WorldMapScene', label: 'MAPA' }),
  jungla: Object.freeze({ scene: 'GameScene', label: 'JUNGLA' }),
  jungle: Object.freeze({ scene: 'GameScene', label: 'JUNGLA' }),
  boss2: Object.freeze({ scene: 'DarknessBossScene', label: 'LA OSCURIDAD' }),
  city: Object.freeze({ scene: 'ComingSoonScene', label: 'CIUDAD' }),
});

function continueDestination(progress) {
  const key = String(progress?.scene ?? 'title').trim().toLowerCase();
  if (!key || key === 'title' || key === 'titlescene') return null;
  return CONTINUE_DESTINATIONS[key] ?? Object.freeze({
    scene: 'GameScene',
    label: 'AVENTURA',
  });
}

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    this.store = this.registry.get('saveStore');
    this.save = this.store.getState();
    this.menuButtons = [];
    this.controlsOverlay = null;
    this.newAdventureOverlay = null;

    addPixelBackground(this, 'title', { groundHeight: 46 });
    createAmbientMotes(this, {
      count: 30,
      color: UI_COLORS.cyan,
      depth: 1,
      seed: 'babitos-title',
      minAlpha: 0.15,
      maxAlpha: 0.62,
    });

    this.createLogo();
    this.createHero();
    this.createMenu();

    this.escapeHandler = () => {
      if (this.controlsOverlay) this.closeControls();
      else if (this.newAdventureOverlay) this.closeNewAdventureConfirmation();
    };
    this.input.keyboard?.on('keydown-ESC', this.escapeHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.escapeHandler);
    });

    announce('BABITOS. Pequeños Babitos, grandes aventuras.');
    fadeIn(this, { duration: 260 });
  }

  createLogo() {
    const glow = this.add.graphics().setDepth(3);
    glow.fillStyle(0x071326, 0.72);
    glow.fillEllipse(304, 112, 470, 158);
    glow.lineStyle(4, UI_COLORS.cyan, 0.16);
    glow.strokeEllipse(304, 112, 454, 144);

    if (this.textures.exists(CHARACTER_ASSETS.logoV2.key)) {
      this.add.image(304, 99, CHARACTER_ASSETS.logoV2.key)
        .setDisplaySize(500, 167)
        .setDepth(10);
    } else {
      createTitle(this, 'BABITOS', 304, 94, {
        fontSize: 66,
        color: UI_COLORS.white,
        stroke: 0x071326,
        strokeThickness: 10,
        depth: 10,
      });
    }
    createLabel(this, 'PEQUEÑOS BABITOS · GRANDES AVENTURAS', 304, 174, {
      fontSize: 12,
      color: UI_COLORS.yellow,
      depth: 11,
    });
  }

  createHero() {
    createPanel(this, 730, 298, 330, 370, {
      depth: 5,
      fillColor: 0x0a213b,
      fillAlpha: 0.9,
      strokeColor: UI_COLORS.cyan,
      strokeAlpha: 0.52,
    });
    createLabel(this, 'TU HÉROE', 730, 139, {
      fontSize: 13,
      color: UI_COLORS.yellow,
      depth: 12,
    });

    this.avatarHost = this.add.container(730, 294).setScale(4.25).setDepth(15);
    this.avatar = new BabitoAvatar(
      this,
      0,
      0,
      this.save.appearance,
      this.save.size,
    );
    this.avatarHost.add(this.avatar);

    this.tweens.add({
      targets: this.avatarHost,
      y: 287,
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    createTitle(this, this.save.name || 'Babito', 730, 433, {
      fontSize: 23,
      color: UI_COLORS.white,
      strokeThickness: 5,
      depth: 16,
      maxWidth: 260,
    });
    createBodyText(this, 'Personalízalo, elige un poder\ny recupera las Manzanas.', 730, 472, {
      fontSize: 14,
      color: '#bdefff',
      wordWrapWidth: 275,
      lineSpacing: 2,
      depth: 16,
    });
  }

  createMenu() {
    const destination = continueDestination(this.save.progress);
    const firstY = destination ? 275 : 319;

    createPanel(this, 304, destination ? 360 : 367, 382, destination ? 310 : 234, {
      depth: 5,
      fillColor: 0x0a213b,
      fillAlpha: 0.93,
      strokeColor: 0x2f7ca4,
    });
    createLabel(this, 'MENÚ PRINCIPAL', 304, destination ? 221 : 275, {
      fontSize: 12,
      color: UI_COLORS.cyan,
      depth: 12,
    });

    this.menuButtons.push(createButton(this, {
      x: 304,
      y: firstY,
      width: 286,
      height: 52,
      label: destination ? 'NUEVA AVENTURA' : 'JUGAR',
      variant: 'primary',
      accessibleLabel: destination
        ? 'Comenzar una nueva aventura'
        : 'Jugar desde el creador de Babitos',
      onPress: () => {
        if (destination) this.openNewAdventureConfirmation();
        else this.startNewAdventure();
      },
    }));

    if (destination) {
      this.menuButtons.push(createButton(this, {
        x: 304,
        y: firstY + 65,
        width: 286,
        height: 52,
        label: `CONTINUAR · ${destination.label}`,
        fontSize: '16px',
        variant: 'accent',
        accessibleLabel: `Continuar desde ${destination.label}`,
        onPress: () => transitionToScene(this, destination.scene, {}, {
          announcement: `Continuando desde ${destination.label}`,
        }),
      }));
    }

    this.menuButtons.push(createButton(this, {
      x: 304,
      y: destination ? firstY + 130 : firstY + 65,
      width: 286,
      height: 46,
      label: 'CONTROLES',
      fontSize: '16px',
      variant: 'secondary',
      onPress: () => this.openControls(),
    }));
  }

  startNewAdventure() {
    this.store.restartAdventure();
    transitionToScene(this, 'CreatorScene', {}, {
      announcement: 'Abriendo el creador de Babitos',
    });
  }

  openNewAdventureConfirmation() {
    if (this.newAdventureOverlay || this.controlsOverlay) return;
    this.menuButtons.forEach((button) => button.setEnabled(false));

    const blocker = this.add.rectangle(480, 270, 960, 540, 0x020814, 0.84)
      .setDepth(900)
      .setInteractive();
    const panel = createPanel(this, 480, 270, 650, 324, {
      depth: 910,
      fillColor: 0x0b2745,
      fillAlpha: 0.99,
      strokeColor: UI_COLORS.cyan,
      strokeWidth: 4,
    });
    const title = createTitle(this, '¿NUEVA AVENTURA?', 480, 154, {
      fontSize: 30,
      color: UI_COLORS.yellow,
      depth: 920,
    });
    const copy = createBodyText(
      this,
      'Reiniciarás la historia, el checkpoint y el poder elegido.\nConservarás tu Babito, monedas y cosméticos.',
      480,
      236,
      {
        fontSize: 16,
        color: '#f7fbff',
        lineSpacing: 8,
        wordWrapWidth: 540,
        depth: 920,
      },
    );
    const cancel = createButton(this, {
      x: 354,
      y: 348,
      width: 216,
      height: 48,
      label: 'SEGUIR AQUÍ',
      variant: 'secondary',
      depth: 930,
      onPress: () => this.closeNewAdventureConfirmation(),
    });
    const confirm = createButton(this, {
      x: 606,
      y: 348,
      width: 216,
      height: 48,
      label: 'REINICIAR',
      variant: 'danger',
      depth: 930,
      autoFocus: false,
      accessibleLabel: 'Confirmar nueva aventura y reiniciar el progreso de la historia',
      onPress: () => this.startNewAdventure(),
    });

    this.newAdventureOverlay = {
      objects: [blocker, panel, title, copy, cancel, confirm],
    };
    cancel.focusAccessible();
    announce('Confirmar nueva aventura. Conservas tu Babito, monedas y cosméticos.');
  }

  closeNewAdventureConfirmation() {
    if (!this.newAdventureOverlay) return;
    const { objects } = this.newAdventureOverlay;
    this.newAdventureOverlay = null;
    objects.forEach((object) => object?.destroy());
    this.menuButtons.forEach((button) => button.setEnabled(true));
    this.menuButtons[0]?.focusAccessible();
    announce('Menú principal');
  }

  openControls() {
    if (this.controlsOverlay || this.newAdventureOverlay) return;
    this.menuButtons.forEach((button) => button.setEnabled(false));

    const blocker = this.add.rectangle(480, 270, 960, 540, 0x020814, 0.82)
      .setDepth(900)
      .setInteractive();
    const panel = createPanel(this, 480, 270, 660, 414, {
      depth: 910,
      fillColor: 0x0b2745,
      fillAlpha: 0.99,
      strokeColor: UI_COLORS.cyan,
      strokeWidth: 4,
    });
    const title = createTitle(this, 'CONTROLES', 480, 100, {
      fontSize: 34,
      color: UI_COLORS.yellow,
      depth: 920,
    });
    const copy = createBodyText(
      this,
      [
        'MOVER     A / D   o   ← / →',
        'SALTAR    W / ↑ / ESPACIO',
        'BAJAR     S / ↓  (plataformas)',
        'ATACAR    J / X',
        'PAUSA     P / ESC',
        'MENÚS     TAB + ENTER / ESPACIO',
        '          RATÓN / TÁCTIL',
      ].join('\n'),
      480,
      267,
      {
        fontSize: 21,
        color: '#f7fbff',
        align: 'left',
        lineSpacing: 10,
        wordWrapWidth: 530,
        depth: 920,
      },
    );
    const hint = createLabel(this, 'EL TAMAÑO DEL BABITO NO CAMBIA LA HITBOX', 480, 399, {
      fontSize: 12,
      color: UI_COLORS.cyan,
      depth: 920,
    });
    const close = createButton(this, {
      x: 480,
      y: 447,
      width: 230,
      height: 46,
      label: 'VOLVER',
      variant: 'accent',
      depth: 930,
      onPress: () => this.closeControls(),
    });

    this.controlsOverlay = { objects: [blocker, panel, title, copy, hint, close] };
    close.focusAccessible();
    announce('Controles. Usa A y D o flechas para moverte, espacio para saltar, S o flecha abajo para bajar de una plataforma y J o X para atacar.');
  }

  closeControls() {
    if (!this.controlsOverlay) return;
    const { objects } = this.controlsOverlay;
    this.controlsOverlay = null;
    objects.forEach((object) => object?.destroy());
    this.menuButtons.forEach((button) => button.setEnabled(true));
    this.menuButtons[0]?.focusAccessible();
    announce('Menú principal');
  }
}
