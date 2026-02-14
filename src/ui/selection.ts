import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  FreeCamera,
  Vector3,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, Rectangle, StackPanel } from '@babylonjs/gui';
import type { AbilityType, GameState } from '../types.ts';
import type { PlayerMeshes } from '../objects/player.ts';
import { isKeyJustPressed } from '../input.ts';
import {
  PLAYER_RADIUS, HAND_RADIUS, HAND_OFFSET,
  P1_BODY_COLOR, P1_HAND_COLOR,
  P2_BODY_COLOR, P2_HAND_COLOR,
} from '../constants.ts';

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
const CARD_COUNT = ABILITIES.length + 1;

const CARD_STYLES: Record<string, { bg: string; border: string }> = {
  burrito: { bg: '#2d5a1e', border: '#33cc33' },
  child: { bg: '#5a3a1e', border: '#ff8833' },
  melon: { bg: '#1e4a1e', border: '#44bb22' },
  random: { bg: '#3a1e5a', border: '#8844cc' },
};

const P1_COLOR = '#4488ff';
const P2_COLOR = '#ff4444';

// 3D stage layout
const STAGE_CAM_POS = new Vector3(0, 1.2, -5.5);
const STAGE_CAM_TARGET = new Vector3(0, 0.6, 0);
const P1_STAGE_X = -2.2;
const P2_STAGE_X = 2.2;
const PLAYER_STAGE_Z = 0;
const PLAYER_STAGE_Y = 1.2;
const BACKDROP_Z = 2.5;
const BACKDROP_W = 6;
const BACKDROP_H = 5;
const FLOOR_Y = -0.05;

// Idle bounce
const BOUNCE_SPEED = 0.8;
const BOUNCE_AMPLITUDE = 0.15;
let bounceTime = 0;

// --- 3D Stage ---

export interface SelectionStage {
  backdrops: [Mesh, Mesh];
  backdropMats: [StandardMaterial, StandardMaterial];
  divider: Mesh;
  floor: Mesh;
  floorMat: StandardMaterial;
}

export function createSelectionStage(scene: Scene): SelectionStage {
  // P1 backdrop (orange)
  const bd1 = MeshBuilder.CreatePlane('selBd1', { width: BACKDROP_W, height: BACKDROP_H }, scene);
  bd1.position.set(P1_STAGE_X, BACKDROP_H / 2 - 0.5, BACKDROP_Z);
  const bd1Mat = new StandardMaterial('selBd1Mat', scene);
  bd1Mat.emissiveColor = new Color3(0.8, 0.5, 0.0);
  bd1Mat.disableLighting = true;
  bd1Mat.alpha = 0.7;
  bd1.material = bd1Mat;

  // P2 backdrop (cyan)
  const bd2 = MeshBuilder.CreatePlane('selBd2', { width: BACKDROP_W, height: BACKDROP_H }, scene);
  bd2.position.set(P2_STAGE_X, BACKDROP_H / 2 - 0.5, BACKDROP_Z);
  const bd2Mat = new StandardMaterial('selBd2Mat', scene);
  bd2Mat.emissiveColor = new Color3(0.0, 0.5, 0.7);
  bd2Mat.disableLighting = true;
  bd2Mat.alpha = 0.7;
  bd2.material = bd2Mat;

  // Center divider
  const divider = MeshBuilder.CreatePlane('selDivider', { width: 0.08, height: BACKDROP_H }, scene);
  divider.position.set(0, BACKDROP_H / 2 - 0.5, BACKDROP_Z - 0.01);
  const divMat = new StandardMaterial('selDivMat', scene);
  divMat.emissiveColor = new Color3(0, 0, 0);
  divMat.disableLighting = true;
  divider.material = divMat;

  // Stage floor
  const floor = MeshBuilder.CreateGround('selFloor', { width: 14, height: 8 }, scene);
  floor.position.set(0, FLOOR_Y, BACKDROP_Z / 2);
  const floorMat = new StandardMaterial('selFloorMat', scene);
  floorMat.emissiveColor = new Color3(0.12, 0.12, 0.2);
  floorMat.disableLighting = true;
  floor.material = floorMat;

  return {
    backdrops: [bd1, bd2],
    backdropMats: [bd1Mat, bd2Mat],
    divider,
    floor,
    floorMat,
  };
}

export function setSelectionStageVisible(stage: SelectionStage, visible: boolean): void {
  for (const b of stage.backdrops) b.setEnabled(visible);
  stage.divider.setEnabled(visible);
  stage.floor.setEnabled(visible);
}

export function disposeSelectionStage(stage: SelectionStage): void {
  for (const b of stage.backdrops) b.dispose();
  stage.divider.dispose();
  stage.floor.dispose();
}

