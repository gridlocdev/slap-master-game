import type { GameState, PlayerInput } from './types.ts';
import { computeHandOffsets } from './state/gameState.ts';
import { computeFacingAngle, applyMovement, applyVelocity } from './logic/movement.ts';
import { handleSlapInput, updateHandState, checkSlapHit, applyKnockback, checkAndResolveClashes } from './logic/combat.ts';
import { isOutOfBounds } from './logic/arena.ts';
import {
  handleAbilityInput, updateDash, updateMelons, checkMelonCollisions,
  checkMelonExplosion, updateStinkClouds, updateJuiceMarks, updateAbilityCooldowns,
  applyStinkCloudSlow,
} from './logic/abilities.ts';
import { FALL_DURATION, FALL_GRAVITY } from './constants.ts';

function separatePlayers(state: GameState): void {
  const p0 = state.players[0];
  const p1 = state.players[1];
  if (p0.isFalling || p1.isFalling) return;

  const dx = p1.pos.x - p0.pos.x;
  const dy = p1.pos.y - p0.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const minDist = p0.radius + p1.radius;

  if (dist >= minDist || dist === 0) return;

  const overlap = (minDist - dist) / 2;
  const nx = dx / dist;
  const ny = dy / dist;

  p0.pos.x -= nx * overlap;
  p0.pos.y -= ny * overlap;
  p1.pos.x += nx * overlap;
  p1.pos.y += ny * overlap;
}

export function updateGame(state: GameState, p1Input: PlayerInput, p2Input: PlayerInput, dt: number): void {
  const inputs = [p1Input, p2Input] as const;

  // Update ability cooldowns
  for (const player of state.players) {
    updateAbilityCooldowns(player, dt);
  }

  // Update hand state machines
  for (const player of state.players) {
    for (const hand of player.hands) {
      updateHandState(hand, dt);
    }
    // Clear doubleSlapActive when both hands return to idle
    if (player.doubleSlapActive && player.hands[0].state === 'idle' && player.hands[1].state === 'idle') {
      player.doubleSlapActive = false;
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

  // Handle ability input
  for (let i = 0; i < 2; i++) {
    handleAbilityInput(state.players[i], inputs[i], state, i);
  }

  // Update dashes
  updateDash(state.players[0], state, state.players[1], dt);
  updateDash(state.players[1], state, state.players[0], dt);

  // Apply stink cloud slow
  for (const player of state.players) {
    applyStinkCloudSlow(player, state.stinkClouds);
  }

  // Apply movement (only for non-falling, non-dashing players)
  for (let i = 0; i < 2; i++) {
    const player = state.players[i];
    const input = inputs[i];
    if (!player.isFalling && !player.isDashing) {
      applyMovement(player, input, dt);
      applyVelocity(player, dt);
    }
  }

  // Separate overlapping players
  separatePlayers(state);

  // Check clashes first (same-hand cancel) — sends clashed hands to recovery
  checkAndResolveClashes(state.players[0], state.players[1]);

  // Check slap hits (clashed hands are already in recovery, so naturally skipped)
  if (checkSlapHit(state.players[0], state.players[1])) {
    applyKnockback(state.players[0], state.players[1]);
  }
  if (checkSlapHit(state.players[1], state.players[0])) {
    applyKnockback(state.players[1], state.players[0]);
  }

  // Update melons
  updateMelons(state, dt);
  checkMelonCollisions(state);

  // Check melon explosions (double-slap)
  for (let i = 0; i < 2; i++) {
    checkMelonExplosion(state, i, inputs[i]);
  }

  // Update stink clouds and juice marks
  updateStinkClouds(state, dt);
  updateJuiceMarks(state, dt);

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
