import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel } from '@babylonjs/gui';
import { isKeyJustPressed } from '../input.ts';
import { MENU_STICK_THRESHOLD } from '../constants.ts';
import type { AIDifficulty } from '../types.ts';

const DIFFICULTY_ITEMS: { key: AIDifficulty; label: string; border: string }[] = [
  { key: 'easy', label: 'Easy', border: '#33cc33' },
  { key: 'medium', label: 'Medium', border: '#4488ff' },
  { key: 'hard', label: 'Hard', border: '#ff4444' },
];

interface DifficultyButton {
  rect: Rectangle;
  label: TextBlock;
  border: string;
}

export interface DifficultyMenuUI {
  ui: AdvancedDynamicTexture;
  selectedIndex: number;
  buttons: DifficultyButton[];
}

// Gamepad edge detection state (per-pad)
const prevStickY = new Map<number, number>();
const prevDpadUp = new Map<number, boolean>();
const prevDpadDown = new Map<number, boolean>();
const prevButtonA = new Map<number, boolean>();
const prevButtonB = new Map<number, boolean>();

export function createDifficultyMenu(scene: Scene): DifficultyMenuUI {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('difficultyMenuUI', true, scene);

  // Dark backdrop
  const backdrop = new Rectangle('diffBg');
  backdrop.width = 1;
  backdrop.height = 1;
  backdrop.thickness = 0;
  backdrop.background = '#000000cc';
  backdrop.zIndex = 100;
  ui.addControl(backdrop);

  // Centered panel
  const panel = new Rectangle('diffPanel');
  panel.width = '500px';
  panel.height = '380px';
  panel.thickness = 2;
  panel.color = '#555577';
  panel.cornerRadius = 12;
  panel.background = '#1a1a2eee';
  backdrop.addControl(panel);

  // Title
  const title = new TextBlock('diffTitle', 'SELECT DIFFICULTY');
  title.fontSize = 42;
  title.fontFamily = 'monospace';
  title.fontWeight = 'bold';
  title.color = '#ffffff';
  title.outlineWidth = 4;
  title.outlineColor = '#000000';
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  title.top = '28px';
  title.height = '80px';
  panel.addControl(title);

  // Button stack
  const buttonStack = new StackPanel('diffButtonStack');
  buttonStack.isVertical = true;
  buttonStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  buttonStack.top = '-32px';
  buttonStack.adaptHeightToChildren = true;
  buttonStack.width = '450px';
  panel.addControl(buttonStack);

  const buttons: DifficultyButton[] = [];
  for (const item of DIFFICULTY_ITEMS) {
    const wrapper = new Rectangle(`diffBtnWrap_${item.key}`);
    wrapper.width = 1;
    wrapper.height = '56px';
    wrapper.thickness = 0;
    wrapper.background = '#00000000';
    wrapper.paddingTop = '4px';
    wrapper.paddingBottom = '4px';
    buttonStack.addControl(wrapper);

    const rect = new Rectangle(`diffBtn_${item.key}`);
    rect.width = 1;
    rect.height = 1;
    rect.background = '#222233';
    rect.thickness = 3;
    rect.color = item.border;
    rect.cornerRadius = 6;
    wrapper.addControl(rect);

    const label = new TextBlock(`diffLabel_${item.key}`, item.label);
    label.fontSize = 22;
    label.fontFamily = 'monospace';
    label.fontWeight = 'bold';
    label.color = '#ffffff';
    rect.addControl(label);

    buttons.push({ rect, label, border: item.border });
  }

  const menuUI: DifficultyMenuUI = { ui, selectedIndex: 1, buttons }; // default to medium
  updateButtonVisuals(menuUI);

  // Clear edge detection state
  prevStickY.clear();
  prevDpadUp.clear();
  prevDpadDown.clear();
  prevButtonA.clear();
  prevButtonB.clear();

  return menuUI;
}

function updateButtonVisuals(menuUI: DifficultyMenuUI): void {
  for (let i = 0; i < menuUI.buttons.length; i++) {
    const btn = menuUI.buttons[i];
    const selected = i === menuUI.selectedIndex;
    btn.rect.thickness = selected ? 5 : 3;
    btn.rect.color = selected ? '#ffffff' : btn.border;
    btn.rect.alpha = selected ? 1 : 0.7;
    btn.label.alpha = selected ? 1 : 0.7;
  }
}

export function updateDifficultyMenu(menuUI: DifficultyMenuUI): AIDifficulty | 'back' | null {
  const count = menuUI.buttons.length;
  let moved = false;

  // Keyboard navigation (vertical: W/S/Up/Down)
  const goUpKB = isKeyJustPressed('KeyW') || isKeyJustPressed('KeyO') || isKeyJustPressed('ArrowUp');
  const goDownKB = isKeyJustPressed('KeyS') || isKeyJustPressed('KeyL') || isKeyJustPressed('ArrowDown');

  if (goUpKB) {
    menuUI.selectedIndex = (menuUI.selectedIndex - 1 + count) % count;
    moved = true;
  }
  if (goDownKB) {
    menuUI.selectedIndex = (menuUI.selectedIndex + 1) % count;
    moved = true;
  }

  // Gamepad navigation (check all connected gamepads)
  const gamepads = navigator.getGamepads();
  let gamepadConfirm = false;
  let gamepadBack = false;

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;

    const sy = gp.axes[1] ?? 0;
    const dpadU = gp.buttons[12]?.pressed ?? false;
    const dpadD = gp.buttons[13]?.pressed ?? false;
    const aDown = gp.buttons[0]?.pressed ?? false;
    const bDown = gp.buttons[1]?.pressed ?? false;

    const prevSy = prevStickY.get(i) ?? 0;
    const prevDU = prevDpadUp.get(i) ?? false;
    const prevDD = prevDpadDown.get(i) ?? false;
    const prevA = prevButtonA.get(i) ?? false;
    const prevB = prevButtonB.get(i) ?? false;

    const goUp = (sy < -MENU_STICK_THRESHOLD && prevSy >= -MENU_STICK_THRESHOLD)
      || (dpadU && !prevDU);
    const goDown = (sy > MENU_STICK_THRESHOLD && prevSy <= MENU_STICK_THRESHOLD)
      || (dpadD && !prevDD);

    if (goUp) {
      menuUI.selectedIndex = (menuUI.selectedIndex - 1 + count) % count;
      moved = true;
    }
    if (goDown) {
      menuUI.selectedIndex = (menuUI.selectedIndex + 1) % count;
      moved = true;
    }

    if (aDown && !prevA) gamepadConfirm = true;
    if (bDown && !prevB) gamepadBack = true;

    prevStickY.set(i, sy);
    prevDpadUp.set(i, dpadU);
    prevDpadDown.set(i, dpadD);
    prevButtonA.set(i, aDown);
    prevButtonB.set(i, bDown);
  }

  if (moved) {
    updateButtonVisuals(menuUI);
  }

  // Back: Escape or gamepad B
  if (isKeyJustPressed('Escape') || gamepadBack) {
    return 'back';
  }

  // Confirm: Space/Enter or gamepad A
  const kbConfirm = isKeyJustPressed('Space') || isKeyJustPressed('Enter');
  if (kbConfirm || gamepadConfirm) {
    return DIFFICULTY_ITEMS[menuUI.selectedIndex].key;
  }

  return null;
}

export function destroyDifficultyMenu(menuUI: DifficultyMenuUI): void {
  menuUI.ui.dispose();
}
