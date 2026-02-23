import type { PlayerState, PlayerInput } from '../types.ts';
import { MOVE_SPEED, KNOCKBACK_FRICTION, CHILD_SPEED_MULT } from '../constants.ts';

export function computeFacingAngle(player: PlayerState, opponent: PlayerState): number {
  return Math.atan2(opponent.pos.y - player.pos.y, opponent.pos.x - player.pos.x);
}

export function applyMovement(player: PlayerState, input: PlayerInput, dt: number): void {
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

  const len = Math.sqrt(dx * dx + dy * dy);
  const baseSpeed = player.ability === 'child' ? MOVE_SPEED * CHILD_SPEED_MULT : MOVE_SPEED;
  const speed = baseSpeed * player.speedMultiplier;
  if (len > 0) {
    dx = (dx / len) * speed * dt;
    dy = (dy / len) * speed * dt;
  }

  player.vel.x = dx;
  player.vel.y = dy;
}

export function applyVelocity(player: PlayerState, dt: number): void {
  player.pos.x += player.vel.x + player.knockbackVel.x * dt;
  player.pos.y += player.vel.y + player.knockbackVel.y * dt;

  const friction = Math.pow(KNOCKBACK_FRICTION, dt * 60);
  player.knockbackVel.x *= friction;
  player.knockbackVel.y *= friction;

  if (Math.abs(player.knockbackVel.x) < 0.002 && Math.abs(player.knockbackVel.y) < 0.002) {
    player.knockbackVel.x = 0;
    player.knockbackVel.y = 0;
  }
}
