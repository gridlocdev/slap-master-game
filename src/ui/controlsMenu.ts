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

const ICON = ICON_SIZE.md;
const FONT = 16;
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
  title.fontSize = 44;
  title.fontFamily = 'monospace';
  title.fontWeight = 'bold';
  title.color = '#ffffff';
  title.outlineWidth = 4;
  title.outlineColor = '#000000';
  title.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  title.top = '12px';
  title.height = '60px';
  panel.addControl(title);

  // Vertical content area
  const contentArea = new StackPanel('ctrlContent');
  contentArea.isVertical = true;
  contentArea.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  contentArea.top = '74px';
  contentArea.height = '580px';
  contentArea.width = '920px';
  panel.addControl(contentArea);

  // ---- Gamepad section (top) ----
  const gpHeader = createIconRow(
    [{ icon: GP_ICONS.device }, { text: ' Gamepad' }],
    { iconSize: ICON, fontSize: 20, color: '#ffffff', gap: 6 },
  );
  contentArea.addControl(gpHeader);

  // Gamepad two-column row (Game | Menu)
  const gpColumnsRow = new StackPanel('gpColumns');
  gpColumnsRow.isVertical = false;
  gpColumnsRow.height = `${5 * (ICON + 6)}px`;
  gpColumnsRow.width = '800px';
  gpColumnsRow.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  contentArea.addControl(gpColumnsRow);

  // GP left: game controls
  const gpLeftCol = new StackPanel('gpLeftCol');
  gpLeftCol.isVertical = true;
  gpLeftCol.width = '400px';
  gpLeftCol.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  gpLeftCol.paddingLeft = '20px';
  gpColumnsRow.addControl(gpLeftCol);

  gpLeftCol.addControl(sectionLabel('— Game —'));
  gpLeftCol.addControl(controlRow('Move  ', [
    { icon: GP_ICONS.stick_l }, { text: ' / ' }, { icon: GP_ICONS.dpad },
  ]));
  gpLeftCol.addControl(controlRow('Slap  ', [
    { icon: GP_ICONS.lt }, { icon: GP_ICONS.rt },
  ]));
  gpLeftCol.addControl(controlRow('Ability  ', [{ icon: GP_ICONS.x }]));

  // GP right: menu controls
  const gpRightCol = new StackPanel('gpRightCol');
  gpRightCol.isVertical = true;
  gpRightCol.width = '400px';
  gpRightCol.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  gpRightCol.paddingLeft = '20px';
  gpColumnsRow.addControl(gpRightCol);

  gpRightCol.addControl(sectionLabel('— Menu —'));
  gpRightCol.addControl(controlRow('Pause  ', [{ icon: GP_ICONS.menu }]));
  gpRightCol.addControl(controlRow('Back / Menu  ', [{ icon: GP_ICONS.b }]));
  gpRightCol.addControl(controlRow('Confirm  ', [{ icon: GP_ICONS.a }]));
  gpRightCol.addControl(controlRow('Input Setup  ', [{ icon: GP_ICONS.back }]));

  // ---- Horizontal divider ----
  const hDividerWrap = new Rectangle('ctrlHDividerWrap');
  hDividerWrap.width = 1;
  hDividerWrap.height = '16px';
  hDividerWrap.thickness = 0;
  contentArea.addControl(hDividerWrap);

  const hDividerLine = new Rectangle('ctrlHDividerLine');
  hDividerLine.width = '880px';
  hDividerLine.height = '2px';
  hDividerLine.thickness = 0;
  hDividerLine.background = '#555577';
  hDividerWrap.addControl(hDividerLine);

  // ---- Keyboard section (bottom) ----
  const kbHeader = createIconRow(
    [{ icon: KB_ICONS.device }, { text: ' Keyboard' }],
    { iconSize: ICON, fontSize: 20, color: '#ffffff', gap: 6 },
  );
  contentArea.addControl(kbHeader);

  // KB P1/P2 side by side
  const kbPlayersRow = new StackPanel('kbPlayersRow');
  kbPlayersRow.isVertical = false;
  kbPlayersRow.height = `${4 * (ICON + 6)}px`;
  kbPlayersRow.width = '900px';
  contentArea.addControl(kbPlayersRow);

  // KB P1 column (left)
  const kbP1Col = new StackPanel('kbP1Col');
  kbP1Col.isVertical = true;
  kbP1Col.width = COL_W;
  kbP1Col.paddingLeft = '20px';
  kbPlayersRow.addControl(kbP1Col);

  kbP1Col.addControl(sectionLabel('— P1 —', P1_HUD_COLOR));
  kbP1Col.addControl(controlRow('Move  ', iconsFromKeys(P1_KB_MOVE, KB_ICONS)));
  kbP1Col.addControl(controlRow('Slap  ', iconsFromKeys(P1_KB_SLAP, KB_ICONS)));
  kbP1Col.addControl(controlRow('Ability  ', iconsFromKeys(P1_KB_ABILITY, KB_ICONS)));

  // KB P1/P2 vertical divider
  const kbPlayerDivider = new Rectangle('kbPlayerDivider');
  kbPlayerDivider.width = '2px';
  kbPlayerDivider.height = 1;
  kbPlayerDivider.thickness = 0;
  kbPlayerDivider.background = '#555577';
  kbPlayersRow.addControl(kbPlayerDivider);

  // KB P2 column (right)
  const kbP2Col = new StackPanel('kbP2Col');
  kbP2Col.isVertical = true;
  kbP2Col.width = COL_W;
  kbP2Col.paddingLeft = '20px';
  kbPlayersRow.addControl(kbP2Col);

  kbP2Col.addControl(sectionLabel('— P2 —', P2_HUD_COLOR));
  kbP2Col.addControl(controlRow('Move  ', iconsFromKeys(P2_KB_MOVE, KB_ICONS)));
  kbP2Col.addControl(controlRow('Slap  ', iconsFromKeys(P2_KB_SLAP, KB_ICONS)));
  kbP2Col.addControl(controlRow('Ability  ', iconsFromKeys(P2_KB_ABILITY, KB_ICONS)));

  // KB Shared controls (centered below P1/P2)
  const kbSharedCol = new StackPanel('kbSharedCol');
  kbSharedCol.isVertical = true;
  kbSharedCol.width = COL_W;
  kbSharedCol.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  contentArea.addControl(kbSharedCol);

  kbSharedCol.addControl(sectionLabel('— Menu —'));
  kbSharedCol.addControl(controlRow('Pause  ', [{ icon: KB_ICONS.escape }]));
  kbSharedCol.addControl(controlRow('Confirm  ', [{ icon: KB_ICONS.space }]));
  kbSharedCol.addControl(controlRow('Input Setup  ', [{ icon: KB_ICONS.shift }]));

  // Bottom hint
  const hint = createIconRow(
    [
      { icon: KB_ICONS.escape },
      { text: ' / ' },
      { icon: GP_ICONS.b },
      { text: ' = Close' },
    ],
    { iconSize: ICON_SIZE.sm, fontSize: 14, color: '#888888', gap: 4 },
  );
  hint.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  hint.top = '-12px';
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
