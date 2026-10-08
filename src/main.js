import './styles.css';
import { activateUiFontStylesheet } from './ui/fontLoading.js';

// The landing uses the game's fonts too; activate the non-blocking stylesheet.
void activateUiFontStylesheet(document.getElementById('babitos-ui-fonts'));

const playDialog = document.getElementById('play-dialog');
const artDialog = document.getElementById('art-dialog');
let gameController = null;
let bootPromise = null;

/** Loads Phaser and the game only the first time the player presses Play. */
function bootGame() {
  bootPromise ??= import('./gameBoot.js')
    .then(({ startGame }) => startGame())
    .then((controller) => {
      gameController = controller;
      document.querySelector('[data-loading]')?.remove();
      return controller;
    })
    .catch((error) => {
      bootPromise = null;
      const loading = document.querySelector('[data-loading]');
      if (loading) loading.textContent = 'No se pudo cargar el juego. Recarga la página para intentarlo de nuevo.';
      throw error;
    });
  return bootPromise;
}

function focusCanvas() {
  document.querySelector('#game canvas')?.focus?.();
}

async function openPlayDialog() {
  if (!playDialog.open) playDialog.showModal();
  document.documentElement.classList.add('is-playing');
  if (location.hash !== '#jugar') history.replaceState(null, '', '#jugar');
  if (gameController) {
    gameController.setActive(true);
    focusCanvas();
    return;
  }
  const controller = await bootGame();
  // The first boot is asynchronous. If the player closed the dialog while
  // Phaser was loading, freeze the newly created game instead of letting it
  // run (or stealing focus) behind the landing page.
  if (!playDialog.open) {
    controller.setActive(false);
    return;
  }
  focusCanvas();
}

function closePlayDialog() {
  gameController?.setActive(false);
  if (playDialog.open) playDialog.close();
  document.documentElement.classList.remove('is-playing');
  if (location.hash === '#jugar') history.replaceState(null, '', location.pathname + location.search);
}

for (const button of document.querySelectorAll('[data-play]')) {
  button.addEventListener('click', () => void openPlayDialog());
}
playDialog.querySelector('[data-close]').addEventListener('click', closePlayDialog);

// Esc pauses the game; only the close button leaves the dialog.
playDialog.addEventListener('cancel', (event) => event.preventDefault());

playDialog.querySelector('[data-fullscreen]').addEventListener('click', () => {
  const shell = playDialog.querySelector('.game-shell');
  if (document.fullscreenElement) void document.exitFullscreen?.();
  else void shell.requestFullscreen?.().catch(() => {});
});

// Concept art lightbox.
const artImage = artDialog.querySelector('[data-art-image]');
const artCaption = artDialog.querySelector('[data-art-caption]');
for (const frame of document.querySelectorAll('[data-zoom]')) {
  frame.addEventListener('click', () => {
    artImage.src = frame.dataset.zoom;
    artImage.alt = frame.querySelector('img')?.alt ?? '';
    artCaption.textContent = frame.dataset.caption ?? '';
    artDialog.showModal();
  });
}
artDialog.querySelector('[data-close]').addEventListener('click', () => artDialog.close());
artDialog.addEventListener('click', (event) => {
  if (event.target === artDialog) artDialog.close();
});

// Direct links (#jugar) and development-only QA routes (?qa=…) open the game.
const params = new URLSearchParams(location.search);
const hasDevelopmentQaRoute = import.meta.env.DEV && params.has('qa');
if (location.hash === '#jugar' || hasDevelopmentQaRoute) void openPlayDialog();
