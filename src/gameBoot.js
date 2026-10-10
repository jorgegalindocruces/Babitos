import Phaser from 'phaser';
import { AudioSystem } from './game/AudioSystem.js';
import {
  readAudioPreferences,
  saveMusicStylePreference,
  saveMutedPreference,
} from './game/AudioPreferences.js';
import { MUSIC_STYLE_LABELS } from './game/musicTracks.js';
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { CreatorScene } from './scenes/CreatorScene.js';
import { PowerScene } from './scenes/PowerScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { GameScene } from './scenes/GameScene.js';
import { BossScene } from './scenes/BossScene.js';
import { DarknessBossScene } from './scenes/DarknessBossScene.js';
import { ShopScene } from './scenes/ShopScene.js';
import { WorldMapScene } from './scenes/WorldMapScene.js';
import { ComingSoonScene } from './scenes/ComingSoonScene.js';
import { refreshUiText, requestUiFonts, waitForUiFonts } from './ui/fontLoading.js';

/** Scenes whose gameplay can be paused from outside the canvas. */
function findPausableScene(game) {
  return game.scene.getScenes(true).find((scene) => (
    typeof scene.togglePause === 'function' && !scene.paused && !scene.pauseOverlay
  )) ?? null;
}

/**
 * Boots Phaser inside #game. The landing page calls this the first time the
 * play dialog opens, so the page itself loads without the game engine.
 */
export async function startGame() {
  const preferences = readAudioPreferences();
  const audio = new AudioSystem(preferences);
  audio.bindUnlock();

  const audioToggle = document.getElementById('audio-toggle');
  const musicStyleToggle = document.getElementById('music-style-toggle');
  let toggleAudioPromise = null;
  let changeMusicPromise = null;
  let active = true;

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

  function syncMusicStyleToggle(announceChange = false) {
    if (!musicStyleToggle) return;
    const { available, musicStyle } = audio.getState();
    const label = MUSIC_STYLE_LABELS[musicStyle] ?? MUSIC_STYLE_LABELS.adventure;
    const spokenLabel = label.charAt(0) + label.slice(1).toLowerCase();

    musicStyleToggle.disabled = !available;
    musicStyleToggle.textContent = available ? `♫ ${label}` : 'MÚSICA N/D';
    musicStyleToggle.setAttribute(
      'aria-label',
      `Estilo musical: ${spokenLabel}. Pulsa para cambiar`,
    );
    musicStyleToggle.title = available
      ? `Música ${spokenLabel.toLowerCase()} · cambiar estilo`
      : 'Web Audio no está disponible';

    if (announceChange) {
      const status = document.getElementById('game-status');
      if (status) status.textContent = `Estilo musical: ${spokenLabel}.`;
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

  function changeMusicStyle() {
    if (changeMusicPromise) return changeMusicPromise;

    changeMusicPromise = (async () => {
      const style = audio.cycleMusicStyle();
      if (!style) return false;
      saveMusicStylePreference(style);
      syncMusicStyleToggle(true);

      const unlocked = await audio.unlock();
      if (!unlocked) {
        syncMusicStyleToggle();
        announceAudioFailure();
        return false;
      }

      if (!audio.getState().muted) audio.play('ui');
      return true;
    })().finally(() => {
      changeMusicPromise = null;
    });

    return changeMusicPromise;
  }

  const handleAudioToggleClick = () => {
    void toggleAudio();
  };
  const handleMusicStyleClick = () => {
    void changeMusicStyle();
  };

  // Preserve native Space/Enter activation while keeping those events away from
  // Phaser's global keyboard capture and gameplay controls.
  const stopAudioToggleKeyPropagation = (event) => {
    if (event.code === 'Space' || event.code === 'Enter') event.stopPropagation();
  };

  audioToggle?.addEventListener('click', handleAudioToggleClick);
  audioToggle?.addEventListener('keydown', stopAudioToggleKeyPropagation);
  audioToggle?.addEventListener('keyup', stopAudioToggleKeyPropagation);
  musicStyleToggle?.addEventListener('click', handleMusicStyleClick);
  musicStyleToggle?.addEventListener('keydown', stopAudioToggleKeyPropagation);
  musicStyleToggle?.addEventListener('keyup', stopAudioToggleKeyPropagation);

  const muteShortcut = (event) => {
    const tag = event.target?.tagName;
    if (
      !active
      || event.repeat
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
  syncMusicStyleToggle();

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
      DarknessBossScene,
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
    musicStyleToggle?.removeEventListener('click', handleMusicStyleClick);
    musicStyleToggle?.removeEventListener('keydown', stopAudioToggleKeyPropagation);
    musicStyleToggle?.removeEventListener('keyup', stopAudioToggleKeyPropagation);
    void audio.destroy();
    game.destroy(true);
  });

  return {
    game,
    /**
     * Closing the dialog pauses gameplay (the pause panel is waiting on
     * return), freezes the loop, silences audio and releases the keyboard so
     * arrows and Space scroll the page again.
     */
    setActive(nextActive) {
      if (nextActive === active) return;
      active = nextActive;
      if (!active) {
        findPausableScene(game)?.togglePause();
        if (game.input?.keyboard) game.input.keyboard.enabled = false;
        audio.unbindUnlock();
        void audio.context?.suspend?.();
        game.loop.sleep();
        return;
      }
      game.loop.wake();
      if (game.input?.keyboard) game.input.keyboard.enabled = true;
      audio.bindUnlock();
      void audio.unlock();
      game.scale.refresh();
    },
  };
}
