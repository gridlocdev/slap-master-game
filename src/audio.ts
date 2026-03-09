import { getSettings } from './settings.ts';

const ctx = new AudioContext();
const musicGain = ctx.createGain();
musicGain.connect(ctx.destination);
const gameplayMusicGain = ctx.createGain();
gameplayMusicGain.connect(ctx.destination);
const mainMenuMusicGain = ctx.createGain();
mainMenuMusicGain.connect(ctx.destination);
const sfxGain = ctx.createGain();
sfxGain.connect(ctx.destination);

// Resume AudioContext on first user interaction (browser autoplay policy)
function resumeOnInteraction() {
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      if (mainMenuPending || mainMenuPlaying) {
        // mainMenuPlaying means buffer loaded & play was called but context was suspended
        // mainMenuPending means play was called but buffer hadn't loaded yet
        if (mainMenuBuffer && !mainMenuSource) playMainMenuBGM();
      }
    });
  }
  document.removeEventListener('pointerdown', resumeOnInteraction);
  document.removeEventListener('keydown', resumeOnInteraction);
}
document.addEventListener('pointerdown', resumeOnInteraction);
document.addEventListener('keydown', resumeOnInteraction);

// --- BGM ---

let menuBuffer: AudioBuffer | null = null;
let menuSource: AudioBufferSourceNode | null = null;
let fadeRaf = 0;
let playing = false;

function loadBuffer(url: string): Promise<AudioBuffer> {
  return fetch(url).then(r => r.arrayBuffer()).then(buf => ctx.decodeAudioData(buf));
}

loadBuffer('audio/bgm/Slap Master Ability Select.mp3')
  .then(decoded => { menuBuffer = decoded; })
  .catch(() => {});

let mainMenuBuffer: AudioBuffer | null = null;
let mainMenuSource: AudioBufferSourceNode | null = null;
let mainMenuPlaying = false;
let mainMenuFadeRaf = 0;
let mainMenuPending = false;

loadBuffer('audio/bgm/Slap Master Main Menu.mp3')
  .then(decoded => {
    mainMenuBuffer = decoded;
    if (mainMenuPending) {
      mainMenuPending = false;
      playMainMenuBGM();
    }
  })
  .catch(() => {});

function stopSource(): void {
  if (menuSource) {
    menuSource.stop();
    menuSource.disconnect();
    menuSource = null;
  }
  playing = false;
}

export function playAbilitySelectBGM(): void {
  cancelAnimationFrame(fadeRaf);
  if (!menuBuffer) return;
  stopSource();
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = menuBuffer;
  src.loop = true;
  src.connect(musicGain);
  musicGain.gain.value = getSettings().musicVolume / 100;
  src.start();
  menuSource = src;
  playing = true;
}

export function fadeOutAbilitySelectBGM(durationMs = 500): void {
  if (!playing) return;
  const startVol = musicGain.gain.value;
  if (startVol === 0) { stopSource(); return; }
  const startTime = performance.now();

  function tick() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    musicGain.gain.value = startVol * (1 - t);
    if (t < 1) {
      fadeRaf = requestAnimationFrame(tick);
    } else {
      stopSource();
    }
  }

  fadeRaf = requestAnimationFrame(tick);
}

export function stopAbilitySelectBGM(): void {
  cancelAnimationFrame(fadeRaf);
  stopSource();
}

// --- Gameplay BGM ---

let gameplayBuffer: AudioBuffer | null = null;
let gameplaySource: AudioBufferSourceNode | null = null;
let gameplayPlaying = false;
let gameplayPaused = false;
let gameplayFadeRaf = 0;
let gameplayStartContextTime = 0;
let gameplaySavedOffset = 0;

loadBuffer('audio/bgm/Slap Master Gameplay.mp3')
  .then(decoded => { gameplayBuffer = decoded; })
  .catch(() => {});

function stopGameplaySource(): void {
  if (gameplaySource) {
    gameplaySource.stop();
    gameplaySource.disconnect();
    gameplaySource = null;
  }
  gameplayPlaying = false;
}

export function playGameplayBGM(): void {
  if (gameplayPlaying) return;
  cancelAnimationFrame(gameplayFadeRaf);
  if (!gameplayBuffer) return;
  stopGameplaySource();
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = gameplayBuffer;
  src.loop = true;
  src.connect(gameplayMusicGain);
  gameplayMusicGain.gain.value = getSettings().musicVolume / 100;
  gameplaySavedOffset = 0;
  gameplayPaused = false;
  src.start(0, 0);
  gameplayStartContextTime = ctx.currentTime;
  gameplaySource = src;
  gameplayPlaying = true;
}

export function pauseGameplayBGM(): void {
  if (!gameplayPlaying) return;
  const elapsed = ctx.currentTime - gameplayStartContextTime;
  gameplaySavedOffset = (gameplaySavedOffset + elapsed) % gameplayBuffer!.duration;
  stopGameplaySource();
  gameplayPaused = true;
}

export function resumeGameplayBGM(): void {
  if (!gameplayPaused || !gameplayBuffer) return;
  cancelAnimationFrame(gameplayFadeRaf);
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = gameplayBuffer;
  src.loop = true;
  src.connect(gameplayMusicGain);
  gameplayMusicGain.gain.value = getSettings().musicVolume / 100;
  src.start(0, gameplaySavedOffset);
  gameplayStartContextTime = ctx.currentTime;
  gameplaySource = src;
  gameplayPlaying = true;
  gameplayPaused = false;
}

