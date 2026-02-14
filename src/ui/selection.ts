import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel, Ellipse } from '@babylonjs/gui';
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

const RANDOM_LABEL = 'RANDOM';
const CARD_COUNT = ABILITIES.length + 1; // +1 for random

// Card styling per ability
const CARD_STYLES: Record<string, { bg: string; border: string }> = {
  burrito: { bg: '#2d5a1e', border: '#33cc33' },
  child: { bg: '#5a3a1e', border: '#ff8833' },
  melon: { bg: '#1e4a1e', border: '#44bb22' },
  random: { bg: '#3a1e5a', border: '#8844cc' },
};

const P1_COLOR = '#4488ff';
const P2_COLOR = '#ff4444';
const P1_BODY_HEX = '#4488ff';
const P1_HAND_HEX = '#66aaff';
const P2_BODY_HEX = '#ff4444';
const P2_HAND_HEX = '#ff6666';
const P1_BG = '#cc8800';
const P2_BG = '#0088aa';
const PANEL_BG_ALPHA = 0.85;

// Idle bounce animation
const BOUNCE_SPEED = 1.8; // full cycles per second
const BOUNCE_AMPLITUDE = 12; // pixels
let bounceTime = 0;

export interface SelectionUI {
  ui: AdvancedDynamicTexture;
  panels: [PlayerSelectionPanel, PlayerSelectionPanel];
  cards: CardUI[];
}

interface PlayerAvatar {
  root: Rectangle;
  body: Ellipse;
  leftHand: Ellipse;
  rightHand: Ellipse;
  leftEyeWhite: Ellipse;
  rightEyeWhite: Ellipse;
  leftPupil: Ellipse;
  rightPupil: Ellipse;
}

interface PlayerSelectionPanel {
  container: Rectangle;
  avatar: PlayerAvatar;
  abilityLabel: TextBlock;
  abilityName: TextBlock;
  abilityDesc: TextBlock;
  playerTag: Rectangle;
  statusText: TextBlock;
  selectedIndex: number;
  confirmed: boolean;
  resolvedAbility: AbilityType | null;
}

interface CardUI {
  rect: Rectangle;
  nameText: TextBlock;
  p1Cursor: Rectangle;
  p2Cursor: Rectangle;
}

export function createSelectionUI(scene: Scene): SelectionUI {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('selectionUI', true, scene);

  // --- Top half: split preview panels ---
  const topContainer = new Rectangle('topContainer');
  topContainer.width = 1;
  topContainer.height = '60%';
  topContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  topContainer.thickness = 0;
  topContainer.background = '#00000000';
  ui.addControl(topContainer);

  const p1Panel = createPreviewPanel(topContainer, 0);
  const p2Panel = createPreviewPanel(topContainer, 1);

  // VS text centered
  const vsText = new TextBlock('vsText', 'VS');
  vsText.fontSize = 64;
  vsText.fontFamily = 'monospace';
  vsText.fontWeight = 'bold';
  vsText.color = '#ffffff';
  vsText.outlineWidth = 4;
  vsText.outlineColor = '#000000';
  vsText.zIndex = 10;
  topContainer.addControl(vsText);

  // Diagonal divider line (simulated with a thin rotated rect)
  const divider = new Rectangle('divider');
  divider.width = '6px';
  divider.height = '120%';
  divider.background = '#000000';
  divider.thickness = 0;
  divider.rotation = 0.15;
  divider.zIndex = 5;
  topContainer.addControl(divider);

  // --- Bottom half: card grid + controls ---
  const bottomContainer = new Rectangle('bottomContainer');
  bottomContainer.width = 1;
  bottomContainer.height = '40%';
  bottomContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  bottomContainer.thickness = 0;
  bottomContainer.background = '#1a1a2e';
  ui.addControl(bottomContainer);

  // Card row
  const cardRow = new StackPanel('cardRow');
  cardRow.isVertical = false;
  cardRow.height = '70%';
  cardRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  cardRow.top = '10px';
  bottomContainer.addControl(cardRow);

  const cards: CardUI[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const isRandom = i >= ABILITIES.length;
    const key = isRandom ? 'random' : ABILITIES[i];
    const style = CARD_STYLES[key];
    const label = isRandom ? RANDOM_LABEL : ABILITY_INFO[ABILITIES[i]].name;
    const card = createAbilityCard(cardRow, i, label, style);
    cards.push(card);
  }

  // Controls hint bar
  const controlsBar = new Rectangle('controlsBar');
  controlsBar.width = 1;
  controlsBar.height = '30%';
  controlsBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  controlsBar.thickness = 0;
  controlsBar.background = '#111122';
  bottomContainer.addControl(controlsBar);

  const controlsLeft = new TextBlock('ctrlLeft', 'P1: A/D cycle, C/V select');
  controlsLeft.fontSize = 13;
  controlsLeft.color = P1_COLOR;
  controlsLeft.fontFamily = 'monospace';
  controlsLeft.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  controlsLeft.left = '20px';
  controlsBar.addControl(controlsLeft);

  const controlsRight = new TextBlock('ctrlRight', 'P2: K/; cycle, \u2190/\u2192 select');
  controlsRight.fontSize = 13;
  controlsRight.color = P2_COLOR;
  controlsRight.fontFamily = 'monospace';
  controlsRight.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  controlsRight.left = '-20px';
  controlsBar.addControl(controlsRight);

  const controlsCenter = new TextBlock('ctrlCenter', 'Gamepad: Stick cycle, X select, B back');
  controlsCenter.fontSize = 12;
  controlsCenter.color = '#666666';
  controlsCenter.fontFamily = 'monospace';
  controlsBar.addControl(controlsCenter);

  return { ui, panels: [p1Panel, p2Panel], cards };
}

