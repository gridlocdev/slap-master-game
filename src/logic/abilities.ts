import type { GameState, PlayerState, PlayerInput, Vec2, StinkCloud } from '../types.ts';
import { isOutOfBounds } from './arena.ts';
import { getHandWorldPos } from './combat.ts';
import {
  ABILITY_COOLDOWN, DASH_SPEED, DASH_DURATION, DASH_KNOCKBACK,
  STINK_CLOUD_DURATION, STINK_CLOUD_RADIUS, STINK_CLOUD_SLOW,
  TAUNT_DURATION, TAUNT_COOLDOWN,
  MELON_RADIUS, MELON_SPEED, MELON_INVULN_TIME, MELON_FRICTION,
  MELON_KNOCKBACK, MELON_EXPLODE_RADIUS, MELON_EXPLODE_KB,
  JUICE_MARK_DURATION, DOUBLE_SLAP_WINDOW,
  HAND_RADIUS, ARENA_X, ARENA_W, ARENA_Y, ARENA_H,
  MELON_SPAWN_OFFSET, MELON_SLAP_FORCE,
  KO_PREDICT_TIME,
} from '../constants.ts';

function emitHitEvent(state: GameState, pos: Vec2, dir: Vec2, force: number, attackerIdx: number, defender: PlayerState): void {
  const simPos = {
    x: defender.pos.x + defender.knockbackVel.x * KO_PREDICT_TIME,
    y: defender.pos.y + defender.knockbackVel.y * KO_PREDICT_TIME,
  };
  const isKO = isOutOfBounds({ ...defender, pos: simPos }, state.arenaRect);
  state.hitEvents.push({ pos, dir, force, attackerIdx, isKO });
}

export function handleAbilityInput(player: PlayerState, input: PlayerInput, state: GameState, playerIdx: number): void {
  if (!input.ability) return;

  switch (player.ability) {
    case 'burrito':
      if (player.abilityCooldown <= 0 && !player.isDashing) {
        player.isDashing = true;
        player.dashTimer = DASH_DURATION;
        player.dashDir = {
          x: Math.cos(player.facingAngle),
          y: Math.sin(player.facingAngle),
        };
        // Spawn stink cloud at starting position
        state.stinkClouds.push({
          pos: { x: player.pos.x, y: player.pos.y },
          timer: STINK_CLOUD_DURATION,
        });
        player.abilityCooldown = ABILITY_COOLDOWN;
      }
      break;

    case 'child':
      // Ability button = taunt with separate cooldown
      if (player.abilityCooldown <= 0 && player.tauntTimer <= 0) {
        player.tauntTimer = TAUNT_DURATION;
        player.abilityCooldown = TAUNT_COOLDOWN;
      }
      break;

    case 'melon':
      if (player.abilityCooldown <= 0) {
        const dirX = Math.cos(player.facingAngle);
        const dirY = Math.sin(player.facingAngle);
        state.melons.push({
          pos: {
            x: player.pos.x + dirX * (player.radius + MELON_RADIUS + MELON_SPAWN_OFFSET),
            y: player.pos.y + dirY * (player.radius + MELON_RADIUS + MELON_SPAWN_OFFSET),
          },
          vel: { x: dirX * MELON_SPEED, y: dirY * MELON_SPEED },
          radius: MELON_RADIUS,
          invulnTimer: MELON_INVULN_TIME,
          owner: playerIdx,
        });
        player.abilityCooldown = ABILITY_COOLDOWN;
      }
      break;
  }
}

export function updateDash(player: PlayerState, state: GameState, otherPlayer: PlayerState, dt: number): void {
  if (!player.isDashing) return;

  player.dashTimer -= dt;

  // Move player in dash direction
  player.pos.x += player.dashDir.x * DASH_SPEED * dt;
  player.pos.y += player.dashDir.y * DASH_SPEED * dt;

  // Check collision with opponent
  const dx = otherPlayer.pos.x - player.pos.x;
  const dy = otherPlayer.pos.y - player.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const hitDist = player.radius + otherPlayer.radius;

  if (dist < hitDist && dist > 0) {
    const dirX = dx / dist;
    const dirY = dy / dist;
    otherPlayer.knockbackVel.x += dirX * DASH_KNOCKBACK;
    otherPlayer.knockbackVel.y += dirY * DASH_KNOCKBACK;
    const attackerIdx = state.players[0] === player ? 0 : 1;
    emitHitEvent(state,
      { x: otherPlayer.pos.x - dirX * otherPlayer.radius, y: otherPlayer.pos.y - dirY * otherPlayer.radius },
      { x: dirX, y: dirY }, DASH_KNOCKBACK, attackerIdx, otherPlayer);
  }

  if (player.dashTimer <= 0) {
    player.isDashing = false;
    player.dashTimer = 0;
  }
}

export function updateMelons(state: GameState, dt: number): void {
  for (let i = state.melons.length - 1; i >= 0; i--) {
    const melon = state.melons[i];

    // Decrease invulnerability
    if (melon.invulnTimer > 0) {
      melon.invulnTimer -= dt;
    }

    // Apply velocity
    melon.pos.x += melon.vel.x * dt;
    melon.pos.y += melon.vel.y * dt;

    // Apply friction
    const frictionPerFrame = Math.pow(MELON_FRICTION, dt * 60);
    melon.vel.x *= frictionPerFrame;
    melon.vel.y *= frictionPerFrame;

    // Remove if out of arena bounds
    const margin = melon.radius;
    if (
      melon.pos.x - margin > ARENA_X + ARENA_W ||
      melon.pos.x + margin < ARENA_X ||
      melon.pos.y - margin > ARENA_Y + ARENA_H ||
      melon.pos.y + margin < ARENA_Y
    ) {
      state.melons.splice(i, 1);
    }
  }
}

