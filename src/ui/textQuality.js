export const MAX_UI_TEXT_RESOLUTION = 2;
// Phaser's pixelArt mode correctly keeps sprites on NEAREST, but applying the
// same filter to a high-resolution Canvas Text discards half of its glyph
// samples. Text textures must remain LINEAR while the rest of the game stays
// pixel-perfect. Phaser.Textures.FilterMode.LINEAR is the stable numeric 0.
export const UI_TEXT_FILTER_MODE = 0;
export const TEXT_METRICS_REFRESH_EVENT = 'babitos-text-metrics-refresh';
const WIDTH_FIT_STATE = Symbol('babitos.textWidthFit');
const TEXT_UPDATE_HOOK = Symbol('babitos.textQualityUpdateHook');

function positiveNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

/**
 * Return the internal texture resolution used by every Phaser Text object.
 * Keeping this in one place prevents controls and transient UI from silently
 * falling back to Phaser's resolution 1 on high-density displays.
 */
export function getUiTextResolution(
  pixelRatio = globalThis.devicePixelRatio ?? 1,
  maxResolution = MAX_UI_TEXT_RESOLUTION,
) {
  const ratio = positiveNumber(pixelRatio, 1);
  const maximum = positiveNumber(maxResolution, MAX_UI_TEXT_RESOLUTION);
  return Math.max(1, Math.min(maximum, Math.ceil(ratio)));
}

/** Keep small pixel-font labels open instead of filling their counters with ink. */
export function getUiTextStrokeThickness(fontSize, maxThickness = 2) {
  const size = Number.parseFloat(fontSize);
  const requestedMaximum = Number(maxThickness);
  const maximum = Number.isFinite(requestedMaximum)
    ? Math.max(0, requestedMaximum)
    : 2;

  if (!Number.isFinite(size) || size <= 10) return 0;
  if (size <= 15) return Math.min(1, maximum);
  return Math.min(2, maximum);
}

function syncTextTextureQuality(textObject) {
  const resolution = Number(textObject?.style?.resolution);
  if (textObject?.frame?.source && Number.isFinite(resolution) && resolution > 0) {
    // Text#setResolution updates the canvas but Phaser 3.90 leaves this source
    // value at the constructor's resolution in its Canvas renderer path.
    textObject.frame.source.resolution = resolution;
  }
  textObject?.texture?.setFilter?.(UI_TEXT_FILTER_MODE);
  return textObject;
}

function keepTextTextureQualityAfterUpdates(textObject) {
  if (
    !textObject
    || textObject[TEXT_UPDATE_HOOK]
    || typeof textObject.updateText !== 'function'
  ) {
    return textObject;
  }

  const updateText = textObject.updateText;
  textObject.updateText = function updateTextWithQuality(...args) {
    const result = updateText.apply(this, args);
    syncTextTextureQuality(this);
    return result;
  };
  textObject[TEXT_UPDATE_HOOK] = true;
  return textObject;
}

/** Apply the shared high-density rendering policy to a Phaser Text object. */
export function configureTextQuality(textObject, options = {}) {
  if (!textObject) return textObject;

  keepTextTextureQualityAfterUpdates(textObject);

  if (options.resolution !== false && typeof textObject.setResolution === 'function') {
    const requestedResolution = Number(options.resolution);
    const resolution = Number.isFinite(requestedResolution) && requestedResolution > 0
      ? requestedResolution
      : getUiTextResolution(options.pixelRatio, options.maxResolution);
    textObject.setResolution(resolution);
  }

  return syncTextTextureQuality(textObject);
}

/**
 * Fit a label without scaling its already-rasterized texture by a fractional
 * amount. Phaser re-renders the glyphs at an integer font size instead.
 */
export function fitTextToWidth(textObject, maxWidth, options = {}) {
  const widthLimit = Number(maxWidth);
  if (
    !textObject
    || !Number.isFinite(widthLimit)
    || widthLimit <= 0
    || !Number.isFinite(textObject.width)
    || typeof textObject.setFontSize !== 'function'
  ) {
    return textObject;
  }

  const currentSize = Number.parseFloat(textObject.style?.fontSize);
  if (!Number.isFinite(currentSize) || currentSize <= 0) return textObject;

  const minimum = Math.max(1, Math.floor(positiveNumber(options.minFontSize, 8)));
  const previousFit = textObject[WIDTH_FIT_STATE];
  textObject[WIDTH_FIT_STATE] = {
    maxWidth: widthLimit,
    minFontSize: minimum,
    originalFontSize: previousFit?.originalFontSize ?? currentSize,
  };

  if (textObject.width <= widthLimit) return textObject;

  let nextSize = Math.max(minimum, Math.floor(currentSize * (widthLimit / textObject.width)));

  textObject.setFontSize(nextSize);
  while (textObject.width > widthLimit && nextSize > minimum) {
    nextSize -= 1;
    textObject.setFontSize(nextSize);
  }

  return textObject;
}

/** Recalculate fallback metrics and width fitting after a web font arrives. */
export function refreshTextAfterFontLoad(textObject) {
  if (!textObject) return textObject;

  const fit = textObject[WIDTH_FIT_STATE];
  if (fit && typeof textObject.setFontSize === 'function') {
    textObject.setFontSize(fit.originalFontSize);
  }

  if (typeof textObject.style?.update === 'function') {
    textObject.style.update(true);
  } else if (typeof textObject.updateText === 'function') {
    textObject.updateText();
  }

  if (fit) {
    fitTextToWidth(textObject, fit.maxWidth, { minFontSize: fit.minFontSize });
  }

  textObject.emit?.(TEXT_METRICS_REFRESH_EVENT, textObject);

  return textObject;
}
