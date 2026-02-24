import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel } from '@babylonjs/gui';
import { isKeyJustPressed } from '../input.ts';
import {
  MENU_STICK_THRESHOLD,
  SETTINGS_VOL_STEP, SETTINGS_SLIDER_TRACK_W,
  P1_HUD_COLOR, P2_HUD_COLOR,
} from '../constants.ts';
import {
  getSettings, setMusicVolume, setSfxVolume,
  setP1Scheme, setP2Scheme,
  setHitlagEnabled, setScreenShakeEnabled,
} from '../settings.ts';
import type { ControlScheme } from '../types.ts';
import { createIconRow, ICON_SIZE } from './iconRow.ts';
import { KB_ICONS, GP_ICONS } from './inputIcons.ts';

const KB1_DETECT_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyV', 'KeyE'];
const KB2_DETECT_KEYS = ['KeyO', 'KeyK', 'KeyL', 'Semicolon', 'ArrowLeft', 'ArrowRight', 'KeyP'];

interface SliderRow {
  kind: 'slider';
  wrapper: Rectangle;
  label: TextBlock;
  trackFill: Rectangle;
  valueText: TextBlock;
  border: string;
  getValue: () => number;
  adjust: (delta: number) => void;
}

interface InputRow {
  kind: 'input';
  wrapper: Rectangle;
  label: TextBlock;
  deviceText: TextBlock;
  border: string;
  player: 1 | 2;
}

interface ToggleRow {
  kind: 'toggle';
  wrapper: Rectangle;
  label: TextBlock;
  valueText: TextBlock;
  border: string;
  getVal: () => boolean;
  toggle: () => void;
}

type SettingsRow = SliderRow | InputRow | ToggleRow;

export interface SettingsMenuUI {
  ui: AdvancedDynamicTexture;
  selectedIndex: number;
  rows: SettingsRow[];
  listeningRow: number | null;
}

// Gamepad edge detection (menu nav)
const prevStickY = new Map<number, number>();
const prevDpadUp = new Map<number, boolean>();
const prevDpadDown = new Map<number, boolean>();
const prevButtonA = new Map<number, boolean>();
const prevButtonB = new Map<number, boolean>();
// Horizontal nav for sliders
const prevStickX = new Map<number, number>();
const prevDpadLeft = new Map<number, boolean>();
const prevDpadRight = new Map<number, boolean>();
// Listening mode: track all gamepad buttons per pad
const prevGpButtons = new Map<number, boolean[]>();

function formatScheme(s: ControlScheme): string {
  if (s.type === 'kb1') return 'Keyboard (WASD)';
  if (s.type === 'kb2') return 'Keyboard (OKL;)';
  return `Gamepad ${s.index + 1}`;
}