function createPreviewPanel(parent: Rectangle, idx: number): PlayerSelectionPanel {
  const isP1 = idx === 0;
  const bgColor = isP1 ? P1_BG : P2_BG;
  const playerColor = isP1 ? P1_COLOR : P2_COLOR;

  const container = new Rectangle(`previewPanel_${idx}`);
  container.width = '50%';
  container.height = 1;
  container.horizontalAlignment = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  container.thickness = 0;
  container.background = bgColor;
  container.alpha = PANEL_BG_ALPHA;
  parent.addControl(container);

  // Player tag (P1/P2 badge) — bottom corner
  const playerTag = new Rectangle(`playerTag_${idx}`);
  playerTag.width = '80px';
  playerTag.height = '40px';
  playerTag.background = '#000000';
  playerTag.thickness = 3;
  playerTag.color = playerColor;
  playerTag.cornerRadius = 4;
  playerTag.horizontalAlignment = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  playerTag.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  playerTag.left = isP1 ? '20px' : '-20px';
  playerTag.top = '-15px';
  playerTag.zIndex = 5;
  container.addControl(playerTag);

  const tagText = new TextBlock(`tagText_${idx}`, isP1 ? 'P1' : 'P2');
  tagText.fontSize = 22;
  tagText.fontFamily = 'monospace';
  tagText.fontWeight = 'bold';
  tagText.color = playerColor;
  playerTag.addControl(tagText);

  // "ABILITY" header label — positioned at bottom, offset
  const abilityHeader = new Rectangle(`abilityHeader_${idx}`);
  abilityHeader.width = '260px';
  abilityHeader.height = '50px';
  abilityHeader.background = '#000000cc';
  abilityHeader.thickness = 0;
  abilityHeader.horizontalAlignment = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  abilityHeader.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  abilityHeader.left = isP1 ? '100px' : '-100px';
  abilityHeader.top = '-30px';
  abilityHeader.zIndex = 4;
  container.addControl(abilityHeader);

  const abilityLabel = new TextBlock(`abilityLabel_${idx}`, 'ABILITY');
  abilityLabel.fontSize = 18;
  abilityLabel.fontFamily = 'monospace';
  abilityLabel.fontWeight = 'bold';
  abilityLabel.color = playerColor;
  abilityLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  abilityLabel.top = '4px';
  abilityHeader.addControl(abilityLabel);

  const abilityName = new TextBlock(`abilityName_${idx}`, '');
  abilityName.fontSize = 14;
  abilityName.fontFamily = 'monospace';
  abilityName.color = '#ffffff';
  abilityName.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  abilityName.top = '-4px';
  abilityHeader.addControl(abilityName);

  // Player avatar
  const avatar = createPlayerAvatar(container, idx);

  // Description text — centered in panel
  const abilityDesc = new TextBlock(`abilityDesc_${idx}`, '');
  abilityDesc.fontSize = 14;
  abilityDesc.fontFamily = 'monospace';
  abilityDesc.color = '#ffffffaa';
  abilityDesc.textWrapping = true;
  abilityDesc.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  abilityDesc.top = '-90px';
  container.addControl(abilityDesc);

  // Status (READY!) text
  const statusText = new TextBlock(`statusText_${idx}`, '');
  statusText.fontSize = 28;
  statusText.fontFamily = 'monospace';
  statusText.fontWeight = 'bold';
  statusText.color = '#44ff44';
  statusText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  statusText.top = '20px';
  container.addControl(statusText);

  return {
    container,
    avatar,
    abilityLabel,
    abilityName,
    abilityDesc,
    playerTag,
    statusText,
    selectedIndex: 0,
    confirmed: false,
    resolvedAbility: null,
  };
}

