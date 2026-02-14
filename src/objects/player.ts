import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';
import type { PlayerState } from '../types.ts';
import type { Color3Tuple } from '../constants.ts';
import { getHandWorldPos } from '../logic/combat.ts';
import {
  PLAYER_RADIUS, HAND_RADIUS,
  P1_BODY_COLOR, P1_HAND_COLOR,
  P2_BODY_COLOR, P2_HAND_COLOR,
  HAND_WINDUP_COLOR, HAND_ACTIVE_COLOR,
  CHILD_SCALE, TAUNT_DURATION,
} from '../constants.ts';

export interface PlayerMeshes {
  body: Mesh;
  bodyMat: StandardMaterial;
  hands: [Mesh, Mesh];
  handMats: [StandardMaterial, StandardMaterial];
  eyeWhites: [Mesh, Mesh];
  eyeWhiteMats: [StandardMaterial, StandardMaterial];
  pupils: [Mesh, Mesh];
  pupilMats: [StandardMaterial, StandardMaterial];
}

export function createPlayerMeshes(scene: Scene, idx: number): PlayerMeshes {
  const tag = idx === 0 ? 'p1' : 'p2';
  const bodyColor = idx === 0 ? P1_BODY_COLOR : P2_BODY_COLOR;
  const handColor = idx === 0 ? P1_HAND_COLOR : P2_HAND_COLOR;

  // Body sphere
  const body = MeshBuilder.CreateSphere(`${tag}_body`, { diameter: PLAYER_RADIUS * 2, segments: 16 }, scene);
  const bodyMat = new StandardMaterial(`${tag}_bodyMat`, scene);
  bodyMat.emissiveColor = new Color3(...bodyColor);
  bodyMat.disableLighting = true;
  body.material = bodyMat;

  // Hand spheres
  const hands: [Mesh, Mesh] = [
    MeshBuilder.CreateSphere(`${tag}_handL`, { diameter: HAND_RADIUS * 2, segments: 12 }, scene),
    MeshBuilder.CreateSphere(`${tag}_handR`, { diameter: HAND_RADIUS * 2, segments: 12 }, scene),
  ];
  const handMats: [StandardMaterial, StandardMaterial] = [
    new StandardMaterial(`${tag}_handMatL`, scene),
    new StandardMaterial(`${tag}_handMatR`, scene),
  ];
  for (let i = 0; i < 2; i++) {
    handMats[i].emissiveColor = new Color3(...handColor);
    handMats[i].disableLighting = true;
    hands[i].material = handMats[i];
  }

  // Eye whites
  const eyeSize = PLAYER_RADIUS * 0.18;
  const eyeWhites: [Mesh, Mesh] = [
    MeshBuilder.CreateSphere(`${tag}_eyeL`, { diameter: eyeSize * 2, segments: 8 }, scene),
    MeshBuilder.CreateSphere(`${tag}_eyeR`, { diameter: eyeSize * 2, segments: 8 }, scene),
  ];
  const eyeWhiteMats: [StandardMaterial, StandardMaterial] = [
    new StandardMaterial(`${tag}_eyeMatL`, scene),
    new StandardMaterial(`${tag}_eyeMatR`, scene),
  ];
  for (let i = 0; i < 2; i++) {
    eyeWhiteMats[i].emissiveColor = new Color3(1, 1, 1);
    eyeWhiteMats[i].disableLighting = true;
    eyeWhites[i].material = eyeWhiteMats[i];
  }

  // Pupils
  const pupilSize = eyeSize * 0.6;
  const pupils: [Mesh, Mesh] = [
    MeshBuilder.CreateSphere(`${tag}_pupilL`, { diameter: pupilSize * 2, segments: 8 }, scene),
    MeshBuilder.CreateSphere(`${tag}_pupilR`, { diameter: pupilSize * 2, segments: 8 }, scene),
  ];
  const pupilMats: [StandardMaterial, StandardMaterial] = [
    new StandardMaterial(`${tag}_pupilMatL`, scene),
    new StandardMaterial(`${tag}_pupilMatR`, scene),
  ];
  for (let i = 0; i < 2; i++) {
    pupilMats[i].emissiveColor = new Color3(0, 0, 0);
    pupilMats[i].disableLighting = true;
    pupils[i].material = pupilMats[i];
  }

  return { body, bodyMat, hands, handMats, eyeWhites, eyeWhiteMats, pupils, pupilMats };
}

function handColorTuple(baseColor: Color3Tuple, state: string): Color3Tuple {
  if (state === 'windup') return HAND_WINDUP_COLOR;
  if (state === 'active') return HAND_ACTIVE_COLOR;
  return baseColor;
}

export function setPlayerMeshesVisible(meshes: PlayerMeshes, visible: boolean): void {
  meshes.body.setEnabled(visible);
  for (const h of meshes.hands) h.setEnabled(visible);
  for (const e of meshes.eyeWhites) e.setEnabled(visible);
  for (const p of meshes.pupils) p.setEnabled(visible);
}

