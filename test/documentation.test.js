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
  'art/production/babito-v3.md',
  'art/production/landing-web-v1.md',
  'art/production/babilandia-v2.md',
  'art/production/boss-arena-v1.md',
  'art/production/ciudad-bicharraca-v1.md',
  'art/production/enemy-vuela-v4.md',
]);
const ESSENTIAL_LINK_TARGETS = Object.freeze([
  'src/main.js',
  'src/gameBoot.js',
  'src/scenes/GameScene.js',
  'src/scenes/BossScene.js',
  'src/scenes/DarknessBossScene.js',
  'src/data/levels/jungla.json',
  'src/game/EnemyBehavior.js',
  'src/game/EnemyPresentation.js',
  'src/game/BabitoAvatar.js',
  'src/game/BabitoPresentation.js',
  'src/game/createTextures.js',
  'src/game/bossPatternGeometry.js',
  'src/game/jungleScenery.js',
  'src/game/platformCollision.js',
  'src/ui/Button.js',
  'src/ui/touchControls.js',
  'src/state/SaveStore.js',
  'public/assets/landing/logo.webp',
  'public/assets/landing/babito.png',
  'public/assets/landing/concept-worlds-environment-reference-only.webp',
  'public/assets/characters/enemy-vuela-sheet-v4.png',
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

test('the public site and deployment docs use babitos.es as the canonical domain', async () => {
  const index = await readRepositoryFile('index.html');
  const readme = await readRepositoryFile('README.md');
  const implementation = await readRepositoryFile('docs/IMPLEMENTATION_SPEC.md');

  assert.match(index, /rel="canonical" href="https:\/\/babitos\.es\/"/u);
  assert.match(index, /property="og:url" content="https:\/\/babitos\.es\/"/u);
  assert.match(readme, /Juega en: \[https:\/\/babitos\.es\/\]/u);
  assert.match(readme, /185\.199\.108\.153[\s\S]*185\.199\.111\.153/u);
  assert.match(readme, /`www` \| `jorgegalindocruces\.github\.io`/u);
  assert.match(readme, /Enforce HTTPS[^\n]*está activo/u);
  assert.doesNotMatch(readme, /The certificate does not exist yet/u);
  assert.match(implementation, /dominio canónico es `https:\/\/babitos\.es\/`/u);
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
  const artBible = await readRepositoryFile('docs/ART_BIBLE.md');
  const implementation = await readRepositoryFile('docs/IMPLEMENTATION_SPEC.md');
  const masterPrompt = await readRepositoryFile('docs/CODEX_MASTER_PROMPT.md');

  assert.match(gameDesign, /La Jungla, ocho encuentros y checkpoints \| Jugable/u);
  assert.match(gameDesign, /Ciudad Bicharraca \| Pantalla de avance estática/u);
  assert.match(gameDesign, /Boss Total y Final \| Roadmap, sin gameplay/u);
  assert.match(interactions, /Todos los fosos miden como mucho 160 px/u);
  assert.match(interactions, /un poder nunca destruye, oculta ni desactiva suelo o plataformas/u);
  assert.match(interactions, /El suelo base es completamente sólido/u);
  assert.match(interactions, /Las plataformas elevadas son unidireccionales/u);
  assert.match(interactions, /cajas de render enteras de 64, 80 y 96 px/u);
  assert.match(interactions, /todos los clips se anclan por los pies a la superficie física/u);
  assert.match(interactions, /`idle` \(6 frames\), `walk` \(8\), `run` \(8\), `jump` \(6\), `fall` \(6\), `attack` \(6\), `hurt` \(5\) y `dead` \(6\)/u);
  assert.match(interactions, /Caminar y correr son ciclos diferentes/u);
  assert.match(interactions, /cuerpo ovoide mide 31 × 33 px[\s\S]*ojos normales 3 × 7 px/u);
  assert.match(interactions, /`#7CDBF9`[\s\S]*`#A8EDFF`[\s\S]*`#2BBFE5`/u);
  assert.match(interactions, /`#FF7196`[\s\S]*`#07111E`/u);
  assert.match(interactions, /`\?qa=TitleScene`[\s\S]*`DarknessBossScene`/u);
  assert.match(interactions, /`&qaLevel=jungla`/u);
  assert.match(interactions, /`&qaOneHit=1`[\s\S]*`DarknessBossScene`/u);
  assert.match(interactions, /se desplaza la tanda completa[\s\S]*sin comprimir/u);
  assert.match(acceptance, /Ningún poder destruye, oculta, desplaza ni desactiva el suelo o las plataformas/u);
  assert.match(acceptance, /Una plataforma elevada se atraviesa desde abajo/u);
  assert.match(acceptance, /`Tab` y `Mayús \+ Tab`[\s\S]*`Enter` y `Espacio`/u);
  assert.match(acceptance, /Landing → diálogo → Título[\s\S]*La Jungla → La Oscuridad/u);
  assert.match(acceptance, /cinco pads: izquierda, derecha, bajar \(`▼`\), salto y ataque/u);
  assert.match(acceptance, /un ancho total no superior a 1,35 veces el cuerpo/u);
  assert.match(acceptance, /transparencia binaria y escala nearest 4×/u);
  assert.match(artBible, /Landing web \| 23 derivados optimizados/u);
  assert.match(artBible, /La Oscuridad:[\s\S]*`SHIFT`[\s\S]*`EXPOSED`[\s\S]*`DISPELLED`/u);
  assert.match(implementation, /main\.js[^\n]*landing[\s\S]*gameBoot\.js[^\n]*Phaser/u);
  assert.match(implementation, /BABITO_CANONICAL_GEOMETRY[\s\S]*drawBabitoCompositeFrame/u);
  assert.match(masterPrompt, /Landing → JUGAR → diálogo → Boot → Título/u);
  assert.match(masterPrompt, /cuerpo ovoide 31 × 33[\s\S]*paleta cian canónica/u);
});

test('visible shell and scene copy cannot regress to the pre-Phase-2 context', async () => {
  const [main, comingSoon, shop] = await Promise.all([
    readRepositoryFile('src/main.js'),
    readRepositoryFile('src/scenes/ComingSoonScene.js'),
    readRepositoryFile('src/scenes/ShopScene.js'),
  ]);

  assert.match(main, /import\.meta\.env\.DEV && params\.has\('qa'\)/u);
  assert.match(main, /if \(!playDialog\.open\)[\s\S]*controller\.setActive\(false\)/u);
  assert.match(comingSoon, /Las Fases 1 y 2 ya están disponibles/u);
  assert.doesNotMatch(comingSoon, /termina en la Fase 1|createJunglePreview/u);
  assert.match(shop, /getShopBossRewardCopy\(snapshot\.progress, gameData\.bossData\)/u);
  assert.doesNotMatch(shop, /DERROTA AL BOSS: \+30 MONEDAS/u);
});
