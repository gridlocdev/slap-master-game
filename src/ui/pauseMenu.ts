import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel } from '@babylonjs/gui';
import { isKeyJustPressed } from '../input.ts';
import { playMenuSelectSfx, playEnterSfx } from '../audio.ts';
import { MENU_STICK_THRESHOLD } from '../constants.ts';

const PAUSE_ITEMS = [
  { key: 'resume', label: 'Resume', border: '#33cc33' },
  { key: 'controls', label: 'Controls', border: '#ff8833' },
  { key: 'select', label: 'Return to Ability Select', border: '#4488ff' },
  { key: 'menu', label: 'Return to Main Menu', border: '#ff4444' },
] as const;

interface PauseButton {
  rect: Rectangle;
  label: TextBlock;
  border: string;
}

export interface PauseMenuUI {
  ui: AdvancedDynamicTexture;
  selectedIndex: number;
  buttons: PauseButton[];
}

// Gamepad edge detection state (per-pad)
const prevStickY = new Map<number, number>();
const prevDpadUp = new Map<number, boolean>();
const prevDpadDown = new Map<number, boolean>();
const prevButtonA = new Map<number, boolean>();

export function createPauseMenuUI(scene: Scene): PauseMenuUI {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('pauseMenuUI', true, scene);

  // Dark backdrop
  const backdrop = new Rectangle('pauseBg');
  backdrop.width = 1;
  backdrop.height = 1;
  backdrop.thickness = 0;
  backdrop.background = '#000000cc';
  backdrop.zIndex = 100;
  ui.addControl(backdrop);

  // Centered panel
  const panel = new Rectangle('pausePanel');
  panel.width = '500px';
  panel.height = '400px';
  panel.thickness = 2;
  panel.color = '#555577';
  panel.cornerRadius = 12;
  panel.background = '#1a1a2eee';
  backdrop.addControl(panel);

  // "PAUSED" title
  const title = new TextBlock('pauseTitle', 'PAUSED');
  title.fontSize = 56;
  title.fontFamily = 'monospace';
  title.fontWeight = 'bold';
  title.color = '#ffffff';
  title.outlineWidth = 4;
  title.outlineColor = '#000000';
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  title.top = '20px';
  title.height = '80px';
  panel.addControl(title);

  // Button stack
  const buttonStack = new StackPanel('pauseButtonStack');
  buttonStack.isVertical = true;
  buttonStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  buttonStack.top = '-24px';
  buttonStack.adaptHeightToChildren = true;
  buttonStack.width = '450px';
  panel.addControl(buttonStack);

  const buttons: PauseButton[] = [];
  for (const item of PAUSE_ITEMS) {
    const wrapper = new Rectangle(`pauseBtnWrap_${item.key}`);
    wrapper.width = 1;
    wrapper.height = '56px';
    wrapper.thickness = 0;
    wrapper.background = '#00000000';
    wrapper.paddingTop = '4px';
    wrapper.paddingBottom = '4px';
    buttonStack.addControl(wrapper);

    const rect = new Rectangle(`pauseBtn_${item.key}`);
    rect.width = 1;
    rect.height = 1;
    rect.background = '#222233';
    rect.thickness = 3;
    rect.color = item.border;
    rect.cornerRadius = 6;
    wrapper.addControl(rect);

    const label = new TextBlock(`pauseLabel_${item.key}`, item.label);
    label.fontSize = 22;
    label.fontFamily = 'monospace';
    label.fontWeight = 'bold';
    label.color = '#ffffff';
    rect.addControl(label);

    buttons.push({ rect, label, border: item.border });
  }

  const menuUI: PauseMenuUI = { ui, selectedIndex: 0, buttons };
  updateButtonVisuals(menuUI);

  // Clear edge detection state
  prevStickY.clear();
  prevDpadUp.clear();
  prevDpadDown.clear();
  prevButtonA.clear();

  return menuUI;
}

function updateButtonVisuals(menuUI: PauseMenuUI): void {
  for (let i = 0; i < menuUI.buttons.length; i++) {
    const btn = menuUI.buttons[i];
    const selected = i === menuUI.selectedIndex;
    btn.rect.thickness = selected ? 5 : 3;
    btn.rect.color = selected ? '#ffffff' : btn.border;
    btn.rect.alpha = selected ? 1 : 0.7;
    btn.label.alpha = selected ? 1 : 0.7;
  }
}

export function updatePauseMenu(menuUI: PauseMenuUI): string | null {
  const count = menuUI.buttons.length;
  let moved = false;

  // Keyboard navigation (vertical: up/down)
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

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;

    const sy = gp.axes[1] ?? 0;
    const dpadU = gp.buttons[12]?.pressed ?? false;
    const dpadD = gp.buttons[13]?.pressed ?? false;
    const aDown = gp.buttons[0]?.pressed ?? false;

    const prevSy = prevStickY.get(i) ?? 0;
    const prevDU = prevDpadUp.get(i) ?? false;
    const prevDD = prevDpadDown.get(i) ?? false;
    const prevA = prevButtonA.get(i) ?? false;

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

    if (aDown && !prevA) {
      gamepadConfirm = true;
    }

    prevStickY.set(i, sy);
    prevDpadUp.set(i, dpadU);
    prevDpadDown.set(i, dpadD);
    prevButtonA.set(i, aDown);
  }

  if (moved) {
    updateButtonVisuals(menuUI);
    playMenuSelectSfx();
  }

  // Confirm
  const kbConfirm = isKeyJustPressed('Space') || isKeyJustPressed('Enter');
  if (kbConfirm || gamepadConfirm) {
    playEnterSfx();
    return PAUSE_ITEMS[menuUI.selectedIndex].key;
  }

  return null;
}

export function destroyPauseMenu(menuUI: PauseMenuUI): void {
  menuUI.ui.dispose();
}
