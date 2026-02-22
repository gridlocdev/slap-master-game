import {
  Scene,
} from '@babylonjs/core';
import {
  AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel, Image,
} from '@babylonjs/gui';
import type { InputDevice } from '../types.ts';
import { isKeyJustPressed, isGamepadSelectJustPressed } from '../input.ts';
import {
  P1_HUD_COLOR, P2_HUD_COLOR,
  INPUT_ASSIGN_BG, INPUT_ASSIGN_PANEL_W,
  INPUT_ASSIGN_ICON_SIZE, INPUT_ASSIGN_LABEL_SIZE,
  INPUT_ASSIGN_READY_COLOR, INPUT_ASSIGN_GAP, INPUT_ASSIGN_STICK_THRESHOLD,
} from '../constants.ts';
import { KB_ICONS, GP_ICONS } from './inputIcons.ts';

// --- Module-level assignment state (persists across rounds) ---

const assignment: { p1: InputDevice | null; p2: InputDevice | null } = {
  p1: null,
  p2: null,
};
let overlayActive = false;
let p1Ready = false;
let p2Ready = false;

// P1 keyboard keys used for detection
const P1_DETECT_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyC', 'KeyV'];
const P2_DETECT_KEYS = ['KeyO', 'KeyK', 'KeyL', 'Semicolon', 'ArrowLeft', 'ArrowRight'];

// --- Public getters ---

export function getP1GamepadIndex(): number | null {
  return assignment.p1?.type === 'gamepad' ? assignment.p1.index : null;
}

export function getP2GamepadIndex(): number | null {
  return assignment.p2?.type === 'gamepad' ? assignment.p2.index : null;
}

export function isP2Unassigned(): boolean {
  return assignment.p2 === null;
}

export function isOverlayActive(): boolean {
  return overlayActive;
}

/** Auto-assign based on connected gamepads. Called once at startup. */
export function initDefaultAssignment(): void {
  const gamepads = navigator.getGamepads();
  const connected: number[] = [];
  for (let i = 0; i < gamepads.length; i++) {
    if (gamepads[i]) connected.push(i);
  }

  if (connected.length >= 2) {
    assignment.p1 = { type: 'gamepad', index: connected[0] };
    assignment.p2 = { type: 'gamepad', index: connected[1] };
  } else if (connected.length === 1) {
    assignment.p1 = { type: 'keyboard' };
    assignment.p2 = { type: 'gamepad', index: connected[0] };
  } else {
    assignment.p1 = { type: 'keyboard' };
    assignment.p2 = { type: 'keyboard' };
  }
}

// --- Overlay UI ---

export interface InputAssignUI {
  texture: AdvancedDynamicTexture;
  p1Box: Rectangle;
  p2Box: Rectangle;
  p1DeviceLabel: TextBlock;
  p2DeviceLabel: TextBlock;
  p1Icon: Image;
  p2Icon: Image;
  p1ReadyText: TextBlock;
  p2ReadyText: TextBlock;
  instructionText: TextBlock;
}

export function createInputAssignUI(scene: Scene): InputAssignUI {
  overlayActive = true;
  p1Ready = false;
  p2Ready = false;

  const texture = AdvancedDynamicTexture.CreateFullscreenUI('inputAssignUI', true, scene);

  // Fullscreen dark backdrop (click shield)
  const backdrop = new Rectangle('iaBg');
  backdrop.width = 1;
  backdrop.height = 1;
  backdrop.thickness = 0;
  backdrop.background = INPUT_ASSIGN_BG;
  backdrop.zIndex = 100;
  texture.addControl(backdrop);

  // Main container panel with rounded border (visual only)
  const mainPanel = new Rectangle('iaMainPanel');
  mainPanel.width = '700px';
  mainPanel.height = '380px';
  mainPanel.thickness = 2;
  mainPanel.color = '#555577';
  mainPanel.cornerRadius = 12;
  mainPanel.background = '#1a1a2eee';
  backdrop.addControl(mainPanel);

  // Vertical stack inside mainPanel for top-to-bottom flow
  const mainStack = new StackPanel('iaMainStack');
  mainStack.isVertical = true;
  mainStack.width = 1;
  mainStack.height = 1;
  mainPanel.addControl(mainStack);

  // Title row
  const title = new TextBlock('iaTitle', 'INPUT SETUP');
  title.fontSize = 28;
  title.fontFamily = 'monospace';
  title.fontWeight = 'bold';
  title.color = '#ffffff';
  title.height = '56px';
  title.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  mainStack.addControl(title);

  // Row holding P1 and P2 sides
  const panelRow = new StackPanel('iaPanelRow');
  panelRow.isVertical = false;
  panelRow.width = '620px';
  panelRow.height = '260px';
  panelRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  mainStack.addControl(panelRow);

  // P1 column
  const { column: _p1Col, box: p1Box, deviceLabel: p1DeviceLabel, icon: p1Icon, readyText: p1ReadyText } =
    createPlayerColumn(panelRow, 0);

  // Spacer between columns
  const spacer = new Rectangle('iaSpacer');
  spacer.width = INPUT_ASSIGN_GAP;
  spacer.height = 1;
  spacer.thickness = 0;
  spacer.background = '#00000000';
  panelRow.addControl(spacer);

  // P2 column
  const { column: _p2Col, box: p2Box, deviceLabel: p2DeviceLabel, icon: p2Icon, readyText: p2ReadyText } =
    createPlayerColumn(panelRow, 1);

  // Instruction text at bottom
  const instructionText = new TextBlock('iaInstruction', '');
  instructionText.fontSize = 14;
  instructionText.fontFamily = 'monospace';
  instructionText.color = '#888899';
  instructionText.height = '40px';
  instructionText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  mainStack.addControl(instructionText);

  const ui: InputAssignUI = {
    texture,
    p1Box, p2Box,
    p1DeviceLabel, p2DeviceLabel,
    p1Icon, p2Icon,
    p1ReadyText, p2ReadyText,
    instructionText,
  };

  syncPanelVisuals(ui);
  return ui;
}

