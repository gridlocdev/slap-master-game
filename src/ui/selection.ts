import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, StackPanel } from '@babylonjs/gui';
import type { AbilityType, GameState } from '../types.ts';
import { isKeyJustPressed } from '../input.ts';

const ABILITIES: AbilityType[] = ['burrito', 'child', 'melon'];

const ABILITY_INFO: Record<AbilityType, { name: string; desc: string }> = {
  burrito: {
    name: 'Black Bean Burrito',
    desc: 'Dash forward, leave stink cloud behind',
  },
  child: {
    name: 'Literal Child',
    desc: 'Smaller, faster, weaker slaps. Taunt!',
  },
  melon: {
    name: 'Melon',
    desc: 'Throw melon. Double-slap to explode!',
  },
};

export interface SelectionUI {
  ui: AdvancedDynamicTexture;
  titleText: TextBlock;
  panels: [PlayerSelectionPanel, PlayerSelectionPanel];
}

interface PlayerSelectionPanel {
  container: StackPanel;
  nameText: TextBlock;
  descText: TextBlock;
  arrowsText: TextBlock;
  statusText: TextBlock;
  controlsText: TextBlock;
  selectedIndex: number;
  confirmed: boolean;
}

export function createSelectionUI(scene: Scene): SelectionUI {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('selectionUI', true, scene);

  const titleText = new TextBlock('title', 'CHOOSE YOUR ABILITY');
  titleText.fontSize = 32;
  titleText.color = '#ffffff';
  titleText.fontFamily = 'monospace';
  titleText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  titleText.top = '40px';
  ui.addControl(titleText);

  const p1Panel = createPlayerPanel(ui, 0);
  const p2Panel = createPlayerPanel(ui, 1);

  return { ui, titleText, panels: [p1Panel, p2Panel] };
}

function createPlayerPanel(ui: AdvancedDynamicTexture, idx: number): PlayerSelectionPanel {
  const isP1 = idx === 0;
  const color = isP1 ? '#4488ff' : '#ff4444';
  const hAlign = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  const xOffset = isP1 ? '80px' : '-80px';

  const container = new StackPanel(`selPanel_${idx}`);
  container.width = '280px';
  container.horizontalAlignment = hAlign;
  container.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  container.left = xOffset;
  ui.addControl(container);

  const label = new TextBlock(`selLabel_${idx}`, isP1 ? 'PLAYER 1' : 'PLAYER 2');
  label.fontSize = 20;
  label.color = color;
  label.fontFamily = 'monospace';
  label.height = '30px';
  container.addControl(label);

  const arrowsText = new TextBlock(`selArrows_${idx}`, '');
  arrowsText.fontSize = 24;
  arrowsText.color = '#888888';
  arrowsText.fontFamily = 'monospace';
  arrowsText.height = '35px';
  container.addControl(arrowsText);

  const nameText = new TextBlock(`selName_${idx}`, '');
  nameText.fontSize = 22;
  nameText.color = '#ffffff';
  nameText.fontFamily = 'monospace';
  nameText.height = '30px';
  container.addControl(nameText);

  const descText = new TextBlock(`selDesc_${idx}`, '');
  descText.fontSize = 13;
  descText.color = '#aaaaaa';
  descText.fontFamily = 'monospace';
  descText.height = '25px';
  descText.textWrapping = true;
  container.addControl(descText);

  const statusText = new TextBlock(`selStatus_${idx}`, '');
  statusText.fontSize = 16;
  statusText.color = '#44ff44';
  statusText.fontFamily = 'monospace';
  statusText.height = '30px';
  container.addControl(statusText);

  const controlsHint = isP1 ? 'A/D cycle, C/V confirm' : 'K/; cycle, \u2190/\u2192 confirm';
  const controlsText = new TextBlock(`selControls_${idx}`, controlsHint);
  controlsText.fontSize = 11;
  controlsText.color = '#666666';
  controlsText.fontFamily = 'monospace';
  controlsText.height = '20px';
  container.addControl(controlsText);

  return {
    container,
    nameText,
    descText,
    arrowsText,
    statusText,
    controlsText,
    selectedIndex: 0,
    confirmed: false,
  };
}

// Gamepad stick tracking for selection cycling
const prevStickX = [0, 0];
const STICK_THRESHOLD = 0.5;

export function updateSelection(selUI: SelectionUI, state: GameState): boolean {
  // P1 controls: A/D cycle, C/V confirm
  handlePlayerSelection(selUI.panels[0], 0, 'KeyA', 'KeyD', 'KeyC', 'KeyV');
  // P2 controls: K/; cycle, ArrowLeft/ArrowRight confirm
  handlePlayerSelection(selUI.panels[1], 1, 'KeyK', 'Semicolon', 'ArrowLeft', 'ArrowRight');

  // Gamepad selection
  handleGamepadSelection(selUI.panels[0], 0);
  handleGamepadSelection(selUI.panels[1], 1);

  // Update display
  for (let i = 0; i < 2; i++) {
    const panel = selUI.panels[i];
    const ability = ABILITIES[panel.selectedIndex];
    const info = ABILITY_INFO[ability];
    panel.nameText.text = info.name;
    panel.descText.text = info.desc;
    panel.arrowsText.text = `< ${panel.selectedIndex + 1}/${ABILITIES.length} >`;

    if (panel.confirmed) {
      panel.statusText.text = 'READY!';
      panel.statusText.color = '#44ff44';
    } else {
      panel.statusText.text = '';
    }
  }

  // Update state selections
  for (let i = 0; i < 2; i++) {
    if (selUI.panels[i].confirmed) {
      state.selections[i] = ABILITIES[selUI.panels[i].selectedIndex];
    } else {
      state.selections[i] = null;
    }
  }

  return selUI.panels[0].confirmed && selUI.panels[1].confirmed;
}

function handlePlayerSelection(
  panel: PlayerSelectionPanel,
  _playerIdx: number,
  leftKey: string,
  rightKey: string,
  confirmKey1: string,
  confirmKey2: string,
): void {
  if (panel.confirmed) return;

  if (isKeyJustPressed(leftKey)) {
    panel.selectedIndex = (panel.selectedIndex - 1 + ABILITIES.length) % ABILITIES.length;
  }
  if (isKeyJustPressed(rightKey)) {
    panel.selectedIndex = (panel.selectedIndex + 1) % ABILITIES.length;
  }
  if (isKeyJustPressed(confirmKey1) || isKeyJustPressed(confirmKey2)) {
    panel.confirmed = true;
  }
}

function handleGamepadSelection(panel: PlayerSelectionPanel, padIdx: number): void {
  if (panel.confirmed) return;

  const gamepads = navigator.getGamepads();
  const gp = gamepads[padIdx];
  if (!gp) return;

  const sx = gp.axes[0] ?? 0;

  // Edge-detect stick left/right
  if (sx < -STICK_THRESHOLD && prevStickX[padIdx] >= -STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex - 1 + ABILITIES.length) % ABILITIES.length;
  }
  if (sx > STICK_THRESHOLD && prevStickX[padIdx] <= STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex + 1) % ABILITIES.length;
  }
  prevStickX[padIdx] = sx;

  // X button (index 2) to confirm
  if (gp.buttons[2]?.pressed) {
    panel.confirmed = true;
  }
}

export function destroySelectionUI(selUI: SelectionUI): void {
  selUI.ui.dispose();
}

export function resetSelection(selUI: SelectionUI): void {
  for (const panel of selUI.panels) {
    panel.selectedIndex = 0;
    panel.confirmed = false;
  }
}
