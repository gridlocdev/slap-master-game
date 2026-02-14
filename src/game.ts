import type { GameState, PlayerInput } from './types.ts';
import { computeHandOffsets } from './state/gameState.ts';
import { computeFacingAngle, applyMovement, applyVelocity } from './logic/movement.ts';
import { handleSlapInput, updateHandState, checkSlapHit, applyKnockback } from './logic/combat.ts';
import { isOutOfBounds } from './logic/arena.ts';
import { FALL_DURATION, FALL_GRAVITY } from './constants.ts';

export function updateGame(state: GameState, p1Input: PlayerInput, p2Input: PlayerInput, dt: number): void {
  // Update hand state machines
  for (const player of state.players) {
    for (const hand of player.hands) {
      updateHandState(hand, dt);
    }
  }

  // Handle slap input
  handleSlapInput(state.players[0], p1Input);
  handleSlapInput(state.players[1], p2Input);

  // Compute facing angles
  state.players[0].facingAngle = computeFacingAngle(state.players[0], state.players[1]);
  state.players[1].facingAngle = computeFacingAngle(state.players[1], state.players[0]);

  // Compute hand offsets
  computeHandOffsets(state.players[0]);
  computeHandOffsets(state.players[1]);

  // Apply movement (only for non-falling players)
  for (let i = 0; i < 2; i++) {
    const player = state.players[i];
    const input = i === 0 ? p1Input : p2Input;
    if (!player.isFalling) {
      applyMovement(player, input, dt);
      applyVelocity(player, dt);
    }
  }

  // Check slap hits
  if (checkSlapHit(state.players[0], state.players[1])) {
    applyKnockback(state.players[0], state.players[1]);
  }
  if (checkSlapHit(state.players[1], state.players[0])) {
    applyKnockback(state.players[1], state.players[0]);
  }

  // Check arena bounds → trigger falling
  for (let i = 0; i < 2; i++) {
    const player = state.players[i];
    if (!player.isFalling && isOutOfBounds(player, state.arenaRect)) {
      player.isFalling = true;
      player.fallTimer = 0;
      player.fallVelY = 0;
      player.fallAlpha = 1;
    }
  }

  // Update falling players
  for (let i = 0; i < 2; i++) {
    const player = state.players[i];
    if (player.isFalling && player.isAlive) {
      player.fallTimer += dt;
      player.fallVelY += FALL_GRAVITY * dt;
      player.fallAlpha = Math.max(0, 1 - player.fallTimer / FALL_DURATION);

      if (player.fallTimer >= FALL_DURATION) {
        player.isAlive = false;
        state.winner = i === 0 ? 1 : 0;
        state.restartTimer = 0;
      }
    }
  }
}
