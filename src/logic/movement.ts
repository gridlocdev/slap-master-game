import type { PlayerState, PlayerInput } from '../types.ts';
import { MOVE_SPEED, KNOCKBACK_FRICTION } from '../constants.ts';

export function computeFacingAngle(player: PlayerState, opponent: PlayerState): number {
  return Math.atan2(opponent.pos.y - player.pos.y, opponent.pos.x - player.pos.x);
}

export function applyMovement(player: PlayerState, input: PlayerInput): void {
  const angle = player.facingAngle;
  const forwardX = Math.cos(angle);
  const forwardY = Math.sin(angle);
  const rightX = -Math.sin(angle);
  const rightY = Math.cos(angle);

  let dx = 0;
  let dy = 0;

  if (input.forward) { dx += forwardX; dy += forwardY; }
  if (input.back) { dx -= forwardX; dy -= forwardY; }
  if (input.right) { dx += rightX; dy += rightY; }
  if (input.left) { dx -= rightX; dy -= rightY; }

  // Normalize
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    dx = (dx / len) * MOVE_SPEED;
    dy = (dy / len) * MOVE_SPEED;
  }

  player.vel.x = dx;
  player.vel.y = dy;
}

export function applyVelocity(player: PlayerState): void {
  player.pos.x += player.vel.x + player.knockbackVel.x;
  player.pos.y += player.vel.y + player.knockbackVel.y;

  // Decay knockback
  player.knockbackVel.x *= KNOCKBACK_FRICTION;
  player.knockbackVel.y *= KNOCKBACK_FRICTION;

  // Zero out tiny knockback
  if (Math.abs(player.knockbackVel.x) < 0.1 && Math.abs(player.knockbackVel.y) < 0.1) {
    player.knockbackVel.x = 0;
    player.knockbackVel.y = 0;
  }
}
