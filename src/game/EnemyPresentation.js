export function isEnemyFootAnchored(type) {
  return type === 'come';
}

export function getEnemyVisualAnchor(type, sprite = {}) {
  const centerY = Number(sprite.y);
  const bodyBottom = Number(sprite.body?.bottom);
  const footAnchored = isEnemyFootAnchored(type);

  return {
    originY: footAnchored ? 1 : 0.5,
    y: footAnchored && Number.isFinite(bodyBottom)
      ? bodyBottom
      : (Number.isFinite(centerY) ? centerY : 0),
  };
}

export function getEnemyVisualTop(y, displayHeight, originY = 0.5) {
  const safeY = Number.isFinite(Number(y)) ? Number(y) : 0;
  const safeHeight = Math.max(0, Number.isFinite(Number(displayHeight)) ? Number(displayHeight) : 0);
  const safeOrigin = Math.max(0, Math.min(1, Number.isFinite(Number(originY)) ? Number(originY) : 0.5));
  return safeY - safeHeight * safeOrigin;
}