function createPlayerAvatar(parent: Rectangle, idx: number): PlayerAvatar {
  const isP1 = idx === 0;
  const bodyColor = isP1 ? P1_BODY_HEX : P2_BODY_HEX;
  const handColor = isP1 ? P1_HAND_HEX : P2_HAND_HEX;

  // Root container for the whole avatar — centered in panel, offset up
  const root = new Rectangle(`avatarRoot_${idx}`);
  root.width = '200px';
  root.height = '200px';
  root.thickness = 0;
  root.background = '#00000000';
  root.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  root.top = '-20px';
  parent.addControl(root);

  // Body
  const body = new Ellipse(`avatarBody_${idx}`);
  body.width = '90px';
  body.height = '90px';
  body.background = bodyColor;
  body.thickness = 3;
  body.color = '#00000044';
  root.addControl(body);

  // Left hand
  const leftHand = new Ellipse(`avatarLH_${idx}`);
  leftHand.width = '36px';
  leftHand.height = '36px';
  leftHand.background = handColor;
  leftHand.thickness = 2;
  leftHand.color = '#00000044';
  leftHand.left = '-58px';
  leftHand.top = '10px';
  root.addControl(leftHand);

  // Right hand
  const rightHand = new Ellipse(`avatarRH_${idx}`);
  rightHand.width = '36px';
  rightHand.height = '36px';
  rightHand.background = handColor;
  rightHand.thickness = 2;
  rightHand.color = '#00000044';
  rightHand.left = '58px';
  rightHand.top = '10px';
  root.addControl(rightHand);

  // Left eye white
  const leftEyeWhite = new Ellipse(`avatarLEW_${idx}`);
  leftEyeWhite.width = '20px';
  leftEyeWhite.height = '20px';
  leftEyeWhite.background = '#ffffff';
  leftEyeWhite.thickness = 0;
  leftEyeWhite.left = '-14px';
  leftEyeWhite.top = '-8px';
  root.addControl(leftEyeWhite);

  // Left pupil
  const leftPupil = new Ellipse(`avatarLP_${idx}`);
  leftPupil.width = '10px';
  leftPupil.height = '10px';
  leftPupil.background = '#111111';
  leftPupil.thickness = 0;
  leftPupil.left = '-12px';
  leftPupil.top = '-8px';
  root.addControl(leftPupil);

  // Right eye white
  const rightEyeWhite = new Ellipse(`avatarREW_${idx}`);
  rightEyeWhite.width = '20px';
  rightEyeWhite.height = '20px';
  rightEyeWhite.background = '#ffffff';
  rightEyeWhite.thickness = 0;
  rightEyeWhite.left = '14px';
  rightEyeWhite.top = '-8px';
  root.addControl(rightEyeWhite);

  // Right pupil
  const rightPupil = new Ellipse(`avatarRP_${idx}`);
  rightPupil.width = '10px';
  rightPupil.height = '10px';
  rightPupil.background = '#111111';
  rightPupil.thickness = 0;
  rightPupil.left = '16px';
  rightPupil.top = '-8px';
  root.addControl(rightPupil);

  return { root, body, leftHand, rightHand, leftEyeWhite, rightEyeWhite, leftPupil, rightPupil };
}