function createPlayerColumn(parent: StackPanel, idx: number) {
  const isP1 = idx === 0;
  const color = isP1 ? P1_HUD_COLOR : P2_HUD_COLOR;
  const label = isP1 ? 'P1' : 'P2';

  // Outer column holds header + box + ready text vertically
  const column = new StackPanel(`iaCol_${idx}`);
  column.isVertical = true;
  column.width = INPUT_ASSIGN_PANEL_W;
  column.height = 1;
  parent.addControl(column);

  // Player label above the box
  const headerText = new TextBlock(`iaHeader_${idx}`, label);
  headerText.fontSize = INPUT_ASSIGN_LABEL_SIZE;
  headerText.fontFamily = 'monospace';
  headerText.fontWeight = 'bold';
  headerText.color = color;
  headerText.height = '36px';
  headerText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  column.addControl(headerText);

  // Device box (bordered)
  const box = new Rectangle(`iaBox_${idx}`);
  box.width = '240px';
  box.height = '160px';
  box.thickness = 3;
  box.color = color;
  box.cornerRadius = 8;
  box.background = '#12122200';
  column.addControl(box);

  // Vertical stack inside box for label above icon
  const boxStack = new StackPanel(`iaBoxStack_${idx}`);
  boxStack.isVertical = true;
  boxStack.width = 1;
  boxStack.height = 1;
  box.addControl(boxStack);

  // Top spacer to push content down a bit
  const topSpacer = new Rectangle(`iaBoxTop_${idx}`);
  topSpacer.width = 1;
  topSpacer.height = '20px';
  topSpacer.thickness = 0;
  topSpacer.background = '#00000000';
  boxStack.addControl(topSpacer);

  // Device type label
  const deviceLabel = new TextBlock(`iaDevLabel_${idx}`, '---');
  deviceLabel.fontSize = 18;
  deviceLabel.fontFamily = 'monospace';
  deviceLabel.color = '#888899';
  deviceLabel.height = '28px';
  deviceLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  boxStack.addControl(deviceLabel);

  // Large device icon image
  const icon = new Image(`iaIcon_${idx}`, KB_ICONS.device);
  icon.width = `${INPUT_ASSIGN_ICON_SIZE}px`;
  icon.height = `${INPUT_ASSIGN_ICON_SIZE}px`;
  icon.stretch = Image.STRETCH_UNIFORM;
  icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  icon.paddingTop = '8px';
  boxStack.addControl(icon);

  // Ready text below the box
  const readyText = new TextBlock(`iaReady_${idx}`, '');
  readyText.fontSize = 20;
  readyText.fontFamily = 'monospace';
  readyText.fontWeight = 'bold';
  readyText.color = INPUT_ASSIGN_READY_COLOR;
  readyText.height = '32px';
  readyText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  readyText.isVisible = false;
  column.addControl(readyText);

  return { column, box, deviceLabel, icon, readyText };
}

function formatDeviceLabel(device: InputDevice | null): string {
  if (!device) return '---';
  if (device.type === 'keyboard') return 'Keyboard';
  return 'Gamepad';
}

function formatDeviceIconUrl(device: InputDevice | null): string {
  if (!device) return KB_ICONS.device; // fallback
  if (device.type === 'keyboard') return KB_ICONS.device;
  return GP_ICONS.device;
}

