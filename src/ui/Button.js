import Phaser from 'phaser';

const REGISTRY_KEY = Symbol('babitos.ui.buttonRegistry');

export const BUTTON_VARIANTS = Object.freeze({
  primary: Object.freeze({
    fill: 0x20a957,
    hover: 0x31c96b,
    pressed: 0x178442,
    border: 0x8ff3a9,
    shadow: 0x0a4c2a,
    text: '#ffffff',
  }),
  secondary: Object.freeze({
    fill: 0x146b9c,
    hover: 0x2189bd,
    pressed: 0x0d527a,
    border: 0x71e5ff,
    shadow: 0x072f51,
    text: '#ffffff',
  }),
  accent: Object.freeze({
    fill: 0xf2a51a,
    hover: 0xffc83d,
    pressed: 0xc87c0a,
    border: 0xffed8a,
    shadow: 0x784006,
    text: '#15243a',
  }),
  danger: Object.freeze({
    fill: 0xd93e68,
    hover: 0xef5b82,
    pressed: 0xaa294e,
    border: 0xff9db7,
    shadow: 0x681a38,
    text: '#ffffff',
  }),
  ghost: Object.freeze({
    fill: 0x102b47,
    hover: 0x1a4569,
    pressed: 0x0a2138,
    border: 0x4f83a8,
    shadow: 0x061523,
    text: '#dff7ff',
  }),
});

function eventTargetsEditableElement(event) {
  const target = event?.target;
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;

  const tagName = target.tagName;
  return target.isContentEditable || tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
}

function keyboardEventBelongsToGame(scene, event) {
  if (scene.scene?.isActive && !scene.scene.isActive()) return false;
  if (scene.input && scene.input.enabled === false) return false;
  if (!isTopmostButtonScene(scene)) return false;
  if (typeof document === 'undefined') return true;
  const canvas = scene.game?.canvas;
  const activeElement = document.activeElement;
  return event?.target === canvas || activeElement === canvas || activeElement === document.body;
}

function focusGameCanvas(scene) {
  const canvas = scene.game?.canvas;
  if (!canvas?.focus) return;

  try {
    canvas.focus({ preventScroll: true });
  } catch {
    canvas.focus();
  }
}

function focusableButtons(registry) {
  return registry.buttons.filter((button) => button.isFocusable());
}

function getTopmostButtonRegistry(game) {
  const activeScenes = game?.scene?.getScenes?.(true) ?? [];
  for (let index = activeScenes.length - 1; index >= 0; index -= 1) {
    const registry = activeScenes[index][REGISTRY_KEY];
    if (registry && focusableButtons(registry).length > 0) {
      return registry;
    }
  }
  return null;
}

function isTopmostButtonScene(scene) {
  const topmost = getTopmostButtonRegistry(scene.game);
  return !topmost || topmost === scene[REGISTRY_KEY];
}

function syncAccessibleButtonStates(game) {
  const topmost = getTopmostButtonRegistry(game);
  const scenes = game?.scene?.getScenes?.(false) ?? [];

  for (const candidateScene of scenes) {
    const registry = candidateScene[REGISTRY_KEY];
    if (!registry) continue;

    for (const button of registry.buttons) {
      const element = button.accessibleElement;
      if (!element) continue;
      const exposed = registry === topmost && button.isFocusable();
      element.tabIndex = exposed ? 0 : -1;
      element.setAttribute('aria-hidden', String(!exposed));
    }
  }
}

function shortcutButtons(registry) {
  return focusableButtons(registry).filter((button) => button.keyboardShortcuts);
}

