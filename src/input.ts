import type { PlayerInput } from './types.ts';
import { STICK_DEADZONE, TRIGGER_THRESHOLD, GAMEPAD_SELECT_BUTTON } from './constants.ts';

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
// B button (index 1) for back/unconfirm edge detection
const buttonJustB = new Set<number>();
const prevButtonB = new Map<number, boolean>();
// Also track A/Start for restart
const buttonJustA = new Set<number>();
const prevButtonA = new Map<number, boolean>();
// Select button (index 8) for input assignment overlay
const buttonJustSelect = new Set<number>();
const prevButtonSelect = new Map<number, boolean>();

export function pollGamepads(): void {
  triggerJustLeft.clear();
  triggerJustRight.clear();
  buttonJustB.clear();
  buttonJustX.clear();
  buttonJustA.clear();
  buttonJustSelect.clear();

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

    // B button (index 1) for back/unconfirm
    const bDown = gp.buttons[1]?.pressed ?? false;
    if (bDown && !prevButtonB.get(i)) buttonJustB.add(i);
    prevButtonB.set(i, bDown);

    // X button (index 2) for ability
    const xDown = gp.buttons[2]?.pressed ?? false;
    if (xDown && !prevButtonX.get(i)) buttonJustX.add(i);
    prevButtonX.set(i, xDown);

    // A button (index 0) or Start (index 9) for restart
    const aDown = gp.buttons[0]?.pressed ?? false;
    if (aDown && !prevButtonA.get(i)) buttonJustA.add(i);
    prevButtonA.set(i, aDown);

    // Select button for input assignment overlay
    const selDown = gp.buttons[GAMEPAD_SELECT_BUTTON]?.pressed ?? false;
    if (selDown && !prevButtonSelect.get(i)) buttonJustSelect.add(i);
    prevButtonSelect.set(i, selDown);
  }
}

export function readGamepadInput(padIndex: number): PlayerInput | null {
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

  // D-pad: buttons 12=up, 13=down, 14=left, 15=right
  const dpadUp = gp.buttons[12]?.pressed ?? false;
  const dpadDown = gp.buttons[13]?.pressed ?? false;
  const dpadLeft = gp.buttons[14]?.pressed ?? false;
  const dpadRight = gp.buttons[15]?.pressed ?? false;

  // Stick axes map directly to facing-relative directions
  // (movement.ts converts forward/back/left/right using facingAngle)
  return {
    forward: -sy > STICK_DEADZONE || dpadUp,
    back: sy > STICK_DEADZONE || dpadDown,
    right: -sx > STICK_DEADZONE || dpadRight,
    left: sx > STICK_DEADZONE || dpadLeft,
    slapLeft: triggerJustLeft.has(padIndex),
    slapRight: triggerJustRight.has(padIndex),
    ability: buttonJustX.has(padIndex),
  };
}

export function isGamepadRestart(padIndex: number): boolean {
  return buttonJustA.has(padIndex);
}

export function isGamepadSelectJustPressed(padIndex: number): boolean {
  return buttonJustSelect.has(padIndex);
}

export function isGamepadBJustPressed(padIndex: number): boolean {
  return buttonJustB.has(padIndex);
}

export function isAnyGamepadSelectJustPressed(): boolean {
  return buttonJustSelect.size > 0;
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
