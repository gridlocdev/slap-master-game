import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';
import type { GameState } from '../types.ts';
import {
  STINK_CLOUD_RADIUS, STINK_CLOUD_DURATION,
  MELON_RADIUS,
  JUICE_MARK_DURATION,
  MELON_BODY_Y_SCALE,
  MAX_CLOUDS, MAX_MELONS, MAX_JUICE_MARKS,
  CLOUD_ALPHA,
  BLOBS_PER_CLOUD,
  CLOUD_CENTER_COLOR, CLOUD_PERI_COLOR_A, CLOUD_PERI_COLOR_B,
  CLOUD_DRIFT_MAX, CLOUD_RISE_MAX,
  MELON_CHUNK_COUNT, CHUNKS_PER_EXPLOSION,
  CHUNK_SPEED_MIN, CHUNK_SPEED_MAX,
  CHUNK_VY_MIN, CHUNK_VY_MAX,
  CHUNK_GRAVITY, CHUNK_LIFE_MIN, CHUNK_LIFE_MAX, CHUNK_FADE_TIME,
  CHUNK_RIND_COLOR, CHUNK_FLESH_COLOR, CHUNK_INNER_COLOR,
  SPLATTER_SATELLITES, SPLATTER_DROPLETS,
  JUICE_MARK_CENTER_COLOR, JUICE_MARK_SAT_COLOR, JUICE_MARK_DROP_COLOR,
  JUICE_MARK_ALPHA,
} from '../constants.ts';
import { getSharedMelonMaterial } from './player.ts';

// ─── Stink cloud blob config (fixed random layout per slot) ───────────────────

interface BlobConfig {
  /** Offset from cloud center in XZ (game X→world X, game Y→world Z) */
  ox: number;
  oz: number;
  /** Vertical offset */
  oy: number;
  /** Drift direction (outward from center) */
  dx: number;
  dz: number;
  /** Size relative to STINK_CLOUD_RADIUS */
  sizeFactor: number;
  /** 0=center, 1=periA, 2=periB */
  colorIdx: number;
}

// ─── Chunk animation state (purely visual, lives in pool) ────────────────────

interface ChunkAnim {
  active: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  rx: number; ry: number; rz: number;
  avx: number; avz: number;
  timer: number;
  maxTimer: number;
}

// ─── Splatter piece config (fixed random layout per juice mark slot) ──────────

interface SplatPiece {
  /** 'center' | 'satellite' | 'droplet' */
  kind: 'center' | 'satellite' | 'droplet';
  ox: number; oz: number;  // offset from mark center
  radius: number;
  rotation: number;        // around Y axis
  scaleX: number; scaleZ: number;
}

// ─── Pool ─────────────────────────────────────────────────────────────────────

export interface EffectsPool {
  // Cloud blobs: [cloudSlot][blobIndex]
  cloudBlobs: Mesh[][];
  cloudBlobMats: StandardMaterial[][];
  cloudBlobConfigs: BlobConfig[][];

  // Melons (unchanged shape)
  melons: Mesh[];

  // Juice mark splatter: [markSlot] → all pieces for that slot
  splatMeshes: Mesh[][];
  splatMats: StandardMaterial[][];
  splatConfigs: SplatPiece[][];