function createAbilityCard(parent: StackPanel, idx: number, label: string, style: { bg: string; border: string }): CardUI {
  // Outer wrapper to add spacing
  const wrapper = new Rectangle(`cardWrapper_${idx}`);
  wrapper.width = '160px';
  wrapper.height = 1;
  wrapper.thickness = 0;
  wrapper.background = '#00000000';
  wrapper.paddingLeft = '8px';
  wrapper.paddingRight = '8px';
  parent.addControl(wrapper);

  const rect = new Rectangle(`card_${idx}`);
  rect.width = 1;
  rect.height = '90%';
  rect.background = style.bg;
  rect.thickness = 3;
  rect.color = style.border;
  rect.cornerRadius = 6;
  wrapper.addControl(rect);

  const nameText = new TextBlock(`cardName_${idx}`, label);
  nameText.fontSize = 12;
  nameText.fontFamily = 'monospace';
  nameText.color = '#ffffff';
  nameText.textWrapping = true;
  nameText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  nameText.top = '-10px';
  rect.addControl(nameText);

  // P1 cursor overlay
  const p1Cursor = new Rectangle(`p1Cursor_${idx}`);
  p1Cursor.width = 1;
  p1Cursor.height = 1;
  p1Cursor.thickness = 4;
  p1Cursor.color = P1_COLOR;
  p1Cursor.background = '#00000000';
  p1Cursor.cornerRadius = 6;
  p1Cursor.isVisible = false;
  p1Cursor.zIndex = 10;
  rect.addControl(p1Cursor);

  // P2 cursor overlay
  const p2Cursor = new Rectangle(`p2Cursor_${idx}`);
  p2Cursor.width = '90%';
  p2Cursor.height = '90%';
  p2Cursor.thickness = 4;
  p2Cursor.color = P2_COLOR;
  p2Cursor.background = '#00000000';
  p2Cursor.cornerRadius = 4;
  p2Cursor.isVisible = false;
  p2Cursor.zIndex = 10;
  rect.addControl(p2Cursor);

  return { rect, nameText, p1Cursor, p2Cursor };
}

function confirmPanel(panel: PlayerSelectionPanel): void {
  panel.confirmed = true;
  if (panel.selectedIndex >= ABILITIES.length) {
    panel.resolvedAbility = ABILITIES[Math.floor(Math.random() * ABILITIES.length)];
  } else {
    panel.resolvedAbility = ABILITIES[panel.selectedIndex];
  }
}

function unconfirmPanel(panel: PlayerSelectionPanel): void {
  panel.confirmed = false;
  panel.resolvedAbility = null;
}

// Gamepad stick tracking for selection cycling
const prevStickX = [0, 0];
const STICK_THRESHOLD = 0.5;

