import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url));
const REQUIRED_DOCUMENTS = Object.freeze([
  'docs/INTERACTIONS.md',
  'docs/CHANGELOG.md',
]);
const STACK_DOCUMENTS = Object.freeze([
  'docs/IMPLEMENTATION_SPEC.md',
  'docs/CODEX_MASTER_PROMPT.md',
]);
const CONTEXT_DOCUMENTS = Object.freeze([
  'README.md',
  'docs/ACCEPTANCE_CRITERIA.md',
  'docs/ART_BIBLE.md',
  'docs/CHANGELOG.md',
  'docs/CODEX_MASTER_PROMPT.md',
  'docs/GAME_DESIGN.md',
  'docs/IMPLEMENTATION_SPEC.md',
  'docs/INTERACTIONS.md',
  'art/production/babilandia-v2.md',
  'art/production/boss-arena-v1.md',
  'art/production/ciudad-bicharraca-v1.md',
]);
const ESSENTIAL_LINK_TARGETS = Object.freeze([
  'src/scenes/GameScene.js',
  'src/scenes/BossScene.js',
  'src/ui/Button.js',
  'src/state/SaveStore.js',
  'public/assets/backgrounds/babilandia-v2.webp',
  'public/assets/backgrounds/boss-arena-v1.webp',
  'public/assets/backgrounds/ciudad-bicharraca-v1.webp',
]);

function repositoryPath(path) {
  return resolve(REPOSITORY_ROOT, path);
}

async function readRepositoryFile(path) {
  return readFile(repositoryPath(path), 'utf8');
}

function extractLocalLinks(markdown, sourcePath) {
  const sourceDirectory = dirname(repositoryPath(sourcePath));
  const links = [];
  const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(markdownLink)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '').split(/\s+["']/u, 1)[0];
    if (
      !rawTarget
      || rawTarget.startsWith('#')
      || rawTarget.startsWith('/')
      || rawTarget.startsWith('//')
      || /^[a-z][a-z\d+.-]*:/iu.test(rawTarget)
    ) {
      continue;
    }

    const fragmentStart = rawTarget.indexOf('#');
    const targetWithoutFragment = rawTarget.split(/[?#]/u, 1)[0];
    if (!targetWithoutFragment) continue;

    const absolutePath = resolve(sourceDirectory, decodeURIComponent(targetWithoutFragment));
    const pathFromRoot = relative(REPOSITORY_ROOT, absolutePath);
    assert.ok(
      pathFromRoot && !pathFromRoot.startsWith('..'),
      `${sourcePath} links outside the repository: ${rawTarget}`,
    );
    links.push({
      rawTarget,
      absolutePath,
      pathFromRoot,
      fragment: fragmentStart >= 0
        ? decodeURIComponent(rawTarget.slice(fragmentStart + 1))
        : null,
    });
  }

  return links;
}

function markdownHeadingAnchors(markdown) {
  const anchors = new Set();
  const occurrences = new Map();

  for (const line of markdown.split(/\r?\n/u)) {
    const match = /^(?:#{1,6})\s+(.+?)(?:\s+#+)?$/u.exec(line);
    if (!match) continue;

    const base = match[1]
      .replace(/`([^`]*)`/gu, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
      .toLocaleLowerCase('es')
      .replace(/[^\p{Letter}\p{Number}\p{Mark}\s_-]/gu, '')
      .replace(/\s/gu, '-');
    const count = occurrences.get(base) ?? 0;
    occurrences.set(base, count + 1);
    anchors.add(count === 0 ? base : `${base}-${count}`);
  }

  return anchors;
}

test('the documentation index exposes the interaction contract and changelog', async () => {
  for (const documentPath of REQUIRED_DOCUMENTS) {
    const file = await stat(repositoryPath(documentPath));
    assert.ok(file.isFile(), `${documentPath} must be a file`);
  }

  const readme = await readRepositoryFile('README.md');
  const readmeTargets = new Set(
    extractLocalLinks(readme, 'README.md').map(({ pathFromRoot }) => pathFromRoot),
  );

  for (const documentPath of REQUIRED_DOCUMENTS) {
    assert.ok(readmeTargets.has(documentPath), `README.md must link to ${documentPath}`);
  }
});

test('the current implementation stack is documented as JavaScript, not TypeScript', async () => {
  for (const documentPath of STACK_DOCUMENTS) {
    const document = await readRepositoryFile(documentPath);
    assert.match(document, /\bJavaScript\b/u, `${documentPath} must declare JavaScript`);
    assert.doesNotMatch(
      document,
      /\bTypeScript\b/u,
      `${documentPath} must not describe TypeScript as the current stack`,
    );
  }
});

test('documented local paths resolve and cover the essential code and art contracts', async () => {
  const links = [];

  for (const documentPath of CONTEXT_DOCUMENTS) {
    const document = await readRepositoryFile(documentPath);
    links.push(...extractLocalLinks(document, documentPath));
  }

  for (const {
    rawTarget,
    absolutePath,
    pathFromRoot,
    fragment,
  } of links) {
    await assert.doesNotReject(
      stat(absolutePath),
      `${pathFromRoot} (linked as ${rawTarget}) must exist`,
    );
    if (fragment && pathFromRoot.endsWith('.md')) {
      const targetDocument = await readFile(absolutePath, 'utf8');
      assert.ok(
        markdownHeadingAnchors(targetDocument).has(fragment),
        `${pathFromRoot} must expose the linked heading #${fragment}`,
      );
    }
  }

  const linkedTargets = new Set(links.map(({ pathFromRoot }) => pathFromRoot));
  for (const essentialPath of ESSENTIAL_LINK_TARGETS) {
    assert.ok(
      linkedTargets.has(essentialPath),
      `documentation must link to the essential path ${essentialPath}`,
    );
  }
});

test('scope and critical gameplay invariants are explicit', async () => {
  const gameDesign = await readRepositoryFile('docs/GAME_DESIGN.md');
  const interactions = await readRepositoryFile('docs/INTERACTIONS.md');
  const acceptance = await readRepositoryFile('docs/ACCEPTANCE_CRITERIA.md');

  assert.match(gameDesign, /La Jungla y Ciudad Bicharraca[\s\S]*Pantallas de avance estáticas/u);
  assert.match(interactions, /un poder nunca destruye, oculta ni desactiva suelo o plataformas/u);
  assert.match(interactions, /`idle`, `walk`, `jump`, `fall`, `attack`, `hurt` y `dead`/u);
  assert.match(acceptance, /Ningún poder destruye, oculta, desplaza ni desactiva el suelo o las plataformas/u);
  assert.match(acceptance, /`Tab` y `Mayús \+ Tab`[\s\S]*`Enter` y `Espacio`/u);
});
