import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
  DynamicTexture,
} from '@babylonjs/core';
import type { PlayerState, AbilityType } from '../types.ts';
import type { Color3Tuple } from '../constants.ts';
import { getHandWorldPos } from '../logic/combat.ts';
import {
  PLAYER_RADIUS, HAND_RADIUS,
  P1_BODY_COLOR, P1_HAND_COLOR,
  P2_BODY_COLOR, P2_HAND_COLOR,
  HAND_WINDUP_COLOR, HAND_ACTIVE_COLOR,
  CHILD_SCALE, TAUNT_DURATION,
  HEADBAND_SEGMENTS, HEADBAND_SEG_LENGTH, HEADBAND_DAMPING,
  MELON_BODY_Y_SCALE,
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
  // Headband (burrito)
  headbandBand: Mesh;
  headbandKnot: Mesh;
  headbandTailsL: Mesh[];
  headbandTailsR: Mesh[];
  headbandPositions: [number[], number[]]; // [tailL, tailR] each 5 * 3 (x,y,z)
  headbandPrevPositions: [number[], number[]];
  // Melon body
  melonBodyMesh: Mesh;
  melonBodyMat: StandardMaterial;
  // Question disc (random)
  questionDisc: Mesh;
  questionDiscMat: StandardMaterial;
  // Visual toggle tracking
  activeVisual: AbilityType | 'random' | 'none';
}

