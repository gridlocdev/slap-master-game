import type { PlayerState } from '../types.ts';
import { getHandWorldPos } from '../logic/combat.ts';
import {
  HAND_RADIUS,
  P1_BODY_COLOR, P1_HAND_COLOR,
  P2_BODY_COLOR, P2_HAND_COLOR,
  HAND_WINDUP_COLOR, HAND_ACTIVE_COLOR,
} from '../constants.ts';

function handColor(baseColor: number, state: string): number {
  if (state === 'windup') return HAND_WINDUP_COLOR;
  if (state === 'active') return HAND_ACTIVE_COLOR;
  return baseColor;
}

export function drawPlayer(gfx: Phaser.GameObjects.Graphics, player: PlayerState, playerIndex: number): void {
  if (!player.isAlive) return;

  const bodyColor = playerIndex === 0 ? P1_BODY_COLOR : P2_BODY_COLOR;
  const baseHandColor = playerIndex === 0 ? P1_HAND_COLOR : P2_HAND_COLOR;

  // Draw hands (behind body for visual layering)
  for (const hand of player.hands) {
    const pos = getHandWorldPos(player, hand);
    const color = handColor(baseHandColor, hand.state);
    const radius = hand.state === 'active' ? HAND_RADIUS + 2 : HAND_RADIUS;

    gfx.fillStyle(color, 1);
    gfx.fillCircle(pos.x, pos.y, radius);

    // Hand outline
    gfx.lineStyle(2, 0x000000, 0.3);
    gfx.strokeCircle(pos.x, pos.y, radius);
  }

  // Draw body
  gfx.fillStyle(bodyColor, 1);
  gfx.fillCircle(player.pos.x, player.pos.y, player.radius);

  // Body outline
  gfx.lineStyle(2, 0x000000, 0.3);
  gfx.strokeCircle(player.pos.x, player.pos.y, player.radius);

  // Eyes (face toward opponent)
  const eyeDist = player.radius * 0.4;
  const eyeSize = 4;
  const perpX = -Math.sin(player.facingAngle);
  const perpY = Math.cos(player.facingAngle);
  const fwdX = Math.cos(player.facingAngle);
  const fwdY = Math.sin(player.facingAngle);

  const eyeForward = player.radius * 0.3;

  gfx.fillStyle(0xffffff, 1);
  gfx.fillCircle(
    player.pos.x + fwdX * eyeForward + perpX * eyeDist,
    player.pos.y + fwdY * eyeForward + perpY * eyeDist,
    eyeSize + 1,
  );
  gfx.fillCircle(
    player.pos.x + fwdX * eyeForward - perpX * eyeDist,
    player.pos.y + fwdY * eyeForward - perpY * eyeDist,
    eyeSize + 1,
  );

  // Pupils
  gfx.fillStyle(0x000000, 1);
  gfx.fillCircle(
    player.pos.x + fwdX * (eyeForward + 2) + perpX * eyeDist,
    player.pos.y + fwdY * (eyeForward + 2) + perpY * eyeDist,
    eyeSize - 1,
  );
  gfx.fillCircle(
    player.pos.x + fwdX * (eyeForward + 2) - perpX * eyeDist,
    player.pos.y + fwdY * (eyeForward + 2) - perpY * eyeDist,
    eyeSize - 1,
  );
}