/** Position the player meshes on the selection stage facing the camera, with bounce. */
export function updateSelectionMeshes(
  playerMeshes: readonly [PlayerMeshes, PlayerMeshes],
  dt: number,
): void {
  bounceTime += dt;
  const bounce = Math.sin(bounceTime * BOUNCE_SPEED * Math.PI * 2) * BOUNCE_AMPLITUDE;
  // Hands bounce slightly out of phase
  const handBounce = Math.sin(bounceTime * BOUNCE_SPEED * Math.PI * 2 + 0.8) * BOUNCE_AMPLITUDE * 0.5;

  for (let idx = 0; idx < 2; idx++) {
    const meshes = playerMeshes[idx];
    const stageX = idx === 0 ? P1_STAGE_X : P2_STAGE_X;
    const bodyY = PLAYER_STAGE_Y + PLAYER_RADIUS + bounce;

    // Body
    meshes.body.position.set(stageX, bodyY, PLAYER_STAGE_Z);
    meshes.body.scaling.setAll(1);
    const bodyColor = idx === 0 ? P1_BODY_COLOR : P2_BODY_COLOR;
    meshes.bodyMat.emissiveColor = new Color3(...bodyColor);
    meshes.bodyMat.alpha = 1;

    // Hands — at sides, facing camera (spread along X)
    const handColor = idx === 0 ? P1_HAND_COLOR : P2_HAND_COLOR;
    const handY = PLAYER_STAGE_Y + HAND_RADIUS + handBounce;
    for (let h = 0; h < 2; h++) {
      const sign = h === 0 ? -1 : 1;
      meshes.hands[h].position.set(
        stageX + sign * HAND_OFFSET,
        handY,
        PLAYER_STAGE_Z,
      );
      meshes.hands[h].scaling.setAll(1);
      meshes.handMats[h].emissiveColor = new Color3(...handColor);
      meshes.handMats[h].alpha = 1;
    }

    // Eyes — facing camera (toward -Z)
    const r = PLAYER_RADIUS;
    const eyeDist = r * 0.4;
    const eyeForward = r * 0.85;
    const eyeY = bodyY + r * 0.2;

    for (let e = 0; e < 2; e++) {
      const sign = e === 0 ? -1 : 1;
      // Forward is -Z (toward camera), perpendicular is X
      meshes.eyeWhites[e].position.set(
        stageX + sign * eyeDist,
        eyeY,
        PLAYER_STAGE_Z - eyeForward,
      );
      meshes.eyeWhites[e].scaling.setAll(1);
      meshes.eyeWhiteMats[e].alpha = 1;

      const pupilForward = eyeForward + r * 0.08;
      meshes.pupils[e].position.set(
        stageX + sign * eyeDist,
        eyeY,
        PLAYER_STAGE_Z - pupilForward,
      );
      meshes.pupils[e].scaling.setAll(1);
      meshes.pupilMats[e].alpha = 1;
    }
  }
}

/** Set up the camera for the selection stage. Returns the saved gameplay camera state. */
export function enterSelectionCamera(camera: FreeCamera): { pos: Vector3; target: Vector3 } {
  const saved = { pos: camera.position.clone(), target: camera.getTarget() };
  camera.position = STAGE_CAM_POS.clone();
  camera.setTarget(STAGE_CAM_TARGET);
  return saved;
}

export function restoreGameplayCamera(camera: FreeCamera, saved: { pos: Vector3; target: Vector3 }): void {
  camera.position = saved.pos;
  camera.setTarget(saved.target);
}

/** Hide arena meshes by name during selection. */
export function setArenaMeshesVisible(scene: Scene, visible: boolean): void {
  const names = [
    'platform', 'dzTop', 'dzBot', 'dzLeft', 'dzRight',
    'bTop', 'bBot', 'bLeft', 'bRight',
  ];
  for (const n of names) {
    const m = scene.getMeshByName(n);
    if (m) m.setEnabled(visible);
  }
}

// --- 2D GUI ---

export interface SelectionUI {
  ui: AdvancedDynamicTexture;
  panels: [PlayerSelectionPanel, PlayerSelectionPanel];
  cards: CardUI[];
  stage: SelectionStage;
}

interface PlayerSelectionPanel {
  container: Rectangle;
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
  const stage = createSelectionStage(scene);

  // --- Top half: transparent overlay with labels (3D shows through) ---
  const topContainer = new Rectangle('topContainer');
  topContainer.width = 1;
  topContainer.height = '55%';
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

  // --- Bottom half: card grid + controls ---
  const bottomContainer = new Rectangle('bottomContainer');
  bottomContainer.width = 1;
  bottomContainer.height = '45%';
  bottomContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  bottomContainer.thickness = 0;
  bottomContainer.background = '#111122ee';
  ui.addControl(bottomContainer);