function createMelonTexture(scene: Scene, tag: string): DynamicTexture {
  const tex = new DynamicTexture(`${tag}_melonTex`, 256, scene, true);
  const ctx = tex.getContext();
  // Base green
  ctx.fillStyle = '#2d8a2d';
  ctx.fillRect(0, 0, 256, 256);
  // Darker stripes
  ctx.strokeStyle = '#1a5a1a';
  ctx.lineWidth = 12;
  for (let i = 0; i < 6; i++) {
    const baseX = (i + 0.5) * (256 / 6);
    ctx.beginPath();
    for (let y = 0; y <= 256; y += 4) {
      const x = baseX + Math.sin(y * 0.04 + i * 1.2) * 10;
      if (y === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  tex.update();
  return tex;
}

function createQuestionTexture(scene: Scene, tag: string): DynamicTexture {
  const tex = new DynamicTexture(`${tag}_questionTex`, 256, scene, true);
  const ctx = tex.getContext() as unknown as CanvasRenderingContext2D;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);
  ctx.save();
  ctx.translate(128, 128);
  ctx.scale(1, -1);
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 200px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 12);
  ctx.restore();
  tex.update();
  return tex;
}

/** Shared melon material — created once, reused for projectiles */
let sharedMelonMat: StandardMaterial | null = null;

export function getSharedMelonMaterial(scene: Scene): StandardMaterial {
  if (sharedMelonMat) return sharedMelonMat;
  const mat = new StandardMaterial('sharedMelonMat', scene);
  mat.disableLighting = false;
  const tex = createMelonTexture(scene, 'shared');
  mat.diffuseTexture = tex;
  mat.diffuseColor = Color3.White();
  mat.emissiveColor = new Color3(0.2, 0.55, 0.2);
  sharedMelonMat = mat;
  return mat;
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

  // --- Headband (burrito) ---
  const headbandBand = MeshBuilder.CreateTorus(`${tag}_hbBand`, {
    diameter: PLAYER_RADIUS * 1.6,
    thickness: 0.06,
    tessellation: 24,
  }, scene);
  const hbBandMat = new StandardMaterial(`${tag}_hbBandMat`, scene);
  hbBandMat.emissiveColor = new Color3(1, 1, 1);
  hbBandMat.disableLighting = true;
  headbandBand.material = hbBandMat;
  headbandBand.setEnabled(false);

  const headbandKnot = MeshBuilder.CreateSphere(`${tag}_hbKnot`, { diameter: 0.1, segments: 8 }, scene);
  const hbKnotMat = new StandardMaterial(`${tag}_hbKnotMat`, scene);
  hbKnotMat.emissiveColor = new Color3(1, 1, 1);
  hbKnotMat.disableLighting = true;
  headbandKnot.material = hbKnotMat;
  headbandKnot.setEnabled(false);

  const headbandTailsL: Mesh[] = [];
  const headbandTailsR: Mesh[] = [];
  for (let t = 0; t < 2; t++) {
    const tails = t === 0 ? headbandTailsL : headbandTailsR;
    for (let s = 0; s < HEADBAND_SEGMENTS; s++) {
      const seg = MeshBuilder.CreateBox(`${tag}_hbTail${t}_${s}`, {
        width: 0.04,
        height: 0.02,
        depth: HEADBAND_SEG_LENGTH,
      }, scene);
      const segMat = new StandardMaterial(`${tag}_hbTailMat${t}_${s}`, scene);
      segMat.emissiveColor = new Color3(1, 1, 1);
      segMat.disableLighting = true;
      seg.material = segMat;
      seg.setEnabled(false);
      tails.push(seg);
    }
  }

  // Verlet positions for both tails (5 points each, xyz)
  const initPositions = (): number[] => new Array(HEADBAND_SEGMENTS * 3).fill(0);
  const headbandPositions: [number[], number[]] = [initPositions(), initPositions()];
  const headbandPrevPositions: [number[], number[]] = [initPositions(), initPositions()];

  // --- Melon body ---
  const melonBodyMesh = MeshBuilder.CreateSphere(`${tag}_melonBody`, {
    diameter: PLAYER_RADIUS * 2,
    segments: 16,
  }, scene);
  const melonBodyMat = new StandardMaterial(`${tag}_melonBodyMat`, scene);
  melonBodyMat.disableLighting = false;
  const melonTex = createMelonTexture(scene, tag);
  melonBodyMat.diffuseTexture = melonTex;
  melonBodyMat.diffuseColor = Color3.White();
  melonBodyMat.emissiveColor = new Color3(0.2, 0.55, 0.2);
  melonBodyMesh.material = melonBodyMat;
  melonBodyMesh.setEnabled(false);

  // --- Question disc (random) ---
  const questionDisc = MeshBuilder.CreateDisc(`${tag}_questionDisc`, {
    radius: PLAYER_RADIUS * 0.9,
    tessellation: 24,
    sideOrientation: Mesh.DOUBLESIDE,
  }, scene);
  const questionDiscMat = new StandardMaterial(`${tag}_questionDiscMat`, scene);
  questionDiscMat.disableLighting = false;
  questionDiscMat.backFaceCulling = false;
  const qTex = createQuestionTexture(scene, tag);
  questionDiscMat.diffuseTexture = qTex;
  questionDiscMat.diffuseColor = Color3.White();
  questionDiscMat.emissiveColor = new Color3(0.5, 0.5, 0.5);
  questionDisc.material = questionDiscMat;
  questionDisc.setEnabled(false);

  return {
    body, bodyMat, hands, handMats, eyeWhites, eyeWhiteMats, pupils, pupilMats,
    headbandBand, headbandKnot, headbandTailsL, headbandTailsR,
    headbandPositions, headbandPrevPositions,
    melonBodyMesh, melonBodyMat,
    questionDisc, questionDiscMat,
    activeVisual: 'none',
  };
}

function handColorTuple(baseColor: Color3Tuple, state: string): Color3Tuple {
  if (state === 'windup') return HAND_WINDUP_COLOR;
  if (state === 'active') return HAND_ACTIVE_COLOR;
  return baseColor;
}

/** Toggle headband/melon/question/normal visuals. Avoids redundant toggling. */
export function applyAbilityVisual(
  meshes: PlayerMeshes,
  ability: AbilityType | 'random' | 'none',
  _idx: number,
  _scale: number,
): void {
  if (meshes.activeVisual === ability) return;
  meshes.activeVisual = ability;

  // Hide all special meshes first
  meshes.headbandBand.setEnabled(false);
  meshes.headbandKnot.setEnabled(false);
  for (const s of meshes.headbandTailsL) s.setEnabled(false);
  for (const s of meshes.headbandTailsR) s.setEnabled(false);
  meshes.melonBodyMesh.setEnabled(false);
  meshes.questionDisc.setEnabled(false);
  meshes.body.setEnabled(true);

  // Show eyes/pupils/hands by default (hidden for random)
  for (const e of meshes.eyeWhites) e.setEnabled(true);
  for (const p of meshes.pupils) p.setEnabled(true);
  for (const h of meshes.hands) h.setEnabled(true);

  if (ability === 'burrito') {
    meshes.headbandBand.setEnabled(true);
    meshes.headbandKnot.setEnabled(true);
    for (const s of meshes.headbandTailsL) s.setEnabled(true);
    for (const s of meshes.headbandTailsR) s.setEnabled(true);
  } else if (ability === 'melon') {
    meshes.body.setEnabled(false);
    meshes.melonBodyMesh.setEnabled(true);
  } else if (ability === 'random') {
    meshes.body.setEnabled(false);
    meshes.questionDisc.setEnabled(true);
    // Hide eyes/pupils/hands — only show the question disc
    for (const e of meshes.eyeWhites) e.setEnabled(false);
    for (const p of meshes.pupils) p.setEnabled(false);
    for (const h of meshes.hands) h.setEnabled(false);
  }
}

export function setPlayerMeshesVisible(meshes: PlayerMeshes, visible: boolean): void {
  meshes.body.setEnabled(visible);
  for (const h of meshes.hands) h.setEnabled(visible);
  for (const e of meshes.eyeWhites) e.setEnabled(visible);
  for (const p of meshes.pupils) p.setEnabled(visible);
  meshes.headbandBand.setEnabled(false);
  meshes.headbandKnot.setEnabled(false);
  for (const s of meshes.headbandTailsL) s.setEnabled(false);
  for (const s of meshes.headbandTailsR) s.setEnabled(false);
  meshes.melonBodyMesh.setEnabled(false);
  meshes.questionDisc.setEnabled(false);
  if (visible) {
    meshes.activeVisual = 'none';
  }
}

function updateHeadbandPhysics(
  meshes: PlayerMeshes,
  anchorX: number, anchorY: number, anchorZ: number,
  facingAngle: number, dt: number,
): void {
  // Back of head direction (opposite facing)
  const backX = -Math.cos(facingAngle);
  const backZ = -Math.sin(facingAngle);

  // Position headband band and knot — torus default is horizontal (XZ plane), no rotation needed
  const bandY = anchorY + PLAYER_RADIUS * 0.65;
  meshes.headbandBand.position.set(anchorX, bandY, anchorZ);
  meshes.headbandBand.rotation.x = 0;
  meshes.headbandBand.rotation.y = 0;

  const knotDist = PLAYER_RADIUS * 0.8;
  const knotX = anchorX + backX * knotDist;
  const knotZ = anchorZ + backZ * knotDist;
  meshes.headbandKnot.position.set(knotX, bandY, knotZ);

  // Splay angle for two tails
  const splayAngles = [-0.3, 0.3];

  for (let t = 0; t < 2; t++) {
    const positions = meshes.headbandPositions[t];
    const prevPositions = meshes.headbandPrevPositions[t];
    const tails = t === 0 ? meshes.headbandTailsL : meshes.headbandTailsR;

    const splay = splayAngles[t];
    const tailDirX = backX * Math.cos(splay) - backZ * Math.sin(splay);
    const tailDirZ = backX * Math.sin(splay) + backZ * Math.cos(splay);

    // First point is anchored at knot
    const ax = knotX + tailDirX * HEADBAND_SEG_LENGTH * 0.5;
    const ay = bandY;
    const az = knotZ + tailDirZ * HEADBAND_SEG_LENGTH * 0.5;

    // Initialize positions if they're all zero (first frame)
    if (positions[0] === 0 && positions[1] === 0 && positions[2] === 0) {
      for (let s = 0; s < HEADBAND_SEGMENTS; s++) {
        const si = s * 3;
        positions[si] = ax + tailDirX * HEADBAND_SEG_LENGTH * s;
        positions[si + 1] = ay;
        positions[si + 2] = az + tailDirZ * HEADBAND_SEG_LENGTH * s;
        prevPositions[si] = positions[si];
        prevPositions[si + 1] = positions[si + 1];
        prevPositions[si + 2] = positions[si + 2];
      }
    }

    // Verlet integration
    for (let s = 0; s < HEADBAND_SEGMENTS; s++) {
      const si = s * 3;
      const cx = positions[si];
      const cy = positions[si + 1];
      const cz = positions[si + 2];

      const vx = (cx - prevPositions[si]) * HEADBAND_DAMPING;
      const vy = (cy - prevPositions[si + 1]) * HEADBAND_DAMPING - 0.5 * dt; // gravity
      const vz = (cz - prevPositions[si + 2]) * HEADBAND_DAMPING;

      prevPositions[si] = cx;
      prevPositions[si + 1] = cy;
      prevPositions[si + 2] = cz;

      positions[si] = cx + vx;
      positions[si + 1] = cy + vy;
      positions[si + 2] = cz + vz;
    }

    // Distance constraints (3 iterations)
    for (let iter = 0; iter < 3; iter++) {
      // First segment anchored to knot
      {
        const si = 0;
        const dx = positions[si] - ax;
        const dy = positions[si + 1] - ay;
        const dz = positions[si + 2] - az;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        const diff = (dist - HEADBAND_SEG_LENGTH) / dist;
        positions[si] -= dx * diff;
        positions[si + 1] -= dy * diff;
        positions[si + 2] -= dz * diff;
      }

      // Chain constraints
      for (let s = 1; s < HEADBAND_SEGMENTS; s++) {
        const si = s * 3;
        const pi = (s - 1) * 3;
        const dx = positions[si] - positions[pi];
        const dy = positions[si + 1] - positions[pi + 1];
        const dz = positions[si + 2] - positions[pi + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.001;
        const diff = (dist - HEADBAND_SEG_LENGTH) / dist * 0.5;
        positions[si] -= dx * diff;
        positions[si + 1] -= dy * diff;
        positions[si + 2] -= dz * diff;
        positions[pi] += dx * diff;
        positions[pi + 1] += dy * diff;
        positions[pi + 2] += dz * diff;
      }
    }

    // Position segment meshes between consecutive points
    for (let s = 0; s < HEADBAND_SEGMENTS; s++) {
      const si = s * 3;
      let startX: number, startY: number, startZ: number;
      if (s === 0) {
        startX = ax; startY = ay; startZ = az;
      } else {
        const pi = (s - 1) * 3;
        startX = positions[pi]; startY = positions[pi + 1]; startZ = positions[pi + 2];
      }
      const endX = positions[si];
      const endY = positions[si + 1];
      const endZ = positions[si + 2];

      const mx = (startX + endX) / 2;
      const my = (startY + endY) / 2;
      const mz = (startZ + endZ) / 2;
      tails[s].position.set(mx, my, mz);

      // Orient segment along the direction
      const segDx = endX - startX;
      const segDy = endY - startY;
      const segDz = endZ - startZ;
      tails[s].rotation.y = Math.atan2(segDx, segDz);
      const horizDist = Math.sqrt(segDx * segDx + segDz * segDz);
      tails[s].rotation.x = -Math.atan2(segDy, horizDist);
    }
  }
}

export function updatePlayerMeshes(meshes: PlayerMeshes, player: PlayerState, idx: number, dt: number): void {
  const scale = player.ability === 'child' ? CHILD_SCALE : 1;
  const bodyY = player.radius; // center of sphere sits on platform
  const visible = player.isAlive || player.isFalling;

  meshes.body.setEnabled(visible);
  for (const h of meshes.hands) h.setEnabled(visible);
  for (const e of meshes.eyeWhites) e.setEnabled(visible);
  for (const p of meshes.pupils) p.setEnabled(visible);

  if (!visible) {
    // Hide all special meshes too
    meshes.headbandBand.setEnabled(false);
    meshes.headbandKnot.setEnabled(false);
    for (const s of meshes.headbandTailsL) s.setEnabled(false);
    for (const s of meshes.headbandTailsR) s.setEnabled(false);
    meshes.melonBodyMesh.setEnabled(false);
    meshes.questionDisc.setEnabled(false);
    return;
  }

  // Apply ability visual
  applyAbilityVisual(meshes, player.ability, idx, scale);

  // Fall animation: drop Y and fade alpha
  let yOffset = 0;
  if (player.isFalling) {
    yOffset = -player.fallVelY * player.fallTimer;
    meshes.bodyMat.alpha = player.fallAlpha;
    meshes.melonBodyMat.alpha = player.fallAlpha;
    for (const m of meshes.handMats) m.alpha = player.fallAlpha;
    for (const m of meshes.eyeWhiteMats) m.alpha = player.fallAlpha;
    for (const m of meshes.pupilMats) m.alpha = player.fallAlpha;
  } else {
    meshes.bodyMat.alpha = 1;
    meshes.melonBodyMat.alpha = 1;
    for (const m of meshes.handMats) m.alpha = 1;
    for (const m of meshes.eyeWhiteMats) m.alpha = 1;
    for (const m of meshes.pupilMats) m.alpha = 1;
  }

  // Vec2 {x,y} → Babylon (x, heightOffset, y) on XZ plane
  meshes.body.position.set(player.pos.x, bodyY + yOffset, player.pos.y);

  // Child scale
  meshes.body.scaling.setAll(scale);

  // Melon body: oblong + same position
  if (player.ability === 'melon') {
    meshes.melonBodyMesh.position.set(player.pos.x, bodyY + yOffset, player.pos.y);
    meshes.melonBodyMesh.scaling.set(scale, scale * MELON_BODY_Y_SCALE, scale);
  }

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

  // Headband physics
  if (player.ability === 'burrito') {
    updateHeadbandPhysics(
      meshes,
      player.pos.x, bodyY + yOffset, player.pos.y,
      player.facingAngle + tauntAngle, dt,
    );
  }
}
