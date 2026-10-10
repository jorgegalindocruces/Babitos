export function isEnemyFootAnchored(type) {
  return ['come', 'garbanzo_loco', 'arbol_pocho', 'sapo_pota'].includes(type);
}

const AUTHORED_BASELINE_OFFSETS = Object.freeze({
  // Transparent cell padding below the last opaque pixel at production size.
  garbanzo_loco: 6,
  arbol_pocho: 5,
});

export function getEnemyVisualAnchor(type, sprite = {}) {
  const centerY = Number(sprite.y);
  const bodyBottom = Number(sprite.body?.bottom);
  const footAnchored = isEnemyFootAnchored(type);

  return {
    originY: footAnchored ? 1 : 0.5,
    y: footAnchored && Number.isFinite(bodyBottom)
      ? bodyBottom + (AUTHORED_BASELINE_OFFSETS[type] ?? 0)
      : (Number.isFinite(centerY) ? centerY : 0),
  };
}

export function shouldFlipEnemyVisual(type, direction) {
  if (type === 'arbol_pocho') return false;
  // The approved Sapo sheet faces left; the other directional sheets face right.
  if (type === 'sapo_pota') return Number(direction) > 0;
  return Number(direction) < 0;
}

export function getEnemyVisualTop(y, displayHeight, originY = 0.5) {
  const safeY = Number.isFinite(Number(y)) ? Number(y) : 0;
  const safeHeight = Math.max(0, Number.isFinite(Number(displayHeight)) ? Number(displayHeight) : 0);
  const safeOrigin = Math.max(0, Math.min(1, Number.isFinite(Number(originY)) ? Number(originY) : 0.5));
  return safeY - safeHeight * safeOrigin;
}
