import {
  Scene,
  FreeCamera,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Mesh,
} from '@babylonjs/core';
import { AdvancedDynamicTexture, Rectangle } from '@babylonjs/gui';
import type { Vec2, HitEvent } from '../types.ts';
import {
  HITLAG_BASE, HITLAG_FORCE_SCALE, HITLAG_MAX, HITLAG_VIBRATE,
  SHAKE_DURATION, SHAKE_INTENSITY, SHAKE_DECAY,
  IMPACT_COUNT, IMPACT_SIZE, IMPACT_SPEED, IMPACT_LIFE,
  IMPACT_COLOR, IMPACT_STRONG_COLOR,
  KO_ZOOM_DURATION, KO_SLOW_MO, KO_ZOOM_AMOUNT,
  BURST_COUNT, BURST_SIZE, BURST_SPEED, BURST_LIFE,
  FLASH_DURATION, FLASH_ALPHA,
  SPEED_LINE_COUNT, SPEED_LINE_LENGTH, SPEED_LINE_WIDTH, SPEED_LINE_LIFE,
  SPEED_LINE_COLOR,
  CAMERA_POS, CAMERA_TARGET,
  P1_BODY_COLOR, P2_BODY_COLOR,
  KNOCKBACK_FORCE,
} from '../constants.ts';
import type { Color3Tuple } from '../constants.ts';

interface Particle {
  velX: number;
  velY: number;
  velZ: number;
  timer: number;
  lifetime: number;
}

interface SpeedLine {
  timer: number;
  lifetime: number;
}

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
  // Impact sparks
  sparks: Mesh[];
  sparkMats: StandardMaterial[];
  sparkData: Particle[];
  // Ring-out burst
  bursts: Mesh[];
  burstMats: StandardMaterial[];
  burstData: Particle[];
  // Screen flash
  flashUI: AdvancedDynamicTexture;
  flashRect: Rectangle;
  flashTimer: number;
  // Speed lines
  lines: Mesh[];
  lineMats: StandardMaterial[];
  lineData: SpeedLine[];
  // Camera base
  baseCamPos: Vector3;
  baseCamTarget: Vector3;
}

