import type { Hand, PlayerState, PlayerInput } from '../types.ts';
import {
  WINDUP_TIME, ACTIVE_TIME, RECOVERY_TIME,
  HAND_OFFSET, HAND_RADIUS, KNOCKBACK_FORCE, CHILD_KB_MULT, CHILD_VS_CHILD_KB_MULT,
  IDLE_ANGLE, WINDUP_ANGLE, SWING_END_ANGLE, SLAP_REACH,
  CLASH_PUSHBACK,
  DOUBLE_SLAP_WINDUP, DOUBLE_SLAP_KB_MULT, DOUBLE_SLAP_WINDUP_ANGLE,
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
  // Double slap: both buttons simultaneously, both hands idle
  if (input.slapLeft && input.slapRight) {
    if (player.hands[0].state === 'idle' && player.hands[1].state === 'idle') {
      player.hands[0].state = 'windup';
      player.hands[0].timer = DOUBLE_SLAP_WINDUP;
      player.hands[1].state = 'windup';
      player.hands[1].timer = DOUBLE_SLAP_WINDUP;
      player.doubleSlapActive = true;
      return;
    }
  }

  if (input.slapLeft) triggerSlap(player.hands[0]);
  if (input.slapRight) triggerSlap(player.hands[1]);
}

export function getHandWorldPos(player: PlayerState, hand: Hand): { x: number; y: number } {
  const facing = player.facingAngle;
  // Left hand swings clockwise (positive → negative angle), right swings counter-clockwise
  const sign = hand.side === 'left' ? 1 : -1;
  let angle: number;
  let reach = HAND_OFFSET;

  const isDouble = player.doubleSlapActive;

  if (hand.state === 'windup') {
    const windupTime = isDouble ? DOUBLE_SLAP_WINDUP : WINDUP_TIME;
    const targetAngle = isDouble ? DOUBLE_SLAP_WINDUP_ANGLE : WINDUP_ANGLE;
    const t = 1 - (hand.timer / windupTime);
    angle = IDLE_ANGLE + (targetAngle - IDLE_ANGLE) * t;
  } else if (hand.state === 'active') {
    const startAngle = isDouble ? DOUBLE_SLAP_WINDUP_ANGLE : WINDUP_ANGLE;
    const t = 1 - (hand.timer / ACTIVE_TIME);
    angle = startAngle + (SWING_END_ANGLE - startAngle) * t;
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

  let force = KNOCKBACK_FORCE;
  if (attacker.ability === 'child') {
    force *= defender.ability === 'child' ? CHILD_VS_CHILD_KB_MULT : CHILD_KB_MULT;
  }
  if (attacker.doubleSlapActive) force *= DOUBLE_SLAP_KB_MULT;

  defender.knockbackVel.x += (dx / len) * force;
  defender.knockbackVel.y += (dy / len) * force;
}

/** Check and resolve same-hand clashes. Returns true if any clash occurred. */
export function checkAndResolveClashes(p0: PlayerState, p1: PlayerState): boolean {
  let clashed = false;
  for (let i = 0; i < 2; i++) {
    if (p0.hands[i].state === 'active' && p1.hands[i].state === 'active') {
      p0.hands[i].state = 'recovery';
      p0.hands[i].timer = RECOVERY_TIME;
      p1.hands[i].state = 'recovery';
      p1.hands[i].timer = RECOVERY_TIME;
      clashed = true;
    }
  }

  if (clashed) {
    // Small symmetric pushback — both players pushed apart equally
    const dx = p1.pos.x - p0.pos.x;
    const dy = p1.pos.y - p0.pos.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      const nx = dx / len;
      const ny = dy / len;
      p0.knockbackVel.x -= nx * CLASH_PUSHBACK;
      p0.knockbackVel.y -= ny * CLASH_PUSHBACK;
      p1.knockbackVel.x += nx * CLASH_PUSHBACK;
      p1.knockbackVel.y += ny * CLASH_PUSHBACK;
    }
  }

  return clashed;
}
