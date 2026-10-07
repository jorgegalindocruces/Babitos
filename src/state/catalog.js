import cosmeticsData from '../data/cosmetics.json' with { type: 'json' };

export const CREATOR_CATEGORIES = Object.freeze([
  'body',
  'eyes',
  'mouth',
  'arms',
  'headAccessory',
  'glasses',
  'neckAccessory',
]);

export const BODY_SIZES = Object.freeze(['small', 'normal', 'large']);

function normalizeItem(category, item) {
  if (!item || typeof item.id !== 'string' || item.id.trim() === '') {
    return null;
  }

  const price = Number(item.price);

  return Object.freeze({
    ...item,
    category,
    id: item.id.trim(),
    price: Number.isFinite(price) && price >= 0 ? Math.floor(price) : 0,
    unlocked: item.unlocked === true,
  });
}

function buildCatalog(source) {
  const catalog = {};

  for (const category of CREATOR_CATEGORIES) {
    const seen = new Set();
    const items = Array.isArray(source?.[category]) ? source[category] : [];

    catalog[category] = Object.freeze(
      items
        .map((item) => normalizeItem(category, item))
        .filter((item) => {
          if (!item || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        }),
    );
  }

  return Object.freeze(catalog);
}

export const COSMETIC_CATALOG = buildCatalog(cosmeticsData);
export const catalog = COSMETIC_CATALOG;

export function cosmeticRef(category, id) {
  return `${category}:${id}`;
}

export function getCategoryItems(category) {
  return COSMETIC_CATALOG[category] ?? Object.freeze([]);
}

export function getCosmetic(category, id) {
  if (typeof id !== 'string') return null;
  return getCategoryItems(category).find((item) => item.id === id) ?? null;
}

export function hasCosmetic(category, id) {
  return getCosmetic(category, id) !== null;
}

export function getDefaultUnlocks() {
  return Object.fromEntries(
    CREATOR_CATEGORIES.map((category) => [
      category,
      getCategoryItems(category)
        .filter((item) => item.unlocked)
        .map((item) => item.id),
    ]),
  );
}

function emptySelection() {
  return Object.fromEntries(CREATOR_CATEGORIES.map((category) => [category, []]));
}

function addSelection(result, category, id) {
  if (!hasCosmetic(category, id) || result[category].includes(id)) return;
  result[category].push(id);
}

function addFlatEntry(result, entry) {
  if (entry && typeof entry === 'object') {
    addSelection(result, entry.category, entry.id);
    return;
  }

  if (typeof entry !== 'string') return;

  const separator = entry.indexOf(':');
  if (separator > 0) {
    addSelection(result, entry.slice(0, separator), entry.slice(separator + 1));
    return;
  }

  // Old saves sometimes stored only IDs. Add every valid match; selections are
  // category-scoped because IDs such as "none" intentionally repeat.
  for (const category of CREATOR_CATEGORIES) {
    addSelection(result, category, entry);
  }
}

function addCategoryEntries(result, category, entries) {
  if (entries instanceof Set || Array.isArray(entries)) {
    for (const entry of entries) {
      if (typeof entry === 'string') addSelection(result, category, entry);
      else if (entry && typeof entry === 'object') {
        addSelection(result, category, entry.id);
      }
    }
    return;
  }

  if (typeof entries === 'string') {
    addSelection(result, category, entries);
    return;
  }

  if (entries && typeof entries === 'object') {
    for (const [id, enabled] of Object.entries(entries)) {
      if (enabled) addSelection(result, category, id);
    }
  }
}

function normalizeSelection(value, includeDefaults) {
  const result = emptySelection();

  if (includeDefaults) {
    const defaults = getDefaultUnlocks();
    for (const category of CREATOR_CATEGORIES) {
      addCategoryEntries(result, category, defaults[category]);
    }
  }

  if (value instanceof Set || Array.isArray(value)) {
    for (const entry of value) addFlatEntry(result, entry);
  } else if (value && typeof value === 'object') {
    for (const category of CREATOR_CATEGORIES) {
      addCategoryEntries(result, category, value[category]);
    }
  }

  // Keep the JSON catalog order so saves and tests are deterministic.
  for (const category of CREATOR_CATEGORIES) {
    const selected = new Set(result[category]);
    result[category] = getCategoryItems(category)
      .filter((item) => selected.has(item.id))
      .map((item) => item.id);
  }

  return result;
}

export function normalizeUnlocks(value) {
  return normalizeSelection(value, true);
}

export function normalizePurchases(value) {
  return normalizeSelection(value, false);
}

export function isUnlocked(unlocks, category, id) {
  return normalizeUnlocks(unlocks)[category]?.includes(id) ?? false;
}

export function getUnlockedItems(category, unlocks) {
  const allowed = new Set(normalizeUnlocks(unlocks)[category] ?? []);
  return getCategoryItems(category).filter((item) => allowed.has(item.id));
}

export function sanitizeAppearance(appearance, unlocks) {
  const normalizedUnlocks = normalizeUnlocks(unlocks);
  const result = {};

  for (const category of CREATOR_CATEGORIES) {
    const unlockedIds = normalizedUnlocks[category];
    const requested = appearance?.[category];
    result[category] = unlockedIds.includes(requested) ? requested : (unlockedIds[0] ?? null);
  }

  return result;
}

export function getDefaultAppearance() {
  return sanitizeAppearance({}, getDefaultUnlocks());
}

export function randomUnlockedAppearance(unlocks, random = Math.random) {
  const normalizedUnlocks = normalizeUnlocks(unlocks);
  const appearance = {};

  for (const category of CREATOR_CATEGORIES) {
    const choices = normalizedUnlocks[category];
    if (choices.length === 0) {
      appearance[category] = null;
      continue;
    }

    let sample = 0;
    try {
      sample = Number(random());
    } catch {
      sample = 0;
    }
    if (!Number.isFinite(sample)) sample = 0;
    sample = Math.min(Math.max(sample, 0), 1 - Number.EPSILON);
    appearance[category] = choices[Math.floor(sample * choices.length)];
  }

  return appearance;
}

export default COSMETIC_CATALOG;