function syncPanelVisuals(ui: InputAssignUI): void {
  ui.p1DeviceLabel.text = formatDeviceLabel(assignment.p1);
  ui.p2DeviceLabel.text = formatDeviceLabel(assignment.p2);
  ui.p1Icon.source = formatDeviceIconUrl(assignment.p1);
  ui.p2Icon.source = formatDeviceIconUrl(assignment.p2);

  // Dim color for unassigned
  ui.p1DeviceLabel.color = assignment.p1 ? '#ffffff' : '#888899';
  ui.p2DeviceLabel.color = assignment.p2 ? '#ffffff' : '#888899';

  // Ready state visuals
  ui.p1ReadyText.text = p1Ready ? 'READY' : '';
  ui.p1ReadyText.isVisible = p1Ready;
  ui.p1Box.thickness = p1Ready ? 5 : 3;
  ui.p1Box.color = p1Ready ? INPUT_ASSIGN_READY_COLOR : P1_HUD_COLOR;

  ui.p2ReadyText.text = p2Ready ? 'READY' : '';
  ui.p2ReadyText.isVisible = p2Ready;
  ui.p2Box.thickness = p2Ready ? 5 : 3;
  ui.p2Box.color = p2Ready ? INPUT_ASSIGN_READY_COLOR : P2_HUD_COLOR;

  // Instruction text
  const bothAssigned = assignment.p1 !== null && assignment.p2 !== null;
  const soloP1 = assignment.p1?.type === 'gamepad' && assignment.p2 === null;
  if (p1Ready && p2Ready) {
    ui.instructionText.text = '';
  } else if (soloP1) {
    ui.instructionText.text = 'Press Select to start solo';
  } else if (bothAssigned) {
    ui.instructionText.text = 'Press ` or Select to ready up';
  } else {
    ui.instructionText.text = 'KB: press your keys · Gamepad: left stick left=P1, right=P2';
  }
}

/** Returns true when overlay should close (both ready). */
export function updateInputAssignUI(ui: InputAssignUI): boolean {
  // --- Keyboard assignment ---
  for (const code of P1_DETECT_KEYS) {
    if (isKeyJustPressed(code)) {
      assignment.p1 = { type: 'keyboard' };
      p1Ready = false;
      break;
    }
  }
  for (const code of P2_DETECT_KEYS) {
    if (isKeyJustPressed(code)) {
      assignment.p2 = { type: 'keyboard' };
      p2Ready = false;
      break;
    }
  }

  // --- Gamepad assignment (stick left = P1, stick right = P2) ---
  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    const gp = gamepads[i];
    if (!gp) continue;

    const sx = gp.axes[0] ?? 0;
    // Also check D-pad: button 14 = left, button 15 = right
    const dpadLeft = gp.buttons[14]?.pressed ?? false;
    const dpadRight = gp.buttons[15]?.pressed ?? false;

    if (sx < -INPUT_ASSIGN_STICK_THRESHOLD || dpadLeft) {
      // Assign this pad to P1
      if (assignment.p1?.type !== 'gamepad' || assignment.p1.index !== i) {
        // If this pad was P2, clear P2
        if (assignment.p2?.type === 'gamepad' && assignment.p2.index === i) {
          assignment.p2 = null;
          p2Ready = false;
        }
        assignment.p1 = { type: 'gamepad', index: i };
        p1Ready = false;
      }
    } else if (sx > INPUT_ASSIGN_STICK_THRESHOLD || dpadRight) {
      // Assign this pad to P2
      if (assignment.p2?.type !== 'gamepad' || assignment.p2.index !== i) {
        // If this pad was P1, clear P1
        if (assignment.p1?.type === 'gamepad' && assignment.p1.index === i) {
          assignment.p1 = null;
          p1Ready = false;
        }
        assignment.p2 = { type: 'gamepad', index: i };
        p2Ready = false;
      }
    }
  }

  // --- Ready detection ---
  const bothAssigned = assignment.p1 !== null && assignment.p2 !== null;
  const soloP1 = assignment.p1?.type === 'gamepad' && assignment.p2 === null;
  const canReady = bothAssigned || soloP1;
  if (canReady) {
    // P1 ready: keyboard → Backquote, gamepad → Select
    if (!p1Ready) {
      if (assignment.p1!.type === 'keyboard' && isKeyJustPressed('Backquote')) {
        p1Ready = true;
      } else if (assignment.p1!.type === 'gamepad' && isGamepadSelectJustPressed(assignment.p1!.index)) {
        p1Ready = true;
      }
    }

    // Solo: P2 auto-readies with P1
    if (soloP1 && p1Ready) {
      p2Ready = true;
    }

    // P2 ready: keyboard → Backquote, gamepad → Select
    if (!p2Ready && bothAssigned) {
      if (assignment.p2!.type === 'keyboard' && isKeyJustPressed('Backquote')) {
        p2Ready = true;
      } else if (assignment.p2!.type === 'gamepad' && isGamepadSelectJustPressed(assignment.p2!.index)) {
        p2Ready = true;
      }
    }

    // If both keyboard, single Backquote readies both
    if (bothAssigned && assignment.p1!.type === 'keyboard' && assignment.p2!.type === 'keyboard' && isKeyJustPressed('Backquote')) {
      p1Ready = true;
      p2Ready = true;
    }
  }

  syncPanelVisuals(ui);

  // Close when both ready
  if (p1Ready && p2Ready) {
    return true;
  }

  return false;
}

export function destroyInputAssignUI(ui: InputAssignUI): void {
  overlayActive = false;
  ui.texture.dispose();
}
