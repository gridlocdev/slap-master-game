import type { Hand, PlayerState, PlayerInput } from '../types.ts';
import {
  WINDUP_FRAMES, ACTIVE_FRAMES, RECOVERY_FRAMES,
  HAND_EXTEND_DISTANCE, HAND_RADIUS, KNOCKBACK_FORCE,
} from '../constants.ts';

export function triggerSlap(hand: Hand): void {
  if (hand.state !== 'idle') return;
  hand.state = 'windup';
  hand.timer = WINDUP_FRAMES;
}

export function updateHandState(hand: Hand): void {
  if (hand.state === 'idle') return;

  hand.timer--;
  if (hand.timer <= 0) {
    switch (hand.state) {
      case 'windup':
        hand.state = 'active';
        hand.timer = ACTIVE_FRAMES;
        break;
      case 'active':
        hand.state = 'recovery';
        hand.timer = RECOVERY_FRAMES;
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

export function getHandWorldPos(player: PlayerState, hand: Hand): { x: number; y: number } {
  let ox = hand.offset.x;
  let oy = hand.offset.y;

  if (hand.state === 'active') {
    // Extend forward toward opponent
    const fwdX = Math.cos(player.facingAngle);
    const fwdY = Math.sin(player.facingAngle);
    const t = 1 - (hand.timer / ACTIVE_FRAMES);
    ox += fwdX * HAND_EXTEND_DISTANCE * t;
    oy += fwdY * HAND_EXTEND_DISTANCE * t;
  } else if (hand.state === 'windup') {
    // Pull back slightly
    const fwdX = Math.cos(player.facingAngle);
    const fwdY = Math.sin(player.facingAngle);
    ox -= fwdX * 8;
    oy -= fwdY * 8;
  }

  return {
    x: player.pos.x + ox,
    y: player.pos.y + oy,
  };
}

export function checkSlapHit(attacker: PlayerState, defender: PlayerState): boolean {
  let hit = false;

  for (const hand of attacker.hands) {
    if (hand.state !== 'active') continue;

    const handPos = getHandWorldPos(attacker, hand);
    const dx = handPos.x - defender.pos.x;
    const dy = handPos.y - defender.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const hitDist = HAND_RADIUS + defender.radius;

    if (dist < hitDist) {
      hit = true;
    }
  }

  return hit;
}

export function applyKnockback(attacker: PlayerState, defender: PlayerState): void {
  const dx = defender.pos.x - attacker.pos.x;
  const dy = defender.pos.y - attacker.pos.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return;

  defender.knockbackVel.x += (dx / len) * KNOCKBACK_FORCE;
  defender.knockbackVel.y += (dy / len) * KNOCKBACK_FORCE;
}
