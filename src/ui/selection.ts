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
import { applyAbilityVisual } from '../objects/player.ts';
import { isKeyJustPressed, isAnyGamepadSelectJustPressed } from '../input.ts';
import {
  createInputAssignUI, updateInputAssignUI, destroyInputAssignUI,
  getP1GamepadIndex, getP2GamepadIndex,
} from './inputAssign.ts';
import type { InputAssignUI } from './inputAssign.ts';
import {
  PLAYER_RADIUS, HAND_RADIUS, HAND_OFFSET,
  P1_BODY_COLOR, P1_HAND_COLOR,
  P2_BODY_COLOR, P2_HAND_COLOR,
  CHILD_SCALE, MELON_BODY_Y_SCALE,
  P1_HUD_COLOR, P2_HUD_COLOR,
  STAGE_CAM_POS as STAGE_CAM_POS_TUPLE,
  STAGE_CAM_TARGET as STAGE_CAM_TARGET_TUPLE,
  P1_STAGE_X, P2_STAGE_X, PLAYER_STAGE_Z, PLAYER_STAGE_Y,
  BACKDROP_Z, BACKDROP_W, BACKDROP_H, SELECTION_FLOOR_Y,
  BOUNCE_SPEED, BOUNCE_AMPLITUDE, HAND_BOUNCE_PHASE,
  SELECTION_STICK_THRESHOLD,
  BACKDROP_P1_COLOR, BACKDROP_P2_COLOR, BACKDROP_ALPHA,
  DIVIDER_WIDTH, SELECTION_FLOOR_W, SELECTION_FLOOR_D, SELECTION_FLOOR_COLOR,
  HEADBAND_SEG_LENGTH,
  HEADBAND_BAND_Y_FACTOR, HEADBAND_KNOT_DIST_FACTOR, HEADBAND_SPLAY_ANGLES,
  EYE_DIST_FACTOR, EYE_FORWARD_FACTOR, EYE_Y_FACTOR, PUPIL_FORWARD_FACTOR,
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

// Card center X positions relative to screen center (4 cards × 180px = 720px total)
const CARD_CENTER_X = [-270, -90, 90, 270];
const CURSOR_P1_OFFSET = -25;
const CURSOR_P2_OFFSET = 25;

const CARD_ICONS: Record<string, string> = {
  burrito: '🌯',
  child: '🧃',
  melon: '🍈',
  random: '?',
};

const CARD_STYLES: Record<string, { bg: string; border: string }> = {
  burrito: { bg: '#2d5a1e', border: '#33cc33' },
  child: { bg: '#5a3a1e', border: '#ff8833' },
  melon: { bg: '#3a3a1e', border: '#ccaa22' },
  random: { bg: '#3a1e5a', border: '#8844cc' },
};

const STAGE_CAM_POS = new Vector3(...STAGE_CAM_POS_TUPLE);
const STAGE_CAM_TARGET = new Vector3(...STAGE_CAM_TARGET_TUPLE);

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
  bd1Mat.emissiveColor = new Color3(...BACKDROP_P1_COLOR);
  bd1Mat.disableLighting = true;
  bd1Mat.alpha = BACKDROP_ALPHA;
  bd1.material = bd1Mat;

  // P2 backdrop (cyan)
  const bd2 = MeshBuilder.CreatePlane('selBd2', { width: BACKDROP_W, height: BACKDROP_H }, scene);
  bd2.position.set(P2_STAGE_X, BACKDROP_H / 2 - 0.5, BACKDROP_Z);
  const bd2Mat = new StandardMaterial('selBd2Mat', scene);
  bd2Mat.emissiveColor = new Color3(...BACKDROP_P2_COLOR);
  bd2Mat.disableLighting = true;
  bd2Mat.alpha = BACKDROP_ALPHA;
  bd2.material = bd2Mat;

  // Center divider
  const divider = MeshBuilder.CreatePlane('selDivider', { width: DIVIDER_WIDTH, height: BACKDROP_H }, scene);
  divider.position.set(0, BACKDROP_H / 2 - 0.5, BACKDROP_Z - 0.01);
  const divMat = new StandardMaterial('selDivMat', scene);
  divMat.emissiveColor = new Color3(0, 0, 0);
  divMat.disableLighting = true;
  divider.material = divMat;

  // Stage floor
  const floor = MeshBuilder.CreateGround('selFloor', { width: SELECTION_FLOOR_W, height: SELECTION_FLOOR_D }, scene);
  floor.position.set(0, SELECTION_FLOOR_Y, BACKDROP_Z / 2);
  const floorMat = new StandardMaterial('selFloorMat', scene);
  floorMat.emissiveColor = new Color3(...SELECTION_FLOOR_COLOR);
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

/** Get the hovered ability for each player from the selection panels. */
export function getHoveredAbilities(selUI: SelectionUI): [AbilityType | null, AbilityType | null] {
  const result: [AbilityType | null, AbilityType | null] = [null, null];
  for (let i = 0; i < 2; i++) {
    const panel = selUI.panels[i];
    if (panel.selectedIndex < ABILITIES.length) {
      result[i] = ABILITIES[panel.selectedIndex];
    }
    // null means RANDOM
  }
  return result;
}

/** Position the player meshes on the selection stage facing the camera, with bounce. */
export function updateSelectionMeshes(
  playerMeshes: readonly [PlayerMeshes, PlayerMeshes],
  dt: number,
  hoveredAbilities: [AbilityType | null, AbilityType | null],
): void {
  bounceTime += dt;
  const bounce = Math.sin(bounceTime * BOUNCE_SPEED * Math.PI * 2) * BOUNCE_AMPLITUDE;
  // Hands bounce slightly out of phase
  const handBounce = Math.sin(bounceTime * BOUNCE_SPEED * Math.PI * 2 + HAND_BOUNCE_PHASE) * BOUNCE_AMPLITUDE * 0.5;

  for (let idx = 0; idx < 2; idx++) {
    const meshes = playerMeshes[idx];
    const stageX = idx === 0 ? P1_STAGE_X : P2_STAGE_X;
    const hovered = hoveredAbilities[idx];
    const scale = hovered === 'child' ? CHILD_SCALE : 1;
    const bodyY = PLAYER_STAGE_Y + PLAYER_RADIUS * scale + bounce;

    // Apply ability visual (headband/melon/question/normal)
    const visualKey = hovered ?? 'random';
    applyAbilityVisual(meshes, visualKey, idx, scale);

    // Body
    meshes.body.position.set(stageX, bodyY, PLAYER_STAGE_Z);
    meshes.body.scaling.setAll(scale);
    const bodyColor = idx === 0 ? P1_BODY_COLOR : P2_BODY_COLOR;
    meshes.bodyMat.emissiveColor = new Color3(...bodyColor);
    meshes.bodyMat.alpha = 1;

    // Melon body position + oblong scale
    if (hovered === 'melon') {
      meshes.melonBodyMesh.position.set(stageX, bodyY, PLAYER_STAGE_Z);
      meshes.melonBodyMesh.scaling.set(scale, scale * MELON_BODY_Y_SCALE, scale);
      meshes.melonBodyMat.alpha = 1;
    }

    // Question disc position — faces +Z by default, camera is at -Z looking toward +Z
    if (hovered === null) {
      meshes.questionDisc.position.set(stageX, bodyY, PLAYER_STAGE_Z - PLAYER_RADIUS * 0.01);
      meshes.questionDiscMat.alpha = 1;
    }

    // Hands — at sides, facing camera (spread along X)
    const handColor = idx === 0 ? P1_HAND_COLOR : P2_HAND_COLOR;
    const handY = PLAYER_STAGE_Y + HAND_RADIUS * scale + handBounce;
    for (let h = 0; h < 2; h++) {
      const sign = h === 0 ? -1 : 1;
      meshes.hands[h].position.set(
        stageX + sign * HAND_OFFSET * scale,
        handY,
        PLAYER_STAGE_Z,
      );
      meshes.hands[h].scaling.setAll(scale);
      meshes.handMats[h].emissiveColor = new Color3(...handColor);
      meshes.handMats[h].alpha = 1;
    }

    // Eyes — facing camera (toward -Z)
    const r = PLAYER_RADIUS * scale;
    const eyeDist = r * EYE_DIST_FACTOR;
    const eyeForward = r * EYE_FORWARD_FACTOR;
    const eyeY = bodyY + r * EYE_Y_FACTOR;

    for (let e = 0; e < 2; e++) {
      const sign = e === 0 ? -1 : 1;
      // Forward is -Z (toward camera), perpendicular is X
      meshes.eyeWhites[e].position.set(
        stageX + sign * eyeDist,
        eyeY,
        PLAYER_STAGE_Z - eyeForward,
      );
      meshes.eyeWhites[e].scaling.setAll(scale);
      meshes.eyeWhiteMats[e].alpha = 1;

      const pupilForward = eyeForward + r * PUPIL_FORWARD_FACTOR;
      meshes.pupils[e].position.set(
        stageX + sign * eyeDist,
        eyeY,
        PLAYER_STAGE_Z - pupilForward,
      );
      meshes.pupils[e].scaling.setAll(scale);
      meshes.pupilMats[e].alpha = 1;
    }

    // Hide eyes/pupils/hands for random (question disc replaces body)
    if (hovered === null) {
      for (const h of meshes.hands) h.setEnabled(false);
      for (const e of meshes.eyeWhites) e.setEnabled(false);
      for (const p of meshes.pupils) p.setEnabled(false);
    }

    // Headband physics in selection screen (face toward -Z / camera)
    if (hovered === 'burrito') {
      updateSelectionHeadband(meshes, stageX, bodyY, PLAYER_STAGE_Z, -Math.PI / 2, dt);
    }
  }
}

/** Simplified headband positioning for the selection screen (no fast movement). */
function updateSelectionHeadband(
  meshes: PlayerMeshes,
  anchorX: number, anchorY: number, anchorZ: number,
  facingAngle: number, _dt: number,
): void {
  const backX = -Math.cos(facingAngle);
  const backZ = -Math.sin(facingAngle);

  const bandY = anchorY + PLAYER_RADIUS * HEADBAND_BAND_Y_FACTOR;
  meshes.headbandBand.position.set(anchorX, bandY, anchorZ);
  meshes.headbandBand.rotation.x = 0;
  meshes.headbandBand.rotation.y = 0;

  const knotDist = PLAYER_RADIUS * HEADBAND_KNOT_DIST_FACTOR;
  const knotX = anchorX + backX * knotDist;
  const knotZ = anchorZ + backZ * knotDist;
  meshes.headbandKnot.position.set(knotX, bandY, knotZ);

  // Static tail positions (gentle drape) for selection screen
  const splayAngles = HEADBAND_SPLAY_ANGLES;
  for (let t = 0; t < 2; t++) {
    const tails = t === 0 ? meshes.headbandTailsL : meshes.headbandTailsR;
    const splay = splayAngles[t];
    const tailDirX = backX * Math.cos(splay) - backZ * Math.sin(splay);
    const tailDirZ = backX * Math.sin(splay) + backZ * Math.cos(splay);

    for (let s = 0; s < tails.length; s++) {
      const dist = (s + 1) * HEADBAND_SEG_LENGTH;
      const droop = s * s * 0.02;
      tails[s].position.set(
        knotX + tailDirX * dist,
        bandY - droop,
        knotZ + tailDirZ * dist,
      );
      tails[s].rotation.y = Math.atan2(tailDirX, tailDirZ);
      tails[s].rotation.x = Math.atan2(droop, HEADBAND_SEG_LENGTH);
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
  p1Cursor: Rectangle;
  p2Cursor: Rectangle;
  inputAssignUI: InputAssignUI | null;
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
  vsText.fontSize = 80;
  vsText.fontFamily = 'monospace';
  vsText.fontWeight = 'bold';
  vsText.color = '#ffffff';
  vsText.outlineWidth = 8;
  vsText.outlineColor = '#000000';
  vsText.zIndex = 10;
  topContainer.addControl(vsText);

  // Bo3 label — top center
  const bo3Rect = new Rectangle('bo3Rect');
  bo3Rect.width = '100px';
  bo3Rect.height = '40px';
  bo3Rect.background = '#000000';
  bo3Rect.thickness = 0;
  bo3Rect.cornerRadius = 4;
  bo3Rect.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  bo3Rect.top = '10px';
  bo3Rect.zIndex = 15;
  ui.addControl(bo3Rect);

  const bo3Text = new TextBlock('bo3Text', 'Bo3');
  bo3Text.fontSize = 24;
  bo3Text.fontFamily = 'monospace';
  bo3Text.fontWeight = 'bold';
  bo3Text.color = '#ffffff';
  bo3Rect.addControl(bo3Text);

  // --- Bottom half: card grid + controls ---
  const bottomContainer = new Rectangle('bottomContainer');
  bottomContainer.width = 1;
  bottomContainer.height = '40%';
  bottomContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  bottomContainer.thickness = 0;
  bottomContainer.background = '#111122ee';
  ui.addControl(bottomContainer);

  const cardRow = new StackPanel('cardRow');
  cardRow.isVertical = false;
  cardRow.height = '70%';
  cardRow.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  cardRow.top = '18px';
  bottomContainer.addControl(cardRow);

  const cards: CardUI[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const isRandom = i >= ABILITIES.length;
    const key = isRandom ? 'random' : ABILITIES[i];
    const style = CARD_STYLES[key];
    const label = isRandom ? RANDOM_LABEL : ABILITY_INFO[ABILITIES[i]].name;
    cards.push(createAbilityCard(cardRow, i, key, label, style, isRandom));
  }

  // Controls hint bar
  const controlsBar = new Rectangle('controlsBar');
  controlsBar.width = 1;
  controlsBar.height = '25%';
  controlsBar.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  controlsBar.thickness = 0;
  controlsBar.background = '#0a0a18';
  bottomContainer.addControl(controlsBar);

  const controlsLeft = new TextBlock('ctrlLeft', 'P1: A/D cycle, C/V select');
  controlsLeft.fontSize = 16;
  controlsLeft.color = P1_HUD_COLOR;
  controlsLeft.fontFamily = 'monospace';
  controlsLeft.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  controlsLeft.left = '20px';
  controlsBar.addControl(controlsLeft);

  const controlsRight = new TextBlock('ctrlRight', 'P2: K/; cycle, \u2190/\u2192 select');
  controlsRight.fontSize = 16;
  controlsRight.color = P2_HUD_COLOR;
  controlsRight.fontFamily = 'monospace';
  controlsRight.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  controlsRight.left = '-20px';
  controlsBar.addControl(controlsRight);

  const controlsCenter = new TextBlock('ctrlCenter', '` / Select = Input Setup  ·  Gamepad: Stick cycle, X select, B back');
  controlsCenter.fontSize = 14;
  controlsCenter.color = '#8888aa';
  controlsCenter.fontFamily = 'monospace';
  controlsBar.addControl(controlsCenter);

  // --- Root-level player cursors (above all containers, no clipping) ---
  const p1Cursor = createPlayerCursor(ui, 'P1', P1_HUD_COLOR, CURSOR_P1_OFFSET);
  const p2Cursor = createPlayerCursor(ui, 'P2', P2_HUD_COLOR, CURSOR_P2_OFFSET);

  return { ui, panels: [p1Panel, p2Panel], cards, stage, p1Cursor, p2Cursor, inputAssignUI: null };
}

function createPreviewPanel(parent: Rectangle, idx: number): PlayerSelectionPanel {
  const isP1 = idx === 0;
  const playerColor = isP1 ? P1_HUD_COLOR : P2_HUD_COLOR;

  // Transparent container — 3D renders behind it
  const container = new Rectangle(`previewPanel_${idx}`);
  container.width = '50%';
  container.height = 1;
  container.horizontalAlignment = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  container.thickness = 0;
  container.background = '#00000000';
  parent.addControl(container);

  // Player tag (P1/P2 badge) — top corner
  const playerTag = new Rectangle(`playerTag_${idx}`);
  playerTag.width = '100px';
  playerTag.height = '48px';
  playerTag.background = '#000000cc';
  playerTag.thickness = 3;
  playerTag.color = playerColor;
  playerTag.cornerRadius = 4;
  playerTag.horizontalAlignment = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  playerTag.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  playerTag.left = isP1 ? '20px' : '-20px';
  playerTag.top = '15px';
  playerTag.zIndex = 5;
  container.addControl(playerTag);

  const tagText = new TextBlock(`tagText_${idx}`, isP1 ? 'P1' : 'P2');
  tagText.fontSize = 28;
  tagText.fontFamily = 'monospace';
  tagText.fontWeight = 'bold';
  tagText.color = playerColor;
  playerTag.addControl(tagText);

  // "ABILITY" header + ability name + description — bottom bar
  const abilityHeader = new Rectangle(`abilityHeader_${idx}`);
  abilityHeader.width = '340px';
  abilityHeader.height = '95px';
  abilityHeader.background = '#000000cc';
  abilityHeader.thickness = 0;
  abilityHeader.horizontalAlignment = isP1 ? Control.HORIZONTAL_ALIGNMENT_LEFT : Control.HORIZONTAL_ALIGNMENT_RIGHT;
  abilityHeader.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  abilityHeader.left = isP1 ? '100px' : '-100px';
  abilityHeader.top = '-15px';
  abilityHeader.zIndex = 4;
  container.addControl(abilityHeader);

  const abilityLabel = new TextBlock(`abilityLabel_${idx}`, 'ABILITY');
  abilityLabel.fontSize = 22;
  abilityLabel.fontFamily = 'monospace';
  abilityLabel.fontWeight = 'bold';
  abilityLabel.color = playerColor;
  abilityLabel.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  abilityLabel.top = '4px';
  abilityHeader.addControl(abilityLabel);

  const abilityName = new TextBlock(`abilityName_${idx}`, '');
  abilityName.fontSize = 18;
  abilityName.fontFamily = 'monospace';
  abilityName.color = '#ffffff';
  abilityName.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  abilityName.top = '2px';
  abilityHeader.addControl(abilityName);

  // Description text — inside header box
  const abilityDesc = new TextBlock(`abilityDesc_${idx}`, '');
  abilityDesc.fontSize = 14;
  abilityDesc.fontFamily = 'monospace';
  abilityDesc.color = '#ffffffaa';
  abilityDesc.textWrapping = true;
  abilityDesc.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  abilityDesc.top = '-6px';
  abilityHeader.addControl(abilityDesc);

  // Status (READY!) text
  const statusText = new TextBlock(`statusText_${idx}`, '');
  statusText.fontSize = 40;
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

function createPlayerCursor(ui: AdvancedDynamicTexture, label: string, color: string, xOffset: number): Rectangle {
  const cursor = new Rectangle(`cursor_${label}`);
  cursor.width = '90px';
  cursor.height = '72px';
  cursor.thickness = 0;
  cursor.background = '#00000000';
  cursor.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  cursor.top = '-36%';
  cursor.left = `${CARD_CENTER_X[0] + xOffset}px`;
  cursor.isVisible = true;
  cursor.zIndex = 20;
  ui.addControl(cursor);

  const labelText = new TextBlock(`cursorLabel_${label}`, label);
  labelText.fontSize = 28;
  labelText.fontFamily = 'monospace';
  labelText.fontWeight = 'bold';
  labelText.color = color;
  labelText.outlineWidth = 4;
  labelText.outlineColor = '#000000';
  labelText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  cursor.addControl(labelText);

  const arrow = new TextBlock(`cursorArrow_${label}`, '\u25BC');
  arrow.fontSize = 48;
  arrow.fontFamily = 'monospace';
  arrow.color = color;
  arrow.outlineWidth = 4;
  arrow.outlineColor = '#000000';
  arrow.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  cursor.addControl(arrow);

  return cursor;
}

function createAbilityCard(parent: StackPanel, idx: number, key: string, label: string, style: { bg: string; border: string }, isRandom: boolean): CardUI {
  const wrapper = new Rectangle(`cardWrapper_${idx}`);
  wrapper.width = '180px';
  wrapper.height = 1;
  wrapper.thickness = 0;
  wrapper.background = '#00000000';
  wrapper.paddingLeft = '8px';
  wrapper.paddingRight = '8px';
  parent.addControl(wrapper);

  const rect = new Rectangle(`card_${idx}`);
  rect.width = 1;
  rect.height = '80%';
  rect.background = style.bg;
  rect.thickness = 3;
  rect.color = style.border;
  rect.cornerRadius = 6;
  wrapper.addControl(rect);

  // Dark footer strip for text contrast
  const footer = new Rectangle(`cardFooter_${idx}`);
  footer.width = 1;
  footer.height = '36px';
  footer.background = '#00000066';
  footer.thickness = 0;
  footer.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  rect.addControl(footer);

  // Icon area above the footer
  const iconArea = new Rectangle(`cardIconArea_${idx}`);
  iconArea.width = 1;
  iconArea.height = 1;
  iconArea.paddingBottom = '36px';
  iconArea.thickness = 0;
  iconArea.background = '#00000000';
  iconArea.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  rect.addControl(iconArea);

  const icon = new TextBlock(`cardIcon_${idx}`, CARD_ICONS[key]);
  icon.fontSize = isRandom ? 64 : 80;
  icon.fontFamily = isRandom ? 'monospace' : 'sans-serif';
  icon.fontWeight = isRandom ? 'bold' : 'normal';
  icon.color = isRandom ? '#ffffffaa' : '#ffffff';
  icon.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  icon.top = isRandom ? '0px' : '6px';
  icon.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
  if (key === 'melon') icon.left = '-6px';
  iconArea.addControl(icon);

  const nameText = new TextBlock(`cardName_${idx}`, label);
  nameText.fontSize = 16;
  nameText.fontFamily = 'monospace';
  nameText.fontWeight = 'bold';
  nameText.color = '#ffffff';
  nameText.textWrapping = true;
  nameText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
  footer.addControl(nameText);

  return { rect, nameText };
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

export function updateSelection(selUI: SelectionUI, state: GameState): boolean {
  // Input assignment overlay
  if (selUI.inputAssignUI) {
    if (updateInputAssignUI(selUI.inputAssignUI)) {
      destroyInputAssignUI(selUI.inputAssignUI);
      selUI.inputAssignUI = null;
    }
    return false;
  }

  // Open overlay on Backquote or any gamepad Select
  if (isKeyJustPressed('Backquote') || isAnyGamepadSelectJustPressed()) {
    const scene = selUI.ui.getScene()!;
    selUI.inputAssignUI = createInputAssignUI(scene);
    return false;
  }

  // P1 controls: A/D cycle, C/V confirm, Escape unconfirm
  handlePlayerSelection(selUI.panels[0], 'KeyA', 'KeyD', 'KeyC', 'KeyV', 'Escape');
  // P2 controls: K/; cycle, ArrowLeft/ArrowRight confirm, Backspace unconfirm
  handlePlayerSelection(selUI.panels[1], 'KeyK', 'Semicolon', 'ArrowLeft', 'ArrowRight', 'Backspace');

  const p1Pad = getP1GamepadIndex();
  const p2Pad = getP2GamepadIndex();
  if (p1Pad !== null) handleGamepadSelection(selUI.panels[0], p1Pad);
  if (p2Pad !== null) handleGamepadSelection(selUI.panels[1], p2Pad);

  // Position root-level cursors based on selected card index
  selUI.p1Cursor.left = `${CARD_CENTER_X[selUI.panels[0].selectedIndex] + CURSOR_P1_OFFSET}px`;
  selUI.p2Cursor.left = `${CARD_CENTER_X[selUI.panels[1].selectedIndex] + CURSOR_P2_OFFSET}px`;

  // Update card border visuals for confirmed selections
  for (let i = 0; i < CARD_COUNT; i++) {
    const card = selUI.cards[i];
    const isRandom = i >= ABILITIES.length;
    const key = isRandom ? 'random' : ABILITIES[i];
    const style = CARD_STYLES[key];

    const p1Confirmed = selUI.panels[0].confirmed && selUI.panels[0].selectedIndex === i;
    const p2Confirmed = selUI.panels[1].confirmed && selUI.panels[1].selectedIndex === i;

    if (p1Confirmed || p2Confirmed) {
      card.rect.thickness = 5;
      card.rect.color = p1Confirmed ? P1_HUD_COLOR : P2_HUD_COLOR;
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

  if (sx < -SELECTION_STICK_THRESHOLD && prevStickX[padIdx] >= -SELECTION_STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex - 1 + CARD_COUNT) % CARD_COUNT;
  }
  if (sx > SELECTION_STICK_THRESHOLD && prevStickX[padIdx] <= SELECTION_STICK_THRESHOLD) {
    panel.selectedIndex = (panel.selectedIndex + 1) % CARD_COUNT;
  }
  prevStickX[padIdx] = sx;

  if (gp.buttons[2]?.pressed) {
    confirmPanel(panel);
  }
}

export function destroySelectionUI(selUI: SelectionUI): void {
  if (selUI.inputAssignUI) {
    destroyInputAssignUI(selUI.inputAssignUI);
    selUI.inputAssignUI = null;
  }
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