export function createSettingsMenu(scene: Scene): SettingsMenuUI {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('settingsMenuUI', true, scene);

  // Dark backdrop
  const backdrop = new Rectangle('settingsBg');
  backdrop.width = 1;
  backdrop.height = 1;
  backdrop.thickness = 0;
  backdrop.background = '#000000cc';
  backdrop.zIndex = 100;
  ui.addControl(backdrop);

  // Centered panel
  const panel = new Rectangle('settingsPanel');
  panel.width = '580px';
  panel.height = '600px';
  panel.thickness = 2;
  panel.color = '#555577';
  panel.cornerRadius = 12;
  panel.background = '#1a1a2eee';
  backdrop.addControl(panel);

  // Title
  const title = new TextBlock('settingsTitle', 'SETTINGS');
  title.fontSize = 44;
  title.fontFamily = 'monospace';
  title.fontWeight = 'bold';
  title.color = '#ffffff';
  title.outlineWidth = 4;
  title.outlineColor = '#000000';
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  title.top = '20px';
  title.height = '70px';
  panel.addControl(title);

  // Row stack
  const rowStack = new StackPanel('settingsRowStack');
  rowStack.isVertical = true;
  rowStack.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  rowStack.top = '20px';
  rowStack.adaptHeightToChildren = true;
  rowStack.width = '520px';
  panel.addControl(rowStack);

  const s = getSettings();
  const rows: SettingsRow[] = [];

  // Music Volume slider
  rows.push(createSliderRow(rowStack, 'Music Volume', '#33cc33', s.musicVolume,
    () => getSettings().musicVolume,
    (delta) => setMusicVolume(getSettings().musicVolume + delta),
  ));

  // SFX Volume slider
  rows.push(createSliderRow(rowStack, 'SFX Volume', '#4488ff', s.sfxVolume,
    () => getSettings().sfxVolume,
    (delta) => setSfxVolume(getSettings().sfxVolume + delta),
  ));

  // Hitlag toggle
  rows.push(createToggleRow(rowStack, 'Hitlag', '#cc66ff', s.hitlagEnabled,
    () => getSettings().hitlagEnabled,
    () => setHitlagEnabled(!getSettings().hitlagEnabled),
  ));

  // Screen Shake toggle
  rows.push(createToggleRow(rowStack, 'Screen Shake', '#ff6644', s.screenShakeEnabled,
    () => getSettings().screenShakeEnabled,
    () => setScreenShakeEnabled(!getSettings().screenShakeEnabled),
  ));

  // P1 Input
  rows.push(createInputRow(rowStack, 'P1 Input', P1_HUD_COLOR, 1, s.p1Scheme));

  // P2 Input
  rows.push(createInputRow(rowStack, 'P2 Input', P2_HUD_COLOR, 2, s.p2Scheme));

  // Bottom hint
  const hint = createIconRow(
    [
      { icon: KB_ICONS.escape },
      { text: ' / ' },
      { icon: GP_ICONS.b },
      { text: ' = Back' },
    ],
    { iconSize: ICON_SIZE.sm, fontSize: 14, color: '#888888', gap: 4 },
  );
  hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  hint.top = '-14px';
  panel.addControl(hint);

  const menuUI: SettingsMenuUI = { ui, selectedIndex: 0, rows, listeningRow: null };
  updateRowHighlights(menuUI);

  // Clear edge detection
  prevStickY.clear();
  prevDpadUp.clear();
  prevDpadDown.clear();
  prevButtonA.clear();
  prevButtonB.clear();
  prevStickX.clear();
  prevDpadLeft.clear();
  prevDpadRight.clear();
  prevGpButtons.clear();

  return menuUI;
}

function createSliderRow(
  parent: StackPanel, label: string, border: string, initialValue: number,
  getValue: () => number, adjust: (delta: number) => void,
): SliderRow {
  const wrapper = new Rectangle(`settingsSlider_${label}`);
  wrapper.width = 1;
  wrapper.height = '60px';
  wrapper.thickness = 3;
  wrapper.color = border;
  wrapper.cornerRadius = 6;
  wrapper.background = '#222233';
  wrapper.paddingTop = '4px';
  wrapper.paddingBottom = '4px';
  parent.addControl(wrapper);

  const labelText = new TextBlock(`settingsLabel_${label}`, label);
  labelText.fontSize = 20;
  labelText.fontFamily = 'monospace';
  labelText.fontWeight = 'bold';
  labelText.color = '#ffffff';
  labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelText.left = '16px';
  labelText.width = '200px';
  labelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  wrapper.addControl(labelText);

  // Track background
  const trackBg = new Rectangle(`settingsTrack_${label}`);
  trackBg.width = `${SETTINGS_SLIDER_TRACK_W}px`;
  trackBg.height = '16px';
  trackBg.thickness = 0;
  trackBg.background = '#333344';
  trackBg.cornerRadius = 4;
  trackBg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  trackBg.left = '40px';
  wrapper.addControl(trackBg);

  // Track fill
  const fillW = Math.round((initialValue / 100) * SETTINGS_SLIDER_TRACK_W);
  const trackFill = new Rectangle(`settingsFill_${label}`);
  trackFill.width = `${fillW}px`;
  trackFill.height = 1;
  trackFill.thickness = 0;
  trackFill.background = border;
  trackFill.cornerRadius = 4;
  trackFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  trackBg.addControl(trackFill);

  // Value text
  const valueText = new TextBlock(`settingsVal_${label}`, `${initialValue}%`);
  valueText.fontSize = 20;
  valueText.fontFamily = 'monospace';
  valueText.fontWeight = 'bold';
  valueText.color = '#ffffff';
  valueText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  valueText.left = '-16px';
  valueText.width = '60px';
  valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  wrapper.addControl(valueText);

  return { kind: 'slider', wrapper, label: labelText, trackFill, valueText, border, getValue, adjust };
}

