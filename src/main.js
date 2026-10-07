import Phaser from 'phaser';
import './styles.css';
import { AudioSystem } from './game/AudioSystem.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CreatorScene } from './scenes/CreatorScene.js';
import { PowerScene } from './scenes/PowerScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { GameScene } from './scenes/GameScene.js';
import { BossScene } from './scenes/BossScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { ComingSoonScene } from './scenes/ComingSoonScene.js';
import { refreshUiText, requestUiFonts, waitForUiFonts } from './ui/fontLoading.js';

const AUDIO_PREFERENCE_KEY = 'babitos.audio.v1';

function readMutedPreference() {
  try {
    return globalThis.localStorage?.getItem(AUDIO_PREFERENCE_KEY) === 'muted';
  } catch {
    return false;
  }
}

function saveMutedPreference(muted) {
  try {
    globalThis.localStorage?.setItem(AUDIO_PREFERENCE_KEY, muted ? 'muted' : 'enabled');
  } catch {
    // Audio remains usable when storage is unavailable or blocked.
  }
}

const audio = new AudioSystem({ muted: readMutedPreference() });
audio.bindUnlock();

const audioToggle = document.getElementById('audio-toggle');
let toggleAudioPromise = null;

function syncAudioToggle(announceChange = false) {
  if (!audioToggle) return;
  const { available, muted } = audio.getState();
  audioToggle.disabled = !available;
  // Stable toggle semantics: "pressed" means that mute mode is active.
  // Keeping the name fixed avoids contradictory output such as
  // "Activar audio, pulsado" in screen readers.
  audioToggle.setAttribute('aria-pressed', String(muted));
  audioToggle.setAttribute('aria-label', 'Silenciar audio');
  audioToggle.textContent = available ? (muted ? '🔇 AUDIO' : '🔊 AUDIO') : 'AUDIO N/D';

  if (announceChange) {
    const status = document.getElementById('game-status');
    if (status) status.textContent = muted ? 'Audio silenciado.' : 'Audio activado.';
  }
}

function announceAudioFailure() {
  const status = document.getElementById('game-status');
  if (status) status.textContent = 'No se pudo activar el audio. Vuelve a intentarlo.';
}

function toggleAudio() {
  if (toggleAudioPromise) return toggleAudioPromise;

  toggleAudioPromise = (async () => {
    const unlocked = await audio.unlock();
    if (!unlocked) {
      syncAudioToggle();
      announceAudioFailure();
      return false;
    }

    const muted = audio.toggleMuted();
    saveMutedPreference(muted);
    syncAudioToggle(true);
    if (!muted) audio.play('ui');
    return true;
  })().finally(() => {
    toggleAudioPromise = null;
  });

  return toggleAudioPromise;
}

const handleAudioToggleClick = () => {
  void toggleAudio();
};

// Preserve native Space/Enter activation while keeping those events away from
// Phaser's global keyboard capture and gameplay controls.
const stopAudioToggleKeyPropagation = (event) => {
  if (event.code === 'Space' || event.code === 'Enter') event.stopPropagation();
};

audioToggle?.addEventListener('click', handleAudioToggleClick);
audioToggle?.addEventListener('keydown', stopAudioToggleKeyPropagation);
audioToggle?.addEventListener('keyup', stopAudioToggleKeyPropagation);

const muteShortcut = (event) => {
  const tag = event.target?.tagName;
  if (
    event.repeat
    || event.isComposing
    || event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || event.code !== 'KeyM'
    || event.target?.isContentEditable
    || ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)
  ) return;
  event.preventDefault();
  void toggleAudio();
};
document.addEventListener('keydown', muteShortcut);
syncAudioToggle();

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 540,
  backgroundColor: '#071a33',
  pixelArt: true,
  roundPixels: true,
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 1350 },
      debug: false,
    },
  },
  input: {
    activePointers: 4,
  },
  callbacks: {
    preBoot: (game) => game.registry.set('audio', audio),
  },
  scene: [
    BootScene,
    TitleScene,
    CreatorScene,
    PowerScene,
    IntroScene,
    GameScene,
    BossScene,
    ShopScene,
    WorldMapScene,
    ComingSoonScene,
  ],
};

const uiFontPromise = requestUiFonts();
const fontsReadyAtBoot = await waitForUiFonts(uiFontPromise);
const game = new Phaser.Game(config);

if (!fontsReadyAtBoot) {
  void uiFontPromise.then((loaded) => {
    if (loaded) refreshUiText(game);
  });
}

window.addEventListener('beforeunload', () => {
  document.removeEventListener('keydown', muteShortcut);
  audioToggle?.removeEventListener('click', handleAudioToggleClick);
  audioToggle?.removeEventListener('keydown', stopAudioToggleKeyPropagation);
  audioToggle?.removeEventListener('keyup', stopAudioToggleKeyPropagation);
  void audio.destroy();
  game.destroy(true);
});
