import type { ArenaRect } from '../types.ts';
import {
  ARENA_FILL_COLOR, ARENA_BORDER_COLOR,
  ARENA_DANGER_COLOR, DANGER_ZONE_WIDTH,
} from '../constants.ts';

export function drawArena(gfx: Phaser.GameObjects.Graphics, arena: ArenaRect): void {
  // Main platform fill
  gfx.fillStyle(ARENA_FILL_COLOR, 1);
  gfx.fillRect(arena.x, arena.y, arena.w, arena.h);

  // Danger zone edges
  const dz = DANGER_ZONE_WIDTH;
  gfx.fillStyle(ARENA_DANGER_COLOR, 0.5);
  // Top
  gfx.fillRect(arena.x, arena.y, arena.w, dz);
  // Bottom
  gfx.fillRect(arena.x, arena.y + arena.h - dz, arena.w, dz);
  // Left
  gfx.fillRect(arena.x, arena.y, dz, arena.h);
  // Right
  gfx.fillRect(arena.x + arena.w - dz, arena.y, dz, arena.h);

  // Border
  gfx.lineStyle(3, ARENA_BORDER_COLOR, 1);
  gfx.strokeRect(arena.x, arena.y, arena.w, arena.h);
}