export function checkMelonCollisions(state: GameState): void {
  for (const melon of state.melons) {
    if (melon.invulnTimer > 0) continue;

    // Melon ↔ player collision
    for (let pi = 0; pi < state.players.length; pi++) {
      const player = state.players[pi];
      if (!player.isAlive || player.isFalling) continue;
      const dx = player.pos.x - melon.pos.x;
      const dy = player.pos.y - melon.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitDist = player.radius + melon.radius;

      if (dist < hitDist && dist > 0) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        player.knockbackVel.x += dirX * MELON_KNOCKBACK;
        player.knockbackVel.y += dirY * MELON_KNOCKBACK;
        emitHitEvent(state,
          { x: player.pos.x - dirX * player.radius, y: player.pos.y - dirY * player.radius },
          { x: dirX, y: dirY }, MELON_KNOCKBACK, melon.owner, player);
      }
    }

    // Melon ↔ active hand collision (slap pushes melon)
    for (const player of state.players) {
      for (const hand of player.hands) {
        if (hand.state !== 'active') continue;
        const handPos = getHandWorldPos(player, hand);
        const dx = melon.pos.x - handPos.x;
        const dy = melon.pos.y - handPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitDist = HAND_RADIUS + melon.radius;

        if (dist < hitDist && dist > 0) {
          // Push melon in the direction from hand to melon
          melon.vel.x += (dx / dist) * MELON_SLAP_FORCE;
          melon.vel.y += (dy / dist) * MELON_SLAP_FORCE;
        }
      }
    }
  }
}

export function checkMelonExplosion(state: GameState, playerIdx: number, input: PlayerInput): void {
  const player = state.players[playerIdx];
  const now = performance.now() / 1000;

  // Track slap times
  if (input.slapLeft) player.lastSlapLeftTime = now;
  if (input.slapRight) player.lastSlapRightTime = now;

  // Check for double-slap (both slap buttons within window)
  const timeDiff = Math.abs(player.lastSlapLeftTime - player.lastSlapRightTime);
  if (timeDiff > DOUBLE_SLAP_WINDOW) return;
  if (player.lastSlapLeftTime === 0 || player.lastSlapRightTime === 0) return;

  // Only explode if a slap just happened this frame
  if (!input.slapLeft && !input.slapRight) return;

  // Find nearby melons and explode them
  let exploded = false;
  for (let i = state.melons.length - 1; i >= 0; i--) {
    const melon = state.melons[i];
    const dx = melon.pos.x - player.pos.x;
    const dy = melon.pos.y - player.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MELON_EXPLODE_RADIUS) {
      // Explode: apply KB to all players in radius
      for (let pi = 0; pi < state.players.length; pi++) {
        const p = state.players[pi];
        if (!p.isAlive || p.isFalling) continue;
        const pdx = p.pos.x - melon.pos.x;
        const pdy = p.pos.y - melon.pos.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        if (pdist < MELON_EXPLODE_RADIUS && pdist > 0) {
          const dirX = pdx / pdist;
          const dirY = pdy / pdist;
          p.knockbackVel.x += dirX * MELON_EXPLODE_KB;
          p.knockbackVel.y += dirY * MELON_EXPLODE_KB;
          emitHitEvent(state,
            { x: melon.pos.x, y: melon.pos.y },
            { x: dirX, y: dirY }, MELON_EXPLODE_KB, playerIdx, p);
        }
      }

      // Leave juice mark
      state.juiceMarks.push({
        pos: { x: melon.pos.x, y: melon.pos.y },
        timer: JUICE_MARK_DURATION,
      });

      state.melons.splice(i, 1);
      exploded = true;
    }
  }

  if (exploded) {
    // Reset slap times so we don't double-trigger
    player.lastSlapLeftTime = 0;
    player.lastSlapRightTime = 0;
  }
}

export function updateStinkClouds(state: GameState, dt: number): void {
  for (let i = state.stinkClouds.length - 1; i >= 0; i--) {
    state.stinkClouds[i].timer -= dt;
    if (state.stinkClouds[i].timer <= 0) {
      state.stinkClouds.splice(i, 1);
    }
  }
}

export function updateJuiceMarks(state: GameState, dt: number): void {
  for (let i = state.juiceMarks.length - 1; i >= 0; i--) {
    state.juiceMarks[i].timer -= dt;
    if (state.juiceMarks[i].timer <= 0) {
      state.juiceMarks.splice(i, 1);
    }
  }
}

export function updateAbilityCooldowns(player: PlayerState, dt: number): void {
  if (player.abilityCooldown > 0) {
    player.abilityCooldown -= dt;
  }
  if (player.tauntTimer > 0) {
    player.tauntTimer -= dt;
  }
}

export function isInStinkCloud(pos: Vec2, clouds: StinkCloud[]): boolean {
  for (const cloud of clouds) {
    const dx = pos.x - cloud.pos.x;
    const dy = pos.y - cloud.pos.y;
    if (dx * dx + dy * dy < STINK_CLOUD_RADIUS * STINK_CLOUD_RADIUS) {
      return true;
    }
  }
  return false;
}

export function applyStinkCloudSlow(player: PlayerState, clouds: StinkCloud[]): void {
  player.speedMultiplier = isInStinkCloud(player.pos, clouds) ? STINK_CLOUD_SLOW : 1;
}
