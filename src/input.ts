import type { PlayerInput } from './types.ts';

const keysHeld = new Set<string>();
const keysJustPressed = new Set<string>();

window.addEventListener('keydown', (e) => {
  if (!keysHeld.has(e.code)) {
    keysJustPressed.add(e.code);
  }
  keysHeld.add(e.code);
});

window.addEventListener('keyup', (e) => {
  keysHeld.delete(e.code);
});

export interface KeyMap {
  forward: string;
  back: string;
  left: string;
  right: string;
  slapLeft: string;
  slapRight: string;
}

export function readInput(keyMap: KeyMap): PlayerInput {
  return {
    forward: keysHeld.has(keyMap.forward),
    back: keysHeld.has(keyMap.back),
    left: keysHeld.has(keyMap.left),
    right: keysHeld.has(keyMap.right),
    slapLeft: keysJustPressed.has(keyMap.slapLeft),
    slapRight: keysJustPressed.has(keyMap.slapRight),
  };
}

export function isKeyJustPressed(code: string): boolean {
  return keysJustPressed.has(code);
}

export function clearJustPressed(): void {
  keysJustPressed.clear();
}