function createInputRow(
  parent: StackPanel, label: string, border: string, player: 1 | 2, scheme: ControlScheme,
): InputRow {
  const wrapper = new Rectangle(`settingsInput_${label}`);
  wrapper.width = 1;
  wrapper.height = '60px';
  wrapper.thickness = 3;
  wrapper.color = border;
  wrapper.cornerRadius = 6;
  wrapper.background = '#222233';
  wrapper.paddingTop = '4px';
  wrapper.paddingBottom = '4px';
  parent.addControl(wrapper);

  const labelText = new TextBlock(`settingsLabel_${label}`, label);
  labelText.fontSize = 20;
  labelText.fontFamily = 'monospace';
  labelText.fontWeight = 'bold';
  labelText.color = '#ffffff';
  labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelText.left = '16px';
  labelText.width = '200px';
  labelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  wrapper.addControl(labelText);

  const deviceText = new TextBlock(`settingsDevice_${label}`, formatScheme(scheme));
  deviceText.fontSize = 18;
  deviceText.fontFamily = 'monospace';
  deviceText.color = '#cccccc';
  deviceText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  deviceText.left = '-16px';
  deviceText.width = '280px';
  deviceText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  wrapper.addControl(deviceText);

  return { kind: 'input', wrapper, label: labelText, deviceText, border, player };
}

function createToggleRow(
  parent: StackPanel, label: string, border: string, initialValue: boolean,
  getVal: () => boolean, toggle: () => void,
): ToggleRow {
  const wrapper = new Rectangle(`settingsToggle_${label}`);
  wrapper.width = 1;
  wrapper.height = '60px';
  wrapper.thickness = 3;
  wrapper.color = border;
  wrapper.cornerRadius = 6;
  wrapper.background = '#222233';
  wrapper.paddingTop = '4px';
  wrapper.paddingBottom = '4px';
  parent.addControl(wrapper);

  const labelText = new TextBlock(`settingsLabel_${label}`, label);
  labelText.fontSize = 20;
  labelText.fontFamily = 'monospace';
  labelText.fontWeight = 'bold';
  labelText.color = '#ffffff';
  labelText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  labelText.left = '16px';
  labelText.width = '200px';
  labelText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  wrapper.addControl(labelText);

  const valueText = new TextBlock(`settingsVal_${label}`, initialValue ? 'ON' : 'OFF');
  valueText.fontSize = 20;
  valueText.fontFamily = 'monospace';
  valueText.fontWeight = 'bold';
  valueText.color = initialValue ? '#44ff44' : '#ff4444';
  valueText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  valueText.left = '-16px';
  valueText.width = '80px';
  valueText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  wrapper.addControl(valueText);

  return { kind: 'toggle', wrapper, label: labelText, valueText, border, getVal, toggle };
}

function syncToggleVisual(row: ToggleRow): void {
  const v = row.getVal();
  row.valueText.text = v ? 'ON' : 'OFF';
  row.valueText.color = v ? '#44ff44' : '#ff4444';
}

function updateRowHighlights(menuUI: SettingsMenuUI): void {
  for (let i = 0; i < menuUI.rows.length; i++) {
    const row = menuUI.rows[i];
    const selected = i === menuUI.selectedIndex;
    row.wrapper.thickness = selected ? 5 : 3;
    row.wrapper.color = selected ? '#ffffff' : row.border;
    row.wrapper.alpha = selected ? 1 : 0.7;
  }
}

function syncSliderVisual(row: SliderRow): void {
  const v = row.getValue();
  const fillW = Math.round((v / 100) * SETTINGS_SLIDER_TRACK_W);
  row.trackFill.width = `${fillW}px`;
  row.valueText.text = `${v}%`;
}

function syncInputVisual(row: InputRow, listening: boolean): void {
  if (listening) {
    row.deviceText.text = 'Press any key or button...';
    row.deviceText.color = '#ffcc44';
  } else {
    const s = getSettings();
    const scheme = row.player === 1 ? s.p1Scheme : s.p2Scheme;
    row.deviceText.text = formatScheme(scheme);
    row.deviceText.color = '#cccccc';
  }
}

