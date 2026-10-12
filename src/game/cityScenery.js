import Phaser from 'phaser';
import { createLabel } from '../ui/sceneHelpers.js';
import { prefersReducedMotion } from '../ui/effects.js';

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 540;
const FAR_TEXTURE = 'city_parallax_far_v1';
const MID_TEXTURE = 'city_parallax_mid_v1';
const NEAR_TEXTURE = 'city_parallax_near_v1';

function ensureTexture(scene, key, draw) {
  if (scene.textures.exists(key)) return key;
  const texture = scene.textures.createCanvas(key, 512, VIEW_HEIGHT);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, 512, VIEW_HEIGHT);
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  texture.refresh();
  return key;
}

function fill(ctx, color, x, y, width, height, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.globalAlpha = 1;
}

function createParallaxTextures(scene) {
  ensureTexture(scene, FAR_TEXTURE, (ctx) => {
    // The approved panorama already contains the complete skyline. This layer
    // only adds distant traffic and haze so it never hides the authored city.
    for (const [y, alpha] of [[176, 0.035], [236, 0.045], [314, 0.03]]) {
      fill(ctx, '#b6b9de', 0, y, 512, 12, alpha);
    }
    for (const [x, y, color] of [
      [42, 132, '#ff345e'], [156, 198, '#4adcf2'], [282, 154, '#ff345e'], [422, 218, '#4adcf2'],
    ]) {
      fill(ctx, '#07101f', x, y, 22, 5, 0.34);
      fill(ctx, color, x + 3, y + 1, 4, 3, 0.5);
      fill(ctx, color, x + 15, y + 1, 4, 3, 0.34);
    }
  });

  ensureTexture(scene, MID_TEXTURE, (ctx) => {
    // Sparse animated warning lights make the seven-screen route feel alive
    // without drawing a second set of buildings over the official artwork.
    for (let x = 28; x < 512; x += 96) {
      fill(ctx, '#ff345e', x, 344 + (x % 3) * 18, 5, 8, 0.32);
      fill(ctx, '#ff91a8', x + 1, 345 + (x % 3) * 18, 2, 3, 0.42);
    }
    for (const [x, y] of [[82, 268], [236, 302], [390, 252]]) {
      fill(ctx, '#a6bbd7', x, y, 3, 74, 0.055);
      fill(ctx, '#d9e7ef', x + 4, y - 18, 3, 92, 0.035);
    }
  });

  ensureTexture(scene, NEAR_TEXTURE, (ctx) => {
    fill(ctx, '#050b16', 0, 48, 512, 9, 0.42);
    fill(ctx, '#344056', 0, 50, 512, 3, 0.38);
    for (let x = 38; x < 512; x += 118) {
      fill(ctx, '#050b16', x, 42, 11, 22, 0.55);
      fill(ctx, '#ff4f6f', x + 3, 49, 5, 5, 0.5);
    }
    // Hanging cables frame the route without covering the playable floor.
    ctx.strokeStyle = 'rgba(3, 8, 18, 0.48)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(40, 0);
    ctx.bezierCurveTo(70, 130, 150, 120, 182, 0);
    ctx.moveTo(310, 0);
    ctx.bezierCurveTo(342, 112, 430, 126, 470, 0);
    ctx.stroke();
  });
}

/** Official city panorama plus three restrained, non-collidable ambience layers. */
export function createCityScenery(scene, level) {
  createParallaxTextures(scene);
  const far = scene.add.tileSprite(0, 0, VIEW_WIDTH, VIEW_HEIGHT, FAR_TEXTURE)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-42);
  const mid = scene.add.tileSprite(0, 0, VIEW_WIDTH, VIEW_HEIGHT, MID_TEXTURE)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-35);
  const near = scene.add.tileSprite(0, 0, VIEW_WIDTH, VIEW_HEIGHT, NEAR_TEXTURE)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDepth(-2);

  const zoneLabels = (level.zones ?? []).map((zone) => createLabel(
    scene,
    zone.label,
    (zone.startX + zone.endX) / 2,
    118,
    {
      fontSize: '15px',
      color: 0x9cf5ff,
      depth: 3,
      scrollFactor: 1,
      strokeThickness: 4,
    },
  ).setAlpha(0.78));

  let elapsed = 0;
  return {
    objects: [far, mid, near, ...zoneLabels],
    update(camera) {
      elapsed += 1;
      far.tilePositionX = camera.scrollX * 0.08;
      mid.tilePositionX = camera.scrollX * 0.2;
      near.tilePositionX = camera.scrollX * 0.46;
      if (!prefersReducedMotion()) near.setAlpha(0.84 + Math.sin(elapsed / 38) * 0.08);
    },
    splash(x) {
      for (let index = 0; index < 8; index += 1) {
        const spark = scene.add.rectangle(x, 494, 4, 4, index % 2 ? 0x42e8ec : 0xff4f6f)
          .setDepth(13);
        scene.tweens.add({
          targets: spark,
          x: x + Phaser.Math.Between(-40, 40),
          y: 494 - Phaser.Math.Between(18, 64),
          alpha: 0,
          duration: 380,
          ease: 'Quad.easeOut',
          onComplete: () => spark.destroy(),
        });
      }
    },
  };
}

export default createCityScenery;
