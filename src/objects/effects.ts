import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Mesh,
} from '@babylonjs/core';
import type { GameState } from '../types.ts';
import {
  STINK_CLOUD_RADIUS, STINK_CLOUD_COLOR, STINK_CLOUD_DURATION,
  MELON_RADIUS, MELON_COLOR,
  JUICE_MARK_COLOR, JUICE_MARK_DURATION,
} from '../constants.ts';

const MAX_CLOUDS = 8;
const MAX_MELONS = 8;
const MAX_JUICE_MARKS = 8;

export interface EffectsPool {
  clouds: Mesh[];
  cloudMats: StandardMaterial[];
  melons: Mesh[];
  melonMats: StandardMaterial[];
  juiceMarks: Mesh[];
  juiceMarkMats: StandardMaterial[];
}

export function createEffectsPool(scene: Scene): EffectsPool {
  const clouds: Mesh[] = [];
  const cloudMats: StandardMaterial[] = [];
  for (let i = 0; i < MAX_CLOUDS; i++) {
    const mesh = MeshBuilder.CreateSphere(`cloud_${i}`, {
      diameter: STINK_CLOUD_RADIUS * 2,
      segments: 10,
    }, scene);
    const mat = new StandardMaterial(`cloudMat_${i}`, scene);
    mat.emissiveColor = new Color3(...STINK_CLOUD_COLOR);
    mat.disableLighting = true;
    mat.alpha = 0.4;
    mesh.material = mat;
    mesh.setEnabled(false);
    clouds.push(mesh);
    cloudMats.push(mat);
  }

  const melons: Mesh[] = [];
  const melonMats: StandardMaterial[] = [];
  for (let i = 0; i < MAX_MELONS; i++) {
    const mesh = MeshBuilder.CreateSphere(`melon_${i}`, {
      diameter: MELON_RADIUS * 2,
      segments: 10,
    }, scene);
    const mat = new StandardMaterial(`melonMat_${i}`, scene);
    mat.emissiveColor = new Color3(...MELON_COLOR);
    mat.disableLighting = true;
    mesh.material = mat;
    mesh.setEnabled(false);
    melons.push(mesh);
    melonMats.push(mat);
  }

  const juiceMarks: Mesh[] = [];
  const juiceMarkMats: StandardMaterial[] = [];
  for (let i = 0; i < MAX_JUICE_MARKS; i++) {
    const mesh = MeshBuilder.CreateDisc(`juice_${i}`, {
      radius: 0.8,
      tessellation: 16,
    }, scene);
    mesh.rotation.x = Math.PI / 2; // lay flat
    const mat = new StandardMaterial(`juiceMat_${i}`, scene);
    mat.emissiveColor = new Color3(...JUICE_MARK_COLOR);
    mat.disableLighting = true;
    mat.alpha = 0.6;
    mesh.material = mat;
    mesh.setEnabled(false);
    juiceMarks.push(mesh);
    juiceMarkMats.push(mat);
  }

  return { clouds, cloudMats, melons, melonMats, juiceMarks, juiceMarkMats };
}

export function updateEffects(pool: EffectsPool, state: GameState): void {
  // Stink clouds
  for (let i = 0; i < pool.clouds.length; i++) {
    if (i < state.stinkClouds.length) {
      const cloud = state.stinkClouds[i];
      pool.clouds[i].setEnabled(true);
      pool.clouds[i].position.set(cloud.pos.x, STINK_CLOUD_RADIUS, cloud.pos.y);
      // Fade out over duration
      const alpha = 0.4 * (cloud.timer / STINK_CLOUD_DURATION);
      pool.cloudMats[i].alpha = alpha;
    } else {
      pool.clouds[i].setEnabled(false);
    }
  }

  // Melons
  for (let i = 0; i < pool.melons.length; i++) {
    if (i < state.melons.length) {
      const melon = state.melons[i];
      pool.melons[i].setEnabled(true);
      pool.melons[i].position.set(melon.pos.x, MELON_RADIUS, melon.pos.y);
    } else {
      pool.melons[i].setEnabled(false);
    }
  }

  // Juice marks
  for (let i = 0; i < pool.juiceMarks.length; i++) {
    if (i < state.juiceMarks.length) {
      const mark = state.juiceMarks[i];
      pool.juiceMarks[i].setEnabled(true);
      pool.juiceMarks[i].position.set(mark.pos.x, 0.01, mark.pos.y);
      const alpha = 0.6 * (mark.timer / JUICE_MARK_DURATION);
      pool.juiceMarkMats[i].alpha = alpha;
    } else {
      pool.juiceMarks[i].setEnabled(false);
    }
  }
}
