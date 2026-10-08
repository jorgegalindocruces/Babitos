import Phaser from 'phaser';
import { createLabel } from './sceneHelpers.js';

const PAD_RADIUS = 30;
// The touch target is larger than the drawn pad: a thumb that drifts a little
// off the circle keeps holding the control instead of dropping it.
const PAD_HIT_RADIUS = 42;

export function prefersTouchControls() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || Boolean(window.matchMedia?.('(pointer: coarse)').matches);
}

/**
 * Virtual left/right/down/jump/attack pads shared by every playable scene. Each pad
 * forwards press and release to `PlayerController.setVirtualControl`.
 */
export function createTouchControls(scene, getPlayer, { y = 470, strokeColor = 0x71e5ff, fillAlpha = 0.44 } = {}) {
  const objects = [];
  const createPad = (x, label, control) => {
    const pad = scene.add.circle(x, y, PAD_RADIUS, 0x071326, fillAlpha)
      .setStrokeStyle(2, strokeColor, 0.5)
      .setDepth(900)
      .setScrollFactor(0);
    pad.setInteractive({
      hitArea: new Phaser.Geom.Circle(PAD_RADIUS, PAD_RADIUS, PAD_HIT_RADIUS),
      hitAreaCallback: Phaser.Geom.Circle.Contains,
      useHandCursor: true,
    });
    const text = createLabel(scene, label, x, y, { fontSize: '15px', color: 0xffffff, depth: 901 });
    const down = () => getPlayer()?.setVirtualControl(control, true);
    const up = () => getPlayer()?.setVirtualControl(control, false);
    pad.on('pointerdown', down)
      .on('pointerup', up)
      .on('pointerout', up)
      .on('pointerupoutside', up);
    objects.push(pad, text);
  };

  createPad(58, '◀', 'left');
  createPad(146, '▶', 'right');
  createPad(234, '▼', 'down');
  createPad(814, '↑', 'jump');
  createPad(902, '✦', 'attack');
  return objects;
}
