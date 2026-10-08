import { refreshTextAfterFontLoad } from './textQuality.js';

export const UI_FONT_STYLESHEET_ID = 'babitos-ui-fonts';
export const UI_FONT_REQUESTS = Object.freeze([
  Object.freeze({ query: "700 16px 'Silkscreen'", sample: 'BABITOS' }),
  Object.freeze({ query: "700 16px 'Nunito'", sample: 'Pequeños héroes' }),
]);

/** Enable the non-render-blocking font stylesheet once it has downloaded. */
export async function activateUiFontStylesheet(
  stylesheet = globalThis.document?.getElementById?.(UI_FONT_STYLESHEET_ID),
) {
  if (!stylesheet) return true;

  if (stylesheet.sheet) {
    stylesheet.media = 'all';
    return true;
  }

  if (typeof stylesheet.addEventListener !== 'function') return false;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (loaded) => {
      if (settled) return;
      settled = true;
      stylesheet.removeEventListener?.('load', handleLoad);
      stylesheet.removeEventListener?.('error', handleError);
      if (loaded) stylesheet.media = 'all';
      resolve(loaded);
    };
    const handleLoad = () => finish(true);
    const handleError = () => finish(false);

    stylesheet.addEventListener('load', handleLoad, { once: true });
    stylesheet.addEventListener('error', handleError, { once: true });
    // Cover a load that completed between the first check and listener setup.
    if (stylesheet.sheet) finish(true);
  });
}

/** Ask the browser to make every UI font available before Phaser rasterizes it. */
export async function requestUiFonts(
  fontFaceSet = globalThis.document?.fonts,
  stylesheet = globalThis.document?.getElementById?.(UI_FONT_STYLESHEET_ID),
) {
  try {
    if (!await activateUiFontStylesheet(stylesheet)) return false;
    if (!fontFaceSet || typeof fontFaceSet.load !== 'function') return false;
    const loadedFaces = await Promise.all(
      UI_FONT_REQUESTS.map(({ query, sample }) => fontFaceSet.load(query, sample)),
    );
    return loadedFaces.every((faces) => faces.length > 0);
  } catch {
    // The system fallbacks keep the game usable when the font host is blocked.
    return false;
  }
}

/**
 * Avoid holding the whole game indefinitely on a slow font request. If the
 * request completes later, gameBoot.js refreshes any text already on screen.
 */
export async function waitForUiFonts(fontPromise, timeoutMs = 1200) {
  const delay = Math.max(0, Number(timeoutMs) || 0);
  if (delay === 0) return Promise.resolve(fontPromise).catch(() => false);

  let timeoutId;
  const timeout = new Promise((resolve) => {
    timeoutId = globalThis.setTimeout(() => resolve(false), delay);
  });
  const loaded = await Promise.race([
    Promise.resolve(fontPromise).catch(() => false),
    timeout,
  ]);
  globalThis.clearTimeout(timeoutId);
  return loaded;
}

function refreshDisplayObjectText(displayObject, visited) {
  if (!displayObject || visited.has(displayObject)) return;
  visited.add(displayObject);

  if (displayObject.type === 'Text') {
    refreshTextAfterFontLoad(displayObject);
  }

  if (Array.isArray(displayObject.list)) {
    displayObject.list.forEach((child) => refreshDisplayObjectText(child, visited));
  }
}

/** Re-rasterize existing text when a slow web font arrives after the timeout. */
export function refreshUiText(game) {
  const scenes = game?.scene?.getScenes?.(false) ?? [];
  const visited = new Set();
  for (const scene of scenes) {
    const children = scene?.children?.list ?? [];
    children.forEach((child) => refreshDisplayObjectText(child, visited));
  }
}
