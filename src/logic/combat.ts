import type { Hand, PlayerState, PlayerInput } from '../types.ts';
import {
  WINDUP_TIME, ACTIVE_TIME, RECOVERY_TIME,
  HAND_OFFSET, HAND_RADIUS, KNOCKBACK_FORCE,
} from '../constants.ts';

export function triggerSlap(hand: Hand): void {
  if (hand.state !== 'idle') return;
  hand.state = 'windup';
  hand.timer = WINDUP_TIME;
}

export function updateHandState(hand: Hand, dt: number): void {
  if (hand.state === 'idle') return;

  hand.timer -= dt;
  if (hand.timer <= 0) {
    switch (hand.state) {
      case 'windup':
        hand.state = 'active';
        hand.timer = ACTIVE_TIME;
        break;
      case 'active':
        hand.state = 'recovery';
        hand.timer = RECOVERY_TIME;
        break;
      case 'recovery':
        hand.state = 'idle';
        hand.timer = 0;
        break;
    }
  }
}

export function handleSlapInput(player: PlayerState, input: PlayerInput): void {
  if (input.slapLeft) triggerSlap(player.hands[0]);
  if (input.slapRight) triggerSlap(player.hands[1]);
}

// Slap arc angles (relative to facing direction)
const IDLE_ANGLE = Math.PI / 2;       // 90° — perpendicular at side
const WINDUP_ANGLE = Math.PI * 0.8;   // 144° — pulled back behind
const SWING_END_ANGLE = -Math.PI * 0.3; // -54° — swung past front to opposite side
const SLAP_REACH = 0.85;              // arm extends during active swing

export function getHandWorldPos(player: PlayerState, hand: Hand): { x: number; y: number } {
  const facing = player.facingAngle;
  // Left hand swings clockwise (positive → negative angle), right swings counter-clockwise
  const sign = hand.side === 'left' ? 1 : -1;
  let angle: number;
  let reach = HAND_OFFSET;

  if (hand.state === 'windup') {
    // Interpolate from idle position back to windup
    const t = 1 - (hand.timer / WINDUP_TIME);
    angle = IDLE_ANGLE + (WINDUP_ANGLE - IDLE_ANGLE) * t;
  } else if (hand.state === 'active') {
    // Sweep from windup position across the front
    const t = 1 - (hand.timer / ACTIVE_TIME);
    angle = WINDUP_ANGLE + (SWING_END_ANGLE - WINDUP_ANGLE) * t;
    // Extend reach at the midpoint of the swing for more impact
    const reachT = Math.sin(t * Math.PI);
    reach = HAND_OFFSET + (SLAP_REACH - HAND_OFFSET) * reachT;
  } else if (hand.state === 'recovery') {
    // Return from swing end back to idle
    const t = 1 - (hand.timer / RECOVERY_TIME);
    angle = SWING_END_ANGLE + (IDLE_ANGLE - SWING_END_ANGLE) * t;
  } else {
    angle = IDLE_ANGLE;
  }

  const handAngle = facing + angle * sign;

  return {
    x: player.pos.x + Math.cos(handAngle) * reach,
    y: player.pos.y + Math.sin(handAngle) * reach,
  };
}

export function checkSlapHit(attacker: PlayerState, defender: PlayerState): boolean {
  for (const hand of attacker.hands) {
    if (hand.state !== 'active') continue;

    const handPos = getHandWorldPos(attacker, hand);
    const dx = handPos.x - defender.pos.x;
    const dy = handPos.y - defender.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitDist = HAND_RADIUS + defender.radius;

    if (dist < hitDist) return true;
  }

  return false;
}

export function applyKnockback(attacker: PlayerState, defender: PlayerState): void {
  const dx = defender.pos.x - attacker.pos.x;
  const dy = defender.pos.y - attacker.pos.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return;

  defender.knockbackVel.x += (dx / len) * KNOCKBACK_FORCE;
  defender.knockbackVel.y += (dy / len) * KNOCKBACK_FORCE;
}