export function updateSelection(selUI: SelectionUI, state: GameState, dt: number): boolean {
  // Animate avatar bounce (sine for smooth ease-in/ease-out)
  bounceTime += dt;
  const bounceY = Math.sin(bounceTime * BOUNCE_SPEED * Math.PI * 2) * BOUNCE_AMPLITUDE;
  for (let i = 0; i < 2; i++) {
    const avatar = selUI.panels[i].avatar;
    avatar.root.top = `${-20 + bounceY}px`;
    // Hands bob slightly out of phase for a lively feel
    const handBounce = Math.sin((bounceTime * BOUNCE_SPEED * Math.PI * 2) + 0.8) * BOUNCE_AMPLITUDE * 0.6;
    avatar.leftHand.top = `${10 + handBounce}px`;
    avatar.rightHand.top = `${10 + handBounce}px`;
  }

  // P1 controls: A/D cycle, C/V confirm, Escape unconfirm
  handlePlayerSelection(selUI.panels[0], 'KeyA', 'KeyD', 'KeyC', 'KeyV', 'Escape');
  // P2 controls: K/; cycle, ArrowLeft/ArrowRight confirm, Backspace unconfirm
  handlePlayerSelection(selUI.panels[1], 'KeyK', 'Semicolon', 'ArrowLeft', 'ArrowRight', 'Backspace');

  // Gamepad selection
  handleGamepadSelection(selUI.panels[0], 0);
  handleGamepadSelection(selUI.panels[1], 1);

  // Update card cursor visuals
  for (let i = 0; i < CARD_COUNT; i++) {
    const card = selUI.cards[i];
    card.p1Cursor.isVisible = selUI.panels[0].selectedIndex === i;
    card.p2Cursor.isVisible = selUI.panels[1].selectedIndex === i;

    // Confirmed highlight: thicker border + brighter bg
    const isRandom = i >= ABILITIES.length;
    const key = isRandom ? 'random' : ABILITIES[i];
    const style = CARD_STYLES[key];

    const p1Confirmed = selUI.panels[0].confirmed && selUI.panels[0].selectedIndex === i;
    const p2Confirmed = selUI.panels[1].confirmed && selUI.panels[1].selectedIndex === i;

    if (p1Confirmed || p2Confirmed) {
      card.rect.thickness = 5;
      card.rect.color = p1Confirmed ? P1_COLOR : P2_COLOR;
    } else {
      card.rect.thickness = 3;
      card.rect.color = style.border;
    }
  }

  // Update preview panels
  for (let i = 0; i < 2; i++) {
    const panel = selUI.panels[i];
    const isRandom = panel.selectedIndex >= ABILITIES.length;

    if (isRandom) {
      panel.abilityName.text = RANDOM_LABEL;
      panel.abilityDesc.text = 'Pick a random ability!';
    } else {
      const ability = ABILITIES[panel.selectedIndex];
      const info = ABILITY_INFO[ability];
      panel.abilityName.text = info.name;
      panel.abilityDesc.text = info.desc;
    }

    if (panel.confirmed) {
      panel.statusText.text = 'READY!';
      panel.statusText.isVisible = true;
    } else {
      panel.statusText.text = '';
      panel.statusText.isVisible = false;
    }
  }

  // Update state selections (use resolvedAbility to avoid re-rolling random)
  for (let i = 0; i < 2; i++) {
    const panel = selUI.panels[i];
    if (panel.confirmed) {
      state.selections[i] = panel.resolvedAbility;
    } else {
      state.selections[i] = null;
    }
  }

  return selUI.panels[0].confirmed && selUI.panels[1].confirmed;
}

function handlePlayerSelection(
  panel: PlayerSelectionPanel,
  leftKey: string,
  rightKey: string,
  confirmKey1: string,
  confirmKey2: string,
  backKey: string,
): void {
  if (panel.confirmed) {
    if (isKeyJustPressed(backKey)) {
      unconfirmPanel(panel);
    }
    return;
  }

  if (isKeyJustPressed(leftKey)) {
    panel.selectedIndex = (panel.selectedIndex - 1 + CARD_COUNT) % CARD_COUNT;
  }
  if (isKeyJustPressed(rightKey)) {
    panel.selectedIndex = (panel.selectedIndex + 1) % CARD_COUNT;
  }
  if (isKeyJustPressed(confirmKey1) || isKeyJustPressed(confirmKey2)) {
    confirmPanel(panel);
  }
}

function handleGamepadSelection(panel: PlayerSelectionPanel, padIdx: number): void {
  const gamepads = navigator.getGamepads();
  const gp = gamepads[padIdx];
  if (!gp) return;

  // B button (index 1) to unconfirm
  if (panel.confirmed) {
    if (gp.buttons[1]?.pressed) {
      unconfirmPanel(panel);
    }
    prevStickX[padIdx] = gp.axes[0] ?? 0;
    return;
  }

  const sx = gp.axes[0] ?? 0;

  // Edge-detect stick left/right
  if (sx < -STICK_THRESHOLD && prevStickX[padIdx] >= -STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex - 1 + CARD_COUNT) % CARD_COUNT;
  }
  if (sx > STICK_THRESHOLD && prevStickX[padIdx] <= STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex + 1) % CARD_COUNT;
  }
  prevStickX[padIdx] = sx;

  // X button (index 2) to confirm

  if (gp.buttons[2]?.pressed) {
    confirmPanel(panel);
  }
}

export function destroySelectionUI(selUI: SelectionUI): void {
  selUI.ui.dispose();
}

export function resetSelection(selUI: SelectionUI): void {
  for (const panel of selUI.panels) {
    panel.selectedIndex = 0;
    unconfirmPanel(panel);
  }
}
