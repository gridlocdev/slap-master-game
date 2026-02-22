import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel } from '@babylonjs/gui';
import { isKeyJustPressed } from '../input.ts';
import {
  MENU_TITLE_FONT_SIZE, MENU_BUTTON_FONT_SIZE, MENU_STICK_THRESHOLD,
} from '../constants.ts';

const MENU_ITEMS = [
  { key: 'local', label: 'Local Multiplayer', bg: '#2d5a1e', border: '#33cc33', width: '290px' },
  { key: 'ai', label: 'vs AI', bg: '#1e2d5a', border: '#4488ff', width: '160px' },
  { key: 'controls', label: 'Controls', bg: '#5a3a1e', border: '#ff8833', width: '200px' },
  { key: 'settings', label: 'Settings', bg: '#3a1e5a', border: '#8844cc', width: '200px' },
  { key: 'quit', label: 'Quit Game', bg: '#5a1e1e', border: '#ff4444', width: '220px' },
] as const;

interface MenuButton {
  rect: Rectangle;
  label: TextBlock;
  bg: string;
  border: string;
}

export interface MainMenuUI {
  ui: AdvancedDynamicTexture;
  selectedIndex: number;
  buttons: MenuButton[];
}

// Gamepad edge detection state (per-pad)
const prevStickX = new Map<number, number>();
const prevDpadLeft = new Map<number, boolean>();
const prevDpadRight = new Map<number, boolean>();
const prevButtonA = new Map<number, boolean>();

export function createMainMenuUI(scene: Scene): MainMenuUI {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('mainMenuUI', true, scene);

  // Title: "SLAP MASTER"
  const title = new TextBlock('menuTitle', 'SLAP MASTER');
  title.fontSize = MENU_TITLE_FONT_SIZE;
  title.fontFamily = 'monospace';
  title.fontWeight = 'bold';
  title.color = '#ffffff';
  title.outlineWidth = 8;
  title.outlineColor = '#000000';
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  title.top = '15%';
  ui.addControl(title);

  // Button row
  const buttonRow = new StackPanel('menuButtonRow');
  buttonRow.isVertical = false;
  buttonRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  buttonRow.top = '-15%';
  buttonRow.adaptWidthToChildren = true;
  buttonRow.height = '70px';
  ui.addControl(buttonRow);

  const buttons: MenuButton[] = [];
  for (const item of MENU_ITEMS) {
    const wrapper = new Rectangle(`menuBtnWrap_${item.key}`);
    wrapper.width = item.width;
    wrapper.height = 1;
    wrapper.thickness = 0;
    wrapper.background = '#00000000';
    wrapper.paddingLeft = '8px';
    wrapper.paddingRight = '8px';
    buttonRow.addControl(wrapper);

    const rect = new Rectangle(`menuBtn_${item.key}`);
    rect.width = 1;
    rect.height = 1;
    rect.background = item.bg;
    rect.thickness = 3;
    rect.color = item.border;
    rect.cornerRadius = 6;
    wrapper.addControl(rect);

    const label = new TextBlock(`menuLabel_${item.key}`, item.label);
    label.fontSize = MENU_BUTTON_FONT_SIZE;
    label.fontFamily = 'monospace';
    label.fontWeight = 'bold';
    label.color = '#ffffff';
    rect.addControl(label);

    buttons.push({ rect, label, bg: item.bg, border: item.border });
  }

  const menuUI: MainMenuUI = { ui, selectedIndex: 0, buttons };

  // Apply initial highlight
  updateButtonVisuals(menuUI);

  // Clear edge detection state
  prevStickX.clear();
  prevDpadLeft.clear();
  prevDpadRight.clear();
  prevButtonA.clear();

  return menuUI;
}

function updateButtonVisuals(menuUI: MainMenuUI): void {
  for (let i = 0; i < menuUI.buttons.length; i++) {
    const btn = menuUI.buttons[i];
    const selected = i === menuUI.selectedIndex;
    btn.rect.thickness = selected ? 5 : 3;
    btn.rect.color = selected ? '#ffffff' : btn.border;
    btn.rect.alpha = selected ? 1 : 0.7;
    btn.label.alpha = selected ? 1 : 0.7;
  }
}

export function updateMainMenu(menuUI: MainMenuUI): string | null {
  const count = menuUI.buttons.length;
  let moved = false;

  // Keyboard navigation
  const goLeftKB = isKeyJustPressed('KeyA') || isKeyJustPressed('KeyK') || isKeyJustPressed('ArrowLeft');
  const goRightKB = isKeyJustPressed('KeyD') || isKeyJustPressed('Semicolon') || isKeyJustPressed('ArrowRight');

  if (goLeftKB) {
    menuUI.selectedIndex = (menuUI.selectedIndex - 1 + count) % count;
    moved = true;
  }
  if (goRightKB) {
    menuUI.selectedIndex = (menuUI.selectedIndex + 1) % count;
    moved = true;
  }

  // Gamepad navigation (check all connected gamepads)
  const gamepads = navigator.getGamepads();
  let gamepadConfirm = false;

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;

    const sx = gp.axes[0] ?? 0;
    const dpadL = gp.buttons[14]?.pressed ?? false;
    const dpadR = gp.buttons[15]?.pressed ?? false;
    const aDown = gp.buttons[0]?.pressed ?? false;

    const prevSx = prevStickX.get(i) ?? 0;
    const prevDL = prevDpadLeft.get(i) ?? false;
    const prevDR = prevDpadRight.get(i) ?? false;
    const prevA = prevButtonA.get(i) ?? false;

    const goLeft = (sx < -MENU_STICK_THRESHOLD && prevSx >= -MENU_STICK_THRESHOLD)
      || (dpadL && !prevDL);
    const goRight = (sx > MENU_STICK_THRESHOLD && prevSx <= MENU_STICK_THRESHOLD)
      || (dpadR && !prevDR);

    if (goLeft) {
      menuUI.selectedIndex = (menuUI.selectedIndex - 1 + count) % count;
      moved = true;
    }
    if (goRight) {
      menuUI.selectedIndex = (menuUI.selectedIndex + 1) % count;
      moved = true;
    }

    if (aDown && !prevA) {
      gamepadConfirm = true;
    }

    prevStickX.set(i, sx);
    prevDpadLeft.set(i, dpadL);
    prevDpadRight.set(i, dpadR);
    prevButtonA.set(i, aDown);
  }

  if (moved) {
    updateButtonVisuals(menuUI);
  }

  // Confirm
  const kbConfirm = isKeyJustPressed('Space') || isKeyJustPressed('Enter');
  if (kbConfirm || gamepadConfirm) {
    return MENU_ITEMS[menuUI.selectedIndex].key;
  }

  return null;
}

export function destroyMainMenu(menuUI: MainMenuUI): void {
  menuUI.ui.dispose();
}
