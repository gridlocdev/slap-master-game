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
  PLATFORM_HEIGHT, PLATFORM_Y, DANGER_ZONE_ALPHA,
  DANGER_ZONE_OVERLAY_HEIGHT, DANGER_ZONE_Y,
  BORDER_WIDTH, BORDER_HEIGHT,
} from '../constants.ts';

export function createArenaMeshes(scene: Scene): void {
  // Main platform (thin box at y=0)
  const platform = MeshBuilder.CreateBox('platform', {
    width: ARENA_W,
    height: PLATFORM_HEIGHT,
    depth: ARENA_H,
  }, scene);
  platform.position.y = PLATFORM_Y;
  const platMat = new StandardMaterial('platMat', scene);
  platMat.emissiveColor = new Color3(...ARENA_FILL_COLOR);
  platMat.disableLighting = true;
  platform.material = platMat;

  // Danger zone overlays
  const dz = DANGER_ZONE_WIDTH;
  const dangerMat = new StandardMaterial('dangerMat', scene);
  dangerMat.emissiveColor = new Color3(...ARENA_DANGER_COLOR);
  dangerMat.disableLighting = true;
  dangerMat.alpha = DANGER_ZONE_ALPHA;

  // Top edge (negative Z)
  const dzTop = MeshBuilder.CreateBox('dzTop', { width: ARENA_W, height: DANGER_ZONE_OVERLAY_HEIGHT, depth: dz }, scene);
  dzTop.position.set(0, DANGER_ZONE_Y, -(ARENA_H / 2 - dz / 2));
  dzTop.material = dangerMat;

  // Bottom edge (positive Z)
  const dzBot = MeshBuilder.CreateBox('dzBot', { width: ARENA_W, height: DANGER_ZONE_OVERLAY_HEIGHT, depth: dz }, scene);
  dzBot.position.set(0, DANGER_ZONE_Y, ARENA_H / 2 - dz / 2);
  dzBot.material = dangerMat;

  // Left edge (negative X)
  const dzLeft = MeshBuilder.CreateBox('dzLeft', { width: dz, height: DANGER_ZONE_OVERLAY_HEIGHT, depth: ARENA_H }, scene);
  dzLeft.position.set(-(ARENA_W / 2 - dz / 2), DANGER_ZONE_Y, 0);
  dzLeft.material = dangerMat;

  // Right edge (positive X)
  const dzRight = MeshBuilder.CreateBox('dzRight', { width: dz, height: DANGER_ZONE_OVERLAY_HEIGHT, depth: ARENA_H }, scene);
  dzRight.position.set(ARENA_W / 2 - dz / 2, DANGER_ZONE_Y, 0);
  dzRight.material = dangerMat;

  // Border — 4 thin boxes around the edge
  const borderMat = new StandardMaterial('borderMat', scene);
  borderMat.emissiveColor = new Color3(...ARENA_BORDER_COLOR);
  borderMat.disableLighting = true;

  const borderTop = MeshBuilder.CreateBox('bTop', { width: ARENA_W + BORDER_WIDTH, height: BORDER_HEIGHT, depth: BORDER_WIDTH }, scene);
  borderTop.position.set(0, BORDER_HEIGHT / 2 + PLATFORM_Y, -ARENA_H / 2);
  borderTop.material = borderMat;

  const borderBot = MeshBuilder.CreateBox('bBot', { width: ARENA_W + BORDER_WIDTH, height: BORDER_HEIGHT, depth: BORDER_WIDTH }, scene);
  borderBot.position.set(0, BORDER_HEIGHT / 2 + PLATFORM_Y, ARENA_H / 2);
  borderBot.material = borderMat;

  const borderLeft = MeshBuilder.CreateBox('bLeft', { width: BORDER_WIDTH, height: BORDER_HEIGHT, depth: ARENA_H + BORDER_WIDTH }, scene);
  borderLeft.position.set(-ARENA_W / 2, BORDER_HEIGHT / 2 + PLATFORM_Y, 0);
  borderLeft.material = borderMat;

  const borderRight = MeshBuilder.CreateBox('bRight', { width: BORDER_WIDTH, height: BORDER_HEIGHT, depth: ARENA_H + BORDER_WIDTH }, scene);
  borderRight.position.set(ARENA_W / 2, BORDER_HEIGHT / 2 + PLATFORM_Y, 0);
  borderRight.material = borderMat;
}
