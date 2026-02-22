import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel } from '@babylonjs/gui';
import { isKeyJustPressed, isGamepadBJustPressed, isGamepadRestart, isGamepadStartJustPressed } from '../input.ts';
import { createIconRow, iconsFromKeys, ICON_SIZE } from './iconRow.ts';
import type { IconRowItem } from './iconRow.ts';
import {
  KB_ICONS, GP_ICONS,
  P1_KB_MOVE, P1_KB_SLAP, P1_KB_ABILITY,
  P2_KB_MOVE, P2_KB_SLAP, P2_KB_ABILITY,
} from './inputIcons.ts';
import { P1_HUD_COLOR, P2_HUD_COLOR } from '../constants.ts';

export interface ControlsMenuUI {
  ui: AdvancedDynamicTexture;
}

const ICON = ICON_SIZE.lg;
const FONT = 20;
const ROW_H = `${ICON + 6}px`;
const COL_W = '440px';

function controlRow(label: string, items: IconRowItem[]): StackPanel {
  return createIconRow(
    [{ text: label }, ...items],
    { iconSize: ICON, fontSize: FONT, color: '#ffffff', gap: 4 },
  );
}

function sectionLabel(text: string, color = '#aaaaaa'): TextBlock {
  const tb = new TextBlock('', text);
  tb.fontSize = FONT;
  tb.fontFamily = 'monospace';
  tb.fontWeight = 'bold';
  tb.color = color;
  tb.height = ROW_H;
  tb.paddingTop = '6px';
  return tb;
}