export function createImpactFx(scene: Scene): ImpactFxState {
  // Impact sparks pool
  const sparks: Mesh[] = [];
  const sparkMats: StandardMaterial[] = [];
  const sparkData: Particle[] = [];
  for (let i = 0; i < IMPACT_COUNT; i++) {
    const mesh = MeshBuilder.CreateSphere(`spark_${i}`, { diameter: IMPACT_SIZE, segments: 4 }, scene);
    const mat = new StandardMaterial(`sparkMat_${i}`, scene);
    mat.emissiveColor = new Color3(...IMPACT_COLOR);
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.setEnabled(false);
    sparks.push(mesh);
    sparkMats.push(mat);
    sparkData.push({ velX: 0, velY: 0, velZ: 0, timer: 0, lifetime: IMPACT_LIFE });
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
    burstData.push({ velX: 0, velY: 0, velZ: 0, timer: 0, lifetime: BURST_LIFE });
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

  // Screen flash overlay
  const flashUI = AdvancedDynamicTexture.CreateFullscreenUI('impactFlashUI', true, scene);
  const flashRect = new Rectangle('flashRect');
  flashRect.width = 1;
  flashRect.height = 1;
  flashRect.background = '#ffffff';
  flashRect.thickness = 0;
  flashRect.alpha = 0;
  flashUI.addControl(flashRect);

  return {
    hitlagTimer: 0,
    shakeTimer: 0,
    shakeIntensity: 0,
    shakeDirX: 0,
    shakeDirZ: 0,
    koTimer: 0,
    koDuration: KO_ZOOM_DURATION,
    koActive: false,
    sparks,
    sparkMats,
    sparkData,
    bursts,
    burstMats,
    burstData,
    flashUI,
    flashRect,
    flashTimer: 0,
    lines,
    lineMats,
    lineData,
    baseCamPos: new Vector3(...CAMERA_POS),
    baseCamTarget: new Vector3(...CAMERA_TARGET),
  };
}

/** Process hit events from game logic — triggers hitlag, shake, and impact sparks. */
export function processHitEvents(fx: ImpactFxState, events: HitEvent[]): void {
  for (const event of events) {
    // Hitlag: duration scales with force
    const hitlagDuration = Math.min(HITLAG_BASE + event.force * HITLAG_FORCE_SCALE, HITLAG_MAX);
    if (hitlagDuration > fx.hitlagTimer) {
      fx.hitlagTimer = hitlagDuration;
    }

    // Screen shake: intensity scales with force relative to base knockback
    const forceRatio = event.force / KNOCKBACK_FORCE;
    const intensity = SHAKE_INTENSITY * forceRatio;
    if (intensity > fx.shakeIntensity) {
      fx.shakeTimer = SHAKE_DURATION;
      fx.shakeIntensity = intensity;
      // Bias shake direction toward knockback direction (game Y → scene Z)
      fx.shakeDirX = event.dir.x;
      fx.shakeDirZ = event.dir.y;
    }

    // KO zoom
    if (event.isKO && !fx.koActive) {
      fx.koActive = true;
      fx.koTimer = fx.koDuration;
    }

    // Spawn impact sparks at contact point
    const isStrong = event.force > KNOCKBACK_FORCE * 1.5;
    const color: Color3Tuple = isStrong ? IMPACT_STRONG_COLOR : IMPACT_COLOR;
    const sparkCount = isStrong ? IMPACT_COUNT : Math.ceil(IMPACT_COUNT * 0.6);
    let spawned = 0;
    for (let i = 0; i < fx.sparkData.length && spawned < sparkCount; i++) {
      if (fx.sparkData[i].timer > 0) continue;
      // Random velocity in hemisphere around knockback direction
      const spread = Math.PI * 0.7;
      const baseAngle = Math.atan2(event.dir.y, event.dir.x);
      const angle = baseAngle + (Math.random() - 0.5) * spread;
      const speed = IMPACT_SPEED * (0.5 + Math.random() * 0.5);
      fx.sparkData[i].velX = Math.cos(angle) * speed;
      fx.sparkData[i].velZ = Math.sin(angle) * speed;
      fx.sparkData[i].velY = (Math.random() * 0.5 + 0.3) * speed;
      fx.sparkData[i].timer = IMPACT_LIFE;
      fx.sparkData[i].lifetime = IMPACT_LIFE;
      // Position at contact point (game coords → scene coords: x stays, y→z)
      fx.sparks[i].position.set(event.pos.x, 0.5, event.pos.y);
      fx.sparks[i].setEnabled(true);
      fx.sparkMats[i].emissiveColor.set(color[0], color[1], color[2]);
      fx.sparkMats[i].alpha = 1;
      spawned++;
    }
  }
}

/** Trigger ring-out burst at player position. */
export function triggerRingOut(fx: ImpactFxState, pos: Vec2, playerIdx: number): void {
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

  // Screen flash
  fx.flashTimer = FLASH_DURATION;
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
      // Zoom: lerp camera Y toward target
      const progress = 1 - fx.koTimer / fx.koDuration;
      // Ease in-out: zoom in first half, zoom out second half
      const zoomT = progress < 0.5
        ? progress * 2  // 0→1
        : 2 - progress * 2; // 1→0
      const zoomOffset = KO_ZOOM_AMOUNT * zoomT;
      camera.position.y = fx.baseCamPos.y - zoomOffset;
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

  // Restore camera X/Z when no shake (and no KO zoom, let that control Y)
  if (fx.shakeTimer <= 0) {
    camera.position.x = fx.baseCamPos.x;
    camera.position.z = fx.baseCamPos.z;
  }
  if (!fx.koActive) {
    camera.position.y = fx.baseCamPos.y;
  }

  // --- Impact sparks ---
  for (let i = 0; i < fx.sparkData.length; i++) {
    const p = fx.sparkData[i];
    if (p.timer <= 0) continue;
    p.timer -= dt;
    if (p.timer <= 0) {
      fx.sparks[i].setEnabled(false);
      continue;
    }
    // Move
    fx.sparks[i].position.x += p.velX * dt;
    fx.sparks[i].position.y += p.velY * dt;
    fx.sparks[i].position.z += p.velZ * dt;
    // Gravity
    p.velY -= 15 * dt;
    // Fade + shrink
    const t = p.timer / p.lifetime;
    fx.sparkMats[i].alpha = t;
    const scale = t * 1.5;
    fx.sparks[i].scaling.setAll(scale);
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

  // --- Screen flash ---
  if (fx.flashTimer > 0) {
    fx.flashTimer -= dt;
    const t = Math.max(0, fx.flashTimer / FLASH_DURATION);
    fx.flashRect.alpha = FLASH_ALPHA * t;
  } else {
    fx.flashRect.alpha = 0;
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
  fx.flashTimer = 0;
  fx.flashRect.alpha = 0;
  camera.position.set(fx.baseCamPos.x, fx.baseCamPos.y, fx.baseCamPos.z);
  camera.setTarget(fx.baseCamTarget.clone());
  for (let i = 0; i < fx.sparkData.length; i++) {
    fx.sparkData[i].timer = 0;
    fx.sparks[i].setEnabled(false);
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
