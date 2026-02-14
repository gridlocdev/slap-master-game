import type { ArenaRect, PlayerState } from '../types.ts';

export function isOutOfBounds(player: PlayerState, arena: ArenaRect): boolean {
  const { x, y } = player.pos;
  const r = player.radius;
  return (
    x + r < arena.x ||
    x - r > arena.x + arena.w ||
    y + r < arena.y ||
    y - r > arena.y + arena.h
  );
}
