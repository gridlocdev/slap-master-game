import { getSettings } from './settings.ts';

const ctx = new AudioContext();
const musicGain = ctx.createGain();
musicGain.connect(ctx.destination);
const sfxGain = ctx.createGain();
sfxGain.connect(ctx.destination);

// --- BGM ---

let menuBuffer: AudioBuffer | null = null;
let menuSource: AudioBufferSourceNode | null = null;
let fadeRaf = 0;
let playing = false;

function loadBuffer(url: string): Promise<AudioBuffer> {
  return fetch(url).then(r => r.arrayBuffer()).then(buf => ctx.decodeAudioData(buf));
}

loadBuffer('audio/bgm/Slap Master Menu.mp3')
  .then(decoded => { menuBuffer = decoded; })
  .catch(() => {});

function stopSource(): void {
  if (menuSource) {
    menuSource.stop();
    menuSource.disconnect();
    menuSource = null;
  }
  playing = false;
}

export function playMenuBGM(): void {
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

export function fadeOutMenuBGM(durationMs = 500): void {
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

export function stopMenuBGM(): void {
  cancelAnimationFrame(fadeRaf);
  stopSource();
}

export function updateMusicVolume(): void {
  if (playing) {
    musicGain.gain.value = getSettings().musicVolume / 100;
  }
}

// --- SFX ---

const hitBuffers: AudioBuffer[] = [];
let menuSelectBuffer: AudioBuffer | null = null;
let menuBackBuffer: AudioBuffer | null = null;
let ouchBuffer: AudioBuffer | null = null;
let launchBuffer: AudioBuffer | null = null;
let deepBounceBuffer: AudioBuffer | null = null;

// Preload all SFX
for (let i = 1; i <= 18; i++) {
  loadBuffer(`audio/sfx/interactions/hits/${i}.ogg`)
    .then(buf => { hitBuffers.push(buf); })
    .catch(() => {});
}
loadBuffer('audio/sfx/menu/Select.wav').then(b => { menuSelectBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/menu/Error.wav').then(b => { menuBackBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/interactions/hurt/Ouch.wav').then(b => { ouchBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/abilities/Launch.wav').then(b => { launchBuffer = b; }).catch(() => {});
loadBuffer('audio/sfx/abilities/DeepBounce.wav').then(b => { deepBounceBuffer = b; }).catch(() => {});

function playSfx(buffer: AudioBuffer | null): void {
  if (!buffer) return;
  if (ctx.state === 'suspended') ctx.resume();
  sfxGain.gain.value = getSettings().sfxVolume / 100;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(sfxGain);
  src.start();
}

export function playSlapHitSfx(): void {
  if (hitBuffers.length === 0) return;
  playSfx(hitBuffers[Math.floor(Math.random() * hitBuffers.length)]);
}

export function playMenuSelectSfx(): void { playSfx(menuSelectBuffer); }
export function playMenuBackSfx(): void { playSfx(menuBackBuffer); }
export function playRingOutSfx(): void { playSfx(ouchBuffer); }
export function playDashSfx(): void { playSfx(launchBuffer); }
export function playMelonExplodeSfx(): void { playSfx(deepBounceBuffer); }