  const cardRow = new StackPanel('cardRow');
  cardRow.isVertical = false;
  cardRow.height = '65%';
  cardRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  cardRow.top = '10px';
  bottomContainer.addControl(cardRow);

  const cards: CardUI[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const isRandom = i >= ABILITIES.length;
    const key = isRandom ? 'random' : ABILITIES[i];
    const style = CARD_STYLES[key];
    const label = isRandom ? RANDOM_LABEL : ABILITY_INFO[ABILITIES[i]].name;
    cards.push(createAbilityCard(cardRow, i, label, style));
  }

  // Controls hint bar
  const controlsBar = new Rectangle('controlsBar');
  controlsBar.width = 1;
  controlsBar.height = '35%';
  controlsBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  controlsBar.thickness = 0;
  controlsBar.background = '#0a0a18';
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

  return { ui, panels: [p1Panel, p2Panel], cards, stage };
}

function createPreviewPanel(parent: Rectangle, idx: number): PlayerSelectionPanel {
  const isP1 = idx === 0;
  const playerColor = isP1 ? P1_COLOR : P2_COLOR;

  // Transparent container — 3D renders behind it
  const container = new Rectangle(`previewPanel_${idx}`);
  container.width = '50%';
  container.height = 1;
  container.horizontalAlignment = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  container.thickness = 0;
  container.background = '#00000000';
  parent.addControl(container);

  // Player tag (P1/P2 badge) — bottom corner
  const playerTag = new Rectangle(`playerTag_${idx}`);
  playerTag.width = '80px';
  playerTag.height = '40px';
  playerTag.background = '#000000cc';
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

  // "ABILITY" header + ability name — bottom bar
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

  // Description text
  const abilityDesc = new TextBlock(`abilityDesc_${idx}`, '');
  abilityDesc.fontSize = 14;
  abilityDesc.fontFamily = 'monospace';
  abilityDesc.color = '#ffffffaa';
  abilityDesc.textWrapping = true;
  abilityDesc.outlineWidth = 3;
  abilityDesc.outlineColor = '#000000';
  abilityDesc.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  abilityDesc.top = '-85px';
  container.addControl(abilityDesc);

  // Status (READY!) text
  const statusText = new TextBlock(`statusText_${idx}`, '');
  statusText.fontSize = 32;
  statusText.fontFamily = 'monospace';
  statusText.fontWeight = 'bold';
  statusText.color = '#44ff44';
  statusText.outlineWidth = 3;
  statusText.outlineColor = '#000000';
  statusText.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  statusText.top = '-10px';
  container.addControl(statusText);

  return {
    container,
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

function createAbilityCard(parent: StackPanel, idx: number, label: string, style: { bg: string; border: string }): CardUI {
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

// --- Input handling ---

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

const prevStickX = [0, 0];
const STICK_THRESHOLD = 0.5;

export function updateSelection(selUI: SelectionUI, state: GameState): boolean {
  // P1 controls: A/D cycle, C/V confirm, Escape unconfirm
  handlePlayerSelection(selUI.panels[0], 'KeyA', 'KeyD', 'KeyC', 'KeyV', 'Escape');
  // P2 controls: K/; cycle, ArrowLeft/ArrowRight confirm, Backspace unconfirm
  handlePlayerSelection(selUI.panels[1], 'KeyK', 'Semicolon', 'ArrowLeft', 'ArrowRight', 'Backspace');

  handleGamepadSelection(selUI.panels[0], 0);
  handleGamepadSelection(selUI.panels[1], 1);

  // Update card cursor visuals
  for (let i = 0; i < CARD_COUNT; i++) {
    const card = selUI.cards[i];
    card.p1Cursor.isVisible = selUI.panels[0].selectedIndex === i;
    card.p2Cursor.isVisible = selUI.panels[1].selectedIndex === i;

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

  // Update state selections
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

  if (panel.confirmed) {
    if (gp.buttons[1]?.pressed) {
      unconfirmPanel(panel);
    }
    prevStickX[padIdx] = gp.axes[0] ?? 0;
    return;
  }

  const sx = gp.axes[0] ?? 0;

  if (sx < -STICK_THRESHOLD && prevStickX[padIdx] >= -STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex - 1 + CARD_COUNT) % CARD_COUNT;
  }
  if (sx > STICK_THRESHOLD && prevStickX[padIdx] <= STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex + 1) % CARD_COUNT;
  }
  prevStickX[padIdx] = sx;

  if (gp.buttons[2]?.pressed) {
    confirmPanel(panel);
  }
}

export function destroySelectionUI(selUI: SelectionUI): void {
  selUI.ui.dispose();
  disposeSelectionStage(selUI.stage);
}

export function resetSelection(selUI: SelectionUI): void {
  bounceTime = 0;
  for (const panel of selUI.panels) {
    panel.selectedIndex = 0;
    unconfirmPanel(panel);
  }
}
