// Module hooks that let Node's test runner import game modules written for
// Vite: `phaser` resolves to a tiny math stub, JSON imports work without
// import attributes and `import.meta.env` reads as a production build.
import { readFile } from 'node:fs/promises';

const PHASER_STUB = new URL('./phaser-stub.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'phaser') return { url: PHASER_STUB, shortCircuit: true };
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json') && url.includes('/src/')) {
    const json = await readFile(new URL(url), 'utf8');
    return { format: 'module', source: `export default ${json};`, shortCircuit: true };
  }
  if (url.includes('/src/') && url.endsWith('.js')) {
    const source = await readFile(new URL(url), 'utf8');
    return {
      format: 'module',
      source: source.replaceAll('import.meta.env', '({ DEV: false, BASE_URL: "/" })'),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