export function createControlsMenu(scene: Scene): ControlsMenuUI {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('controlsMenuUI', true, scene);

  // Dark backdrop
  const backdrop = new Rectangle('ctrlBg');
  backdrop.width = 1;
  backdrop.height = 1;
  backdrop.thickness = 0;
  backdrop.background = '#000000cc';
  backdrop.zIndex = 200;
  ui.addControl(backdrop);

  // Centered panel
  const panel = new Rectangle('ctrlPanel');
  panel.width = '940px';
  panel.height = '700px';
  panel.thickness = 2;
  panel.color = '#555577';
  panel.cornerRadius = 12;
  panel.background = '#1a1a2eee';
  backdrop.addControl(panel);

  // Title
  const title = new TextBlock('ctrlTitle', 'CONTROLS');
  title.fontSize = 52;
  title.fontFamily = 'monospace';
  title.fontWeight = 'bold';
  title.color = '#ffffff';
  title.outlineWidth = 4;
  title.outlineColor = '#000000';
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  title.top = '16px';
  title.height = '68px';
  panel.addControl(title);

  // Two-column layout
  const columnsRow = new StackPanel('ctrlColumns');
  columnsRow.isVertical = false;
  columnsRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  columnsRow.top = '86px';
  columnsRow.height = '560px';
  columnsRow.width = '920px';
  panel.addControl(columnsRow);

  // ---- Keyboard column ----
  const kbCol = new StackPanel('ctrlKbCol');
  kbCol.isVertical = true;
  kbCol.width = COL_W;
  kbCol.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  kbCol.paddingLeft = '20px';
  columnsRow.addControl(kbCol);

  // KB header
  const kbHeader = createIconRow(
    [{ icon: KB_ICONS.device }, { text: ' Keyboard' }],
    { iconSize: ICON, fontSize: 24, color: '#ffffff', gap: 6 },
  );
  kbCol.addControl(kbHeader);

  // P1
  kbCol.addControl(sectionLabel('— P1 —', P1_HUD_COLOR));
  kbCol.addControl(controlRow('Move  ', iconsFromKeys(P1_KB_MOVE, KB_ICONS)));
  kbCol.addControl(controlRow('Slap  ', iconsFromKeys(P1_KB_SLAP, KB_ICONS)));
  kbCol.addControl(controlRow('Ability  ', iconsFromKeys(P1_KB_ABILITY, KB_ICONS)));

  // P2
  kbCol.addControl(sectionLabel('— P2 —', P2_HUD_COLOR));
  kbCol.addControl(controlRow('Move  ', iconsFromKeys(P2_KB_MOVE, KB_ICONS)));
  kbCol.addControl(controlRow('Slap  ', iconsFromKeys(P2_KB_SLAP, KB_ICONS)));
  kbCol.addControl(controlRow('Ability  ', iconsFromKeys(P2_KB_ABILITY, KB_ICONS)));

  // Shared keyboard
  kbCol.addControl(sectionLabel('— Shared —'));
  kbCol.addControl(controlRow('Pause  ', [{ icon: KB_ICONS.escape }]));
  kbCol.addControl(controlRow('Confirm  ', [{ icon: KB_ICONS.space }]));
  kbCol.addControl(controlRow('Input Setup  ', [{ icon: KB_ICONS.tilde }]));

  // ---- Divider ----
  const divider = new Rectangle('ctrlDivider');
  divider.width = '2px';
  divider.height = 1;
  divider.thickness = 0;
  divider.background = '#555577';
  columnsRow.addControl(divider);

  // ---- Gamepad column ----
  const gpCol = new StackPanel('ctrlGpCol');
  gpCol.isVertical = true;
  gpCol.width = COL_W;
  gpCol.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  gpCol.paddingLeft = '20px';
  columnsRow.addControl(gpCol);

  // GP header
  const gpHeader = createIconRow(
    [{ icon: GP_ICONS.device }, { text: ' Gamepad' }],
    { iconSize: ICON, fontSize: 24, color: '#ffffff', gap: 6 },
  );
  gpCol.addControl(gpHeader);

  // Spacer to align with keyboard section
  gpCol.addControl(sectionLabel(''));

  gpCol.addControl(controlRow('Move  ', [
    { icon: GP_ICONS.stick_l }, { text: ' / ' }, { icon: GP_ICONS.dpad },
  ]));
  gpCol.addControl(controlRow('Slap  ', [
    { icon: GP_ICONS.lt }, { icon: GP_ICONS.rt },
  ]));
  gpCol.addControl(controlRow('Ability  ', [{ icon: GP_ICONS.x }]));

  // Spacer to separate game vs UI controls
  gpCol.addControl(sectionLabel(''));

  gpCol.addControl(controlRow('Pause  ', [{ icon: GP_ICONS.view }]));
  gpCol.addControl(controlRow('Back / Menu  ', [{ icon: GP_ICONS.b }]));
  gpCol.addControl(controlRow('Confirm  ', [{ icon: GP_ICONS.a }]));
  gpCol.addControl(controlRow('Input Setup  ', [{ icon: GP_ICONS.back }]));

  // Bottom hint
  const hint = createIconRow(
    [
      { icon: KB_ICONS.escape },
      { text: ' / ' },
      { icon: GP_ICONS.b },
      { text: ' = Close' },
    ],
    { iconSize: ICON_SIZE.md, fontSize: 16, color: '#888888', gap: 4 },
  );
  hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  hint.top = '-16px';
  panel.addControl(hint);

  return { ui };
}

export function updateControlsMenu(_menuUI: ControlsMenuUI): boolean {
  // Keyboard dismiss
  if (isKeyJustPressed('Escape') || isKeyJustPressed('Space') || isKeyJustPressed('Enter')) {
    return true;
  }

  // Gamepad dismiss (any connected pad)
  const gamepads = navigator.getGamepads();
  for (let i = 0; i < gamepads.length; i++) {
    if (!gamepads[i]) continue;
    if (isGamepadBJustPressed(i) || isGamepadRestart(i) || isGamepadStartJustPressed(i)) {
      return true;
    }
  }

  return false;
}

export function destroyControlsMenu(menuUI: ControlsMenuUI): void {
  menuUI.ui.dispose();
}
