import { playSlapHitSfx, playRingOutSfx } from '../audio.ts';
import {
  Scene,
  FreeCamera,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
  VertexData,
  VertexBuffer,
} from '@babylonjs/core';
import type { Vec2, HitEvent } from '../types.ts';
import {
  HITLAG_BASE, HITLAG_FORCE_SCALE, HITLAG_MAX, HITLAG_VIBRATE,
  SHAKE_DURATION, SHAKE_INTENSITY, SHAKE_DECAY,
  STARBURST_COUNT, STARBURST_SPIKES, STARBURST_SPIKES_STRONG,
  STARBURST_INNER_R, STARBURST_OUTER_R,
  STARBURST_LIFE, STARBURST_MAX_SCALE, STARBURST_MAX_SCALE_STRONG,
  STARBURST_SPIN, STARBURST_TIP_COLOR,
  STARBURST_CENTER_HUES, STARBURST_VALLEY_HUES,
  KO_ZOOM_DURATION, KO_ZOOM_HOLD, KO_SLOW_MO, KO_ZOOM_AMOUNT,
  BURST_COUNT, BURST_SIZE, BURST_SPEED, BURST_LIFE,
  SPEED_LINE_COUNT, SPEED_LINE_LENGTH, SPEED_LINE_WIDTH, SPEED_LINE_LIFE,
  SPEED_LINE_COLOR,
  CAMERA_POS, CAMERA_TARGET,
  P1_BODY_COLOR, P2_BODY_COLOR,
  KNOCKBACK_FORCE,
} from '../constants.ts';
import { getSettings } from '../settings.ts';

interface Particle {
  velX: number;
  velY: number;
  velZ: number;
  rotSpeed: number;
  timer: number;
  lifetime: number;
}

interface StarburstData {
  timer: number;
  lifetime: number;
  rotSpeed: number;
  maxScale: number;
}

interface SpeedLine {
  timer: number;
  lifetime: number;
}

// Max spikes determines vertex buffer size (use the larger of normal/strong)
const MAX_SPIKES = STARBURST_SPIKES_STRONG;
const VERTS_PER_STARBURST = 1 + MAX_SPIKES * 2;

export interface ImpactFxState {
  // Hitlag
  hitlagTimer: number;
  // Screen shake
  shakeTimer: number;
  shakeIntensity: number;
  shakeDirX: number;
  shakeDirZ: number;
  // KO zoom
  koTimer: number;
  koDuration: number;
  koActive: boolean;
  koTargetX: number;
  koTargetZ: number;
  // Impact starbursts
  starbursts: Mesh[];
  starburstMats: StandardMaterial[];
  starburstData: StarburstData[];
  // Ring-out burst
  bursts: Mesh[];
  burstMats: StandardMaterial[];
  burstData: Particle[];
  // Speed lines
  lines: Mesh[];
  lineMats: StandardMaterial[];
  lineData: SpeedLine[];
  // Camera base
  baseCamPos: Vector3;
  baseCamTarget: Vector3;
}

/** Build starburst vertex data with given spike count. Unused spikes collapse to center. */
function buildStarburstGeometry(
  spikeCount: number,
  positions: Float32Array,
  colors: Float32Array,
  centerColor: readonly number[],
  valleyColor: readonly number[],
  tipColor: readonly number[],
): void {
  // Center vertex
  positions[0] = 0; positions[1] = 0; positions[2] = 0;
  colors[0] = centerColor[0]; colors[1] = centerColor[1]; colors[2] = centerColor[2]; colors[3] = 1;

  for (let i = 0; i < MAX_SPIKES; i++) {
    const tipIdx = (i * 2 + 1);
    const valIdx = (i * 2 + 2);
    const p3t = tipIdx * 3;
    const p3v = valIdx * 3;
    const c4t = tipIdx * 4;
    const c4v = valIdx * 4;

    if (i < spikeCount) {
      const tipAngle = (i / spikeCount) * Math.PI * 2;
      const valAngle = ((i + 0.5) / spikeCount) * Math.PI * 2;
      const spikeR = STARBURST_OUTER_R * (0.6 + Math.random() * 0.8);
      const valR = STARBURST_INNER_R * (0.7 + Math.random() * 0.6);

      positions[p3t] = Math.cos(tipAngle) * spikeR;
      positions[p3t + 1] = Math.sin(tipAngle) * spikeR;
      positions[p3t + 2] = 0;

      positions[p3v] = Math.cos(valAngle) * valR;
      positions[p3v + 1] = Math.sin(valAngle) * valR;
      positions[p3v + 2] = 0;

      // Tip: white
      colors[c4t] = tipColor[0]; colors[c4t + 1] = tipColor[1];
      colors[c4t + 2] = tipColor[2]; colors[c4t + 3] = 0.9;

      // Valley: warm midtone
      colors[c4v] = valleyColor[0]; colors[c4v + 1] = valleyColor[1];
      colors[c4v + 2] = valleyColor[2]; colors[c4v + 3] = 0.7;
    } else {
      // Collapse unused spikes to center
      positions[p3t] = 0; positions[p3t + 1] = 0; positions[p3t + 2] = 0;
      positions[p3v] = 0; positions[p3v + 1] = 0; positions[p3v + 2] = 0;
      colors[c4t] = 0; colors[c4t + 1] = 0; colors[c4t + 2] = 0; colors[c4t + 3] = 0;
      colors[c4v] = 0; colors[c4v + 1] = 0; colors[c4v + 2] = 0; colors[c4v + 3] = 0;
    }
  }
}

