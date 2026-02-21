import type { PlayerInput } from './types.ts';
import { STICK_DEADZONE, TRIGGER_THRESHOLD } from './constants.ts';

// --- Keyboard ---

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
  ability: string;
}

export function readInput(keyMap: KeyMap): PlayerInput {
  return {
    forward: keysHeld.has(keyMap.forward),
    back: keysHeld.has(keyMap.back),
    left: keysHeld.has(keyMap.left),
    right: keysHeld.has(keyMap.right),
    slapLeft: keysJustPressed.has(keyMap.slapLeft),
    slapRight: keysJustPressed.has(keyMap.slapRight),
    ability: keysJustPressed.has(keyMap.ability),
  };
}

export function isKeyJustPressed(code: string): boolean {
  return keysJustPressed.has(code);
}

export function clearJustPressed(): void {
  keysJustPressed.clear();
}

// --- Gamepad ---

// Track previous trigger state per gamepad for edge detection
const prevTriggerLeft = new Map<number, boolean>();
const prevTriggerRight = new Map<number, boolean>();
// "Just pressed" flags set during pollGamepads, cleared at frame end
const triggerJustLeft = new Set<number>();
const triggerJustRight = new Set<number>();
// Track X button (index 2) for ability
const buttonJustX = new Set<number>();
const prevButtonX = new Map<number, boolean>();
// Also track A/Start for restart
const buttonJustA = new Set<number>();
const prevButtonA = new Map<number, boolean>();

export function pollGamepads(): void {
  triggerJustLeft.clear();
  triggerJustRight.clear();
  buttonJustX.clear();
  buttonJustA.clear();

  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;

    // LT = buttons[6], RT = buttons[7]
    const lt = gp.buttons[6]?.value ?? 0;
    const rt = gp.buttons[7]?.value ?? 0;
    const ltDown = lt > TRIGGER_THRESHOLD;
    const rtDown = rt > TRIGGER_THRESHOLD;

    if (ltDown && !prevTriggerLeft.get(i)) triggerJustLeft.add(i);
    if (rtDown && !prevTriggerRight.get(i)) triggerJustRight.add(i);
    prevTriggerLeft.set(i, ltDown);
    prevTriggerRight.set(i, rtDown);

    // X button (index 2) for ability
    const xDown = gp.buttons[2]?.pressed ?? false;
    if (xDown && !prevButtonX.get(i)) buttonJustX.add(i);
    prevButtonX.set(i, xDown);

    // A button (index 0) or Start (index 9) for restart
    const aDown = gp.buttons[0]?.pressed ?? false;
    if (aDown && !prevButtonA.get(i)) buttonJustA.add(i);
    prevButtonA.set(i, aDown);
  }
}

export function readGamepadInput(padIndex: number, facingAngle: number): PlayerInput | null {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[padIndex];
  if (!gp) return null;

  // Left stick: axes[0] = X, axes[1] = Y
  let sx = gp.axes[0] ?? 0;
  let sy = gp.axes[1] ?? 0;

  // Apply deadzone
  const mag = Math.sqrt(sx * sx + sy * sy);
  if (mag < STICK_DEADZONE) {
    sx = 0;
    sy = 0;
  }

  // Project stick onto facing-relative axes
  // Stick X → world X, stick Y → world Y (game's 2D plane)
  const cosA = Math.cos(facingAngle);
  const sinA = Math.sin(facingAngle);
  const forwardComponent = sx * cosA + sy * sinA;
  const rightComponent = sx * (-sinA) + sy * cosA;

  return {
    forward: forwardComponent > STICK_DEADZONE,
    back: forwardComponent < -STICK_DEADZONE,
    right: rightComponent > STICK_DEADZONE,
    left: rightComponent < -STICK_DEADZONE,
    slapLeft: triggerJustLeft.has(padIndex),
    slapRight: triggerJustRight.has(padIndex),
    ability: buttonJustX.has(padIndex),
  };
}

export function isGamepadRestart(padIndex: number): boolean {
  return buttonJustA.has(padIndex);
}

export function mergeInput(a: PlayerInput, b: PlayerInput): PlayerInput {
  return {
    forward: a.forward || b.forward,
    back: a.back || b.back,
    left: a.left || b.left,
    right: a.right || b.right,
    slapLeft: a.slapLeft || b.slapLeft,
    slapRight: a.slapRight || b.slapRight,
    ability: a.ability || b.ability,
  };
}
