import type { GameState, Hand, PlayerState } from '../types.ts';
import {
  ARENA_X, ARENA_Y, ARENA_W, ARENA_H,
  PLAYER_RADIUS, HAND_OFFSET,
  P1_SPAWN_X, P1_SPAWN_Y, P2_SPAWN_X, P2_SPAWN_Y,
} from '../constants.ts';

function createHand(side: 'left' | 'right'): Hand {
  return {
    side,
    offset: { x: 0, y: 0 },
    state: 'idle',
    timer: 0,
  };
}

function createPlayer(x: number, y: number): PlayerState {
  return {
    pos: { x, y },
    vel: { x: 0, y: 0 },
    radius: PLAYER_RADIUS,
    facingAngle: 0,
    hands: [createHand('left'), createHand('right')],
    knockbackVel: { x: 0, y: 0 },
    isAlive: true,
    isFalling: false,
    fallTimer: 0,
    fallVelY: 0,
    fallAlpha: 1,
  };
}

export function createInitialState(): GameState {
  return {
    players: [
      createPlayer(P1_SPAWN_X, P1_SPAWN_Y),
      createPlayer(P2_SPAWN_X, P2_SPAWN_Y),
    ],
    winner: null,
    arenaRect: { x: ARENA_X, y: ARENA_Y, w: ARENA_W, h: ARENA_H },
    restartTimer: 0,
  };
}

export function computeHandOffsets(player: PlayerState): void {
  const angle = player.facingAngle;
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  // Left hand: offset perpendicular left
  player.hands[0].offset = {
    x: perpX * HAND_OFFSET,
    y: perpY * HAND_OFFSET,
  };
  // Right hand: offset perpendicular right
  player.hands[1].offset = {
    x: -perpX * HAND_OFFSET,
    y: -perpY * HAND_OFFSET,
  };
}