function createButtonRegistry(scene) {
  const registry = {
    buttons: [],
    focused: null,
    disposed: false,
    register(button) {
      if (this.disposed || this.buttons.includes(button)) return;
      this.buttons.push(button);

      if (
        button.autoFocus
        && button.isFocusable()
        && (!this.focused || (!this.focused.keyboardShortcuts && button.keyboardShortcuts))
      ) {
        button.focus();
      }
      syncAccessibleButtonStates(scene.game);
    },
    unregister(button) {
      const index = this.buttons.indexOf(button);
      if (index >= 0) this.buttons.splice(index, 1);

      if (this.focused === button) {
        this.focused = null;
        button.setFocusedState(false);

        if (!this.disposed) {
          focusableButtons(this)[0]?.focus();
        }
      }
      syncAccessibleButtonStates(scene.game);
    },
    setFocus(button) {
      if (this.disposed || !button?.isFocusable()) return false;
      if (this.focused === button) return true;

      this.focused?.setFocusedState(false);
      this.focused = button;
      button.setFocusedState(true);
      return true;
    },
    moveFocus(direction = 1, shortcutsOnly = false) {
      const buttons = shortcutsOnly ? shortcutButtons(this) : focusableButtons(this);
      if (buttons.length === 0) return false;

      const currentIndex = buttons.indexOf(this.focused);
      const nextIndex = currentIndex < 0
        ? (direction < 0 ? buttons.length - 1 : 0)
        : Phaser.Math.Wrap(currentIndex + direction, 0, buttons.length);

      return this.setFocus(buttons[nextIndex]);
    },
    activateFocused() {
      if (!this.focused?.isFocusable() || !this.focused.keyboardShortcuts) {
        if (!this.moveFocus(1, true)) return false;
      }

      return this.focused.activate('keyboard');
    },
  };

  const keyboard = scene.input?.keyboard;
  const handlers = {
    tab(event) {
      if (eventTargetsEditableElement(event) || !keyboardEventBelongsToGame(scene, event)) return;

      // Browser builds expose native off-screen buttons. Let normal Tab order
      // move through those controls and, importantly, out of the game again.
      if (registry.buttons.some((button) => button.accessibleElement)) return;

      event?.preventDefault?.();
      event?.stopPropagation?.();
      registry.moveFocus(event?.shiftKey ? -1 : 1, true);
    },
    activate(event) {
      if (
        eventTargetsEditableElement(event)
        || !keyboardEventBelongsToGame(scene, event)
        || event?.repeat
      ) return;
      // Gameplay scenes can expose pointer-only controls (for example the
      // pause icon). Do not swallow Space when there is no menu action that
      // is intentionally bound to keyboard shortcuts.
      if (shortcutButtons(registry).length === 0) return;
      event?.preventDefault?.();
      event?.stopPropagation?.();
      registry.activateFocused();
    },
  };

  keyboard?.on('keydown-TAB', handlers.tab);
  keyboard?.on('keydown-ENTER', handlers.activate);
  keyboard?.on('keydown-SPACE', handlers.activate);

  const canvas = scene.game?.canvas;
  if (canvas && !canvas.hasAttribute('tabindex')) {
    canvas.tabIndex = 0;
  }

  const sync = () => syncAccessibleButtonStates(scene.game);
  const dispose = () => {
    if (registry.disposed) return;
    registry.disposed = true;

    keyboard?.off('keydown-TAB', handlers.tab);
    keyboard?.off('keydown-ENTER', handlers.activate);
    keyboard?.off('keydown-SPACE', handlers.activate);
    scene.events.off(Phaser.Scenes.Events.SHUTDOWN, dispose);
    scene.events.off(Phaser.Scenes.Events.DESTROY, dispose);
    scene.events.off(Phaser.Scenes.Events.PAUSE, sync);
    scene.events.off(Phaser.Scenes.Events.SLEEP, sync);
    scene.events.off(Phaser.Scenes.Events.RESUME, sync);
    scene.events.off(Phaser.Scenes.Events.WAKE, sync);

    registry.focused?.setFocusedState(false);
    registry.focused = null;
    registry.buttons.length = 0;

    if (scene[REGISTRY_KEY] === registry) {
      delete scene[REGISTRY_KEY];
    }
    syncAccessibleButtonStates(scene.game);
  };

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, dispose);
  scene.events.once(Phaser.Scenes.Events.DESTROY, dispose);
  scene.events.on(Phaser.Scenes.Events.PAUSE, sync);
  scene.events.on(Phaser.Scenes.Events.SLEEP, sync);
  scene.events.on(Phaser.Scenes.Events.RESUME, sync);
  scene.events.on(Phaser.Scenes.Events.WAKE, sync);

  // SceneManager marks a freshly-created scene active only after its create()
  // callback returns. Re-sync on the first clock tick so native buttons are
  // exposed to assistive technology instead of remaining aria-hidden.
  scene.time?.delayedCall(0, sync);

  return registry;
}