export function updateSettingsMenu(menuUI: SettingsMenuUI): 'back' | null {
  // --- Listening mode ---
  if (menuUI.listeningRow !== null) {
    return updateListeningMode(menuUI);
  }

  // --- Normal navigation ---
  const count = menuUI.rows.length;
  let moved = false;
  let goLeft = false;
  let goRight = false;

  // Keyboard vertical nav
  if (isKeyJustPressed('KeyW') || isKeyJustPressed('KeyO') || isKeyJustPressed('ArrowUp')) {
    menuUI.selectedIndex = (menuUI.selectedIndex - 1 + count) % count;
    moved = true;
  }
  if (isKeyJustPressed('KeyS') || isKeyJustPressed('KeyL') || isKeyJustPressed('ArrowDown')) {
    menuUI.selectedIndex = (menuUI.selectedIndex + 1) % count;
    moved = true;
  }

  // Keyboard horizontal nav (for sliders)
  if (isKeyJustPressed('KeyA') || isKeyJustPressed('KeyK') || isKeyJustPressed('ArrowLeft')) goLeft = true;
  if (isKeyJustPressed('KeyD') || isKeyJustPressed('Semicolon') || isKeyJustPressed('ArrowRight')) goRight = true;

  // Gamepad nav
  const gamepads = navigator.getGamepads();
  let gamepadConfirm = false;
  let gamepadBack = false;

  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;

    const sy = gp.axes[1] ?? 0;
    const sx = gp.axes[0] ?? 0;
    const dpadU = gp.buttons[12]?.pressed ?? false;
    const dpadD = gp.buttons[13]?.pressed ?? false;
    const dpadL = gp.buttons[14]?.pressed ?? false;
    const dpadR = gp.buttons[15]?.pressed ?? false;
    const aDown = gp.buttons[0]?.pressed ?? false;
    const bDown = gp.buttons[1]?.pressed ?? false;

    const pSy = prevStickY.get(i) ?? 0;
    const pSx = prevStickX.get(i) ?? 0;
    const pDU = prevDpadUp.get(i) ?? false;
    const pDD = prevDpadDown.get(i) ?? false;
    const pDL = prevDpadLeft.get(i) ?? false;
    const pDR = prevDpadRight.get(i) ?? false;
    const pA = prevButtonA.get(i) ?? false;
    const pB = prevButtonB.get(i) ?? false;

    if ((sy < -MENU_STICK_THRESHOLD && pSy >= -MENU_STICK_THRESHOLD) || (dpadU && !pDU)) {
      menuUI.selectedIndex = (menuUI.selectedIndex - 1 + count) % count;
      moved = true;
    }
    if ((sy > MENU_STICK_THRESHOLD && pSy <= MENU_STICK_THRESHOLD) || (dpadD && !pDD)) {
      menuUI.selectedIndex = (menuUI.selectedIndex + 1) % count;
      moved = true;
    }
    if ((sx < -MENU_STICK_THRESHOLD && pSx >= -MENU_STICK_THRESHOLD) || (dpadL && !pDL)) goLeft = true;
    if ((sx > MENU_STICK_THRESHOLD && pSx <= MENU_STICK_THRESHOLD) || (dpadR && !pDR)) goRight = true;
    if (aDown && !pA) gamepadConfirm = true;
    if (bDown && !pB) gamepadBack = true;

    prevStickY.set(i, sy);
    prevStickX.set(i, sx);
    prevDpadUp.set(i, dpadU);
    prevDpadDown.set(i, dpadD);
    prevDpadLeft.set(i, dpadL);
    prevDpadRight.set(i, dpadR);
    prevButtonA.set(i, aDown);
    prevButtonB.set(i, bDown);
  }

  if (moved) updateRowHighlights(menuUI);

  // Slider adjustment
  const currentRow = menuUI.rows[menuUI.selectedIndex];
  if (currentRow.kind === 'slider') {
    if (goLeft) {
      currentRow.adjust(-SETTINGS_VOL_STEP);
      syncSliderVisual(currentRow);
    }
    if (goRight) {
      currentRow.adjust(SETTINGS_VOL_STEP);
      syncSliderVisual(currentRow);
    }
  }

  // Toggle rows: confirm or left/right to toggle
  if (currentRow.kind === 'toggle') {
    const kbConfirm = isKeyJustPressed('Space') || isKeyJustPressed('Enter');
    if (kbConfirm || gamepadConfirm || goLeft || goRight) {
      currentRow.toggle();
      syncToggleVisual(currentRow);
    }
  }

  // Enter listening mode for input rows
  if (currentRow.kind === 'input') {
    const kbConfirm = isKeyJustPressed('Space') || isKeyJustPressed('Enter');
    if (kbConfirm || gamepadConfirm) {
      menuUI.listeningRow = menuUI.selectedIndex;
      syncInputVisual(currentRow, true);
      // Init gamepad button tracking for listening
      prevGpButtons.clear();
      const gps = navigator.getGamepads();
      for (let i = 0; i < gps.length; i++) {
        const gp = gps[i];
        if (!gp) continue;
        const states: boolean[] = [];
        for (let b = 0; b < gp.buttons.length; b++) {
          states.push(gp.buttons[b]?.pressed ?? false);
        }
        prevGpButtons.set(i, states);
      }
      return null;
    }
  }

  // Back
  if (isKeyJustPressed('Escape') || gamepadBack) {
    return 'back';
  }

  return null;
}

