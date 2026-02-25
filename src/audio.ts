import { getSettings } from './settings.ts';

const ctx = new AudioContext();
const gainNode = ctx.createGain();
gainNode.connect(ctx.destination);

let menuBuffer: AudioBuffer | null = null;
let menuSource: AudioBufferSourceNode | null = null;
let fadeRaf = 0;
let playing = false;

fetch('audio/bgm/Slap Master Menu.mp3')
  .then(r => r.arrayBuffer())
  .then(buf => ctx.decodeAudioData(buf))
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
  src.connect(gainNode);
  gainNode.gain.value = getSettings().musicVolume / 100;
  src.start();
  menuSource = src;
  playing = true;
}

export function fadeOutMenuBGM(durationMs = 500): void {
  if (!playing) return;
  const startVol = gainNode.gain.value;
  if (startVol === 0) { stopSource(); return; }
  const startTime = performance.now();

  function tick() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / durationMs, 1);
    gainNode.gain.value = startVol * (1 - t);
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
    gainNode.gain.value = getSettings().musicVolume / 100;
  }
}