export function fadeOutGameplayBGM(durationMs = 500): void {
  if (!gameplayPlaying) return;
  const startVol = gameplayMusicGain.gain.value;
  if (startVol === 0) { stopGameplaySource(); return; }
  const startTime = performance.now();

  function tick() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    gameplayMusicGain.gain.value = startVol * (1 - t);
    if (t < 1) {
      gameplayFadeRaf = requestAnimationFrame(tick);
    } else {
      stopGameplaySource();
    }
  }

  gameplayFadeRaf = requestAnimationFrame(tick);
}

export function stopGameplayBGM(): void {
  cancelAnimationFrame(gameplayFadeRaf);
  stopGameplaySource();
  gameplayPaused = false;
}

// --- Main Menu BGM ---

function stopMainMenuSource(): void {
  if (mainMenuSource) {
    mainMenuSource.stop();
    mainMenuSource.disconnect();
    mainMenuSource = null;
  }
  mainMenuPlaying = false;
}

export function playMainMenuBGM(): void {
  cancelAnimationFrame(mainMenuFadeRaf);
  if (!mainMenuBuffer) { mainMenuPending = true; return; }
  stopMainMenuSource();
  if (ctx.state === 'suspended') ctx.resume();
  const src = ctx.createBufferSource();
  src.buffer = mainMenuBuffer;
  src.loop = true;
  src.connect(mainMenuMusicGain);
  mainMenuMusicGain.gain.value = getSettings().musicVolume / 100;
  src.start();
  mainMenuSource = src;
  mainMenuPlaying = true;
}

export function fadeOutMainMenuBGM(durationMs = 500): void {
  mainMenuPending = false;
  if (!mainMenuPlaying) return;
  const startVol = mainMenuMusicGain.gain.value;
  if (startVol === 0) { stopMainMenuSource(); return; }
  const startTime = performance.now();

  function tick() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    mainMenuMusicGain.gain.value = startVol * (1 - t);
    if (t < 1) {
      mainMenuFadeRaf = requestAnimationFrame(tick);
    } else {
      stopMainMenuSource();
    }
  }

  mainMenuFadeRaf = requestAnimationFrame(tick);
}

export function stopMainMenuBGM(): void {
  mainMenuPending = false;
  cancelAnimationFrame(mainMenuFadeRaf);
  stopMainMenuSource();
}

export function updateMusicVolume(): void {
  const vol = getSettings().musicVolume / 100;
  if (playing) {
    musicGain.gain.value = vol;
  }
  if (gameplayPlaying) {
    gameplayMusicGain.gain.value = vol;
  }
  if (mainMenuPlaying) {
    mainMenuMusicGain.gain.value = vol;
  }
}

// --- SFX ---

const hitBuffers: AudioBuffer[] = [];
let menuSelectBuffer: AudioBuffer | null = null;
let menuBackBuffer: AudioBuffer | null = null;
let launchBuffer: AudioBuffer | null = null;
let deepBounceBuffer: AudioBuffer | null = null;
let decreasingNoteBuffer: AudioBuffer | null = null;
let repeatedNoiseBuffer: AudioBuffer | null = null;
let readyUpBuffer: AudioBuffer | null = null;
let enterBuffer: AudioBuffer | null = null;
let countdownNumberBuffer: AudioBuffer | null = null;
let countdownFinishBuffer: AudioBuffer | null = null;

// Preload all SFX
for (let i = 1; i <= 18; i++) {
  loadBuffer(`audio/sfx/interactions/hits/${i}.ogg`)
    .then(buf => { hitBuffers.push(buf); })
    .catch(() => {});
}
loadBuffer('audio/sfx/menu/Select.wav').then(b => { menuSelectBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/menu/Error.wav').then(b => { menuBackBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/abilities/Launch.wav').then(b => { launchBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/abilities/DeepBounce.wav').then(b => { deepBounceBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/interactions/ring-out/Decreasing note.wav').then(b => { decreasingNoteBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/interactions/ring-out/Repeated noise.wav').then(b => { repeatedNoiseBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/menu/ReadyUp.wav').then(b => { readyUpBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/menu/Enter.wav').then(b => { enterBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/countdown/Slap Master SFX Countdown Number.mp3').then(b => { countdownNumberBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/countdown/Slap Master SFX Countdown Finish.mp3').then(b => { countdownFinishBuffer = b; }).catch(() => {});

let gameSfxMuted = false;
export function setGameSfxMuted(muted: boolean): void { gameSfxMuted = muted; }

function playSfx(buffer: AudioBuffer | null, volume = 1): void {
  if (!buffer) return;
  if (ctx.state === 'suspended') ctx.resume();
  sfxGain.gain.value = (getSettings().sfxVolume / 100) * volume;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(sfxGain);
  src.start();
}

export function playSlapHitSfx(): void {
  if (gameSfxMuted) return;
  if (hitBuffers.length === 0) return;
  playSfx(hitBuffers[Math.floor(Math.random() * hitBuffers.length)]);
}

export function playMenuSelectSfx(): void { playSfx(menuSelectBuffer); }
export function playMenuBackSfx(): void { playSfx(menuBackBuffer); }
export function playRingOutSfx(): void { if (gameSfxMuted) return; playSfx(decreasingNoteBuffer); playSfx(repeatedNoiseBuffer); }
export function playDashSfx(): void { if (gameSfxMuted) return; playSfx(launchBuffer); }
export function playMelonExplodeSfx(): void { if (gameSfxMuted) return; playSfx(deepBounceBuffer, 0.5); }
export function playReadyUpSfx(): void { playSfx(readyUpBuffer); }
export function playEnterSfx(): void { playSfx(enterBuffer); }
export function playCountdownNumberSfx(): void { playSfx(countdownNumberBuffer); }
export function playCountdownFinishSfx(): void { playSfx(countdownFinishBuffer); }
