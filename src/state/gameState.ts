import type { AbilityType, GameState, Hand, PlayerState } from '../types.ts';
import {
  ARENA_X, ARENA_Y, ARENA_W, ARENA_H,
  PLAYER_RADIUS, HAND_OFFSET,
  P1_SPAWN_X, P1_SPAWN_Y, P2_SPAWN_X, P2_SPAWN_Y,
  CHILD_SCALE,
} from '../constants.ts';

function createHand(side: 'left' | 'right'): Hand {
  return {
    side,
    offset: { x: 0, y: 0 },
    state: 'idle',
    timer: 0,
  };
}

function createPlayer(x: number, y: number, ability: AbilityType): PlayerState {
  const radius = ability === 'child' ? PLAYER_RADIUS * CHILD_SCALE : PLAYER_RADIUS;
  return {
    pos: { x, y },
    vel: { x: 0, y: 0 },
    radius,
    facingAngle: 0,
    hands: [createHand('left'), createHand('right')],
    knockbackVel: { x: 0, y: 0 },
    isAlive: true,
    isFalling: false,
    fallTimer: 0,
    fallVelY: 0,
    fallAlpha: 1,
    ability,
    abilityCooldown: 0,
    isDashing: false,
    dashTimer: 0,
    dashDir: { x: 0, y: 0 },
    tauntTimer: 0,
    lastSlapLeftTime: 0,
    lastSlapRightTime: 0,
  };
}

export function createInitialState(
  p1Ability: AbilityType = 'burrito',
  p2Ability: AbilityType = 'burrito',
): GameState {
  return {
    players: [
      createPlayer(P1_SPAWN_X, P1_SPAWN_Y, p1Ability),
      createPlayer(P2_SPAWN_X, P2_SPAWN_Y, p2Ability),
    ],
    winner: null,
    arenaRect: { x: ARENA_X, y: ARENA_Y, w: ARENA_W, h: ARENA_H },
    restartTimer: 0,
    stinkClouds: [],
    melons: [],
    juiceMarks: [],
    phase: 'playing',
    selections: [null, null],
  };
}

export function createSelectionState(): GameState {
  const state = createInitialState();
  state.phase = 'selecting';
  state.selections = [null, null];
  return state;
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