  // Flying chunks (pooled, managed internally)
  chunkMeshes: Mesh[];
  chunkMats: StandardMaterial[];
  chunkAnims: ChunkAnim[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randAngle(): number {
  return Math.random() * Math.PI * 2;
}

// ─── Pool creation ───────────────────────────────────────────────────────────

export function createEffectsPool(scene: Scene): EffectsPool {
  // ── Cloud blobs ──────────────────────────────────────────────────────────
  const cloudBlobs: Mesh[][] = [];
  const cloudBlobMats: StandardMaterial[][] = [];
  const cloudBlobConfigs: BlobConfig[][] = [];

  const cloudColors = [CLOUD_CENTER_COLOR, CLOUD_PERI_COLOR_A, CLOUD_PERI_COLOR_B];

  for (let ci = 0; ci < MAX_CLOUDS; ci++) {
    const blobs: Mesh[] = [];
    const mats: StandardMaterial[] = [];
    const configs: BlobConfig[] = [];

    for (let bi = 0; bi < BLOBS_PER_CLOUD; bi++) {
      const isCenter = bi === 0;

      // Random layout for this blob within its slot (fixed at pool init)
      let config: BlobConfig;
      if (isCenter) {
        config = { ox: 0, oz: 0, oy: 0, dx: 0, dz: 0, sizeFactor: 1.0, colorIdx: 0 };
      } else {
        const angle = randAngle();
        const dist = rand(0.5, 0.9);
        const dx = Math.cos(angle);
        const dz = Math.sin(angle);
        config = {
          ox: dx * dist,
          oz: dz * dist,
          oy: rand(-0.1, 0.3),
          dx, dz,
          sizeFactor: rand(0.55, 0.90),
          colorIdx: Math.random() < 0.5 ? 1 : 2,
        };
      }
      configs.push(config);

      const diameter = STINK_CLOUD_RADIUS * 2 * config.sizeFactor;
      const mesh = MeshBuilder.CreateSphere(`cloud_${ci}_${bi}`, { diameter, segments: 8 }, scene);
      const mat = new StandardMaterial(`cloudMat_${ci}_${bi}`, scene);
      const col = cloudColors[config.colorIdx];
      mat.emissiveColor = new Color3(col[0], col[1], col[2]);
      mat.disableLighting = true;
      mat.alpha = CLOUD_ALPHA;
      mesh.material = mat;
      mesh.setEnabled(false);

      blobs.push(mesh);
      mats.push(mat);
    }

    cloudBlobs.push(blobs);
    cloudBlobMats.push(mats);
    cloudBlobConfigs.push(configs);
  }

  // ── Melons ───────────────────────────────────────────────────────────────
  const melons: Mesh[] = [];
  const sharedMelonMat = getSharedMelonMaterial(scene);
  for (let i = 0; i < MAX_MELONS; i++) {
    const mesh = MeshBuilder.CreateSphere(`melon_${i}`, { diameter: MELON_RADIUS * 2, segments: 10 }, scene);
    mesh.material = sharedMelonMat;
    mesh.setEnabled(false);
    melons.push(mesh);
  }

  // ── Ground splatter ──────────────────────────────────────────────────────
  const splatMeshes: Mesh[][] = [];
  const splatMats: StandardMaterial[][] = [];
  const splatConfigs: SplatPiece[][] = [];

  for (let mi = 0; mi < MAX_JUICE_MARKS; mi++) {
    const pieces: SplatPiece[] = [];
    const meshes: Mesh[] = [];
    const mats: StandardMaterial[] = [];

    // 1 central disc
    {
      const sx = rand(0.8, 1.1);
      const sz = rand(0.6, 0.9);
      pieces.push({ kind: 'center', ox: 0, oz: 0, radius: 0.8, rotation: randAngle(), scaleX: sx, scaleZ: sz });
    }

    // Satellite discs
    for (let s = 0; s < SPLATTER_SATELLITES; s++) {
      const angle = randAngle();
      const dist = rand(0.4, 1.2);
      const r = rand(0.15, 0.35);
      pieces.push({
        kind: 'satellite',
        ox: Math.cos(angle) * dist,
        oz: Math.sin(angle) * dist,
        radius: r,
        rotation: randAngle(),
        scaleX: rand(0.7, 1.3),
        scaleZ: rand(0.6, 1.1),
      });
    }

    // Droplet discs
    for (let d = 0; d < SPLATTER_DROPLETS; d++) {
      const angle = randAngle();
      const dist = rand(1.0, 2.2);
      pieces.push({
        kind: 'droplet',
        ox: Math.cos(angle) * dist,
        oz: Math.sin(angle) * dist,
        radius: rand(0.04, 0.09),
        rotation: randAngle(),
        scaleX: 1, scaleZ: 1,
      });
    }

    for (let pi = 0; pi < pieces.length; pi++) {
      const p = pieces[pi];
      const mesh = MeshBuilder.CreateDisc(`splat_${mi}_${pi}`, { radius: p.radius, tessellation: 12 }, scene);
      mesh.rotation.x = Math.PI / 2;
      mesh.rotation.y = p.rotation;
      mesh.scaling.x = p.scaleX;
      mesh.scaling.z = p.scaleZ;

      const mat = new StandardMaterial(`splatMat_${mi}_${pi}`, scene);
      let col: [number, number, number];
      if (p.kind === 'center') col = JUICE_MARK_CENTER_COLOR;
      else if (p.kind === 'satellite') col = (pi % 2 === 0) ? JUICE_MARK_SAT_COLOR : [0.88, 0.20, 0.06];
      else col = JUICE_MARK_DROP_COLOR;
      mat.emissiveColor = new Color3(col[0], col[1], col[2]);
      mat.disableLighting = true;
      mat.alpha = JUICE_MARK_ALPHA;
      mesh.material = mat;
      mesh.setEnabled(false);

      meshes.push(mesh);
      mats.push(mat);
    }

    splatMeshes.push(meshes);
    splatMats.push(mats);
    splatConfigs.push(pieces);
  }

  // ── Flying chunks ────────────────────────────────────────────────────────
  const chunkMeshes: Mesh[] = [];
  const chunkMats: StandardMaterial[] = [];
  const chunkAnims: ChunkAnim[] = [];
  const chunkColorPalette = [CHUNK_RIND_COLOR, CHUNK_FLESH_COLOR, CHUNK_INNER_COLOR];

  for (let i = 0; i < MELON_CHUNK_COUNT; i++) {
    // Irregular lump shape via non-uniform scaling baked at init
    const sx = rand(0.12, 0.28);
    const sy = rand(0.08, 0.20);
    const sz = rand(0.10, 0.25);
    const mesh = MeshBuilder.CreateSphere(`chunk_${i}`, { diameter: 1, segments: 6 }, scene);
    mesh.scaling.set(sx, sy, sz);

    const mat = new StandardMaterial(`chunkMat_${i}`, scene);
    const col = chunkColorPalette[i % chunkColorPalette.length];
    mat.emissiveColor = new Color3(col[0], col[1], col[2]);
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.setEnabled(false);

    chunkMeshes.push(mesh);
    chunkMats.push(mat);
    chunkAnims.push({
      active: false,
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      rx: 0, ry: 0, rz: 0,
      avx: 0, avz: 0,
      timer: 0, maxTimer: 1,
    });
  }

  return {
    cloudBlobs, cloudBlobMats, cloudBlobConfigs,
    melons,
    splatMeshes, splatMats, splatConfigs,
    chunkMeshes, chunkMats, chunkAnims,
  };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export function updateEffects(pool: EffectsPool, state: GameState, dt: number): void {
  const now = Date.now();

  // ── Stink clouds (multi-blob) ────────────────────────────────────────────
  for (let ci = 0; ci < MAX_CLOUDS; ci++) {
    const cloudState = ci < state.stinkClouds.length ? state.stinkClouds[ci] : null;

    for (let bi = 0; bi < BLOBS_PER_CLOUD; bi++) {
      const mesh = pool.cloudBlobs[ci][bi];
      const mat = pool.cloudBlobMats[ci][bi];
      const cfg = pool.cloudBlobConfigs[ci][bi];

      if (!cloudState) {
        mesh.setEnabled(false);
        continue;
      }

      mesh.setEnabled(true);

      const t = Math.max(0, cloudState.timer / STINK_CLOUD_DURATION); // 1→0

      // Spawn pop: grow in during first 15% of life
      const progress = 1 - t;
      const spawnScale = progress < 0.15 ? progress / 0.15 : 1;
      // Gas expands as it dissipates — blobs grow larger, not smaller
      const expansion = 1 + (1 - t) * 0.35;
      // Gentle breathing pulse
      const pulse = 1 + 0.05 * Math.sin(now * 0.003 + bi * 1.3);
      const scale = cfg.sizeFactor * spawnScale * expansion * pulse;

      // Drift: peripheral blobs expand outward and rise as cloud dies
      const driftAmt = (1 - t) * CLOUD_DRIFT_MAX;
      const riseAmt = (1 - t) * CLOUD_RISE_MAX;

      const worldX = cloudState.pos.x + cfg.ox + cfg.dx * driftAmt;
      const worldY = STINK_CLOUD_RADIUS * cfg.sizeFactor + cfg.oy + riseAmt;
      const worldZ = cloudState.pos.y + cfg.oz + cfg.dz * driftAmt;

      mesh.position.set(worldX, worldY, worldZ);
      // Scale is baked into mesh diameter at creation; apply runtime scale on top
      mesh.scaling.setAll(scale);

      mat.alpha = CLOUD_ALPHA * Math.pow(t, 0.5);
    }
  }

  // ── Melons ───────────────────────────────────────────────────────────────
  for (let i = 0; i < pool.melons.length; i++) {
    if (i < state.melons.length) {
      const melon = state.melons[i];
      pool.melons[i].setEnabled(true);
      pool.melons[i].position.set(melon.pos.x, MELON_RADIUS, melon.pos.y);
      pool.melons[i].scaling.set(1, MELON_BODY_Y_SCALE, 1);
    } else {
      pool.melons[i].setEnabled(false);
    }
  }

  // ── Ground splatter ───────────────────────────────────────────────────────
  for (let mi = 0; mi < MAX_JUICE_MARKS; mi++) {
    const mark = mi < state.juiceMarks.length ? state.juiceMarks[mi] : null;
    const alpha = mark ? JUICE_MARK_ALPHA * (mark.timer / JUICE_MARK_DURATION) : 0;

    for (let pi = 0; pi < pool.splatMeshes[mi].length; pi++) {
      const mesh = pool.splatMeshes[mi][pi];
      const mat = pool.splatMats[mi][pi];
      const cfg = pool.splatConfigs[mi][pi];

      if (!mark) {
        mesh.setEnabled(false);
        continue;
      }

      mesh.setEnabled(true);
      mesh.position.set(mark.pos.x + cfg.ox, 0.01, mark.pos.y + cfg.oz);
      mat.alpha = alpha;
    }
  }

  // ── Spawn chunks from explosion events ───────────────────────────────────
  for (const event of state.melonExplosionEvents) {
    let spawned = 0;
    for (let i = 0; i < MELON_CHUNK_COUNT && spawned < CHUNKS_PER_EXPLOSION; i++) {
      const anim = pool.chunkAnims[i];
      if (anim.active) continue;

      const angle = randAngle();
      const speed = rand(CHUNK_SPEED_MIN, CHUNK_SPEED_MAX);

      anim.active = true;
      anim.x = event.pos.x;
      anim.y = 0.35;
      anim.z = event.pos.y;
      anim.vx = Math.cos(angle) * speed;
      anim.vz = Math.sin(angle) * speed;
      anim.vy = rand(CHUNK_VY_MIN, CHUNK_VY_MAX);
      anim.rx = randAngle();
      anim.ry = randAngle();
      anim.rz = randAngle();
      anim.avx = rand(-8, 8);
      anim.avz = rand(-8, 8);
      anim.timer = rand(CHUNK_LIFE_MIN, CHUNK_LIFE_MAX);
      anim.maxTimer = anim.timer;
      spawned++;
    }
  }

  // ── Animate active chunks ─────────────────────────────────────────────────
  for (let i = 0; i < MELON_CHUNK_COUNT; i++) {
    const anim = pool.chunkAnims[i];
    const mesh = pool.chunkMeshes[i];
    const mat = pool.chunkMats[i];

    if (!anim.active) {
      mesh.setEnabled(false);
      continue;
    }

    anim.timer -= dt;
    if (anim.timer <= 0) {
      anim.active = false;
      mesh.setEnabled(false);
      continue;
    }

    // Physics
    anim.vy -= CHUNK_GRAVITY * dt;
    anim.x += anim.vx * dt;
    anim.y += anim.vy * dt;
    anim.z += anim.vz * dt;

    // Floor bounce
    if (anim.y < 0.02) {
      anim.y = 0.02;
      anim.vy *= -0.2;
    }

    // Spin
    anim.rx += anim.avx * dt;
    anim.rz += anim.avz * dt;

    mesh.setEnabled(true);
    mesh.position.set(anim.x, anim.y, anim.z);
    mesh.rotation.set(anim.rx, anim.ry, anim.rz);

    // Fade out in final CHUNK_FADE_TIME seconds
    mat.alpha = anim.timer < CHUNK_FADE_TIME ? anim.timer / CHUNK_FADE_TIME : 1;
  }
}