function updateListeningMode(menuUI: SettingsMenuUI): 'back' | null {
  const rowIdx = menuUI.listeningRow!;
  const row = menuUI.rows[rowIdx] as InputRow;

  // Cancel listening
  if (isKeyJustPressed('Escape')) {
    menuUI.listeningRow = null;
    syncInputVisual(row, false);
    return null;
  }

  // Check gamepad B for cancel (using raw prev state to avoid nav conflict)
  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;
    const prev = prevGpButtons.get(i);
    if (!prev) continue;
    const bDown = gp.buttons[1]?.pressed ?? false;
    if (bDown && !prev[1]) {
      menuUI.listeningRow = null;
      syncInputVisual(row, false);
      // Update prev states
      for (let b = 0; b < gp.buttons.length; b++) {
        prev[b] = gp.buttons[b]?.pressed ?? false;
      }
      return null;
    }
  }

  // Detect keyboard scheme
  for (const code of KB1_DETECT_KEYS) {
    if (isKeyJustPressed(code)) {
      assignScheme(row, { type: 'kb1' });
      menuUI.listeningRow = null;
      syncInputVisual(row, false);
      return null;
    }
  }
  for (const code of KB2_DETECT_KEYS) {
    if (isKeyJustPressed(code)) {
      assignScheme(row, { type: 'kb2' });
      menuUI.listeningRow = null;
      syncInputVisual(row, false);
      return null;
    }
  }

  // Detect gamepad (any button except B which is cancel)
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;
    const prev = prevGpButtons.get(i);
    if (!prev) {
      // New gamepad appeared, init
      const states: boolean[] = [];
      for (let b = 0; b < gp.buttons.length; b++) {
        states.push(gp.buttons[b]?.pressed ?? false);
      }
      prevGpButtons.set(i, states);
      continue;
    }

    for (let b = 0; b < gp.buttons.length; b++) {
      if (b === 1) continue; // skip B (cancel)
      const pressed = gp.buttons[b]?.pressed ?? false;
      if (pressed && !prev[b]) {
        assignScheme(row, { type: 'gamepad', index: i });
        menuUI.listeningRow = null;
        syncInputVisual(row, false);
        // Update all prev states before returning
        for (let j = 0; j < gamepads.length; j++) {
          const gp2 = gamepads[j];
          if (!gp2) continue;
          const p = prevGpButtons.get(j);
          if (!p) continue;
          for (let b2 = 0; b2 < gp2.buttons.length; b2++) {
            p[b2] = gp2.buttons[b2]?.pressed ?? false;
          }
        }
        return null;
      }
    }

    // Update prev states
    for (let b = 0; b < gp.buttons.length; b++) {
      prev[b] = gp.buttons[b]?.pressed ?? false;
    }
  }

  return null;
}

function assignScheme(row: InputRow, scheme: ControlScheme): void {
  if (row.player === 1) setP1Scheme(scheme);
  else setP2Scheme(scheme);
}

export function destroySettingsMenu(menuUI: SettingsMenuUI): void {
  menuUI.ui.dispose();
}
