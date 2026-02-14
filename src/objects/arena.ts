import {
  Scene,
  MeshBuilder,
  StandardMaterial,
  Color3,
} from '@babylonjs/core';
import {
  ARENA_W, ARENA_H,
  ARENA_FILL_COLOR, ARENA_BORDER_COLOR, ARENA_DANGER_COLOR,
  DANGER_ZONE_WIDTH,
} from '../constants.ts';

export function createArenaMeshes(scene: Scene): void {
  // Main platform (thin box at y=0)
  const platform = MeshBuilder.CreateBox('platform', {
    width: ARENA_W,
    height: 0.1,
    depth: ARENA_H,
  }, scene);
  platform.position.y = -0.05;
  const platMat = new StandardMaterial('platMat', scene);
  platMat.emissiveColor = new Color3(...ARENA_FILL_COLOR);
  platMat.disableLighting = true;
  platform.material = platMat;

  // Danger zone overlays
  const dz = DANGER_ZONE_WIDTH;
  const dangerMat = new StandardMaterial('dangerMat', scene);
  dangerMat.emissiveColor = new Color3(...ARENA_DANGER_COLOR);
  dangerMat.disableLighting = true;
  dangerMat.alpha = 0.5;

  // Top edge (negative Z)
  const dzTop = MeshBuilder.CreateBox('dzTop', { width: ARENA_W, height: 0.11, depth: dz }, scene);
  dzTop.position.set(0, -0.045, -(ARENA_H / 2 - dz / 2));
  dzTop.material = dangerMat;

  // Bottom edge (positive Z)
  const dzBot = MeshBuilder.CreateBox('dzBot', { width: ARENA_W, height: 0.11, depth: dz }, scene);
  dzBot.position.set(0, -0.045, ARENA_H / 2 - dz / 2);
  dzBot.material = dangerMat;

  // Left edge (negative X)
  const dzLeft = MeshBuilder.CreateBox('dzLeft', { width: dz, height: 0.11, depth: ARENA_H }, scene);
  dzLeft.position.set(-(ARENA_W / 2 - dz / 2), -0.045, 0);
  dzLeft.material = dangerMat;

  // Right edge (positive X)
  const dzRight = MeshBuilder.CreateBox('dzRight', { width: dz, height: 0.11, depth: ARENA_H }, scene);
  dzRight.position.set(ARENA_W / 2 - dz / 2, -0.045, 0);
  dzRight.material = dangerMat;

  // Border — 4 thin boxes around the edge
  const borderMat = new StandardMaterial('borderMat', scene);
  borderMat.emissiveColor = new Color3(...ARENA_BORDER_COLOR);
  borderMat.disableLighting = true;

  const bw = 0.06;
  const bh = 0.15;

  const borderTop = MeshBuilder.CreateBox('bTop', { width: ARENA_W + bw, height: bh, depth: bw }, scene);
  borderTop.position.set(0, bh / 2 - 0.05, -ARENA_H / 2);
  borderTop.material = borderMat;

  const borderBot = MeshBuilder.CreateBox('bBot', { width: ARENA_W + bw, height: bh, depth: bw }, scene);
  borderBot.position.set(0, bh / 2 - 0.05, ARENA_H / 2);
  borderBot.material = borderMat;

  const borderLeft = MeshBuilder.CreateBox('bLeft', { width: bw, height: bh, depth: ARENA_H + bw }, scene);
  borderLeft.position.set(-ARENA_W / 2, bh / 2 - 0.05, 0);
  borderLeft.material = borderMat;

  const borderRight = MeshBuilder.CreateBox('bRight', { width: bw, height: bh, depth: ARENA_H + bw }, scene);
  borderRight.position.set(ARENA_W / 2, bh / 2 - 0.05, 0);
  borderRight.material = borderMat;
}