export function updatePlayerMeshes(meshes: PlayerMeshes, player: PlayerState, idx: number): void {
  const scale = player.ability === 'child' ? CHILD_SCALE : 1;
  const bodyY = player.radius; // center of sphere sits on platform
  const visible = player.isAlive || player.isFalling;

  meshes.body.setEnabled(visible);
  for (const h of meshes.hands) h.setEnabled(visible);
  for (const e of meshes.eyeWhites) e.setEnabled(visible);
  for (const p of meshes.pupils) p.setEnabled(visible);

  if (!visible) return;

  // Fall animation: drop Y and fade alpha
  let yOffset = 0;
  if (player.isFalling) {
    yOffset = -player.fallVelY * player.fallTimer;
    meshes.bodyMat.alpha = player.fallAlpha;
    for (const m of meshes.handMats) m.alpha = player.fallAlpha;
    for (const m of meshes.eyeWhiteMats) m.alpha = player.fallAlpha;
    for (const m of meshes.pupilMats) m.alpha = player.fallAlpha;
  } else {
    meshes.bodyMat.alpha = 1;
    for (const m of meshes.handMats) m.alpha = 1;
    for (const m of meshes.eyeWhiteMats) m.alpha = 1;
    for (const m of meshes.pupilMats) m.alpha = 1;
  }

  // Vec2 {x,y} → Babylon (x, heightOffset, y) on XZ plane
  meshes.body.position.set(player.pos.x, bodyY + yOffset, player.pos.y);

  // Child scale
  meshes.body.scaling.setAll(scale);

  // Dash green tint
  const bodyColor = idx === 0 ? P1_BODY_COLOR : P2_BODY_COLOR;
  if (player.isDashing) {
    meshes.bodyMat.emissiveColor = new Color3(0.2, 0.9, 0.2);
  } else {
    meshes.bodyMat.emissiveColor = new Color3(...bodyColor);
  }

  // Taunt spin offset (applied to hands + eyes so the whole player visually spins)
  let tauntAngle = 0;
  if (player.tauntTimer > 0) {
    const t = 1 - player.tauntTimer / TAUNT_DURATION;
    const eased = t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (1 - t) * (1 - t) * (1 - t) * (1 - t);
    tauntAngle = eased * Math.PI * 2;
  }
  meshes.body.rotation.y = 0;

  // Hands — apply taunt spin to hand positions
  const baseHandColor = idx === 0 ? P1_HAND_COLOR : P2_HAND_COLOR;
  for (let i = 0; i < 2; i++) {
    const hand = player.hands[i];
    const pos = getHandWorldPos(player, hand);
    const color = handColorTuple(baseHandColor, hand.state);
    meshes.handMats[i].emissiveColor = new Color3(...color);

    // Rotate hand position around player center by tauntAngle
    let hx = pos.x;
    let hz = pos.y;
    if (tauntAngle !== 0) {
      const rx = pos.x - player.pos.x;
      const rz = pos.y - player.pos.y;
      const cosT = Math.cos(tauntAngle);
      const sinT = Math.sin(tauntAngle);
      hx = player.pos.x + rx * cosT - rz * sinT;
      hz = player.pos.y + rx * sinT + rz * cosT;
    }

    const handY = HAND_RADIUS;
    meshes.hands[i].position.set(hx, handY + yOffset, hz);

    // Scale up slightly when active, apply child scale
    const s = (hand.state === 'active' ? 1.15 : 1) * scale;
    meshes.hands[i].scaling.setAll(s);
  }

  // Eyes — positioned on the body facing the opponent
  const angle = player.facingAngle + tauntAngle;
  const fwdX = Math.cos(angle);
  const fwdZ = Math.sin(angle);
  const perpX = -Math.sin(angle);
  const perpZ = Math.cos(angle);

  const r = player.radius;
  const eyeDist = r * 0.4;
  const eyeForward = r * 0.85;
  const eyeY = bodyY + r * 0.2;

  for (let i = 0; i < 2; i++) {
    const sign = i === 0 ? 1 : -1;
    const ex = player.pos.x + fwdX * eyeForward + perpX * eyeDist * sign;
    const ez = player.pos.y + fwdZ * eyeForward + perpZ * eyeDist * sign;
    meshes.eyeWhites[i].position.set(ex, eyeY + yOffset, ez);
    meshes.eyeWhites[i].scaling.setAll(scale);

    // Pupils slightly further forward
    const pupilForward = eyeForward + r * 0.08;
    const px = player.pos.x + fwdX * pupilForward + perpX * eyeDist * sign;
    const pz = player.pos.y + fwdZ * pupilForward + perpZ * eyeDist * sign;
    meshes.pupils[i].position.set(px, eyeY + yOffset, pz);
    meshes.pupils[i].scaling.setAll(scale);
  }
}