export function createImpactFx(scene: Scene): ImpactFxState {
  // Starburst pool
  const starbursts: Mesh[] = [];
  const starburstMats: StandardMaterial[] = [];
  const starburstData: StarburstData[] = [];

  for (let i = 0; i < STARBURST_COUNT; i++) {
    const mesh = new Mesh(`starburst_${i}`, scene);

    // Build initial geometry with max spikes
    const positions = new Float32Array(VERTS_PER_STARBURST * 3);
    const colors = new Float32Array(VERTS_PER_STARBURST * 4);
    const indices: number[] = [];

    // Default geometry (will be overwritten on spawn)
    buildStarburstGeometry(
      STARBURST_SPIKES, positions, colors,
      STARBURST_CENTER_HUES[0], STARBURST_VALLEY_HUES[0], STARBURST_TIP_COLOR,
    );

    // Fan triangles: each pair of adjacent rim vertices forms a triangle with center
    for (let j = 0; j < MAX_SPIKES * 2; j++) {
      const next = (j + 1) % (MAX_SPIKES * 2);
      indices.push(0, j + 1, next + 1);
    }

    const normals = new Float32Array(VERTS_PER_STARBURST * 3);

    const vd = new VertexData();
    vd.positions = positions;
    vd.indices = indices;
    vd.normals = normals;
    vd.colors = colors;
    vd.applyToMesh(mesh, true); // updatable

    const mat = new StandardMaterial(`starburstMat_${i}`, scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mat.backFaceCulling = false;
    mesh.material = mat;
    mesh.hasVertexAlpha = true;
    mesh.billboardMode = Mesh.BILLBOARDMODE_ALL;
    mesh.setEnabled(false);

    starbursts.push(mesh);
    starburstMats.push(mat);
    starburstData.push({ timer: 0, lifetime: STARBURST_LIFE, rotSpeed: 0, maxScale: STARBURST_MAX_SCALE });
  }

  // Ring-out burst pool
  const bursts: Mesh[] = [];
  const burstMats: StandardMaterial[] = [];
  const burstData: Particle[] = [];
  for (let i = 0; i < BURST_COUNT; i++) {
    const mesh = MeshBuilder.CreateSphere(`burst_${i}`, { diameter: BURST_SIZE, segments: 4 }, scene);
    const mat = new StandardMaterial(`burstMat_${i}`, scene);
    mat.emissiveColor = new Color3(1, 1, 1);
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.setEnabled(false);
    bursts.push(mesh);
    burstMats.push(mat);
    burstData.push({ velX: 0, velY: 0, velZ: 0, rotSpeed: 0, timer: 0, lifetime: BURST_LIFE });
  }

  // Speed lines pool
  const lines: Mesh[] = [];
  const lineMats: StandardMaterial[] = [];
  const lineData: SpeedLine[] = [];
  for (let i = 0; i < SPEED_LINE_COUNT; i++) {
    const mesh = MeshBuilder.CreateBox(`sline_${i}`, {
      width: SPEED_LINE_WIDTH,
      height: SPEED_LINE_WIDTH,
      depth: SPEED_LINE_LENGTH,
    }, scene);
    const mat = new StandardMaterial(`slineMat_${i}`, scene);
    mat.emissiveColor = new Color3(...SPEED_LINE_COLOR);
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.setEnabled(false);
    lines.push(mesh);
    lineMats.push(mat);
    lineData.push({ timer: 0, lifetime: SPEED_LINE_LIFE });
  }

  return {
    hitlagTimer: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    shakeDirX: 0,
    shakeDirZ: 0,
    koTimer: 0,
    koDuration: KO_ZOOM_DURATION,
    koActive: false,
    koTargetX: 0,
    koTargetZ: 0,
    starbursts,
    starburstMats,
    starburstData,
    bursts,
    burstMats,
    burstData,
    lines,
    lineMats,
    lineData,
    baseCamPos: new Vector3(...CAMERA_POS),
    baseCamTarget: new Vector3(...CAMERA_TARGET),
  };
}

/** Process hit events from game logic — triggers hitlag, shake, and starburst. */
export function processHitEvents(fx: ImpactFxState, events: HitEvent[]): void {
  const settings = getSettings();
  for (const event of events) {
    playSlapHitSfx();
    // Hitlag: duration scales with force
    if (settings.hitlagEnabled) {
      const hitlagDuration = Math.min(HITLAG_BASE + event.force * HITLAG_FORCE_SCALE, HITLAG_MAX);
      if (hitlagDuration > fx.hitlagTimer) {
        fx.hitlagTimer = hitlagDuration;
      }
    }

    // Screen shake: intensity scales with force relative to base knockback
    if (settings.screenShakeEnabled && !fx.koActive) {
      const forceRatio = event.force / KNOCKBACK_FORCE;
      const intensity = SHAKE_INTENSITY * forceRatio;
      if (intensity > fx.shakeIntensity) {
        fx.shakeTimer = SHAKE_DURATION;
        fx.shakeIntensity = intensity;
        fx.shakeDirX = event.dir.x;
        fx.shakeDirZ = event.dir.y;
      }
    }


    // Spawn starburst at contact point
    const isStrong = event.force > KNOCKBACK_FORCE * 1.5;
    for (let i = 0; i < fx.starburstData.length; i++) {
      if (fx.starburstData[i].timer > 0) continue;

      // Pick random color hue
      const hueIdx = Math.floor(Math.random() * STARBURST_CENTER_HUES.length);
      const centerColor = STARBURST_CENTER_HUES[hueIdx];
      const valleyColor = STARBURST_VALLEY_HUES[hueIdx];
      const spikeCount = isStrong ? STARBURST_SPIKES_STRONG : STARBURST_SPIKES;

      // Regenerate randomized geometry
      const positions = fx.starbursts[i].getVerticesData(VertexBuffer.PositionKind) as Float32Array;
      const colors = fx.starbursts[i].getVerticesData(VertexBuffer.ColorKind) as Float32Array;
      if (!positions || !colors) break;
      buildStarburstGeometry(spikeCount, positions, colors, centerColor, valleyColor, STARBURST_TIP_COLOR);
      fx.starbursts[i].updateVerticesData(VertexBuffer.PositionKind, positions);
      fx.starbursts[i].updateVerticesData(VertexBuffer.ColorKind, colors);

      // Position at impact point
      fx.starbursts[i].position.set(event.pos.x, 0.5, event.pos.y);
      fx.starbursts[i].rotation.z = Math.random() * Math.PI * 2;
      fx.starbursts[i].scaling.setAll(0);
      fx.starbursts[i].setEnabled(true);
      fx.starburstMats[i].alpha = 1;

      fx.starburstData[i].timer = STARBURST_LIFE;
      fx.starburstData[i].lifetime = STARBURST_LIFE;
      fx.starburstData[i].rotSpeed = STARBURST_SPIN * (Math.random() < 0.5 ? 1 : -1);
      fx.starburstData[i].maxScale = isStrong ? STARBURST_MAX_SCALE_STRONG : STARBURST_MAX_SCALE;
      break; // One starburst per event
    }
  }
}

/** Trigger ring-out burst at player position. */
export function triggerRingOut(fx: ImpactFxState, pos: Vec2, playerIdx: number): void {
  playRingOutSfx();
  const settings = getSettings();
  if (settings.screenShakeEnabled && !fx.koActive) {
    fx.koActive = true;
    fx.koTimer = fx.koDuration;
    fx.koTargetX = pos.x;
    fx.koTargetZ = pos.y;
  }
  const color = playerIdx === 0 ? P1_BODY_COLOR : P2_BODY_COLOR;

  // Activate burst particles
  for (let i = 0; i < fx.burstData.length; i++) {
    if (fx.burstData[i].timer > 0) continue;
    const angle = (i / BURST_COUNT) * Math.PI * 2 + Math.random() * 0.3;
    const speed = BURST_SPEED * (0.4 + Math.random() * 0.6);
    fx.burstData[i].velX = Math.cos(angle) * speed;
    fx.burstData[i].velZ = Math.sin(angle) * speed;
    fx.burstData[i].velY = (Math.random() * 0.5 + 0.2) * speed;
    fx.burstData[i].timer = BURST_LIFE;
    fx.burstData[i].lifetime = BURST_LIFE;
    fx.bursts[i].position.set(pos.x, 0.5, pos.y);
    fx.bursts[i].setEnabled(true);
    fx.burstMats[i].emissiveColor.set(color[0], color[1], color[2]);
    fx.burstMats[i].alpha = 1;
  }
}

/** Spawn speed lines behind a fast-moving player. */
export function spawnSpeedLines(fx: ImpactFxState, pos: Vec2, vel: Vec2): void {
  const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
  if (speed === 0) return;

  // Direction opposite to velocity
  const invDirX = -vel.x / speed;
  const invDirZ = -vel.y / speed;
  const angle = Math.atan2(invDirZ, invDirX);

  for (let i = 0; i < fx.lineData.length; i++) {
    if (fx.lineData[i].timer > 0) continue;
    fx.lineData[i].timer = SPEED_LINE_LIFE;
    fx.lineData[i].lifetime = SPEED_LINE_LIFE;
    // Offset randomly perpendicular to velocity
    const perpX = -invDirZ;
    const perpZ = invDirX;
    const offset = (Math.random() - 0.5) * 1.2;
    const trailDist = Math.random() * 0.5 + 0.3;
    fx.lines[i].position.set(
      pos.x + invDirX * trailDist + perpX * offset,
      0.3 + Math.random() * 0.4,
      pos.y + invDirZ * trailDist + perpZ * offset,
    );
    fx.lines[i].rotation.y = -angle + Math.PI / 2;
    fx.lines[i].setEnabled(true);
    fx.lineMats[i].alpha = 0.8;
    break; // One line per frame
  }
}

/** Update all impact effects. Returns freeze (hitlag active) and dtScale (slow-mo). */
export function updateImpactFx(
  fx: ImpactFxState,
  camera: FreeCamera,
  dt: number,
): { freeze: boolean; dtScale: number } {
  let freeze = false;
  let dtScale = 1;

  // --- Hitlag ---
  if (fx.hitlagTimer > 0) {
    fx.hitlagTimer -= dt;
    freeze = true;
    if (fx.hitlagTimer <= 0) {
      fx.hitlagTimer = 0;
    }
  }

  // --- KO zoom ---
  if (fx.koActive) {
    fx.koTimer -= dt;
    if (fx.koTimer <= 0) {
      fx.koActive = false;
      fx.koTimer = 0;
    } else {
      dtScale = KO_SLOW_MO;
      const elapsed = fx.koDuration - fx.koTimer;
      const zoomIn = 0.4;
      const zoomOut = fx.koDuration - KO_ZOOM_HOLD - zoomIn;
      let zoomT: number;
      if (elapsed < zoomIn) {
        // Fast zoom in (cubic ease-out)
        const t = elapsed / zoomIn;
        zoomT = 1 - (1 - t) * (1 - t) * (1 - t);
      } else if (elapsed < zoomIn + KO_ZOOM_HOLD) {
        // Hold at peak
        zoomT = 1;
      } else {
        // Fast zoom out (cubic ease-in)
        const t = (elapsed - zoomIn - KO_ZOOM_HOLD) / zoomOut;
        zoomT = 1 - t * t * t;
      }
      // Zoom in (lower camera Y) and rotate to face impact point
      camera.position.y = fx.baseCamPos.y - KO_ZOOM_AMOUNT * zoomT;
      camera.setTarget(new Vector3(
        fx.baseCamTarget.x + (fx.koTargetX - fx.baseCamTarget.x) * zoomT,
        fx.baseCamTarget.y,
        fx.baseCamTarget.z + (fx.koTargetZ - fx.baseCamTarget.z) * zoomT,
      ));
    }
  }

  // --- Screen shake ---
  if (fx.shakeTimer > 0) {
    fx.shakeTimer -= dt;
    fx.shakeIntensity *= Math.pow(SHAKE_DECAY, dt * 60);

    // Random offset biased by knockback direction
    const rx = (Math.random() - 0.5) * 2 + fx.shakeDirX * 0.5;
    const rz = (Math.random() - 0.5) * 2 + fx.shakeDirZ * 0.5;
    const mag = fx.shakeIntensity;
    camera.position.x = fx.baseCamPos.x + rx * mag;
    camera.position.z = fx.baseCamPos.z + rz * mag;

    if (fx.shakeTimer <= 0) {
      fx.shakeTimer = 0;
      fx.shakeIntensity = 0;
    }
  }

  // Restore camera X/Z when no shake
  if (fx.shakeTimer <= 0) {
    camera.position.x = fx.baseCamPos.x;
    camera.position.z = fx.baseCamPos.z;
  }
  // Restore camera Y and target when no KO zoom
  if (!fx.koActive) {
    camera.position.y = fx.baseCamPos.y;
    camera.setTarget(fx.baseCamTarget.clone());
  }

  // --- Starbursts ---
  for (let i = 0; i < fx.starburstData.length; i++) {
    const d = fx.starburstData[i];
    if (d.timer <= 0) continue;
    d.timer -= dt;
    if (d.timer <= 0) {
      fx.starbursts[i].setEnabled(false);
      continue;
    }
    const t = d.timer / d.lifetime; // 1→0
    const progress = 1 - t; // 0→1
    // Ease-out expansion: fast start, slow end
    const eased = 1 - (1 - progress) * (1 - progress);
    fx.starbursts[i].scaling.setAll(eased * d.maxScale);
    fx.starburstMats[i].alpha = t;
    fx.starbursts[i].rotation.z += d.rotSpeed * dt;
  }

  // --- Ring-out burst ---
  for (let i = 0; i < fx.burstData.length; i++) {
    const p = fx.burstData[i];
    if (p.timer <= 0) continue;
    p.timer -= dt;
    if (p.timer <= 0) {
      fx.bursts[i].setEnabled(false);
      continue;
    }
    fx.bursts[i].position.x += p.velX * dt;
    fx.bursts[i].position.y += p.velY * dt;
    fx.bursts[i].position.z += p.velZ * dt;
    p.velY -= 12 * dt;
    const t = p.timer / p.lifetime;
    fx.burstMats[i].alpha = t;
    fx.bursts[i].scaling.setAll(t * 2);
  }

  // --- Speed lines ---
  for (let i = 0; i < fx.lineData.length; i++) {
    const l = fx.lineData[i];
    if (l.timer <= 0) continue;
    l.timer -= dt;
    if (l.timer <= 0) {
      fx.lines[i].setEnabled(false);
      continue;
    }
    const t = l.timer / l.lifetime;
    fx.lineMats[i].alpha = t * 0.8;
    // Stretch along length as they fade
    fx.lines[i].scaling.set(1, 1, 1 + (1 - t) * 2);
  }

  return { freeze, dtScale };
}

/** Apply hitlag vibration to player meshes. */
export function applyHitlagVibration(
  meshes: readonly { body: Mesh }[],
  _timer: number,
): void {
  for (const m of meshes) {
    const offsetX = (Math.random() - 0.5) * HITLAG_VIBRATE * 2;
    const offsetZ = (Math.random() - 0.5) * HITLAG_VIBRATE * 2;
    m.body.position.x += offsetX;
    m.body.position.z += offsetZ;
  }
}

/** Reset all impact effects (call on phase transitions). */
export function resetImpactFx(fx: ImpactFxState, camera: FreeCamera): void {
  fx.hitlagTimer = 0;
  fx.shakeTimer = 0;
  fx.shakeIntensity = 0;
  fx.koActive = false;
  fx.koTimer = 0;
  camera.position.set(fx.baseCamPos.x, fx.baseCamPos.y, fx.baseCamPos.z);
  camera.setTarget(fx.baseCamTarget.clone());
  for (let i = 0; i < fx.starburstData.length; i++) {
    fx.starburstData[i].timer = 0;
    fx.starbursts[i].setEnabled(false);
  }
  for (let i = 0; i < fx.burstData.length; i++) {
    fx.burstData[i].timer = 0;
    fx.bursts[i].setEnabled(false);
  }
  for (let i = 0; i < fx.lineData.length; i++) {
    fx.lineData[i].timer = 0;
    fx.lines[i].setEnabled(false);
  }
}