function getButtonRegistry(scene) {
  if (!scene[REGISTRY_KEY] || scene[REGISTRY_KEY].disposed) {
    scene[REGISTRY_KEY] = createButtonRegistry(scene);
  }

  return scene[REGISTRY_KEY];
}

function resolveVariant(variant, style) {
  const base = typeof variant === 'object'
    ? variant
    : (BUTTON_VARIANTS[variant] ?? BUTTON_VARIANTS.primary);

  return { ...base, ...style };
}

/**
 * Canvas button with pointer support and shared Tab/Enter/Space navigation.
 *
 * @example
 * new Button(scene, {
 *   x: 480,
 *   y: 420,
 *   label: 'JUGAR',
 *   onPress: () => scene.scene.start('CreatorScene'),
 * });
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, options = {}) {
    const x = Number.isFinite(options.x) ? options.x : 0;
    const y = Number.isFinite(options.y) ? options.y : 0;
    super(scene, x, y);

    this.buttonWidth = Math.max(48, Number(options.width) || 240);
    this.buttonHeight = Math.max(32, Number(options.height) || 58);
    this.radius = Math.max(0, Number(options.radius) || 10);
    this.shadowOffset = Math.max(0, Number(options.shadowOffset) || 5);
    this.borderWidth = Math.max(1, Number(options.borderWidth) || 3);
    this.focusWidth = Math.max(this.borderWidth, Number(options.focusWidth) || 4);
    this.variant = options.variant ?? 'primary';
    this.style = resolveVariant(this.variant, options.style);
    this.focusColor = options.focusColor ?? 0xffdf62;
    this.onPress = typeof options.onPress === 'function'
      ? options.onPress
      : (typeof options.callback === 'function' ? options.callback : null);
    this.enabled = options.enabled !== false;
    this.autoFocus = options.autoFocus !== false;
    this.keyboardShortcuts = options.keyboardShortcuts !== false;
    this.accessibleLabel = String(options.accessibleLabel ?? options.label ?? 'Botón');

    this.hovered = false;
    this.pressed = false;
    this.focused = false;
    this.activating = false;

    this.background = scene.add.graphics();
    this.labelText = scene.add.text(0, -1, String(options.label ?? ''), {
      fontFamily: options.fontFamily ?? "'Silkscreen', monospace",
      fontSize: options.fontSize ?? '20px',
      fontStyle: options.fontStyle ?? 'bold',
      color: this.style.text,
      align: 'center',
      stroke: options.textStroke ?? '#071326',
      strokeThickness: Number.isFinite(options.textStrokeThickness)
        ? options.textStrokeThickness
        : 2,
      wordWrap: { width: this.buttonWidth - 28, useAdvancedWrap: true },
    }).setOrigin(0.5);

    this.add([this.background, this.labelText]);
    this.setSize(this.buttonWidth, this.buttonHeight + this.shadowOffset);
    this.setDepth(Number.isFinite(options.depth) ? options.depth : 100);
    this.setScrollFactor(options.scrollFactor ?? 0);
    this.setName(options.name ?? `button:${this.accessibleLabel}`);

    scene.add.existing(this);
    this.bindPointerEvents();
    this.redraw();

    this.registry = getButtonRegistry(scene);
    this.registry.register(this);
    this.accessibleElement = this.createAccessibleElement();
    syncAccessibleButtonStates(scene.game);
  }

  bindPointerEvents() {
    this
      .setInteractive(
        new Phaser.Geom.Rectangle(
          -this.buttonWidth / 2,
          -this.buttonHeight / 2,
          this.buttonWidth,
          this.buttonHeight + this.shadowOffset,
        ),
        Phaser.Geom.Rectangle.Contains,
      )
      .on('pointerover', () => {
        if (!this.enabled) return;
        this.hovered = true;
        this.focus();
        this.redraw();
      })
      .on('pointerout', () => {
        this.hovered = false;
        this.pressed = false;
        this.setScale(1);
        this.redraw();
      })
      .on('pointerdown', (pointer) => {
        if (!this.enabled || pointer?.button > 0) return;
        focusGameCanvas(this.scene);
        this.pressed = true;
        this.focus();
        this.setScale(0.985);
        this.redraw();
      })
      .on('pointerup', (pointer) => {
        if (!this.enabled || pointer?.button > 0) return;
        const shouldActivate = this.pressed;
        this.pressed = false;
        this.setScale(1);
        this.redraw();
        if (shouldActivate) this.activate('pointer');
      });

    if (this.input) {
      this.input.cursor = this.enabled ? 'pointer' : 'default';
      this.input.enabled = this.enabled;
    }
  }

  createAccessibleElement() {
    if (typeof document === 'undefined') return null;
    const host = this.scene.game?.canvas?.parentElement;
    if (!host) return null;

    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'sr-only babitos-canvas-button';
    element.textContent = this.accessibleLabel;
    element.setAttribute('aria-label', this.accessibleLabel);
    element.setAttribute('aria-keyshortcuts', 'Enter Space');
    element.disabled = !this.enabled;
    element.setAttribute('aria-disabled', String(!this.enabled));

    this.onAccessibleFocus = () => this.focus();
    this.onAccessibleClick = (event) => {
      event.preventDefault();
      this.activate('accessibility');
    };
    element.addEventListener('focus', this.onAccessibleFocus);
    element.addEventListener('click', this.onAccessibleClick);
    host.appendChild(element);
    return element;
  }

  isFocusable() {
    return this.enabled && this.active && this.visible && this.alpha > 0;
  }

  focus() {
    return this.registry?.setFocus(this) ?? false;
  }

  /**
   * Moves both the canvas focus ring and the browser's native accessibility
   * focus. Use this after a menu changes its available actions so a second
   * Enter/Space press activates the newly-relevant control.
   */
  focusAccessible() {
    const focused = this.focus();
    if (!focused || !this.accessibleElement?.focus) return focused;

    try {
      this.accessibleElement.focus({ preventScroll: true });
    } catch {
      this.accessibleElement.focus();
    }
    return true;
  }

  blur() {
    if (this.registry?.focused === this) {
      this.registry.focused = null;
    }
    this.setFocusedState(false);
    return this;
  }

  setFocusedState(focused) {
    if (this.focused === focused) return this;
    this.focused = focused;
    this.redraw();
    this.emit(focused ? 'focus' : 'blur', this);
    return this;
  }

  activate(source = 'programmatic') {
    if (!this.isFocusable() || this.activating) return false;

    this.activating = true;
    this.scene.registry?.get('audio')?.play('ui');
    this.emit('activate', this, source);

    try {
      this.onPress?.(this, source);
    } finally {
      this.activating = false;
    }

    return true;
  }

  setEnabled(enabled = true) {
    this.enabled = Boolean(enabled);
    if (this.input) {
      this.input.cursor = this.enabled ? 'pointer' : 'default';
      this.input.enabled = this.enabled;
    }
    if (this.accessibleElement) {
      this.accessibleElement.disabled = !this.enabled;
      this.accessibleElement.setAttribute('aria-disabled', String(!this.enabled));
    }

    if (!this.enabled) {
      this.hovered = false;
      this.pressed = false;
      this.setScale(1);
      if (this.registry?.focused === this) {
        this.registry.focused = null;
        this.setFocusedState(false);
        this.registry.moveFocus(1);
      }
    }

    syncAccessibleButtonStates(this.scene.game);
    this.redraw();
    return this;
  }

  setVisible(value) {
    super.setVisible(value);
    if (this.scene) syncAccessibleButtonStates(this.scene.game);
    return this;
  }

  setActive(value) {
    super.setActive(value);
    if (this.scene) syncAccessibleButtonStates(this.scene.game);
    return this;
  }

  setLabel(label, accessibleLabel = label) {
    this.labelText.setText(String(label ?? ''));
    this.accessibleLabel = String(accessibleLabel ?? label ?? 'Botón');
    this.setName(`button:${this.accessibleLabel}`);
    if (this.accessibleElement) {
      this.accessibleElement.textContent = this.accessibleLabel;
      this.accessibleElement.setAttribute('aria-label', this.accessibleLabel);
    }
    return this;
  }

  setVariant(variant, style = {}) {
    this.variant = variant;
    this.style = resolveVariant(variant, style);
    this.labelText.setColor(this.style.text);
    this.redraw();
    return this;
  }

  redraw() {
    if (!this.background) return this;

    const graphics = this.background;
    const halfWidth = this.buttonWidth / 2;
    const halfHeight = this.buttonHeight / 2;
    const fillColor = this.pressed
      ? this.style.pressed
      : (this.hovered || this.focused ? this.style.hover : this.style.fill);
    const borderColor = this.focused ? this.focusColor : this.style.border;
    const borderWidth = this.focused ? this.focusWidth : this.borderWidth;

    graphics.clear();
    graphics.fillStyle(this.style.shadow, this.enabled ? 0.96 : 0.58);
    graphics.fillRoundedRect(
      -halfWidth,
      -halfHeight + this.shadowOffset,
      this.buttonWidth,
      this.buttonHeight,
      this.radius,
    );

    graphics.fillStyle(fillColor, this.enabled ? 1 : 0.55);
    graphics.fillRoundedRect(-halfWidth, -halfHeight, this.buttonWidth, this.buttonHeight, this.radius);
    graphics.lineStyle(borderWidth, borderColor, this.enabled ? 1 : 0.45);
    graphics.strokeRoundedRect(
      -halfWidth + borderWidth / 2,
      -halfHeight + borderWidth / 2,
      this.buttonWidth - borderWidth,
      this.buttonHeight - borderWidth,
      Math.max(0, this.radius - 1),
    );

    if (this.enabled && !this.pressed) {
      graphics.lineStyle(2, 0xffffff, 0.16);
      graphics.beginPath();
      graphics.moveTo(-halfWidth + this.radius, -halfHeight + 7);
      graphics.lineTo(halfWidth - this.radius, -halfHeight + 7);
      graphics.strokePath();
    }

    this.labelText.setAlpha(this.enabled ? 1 : 0.5);
    return this;
  }

  destroy(fromScene) {
    this.registry?.unregister(this);
    this.registry = null;
    if (this.accessibleElement) {
      this.accessibleElement.removeEventListener('focus', this.onAccessibleFocus);
      this.accessibleElement.removeEventListener('click', this.onAccessibleClick);
      this.accessibleElement.remove();
      this.accessibleElement = null;
    }
    super.destroy(fromScene);
  }
}

/**
 * Convenience factory. It accepts either an options object or positional
 * `(x, y, label, onPress, options)` arguments.
 */
export function createButton(scene, configOrX, y, label, onPress, options = {}) {
  if (configOrX && typeof configOrX === 'object') {
    return new Button(scene, configOrX);
  }

  return new Button(scene, {
    ...options,
    x: configOrX,
    y,
    label,
    onPress,
  });
}

export default Button;
