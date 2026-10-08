import Phaser from 'phaser';
import { getGroundSpans } from '../data/levels/index.js';
import { createAmbientMotes, prefersReducedMotion } from '../ui/effects.js';

const WATER_SURFACE_Y = 494;
const WATER_TEXTURE = 'jungle_water';
const WATERFALL_TEXTURE = 'jungle_waterfall';
const LIGHT_TEXTURE = 'jungle_soft_light';
const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;

function ensureCanvasTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx, width, height);
  texture.refresh();
  return key;
}

function fill(ctx, x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
}

/** Soft warm radial light, drawn additively over dark scenes. */
export function ensureSoftLightTexture(scene) {
  return ensureCanvasTexture(scene, LIGHT_TEXTURE, 128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 244, 196, 0.85)');
    gradient.addColorStop(0.45, 'rgba(255, 228, 150, 0.32)');
    gradient.addColorStop(1, 'rgba(255, 220, 140, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
}

function createTextures(scene) {
  ensureCanvasTexture(scene, WATER_TEXTURE, 32, 48, (ctx) => {
    fill(ctx, 0, 0, 32, 48, '#1b5f7c');
    fill(ctx, 0, 14, 32, 34, '#164b66');
    fill(ctx, 0, 30, 32, 18, '#113a52');
    // Bright crest with a pixel wave.
    fill(ctx, 0, 0, 32, 3, '#8fe8ff');
    fill(ctx, 4, 3, 8, 2, '#8fe8ff');
    fill(ctx, 20, 3, 6, 2, '#5cc6e6');
    fill(ctx, 9, 11, 7, 2, '#3a93b6');
    fill(ctx, 22, 21, 6, 2, '#2a7898');
    fill(ctx, 3, 34, 5, 2, '#1d5674');
  });
  ensureCanvasTexture(scene, WATERFALL_TEXTURE, 32, 64, (ctx) => {
    fill(ctx, 0, 0, 32, 64, '#5fc9e8');
    for (const [x, y, h, color] of [
      [2, 0, 22, '#b9f2ff'], [9, 18, 30, '#8fe1f7'], [15, 4, 18, '#e9fbff'],
      [21, 30, 26, '#b9f2ff'], [27, 8, 20, '#8fe1f7'], [5, 40, 20, '#e9fbff'],
      [24, 0, 10, '#e9fbff'], [12, 50, 14, '#b9f2ff'],
    ]) {
      fill(ctx, x, y, 3, h, color);
    }
    fill(ctx, 0, 0, 2, 64, '#3aa6c9');
    fill(ctx, 30, 0, 2, 64, '#3aa6c9');
  });
  ensureSoftLightTexture(scene);
}

function seeded(seed) {
  return new Phaser.Math.RandomDataGenerator([seed]);
}

/** Hanging vine drawn once, swaying from its anchor at the top of the view. */
function createLiana(scene, x, length, random, depth) {
  const graphics = scene.add.graphics();
  const leafColors = [0x2f8f3c, 0x4fb748, 0x7fd94c];
  graphics.fillStyle(0x24502b, 1);
  for (let y = 0; y < length; y += 6) {
    const wobble = Math.round(Math.sin(y / 22) * 2);
    graphics.fillRect(wobble - 2, y, 4, 7);
  }
  for (let y = 14; y < length - 6; y += 18 + random.between(0, 12)) {
    const side = random.pick([-1, 1]);
    graphics.fillStyle(random.pick(leafColors), 1);
    graphics.fillRect(side * 3 - (side < 0 ? 9 : 0), y, 9, 5);
    graphics.fillRect(side * 3 - (side < 0 ? 6 : 0), y + 5, 6, 3);
  }
  graphics.fillStyle(0x7fd94c, 1);
  graphics.fillRect(-4, length - 3, 8, 6);
  const container = scene.add.container(x, -4, [graphics]).setDepth(depth);
  if (!prefersReducedMotion()) {
    scene.tweens.add({
      targets: container,
      angle: { from: -1.6, to: 1.6 },
      duration: random.between(2200, 3400),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: random.between(0, 1200),
    });
  }
  return container;
}

function drawRuinSilhouettes(scene, startX, endX, random) {
  const ruins = scene.add.graphics().setDepth(-9);
  for (let x = startX; x < endX; x += random.between(260, 380)) {
    const height = random.between(150, 260);
    const width = random.between(46, 70);
    ruins.fillStyle(0x1f3b33, 0.9);
    ruins.fillRect(x, 480 - height, width, height);
    ruins.fillRect(x - 6, 480 - height, width + 12, 14);
    ruins.fillStyle(0x2c5045, 0.9);
    ruins.fillRect(x + 8, 480 - height + 22, 10, height - 30);
    if (random.frac() > 0.45) {
      // A broken arch toward the next column.
      ruins.fillStyle(0x1f3b33, 0.9);
      ruins.fillRect(x + width, 480 - height + 6, 70, 18);
      ruins.fillRect(x + width + 58, 480 - height + 24, 16, 30);
    }
    ruins.fillStyle(0x3c7d45, 0.85);
    ruins.fillRect(x - 6, 480 - height - 4, width + 12, 5);
  }
  return ruins;
}

function drawUndergrowth(scene, spans, random) {
  const plants = scene.add.graphics().setDepth(7);
  for (const span of spans) {
    for (let x = span.left + 30; x < span.right - 30; x += random.between(90, 170)) {
      const color = random.pick([0x2f8f3c, 0x3fa448, 0x24763a]);
      plants.fillStyle(color, 1);
      plants.fillRect(x - 10, 470, 6, 10);
      plants.fillRect(x - 3, 464, 6, 16);
      plants.fillRect(x + 4, 468, 6, 12);
      plants.fillStyle(0x9ae84c, 1);
      plants.fillRect(x - 3, 462, 6, 3);
    }
  }
  return plants;
}

/**
 * Builds La Jungla's world-space scenery: river water in every pit, a
 * waterfall over the rope bridges, hanging vines, background ruins, fireflies
 * and a darkness veil that deepens toward La Oscuridad's portal.
 */
export function createJungleScenery(scene, level) {
  createTextures(scene);
  const random = seeded(`jungle:${level.id}`);
  const spans = getGroundSpans(level.platforms);
  const objects = [];

  // Background ruins only in the second half: the jungle grows older.
  objects.push(drawRuinSilhouettes(scene, 2950, level.worldWidth - 200, random));

  // Waterfall pouring into the widest river crossing.
  const gaps = [];
  for (let index = 0; index < spans.length - 1; index += 1) {
    gaps.push({ left: spans[index].right, right: spans[index + 1].left });
  }
  const widest = gaps.reduce((best, gap) => (
    !best || gap.right - gap.left > best.right - best.left ? gap : best
  ), null);
  const waterfalls = [];
  if (widest) {
    const x = (widest.left + widest.right) / 2 + 20;
    const fall = scene.add.tileSprite(x, 40, 96, WATER_SURFACE_Y - 40, WATERFALL_TEXTURE)
      .setOrigin(0.5, 0)
      .setDepth(-8)
      .setAlpha(0.92);
    const lip = scene.add.rectangle(x, 40, 120, 14, 0x24502b).setDepth(-7);
    const mist = scene.add.ellipse(x, WATER_SURFACE_Y - 6, 170, 34, 0xe9fbff, 0.35).setDepth(3);
    waterfalls.push(fall);
    objects.push(fall, lip, mist);
    if (!prefersReducedMotion()) {
      scene.tweens.add({
        targets: mist, scaleX: 1.12, alpha: 0.2, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }

  // River water fills every pit, just below the ground's grassy edge.
  const waters = gaps.map((gap) => {
    const water = scene.add.tileSprite(
      gap.left - 2,
      WATER_SURFACE_Y,
      gap.right - gap.left + 4,
      VIEW_HEIGHT - WATER_SURFACE_Y + 20,
      WATER_TEXTURE,
    ).setOrigin(0, 0).setDepth(3);
    objects.push(water);
    return water;
  });

  for (let x = 160; x < level.worldWidth; x += random.between(150, 290)) {
    objects.push(createLiana(scene, x, random.between(70, 210), random, -6));
  }
  objects.push(drawUndergrowth(scene, spans, random));

  const fireflies = createAmbientMotes(scene, {
    seed: 'jungle-fireflies',
    count: 22,
    color: 0xd9ff7a,
    minAlpha: 0.25,
    maxAlpha: 0.8,
    minSpeed: 4,
    maxSpeed: 12,
    depth: 5,
  });

  // The veil is screen-space and sits under the HUD and touch pads.
  const darkness = level.darkness ?? null;
  const veil = scene.add.rectangle(0, 0, VIEW_WIDTH, VIEW_HEIGHT, 0x050818, 1)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(880)
    .setAlpha(0);
  // A warm halo keeps the Babito readable as the light fades.
  const halo = scene.add.image(0, 0, LIGHT_TEXTURE)
    .setDepth(881)
    .setScale(2.4)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setAlpha(0);
  objects.push(veil, halo);

  let elapsed = 0;
  return {
    objects,
    /** Darkness ratio (0–1) for a world x position. */
    darknessAt(x) {
      if (!darkness) return 0;
      return Phaser.Math.Clamp((x - darkness.startX) / (darkness.endX - darkness.startX), 0, 1);
    },
    update(camera) {
      elapsed += 1;
      if (!prefersReducedMotion()) {
        for (const water of waters) water.tilePositionX = elapsed * 0.35;
        for (const fall of waterfalls) fall.tilePositionY = -elapsed * 2.2;
      }
      if (!darkness) return;
      const centerX = camera.scrollX + VIEW_WIDTH / 2;
      const ratio = this.darknessAt(centerX);
      veil.setAlpha(ratio * darkness.maxAlpha);
      const player = scene.player?.body;
      halo.setVisible(Boolean(player?.active) && ratio > 0);
      if (player?.active) halo.setPosition(player.x, player.y).setAlpha(ratio * 0.38);
      fireflies?.setAlpha?.(0.6 + ratio * 0.4);
    },
    splash(x) {
      for (let index = 0; index < 8; index += 1) {
        const drop = scene.add.rectangle(x, WATER_SURFACE_Y, 4, 4, 0xb9f2ff, 0.9).setDepth(13);
        scene.tweens.add({
          targets: drop,
          x: x + Phaser.Math.Between(-36, 36),
          y: WATER_SURFACE_Y - Phaser.Math.Between(20, 60),
          alpha: 0,
          duration: 420,
          ease: 'Quad.easeOut',
          onComplete: () => drop.destroy(),
        });
      }
    },
  };
}
