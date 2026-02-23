import type { GameState, PlayerInput, AIDifficulty, Vec2, PlayerState } from '../types.ts';
import type { AIState, AIDifficultyConfig, AdaptationData } from './aiConfig.ts';
import { AI_CONFIGS, EMPTY_INPUT } from './aiConfig.ts';
import {
  ARENA_X, ARENA_W, ARENA_Y, ARENA_H,
  MELON_EXPLODE_RADIUS,
  DASH_SPEED, DASH_DURATION,
} from '../constants.ts';

// ============================================================
// Helpers
// ============================================================

function dist(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function normalize(v: Vec2): Vec2 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function edgeDistances(pos: Vec2): { left: number; right: number; top: number; bottom: number; min: number } {
  const left = pos.x - ARENA_X;
  const right = (ARENA_X + ARENA_W) - pos.x;
  const top = pos.y - ARENA_Y;
  const bottom = (ARENA_Y + ARENA_H) - pos.y;
  return { left, right, top, bottom, min: Math.min(left, right, top, bottom) };
}

function vecToCenter(pos: Vec2): Vec2 {
  return normalize({ x: -pos.x, y: -pos.y });
}

function rotateVec(v: Vec2, angleDeg: number): Vec2 {
  const rad = angleDeg * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** Convert world-space move direction into facing-relative PlayerInput booleans */
function worldDirToInput(moveDir: Vec2, facingAngle: number): Pick<PlayerInput, 'forward' | 'back' | 'left' | 'right'> {
  const fx = Math.cos(facingAngle);
  const fy = Math.sin(facingAngle);
  const rx = -Math.sin(facingAngle);
  const ry = Math.cos(facingAngle);

  const fwd = moveDir.x * fx + moveDir.y * fy;
  const rgt = moveDir.x * rx + moveDir.y * ry;

  const threshold = 0.3;
  return {
    forward: fwd > threshold,
    back: fwd < -threshold,
    right: rgt > threshold,
    left: rgt < -threshold,
  };
}

function hasIdleHand(player: PlayerState): boolean {
  return player.hands[0].state === 'idle' || player.hands[1].state === 'idle';
}

function bothHandsIdle(player: PlayerState): boolean {
  return player.hands[0].state === 'idle' && player.hands[1].state === 'idle';
}

function opponentWindingUp(opponent: PlayerState): boolean {
  return opponent.hands[0].state === 'windup' || opponent.hands[1].state === 'windup';
}

function opponentAttacking(opponent: PlayerState): boolean {
  return opponent.hands[0].state === 'active' || opponent.hands[1].state === 'active';
}

function opponentInRecovery(opponent: PlayerState): boolean {
  return opponent.hands[0].state === 'recovery' || opponent.hands[1].state === 'recovery';
}

/** Pick hand based on bias. bias=0.5 is even, bias=0.6 means 60% preferred hand. */
function pickBiasedSlapHand(ai: PlayerState, preferredHand: 'left' | 'right', bias: number): { slapLeft: boolean; slapRight: boolean } {
  const leftIdle = ai.hands[0].state === 'idle';
  const rightIdle = ai.hands[1].state === 'idle';
  if (!leftIdle && !rightIdle) return { slapLeft: false, slapRight: false };
  if (leftIdle && !rightIdle) return { slapLeft: true, slapRight: false };
  if (!leftIdle && rightIdle) return { slapLeft: false, slapRight: true };
  // Both idle — use bias
  const usePreferred = Math.random() < bias;
  if (usePreferred) {
    return preferredHand === 'left'
      ? { slapLeft: true, slapRight: false }
      : { slapLeft: false, slapRight: true };
  }
  return preferredHand === 'left'
    ? { slapLeft: false, slapRight: true }
    : { slapLeft: true, slapRight: false };
}

/** Pick hand by alternating (least recently used) */
function pickAlternateHand(ai: PlayerState): { slapLeft: boolean; slapRight: boolean } {
  const leftIdle = ai.hands[0].state === 'idle';
  const rightIdle = ai.hands[1].state === 'idle';
  if (leftIdle && rightIdle) {
    return ai.lastSlapLeftTime <= ai.lastSlapRightTime
      ? { slapLeft: true, slapRight: false }
      : { slapLeft: false, slapRight: true };
  }
  if (leftIdle) return { slapLeft: true, slapRight: false };
  if (rightIdle) return { slapLeft: false, slapRight: true };
  return { slapLeft: false, slapRight: false };
}

/** Pick hand that matches opponent's winding-up hand (for intentional clash) */
function pickMatchingHand(ai: PlayerState, opponent: PlayerState): { slapLeft: boolean; slapRight: boolean } {
  if (opponent.hands[0].state === 'windup' && ai.hands[0].state === 'idle') {
    return { slapLeft: true, slapRight: false };
  }
  if (opponent.hands[1].state === 'windup' && ai.hands[1].state === 'idle') {
    return { slapLeft: false, slapRight: true };
  }
  return pickAlternateHand(ai);
}

/** Nearest corner position */
function nearestCorner(pos: Vec2): Vec2 {
  return {
    x: pos.x < 0 ? ARENA_X : ARENA_X + ARENA_W,
    y: pos.y < 0 ? ARENA_Y : ARENA_Y + ARENA_H,
  };
}

interface ScoreState {
  isAhead: boolean;
  isBehind: boolean;
  isDeciding: boolean;
  roundsBehind: number;
}

function getScoreState(state: GameState): ScoreState {
  const aiScore = state.scores[1];
  const oppScore = state.scores[0];
  return {
    isAhead: aiScore > oppScore,
    isBehind: aiScore < oppScore,
    isDeciding: aiScore === state.roundsToWin - 1 && oppScore === state.roundsToWin - 1,
    roundsBehind: Math.max(0, oppScore - aiScore),
  };
}

// ============================================================
// State Creation
// ============================================================

function createEmptyAdaptation(): AdaptationData {
  return {
    retreatBias: { x: 0, y: 0 },
    slapFrequency: 0,
    preferredDodgeDir: null,
    sampleCount: 0,
    lastOpponentPos: { x: 0, y: 0 },
    totalSlapsSeen: 0,
    observationTime: 0,
    opponentSlapPatterns: { leftFirst: 0, rightFirst: 0 },
    postKnockbackDir: { x: 0, y: 0 },
    edgePanicBehavior: null,
    approachAngleBias: 0,
    lastOpponentKBMag: 0,
  };
}

export function createAIState(existingAdaptation?: AdaptationData | null): AIState {
  return {
    decisionTimer: 0,
    currentInput: { ...EMPTY_INPUT },
    reactionTimer: 0,
    pendingInput: null,
    slapCooldownTimer: 0,
    consecutiveSlaps: 0,
    hesitationTimer: 0,
    jitterAngle: 0,
    jitterTimer: 0,
    gameTime: 0,
    tellPauseTimer: 0,
    wasInSlapRange: false,
    adaptation: existingAdaptation ?? null,
    doubleSlapTimer: 0,
    preferredHand: Math.random() < 0.5 ? 'left' : 'right',
    strafeSide: Math.random() < 0.5 ? 1 : -1,
    streakTimer: 0,
    isHotStreak: true,
    lastSlapWhiffed: false,
    slapIntervalTimer: 1.5 + Math.random(),
    microSpacePhase: 0,
  };
}

// ============================================================
// Adaptation (Hard + Expert)
// ============================================================

function updateAdaptation(adapt: AdaptationData, opponent: PlayerState, ai: PlayerState, dt: number): void {
  adapt.observationTime += dt;

  const dx = opponent.pos.x - adapt.lastOpponentPos.x;
  const dy = opponent.pos.y - adapt.lastOpponentPos.y;
  const moveMag = Math.sqrt(dx * dx + dy * dy);
  if (moveMag > 0.01) {
    const weight = 0.05;
    adapt.retreatBias.x = adapt.retreatBias.x * (1 - weight) + (dx / moveMag) * weight;
    adapt.retreatBias.y = adapt.retreatBias.y * (1 - weight) + (dy / moveMag) * weight;

    if (Math.abs(dx) > Math.abs(dy)) {
      adapt.sampleCount++;
      if (adapt.sampleCount > 20) {
        adapt.preferredDodgeDir = adapt.retreatBias.x > 0 ? 'right' : 'left';
      }
    }
  }

  const isSlapping = opponent.hands[0].state === 'active' || opponent.hands[1].state === 'active';
  if (isSlapping) adapt.totalSlapsSeen++;
  if (adapt.observationTime > 0.5) {
    adapt.slapFrequency = adapt.totalSlapsSeen / adapt.observationTime;
  }

  // Track which hand opponent leads with
  const leftWinding = opponent.hands[0].state === 'windup';
  const rightWinding = opponent.hands[1].state === 'windup';
  const leftIdle = opponent.hands[0].state === 'idle';
  const rightIdle = opponent.hands[1].state === 'idle';
  if (leftWinding && rightIdle) adapt.opponentSlapPatterns.leftFirst++;
  if (rightWinding && leftIdle) adapt.opponentSlapPatterns.rightFirst++;

  // Post-knockback DI tracking
  const kbMag = Math.sqrt(opponent.knockbackVel.x ** 2 + opponent.knockbackVel.y ** 2);
  if (adapt.lastOpponentKBMag > 1 && kbMag < 0.5 && moveMag > 0.01) {
    const w = 0.1;
    adapt.postKnockbackDir.x = adapt.postKnockbackDir.x * (1 - w) + (dx / moveMag) * w;
    adapt.postKnockbackDir.y = adapt.postKnockbackDir.y * (1 - w) + (dy / moveMag) * w;
  }
  adapt.lastOpponentKBMag = kbMag;

  // Edge panic behavior tracking
  const oppEdge = edgeDistances(opponent.pos).min;
  if (oppEdge < 1.5 && moveMag > 0.01) {
    const centerDir = vecToCenter(opponent.pos);
    const towardCenter = dx * centerDir.x + dy * centerDir.y;
    if (towardCenter > 0.5) {
      adapt.edgePanicBehavior = 'retreat';
    } else if (isSlapping) {
      adapt.edgePanicBehavior = 'attack';
    } else {
      adapt.edgePanicBehavior = 'dodge';
    }
  }

  // Approach angle bias
  const toAi = Math.atan2(ai.pos.y - opponent.pos.y, ai.pos.x - opponent.pos.x);
  const moveAngle = Math.atan2(dy, dx);
  const angleDiff = moveAngle - toAi;
  if (moveMag > 0.01) {
    const aw = 0.03;
    adapt.approachAngleBias = adapt.approachAngleBias * (1 - aw) + angleDiff * aw;
  }

  adapt.lastOpponentPos = { x: opponent.pos.x, y: opponent.pos.y };
}

// ============================================================
// Ability Decision Helpers
// ============================================================

function shouldUseBurrito(
  ai: PlayerState, opponent: PlayerState, config: AIDifficultyConfig, difficulty: AIDifficulty,
): boolean {
  if (ai.ability !== 'burrito' || ai.abilityCooldown > 0 || ai.isDashing) return false;
  if (Math.random() > config.abilityUseChance) return false;

  const d = dist(ai.pos, opponent.pos);
  const dashRange = DASH_SPEED * DASH_DURATION;

  if (difficulty === 'easy') return d < dashRange * 1.5;
  if (difficulty === 'medium') return d >= 2 && d <= 4;

  const oppEdge = edgeDistances(opponent.pos).min;
  const selfEdge = edgeDistances(ai.pos).min;

  if (difficulty === 'expert') {
    if (selfEdge < 1.0) return true;
    const aiDistToCenter = Math.sqrt(ai.pos.x ** 2 + ai.pos.y ** 2);
    const oppDistToCenter = Math.sqrt(opponent.pos.x ** 2 + opponent.pos.y ** 2);
    return d >= 1.2 && d <= dashRange && oppEdge < 2.0 && aiDistToCenter < oppDistToCenter;
  }

  // Hard
  if (selfEdge < 1.0) return true;
  return d >= 1.5 && d <= dashRange && oppEdge < 3;
}

function shouldUseMelon(
  ai: PlayerState, opponent: PlayerState, config: AIDifficultyConfig, difficulty: AIDifficulty,
): boolean {
  if (ai.ability !== 'melon' || ai.abilityCooldown > 0) return false;
  if (Math.random() > config.abilityUseChance) return false;

  const d = dist(ai.pos, opponent.pos);

  if (difficulty === 'easy') return d > 1.5;
  if (difficulty === 'medium') return d >= 3 && d <= 6;

  const oppEdge = edgeDistances(opponent.pos).min;
  if (difficulty === 'expert') return d >= 1.5 && (oppEdge < 3 || d >= 3);

  // Hard
  return d >= 2 && oppEdge < 3;
}

function shouldUseChild(
  ai: PlayerState, config: AIDifficultyConfig, difficulty: AIDifficulty,
): boolean {
  if (ai.ability !== 'child' || ai.abilityCooldown > 0 || ai.tauntTimer > 0) return false;
  if (difficulty === 'hard' || difficulty === 'expert') return false;
  if (Math.random() > config.abilityUseChance) return false;
  return true;
}

function checkMelonDoubleSlap(
  ai: PlayerState, opponent: PlayerState, state: GameState, config: AIDifficultyConfig,
): boolean {
  if (config.melonDoubleSlap === 'never') return false;

  const ownMelons = state.melons.filter(m => m.owner === 1);
  for (const melon of ownMelons) {
    const melonToOpp = dist(melon.pos, opponent.pos);
    if (melonToOpp > MELON_EXPLODE_RADIUS) continue;

    const aiToMelon = dist(ai.pos, melon.pos);

    if (config.melonDoubleSlap === 'random') {
      if (aiToMelon > MELON_EXPLODE_RADIUS) continue;
      return Math.random() < config.melonDetonateChance;
    }

    // Strategic: detonate when opponent near edge and AI outside blast
    const oppEdge = edgeDistances(opponent.pos).min;
    if (oppEdge < 2.0 && aiToMelon > MELON_EXPLODE_RADIUS * 0.8) {
      return true;
    }
  }
  return false;
}

// ============================================================
// Easy AI — "The Newbie"
// ============================================================

function evaluateEasy(
  state: GameState, aiState: AIState, config: AIDifficultyConfig,
): PlayerInput {
  const ai = state.players[1];
  const opponent = state.players[0];
  if (!ai.isAlive || ai.isFalling) return { ...EMPTY_INPUT };

  const toOpponent = normalize({ x: opponent.pos.x - ai.pos.x, y: opponent.pos.y - ai.pos.y });
  const facingAngle = Math.atan2(opponent.pos.y - ai.pos.y, opponent.pos.x - ai.pos.x);

  // Movement: mostly walk forward, slight random jitter
  let moveDir: Vec2 = {
    x: toOpponent.x * config.aggressionBias + (Math.random() - 0.5) * 0.2,
    y: toOpponent.y * config.aggressionBias + (Math.random() - 0.5) * 0.2,
  };

  // Apply jitter
  if (config.moveJitterDeg > 0) {
    moveDir = rotateVec(moveDir, aiState.jitterAngle);
  }

  let slapLeft = false;
  let slapRight = false;
  let wantAbility = false;

  // Timer-based slapping: fire at intervals regardless of distance
  if (aiState.slapIntervalTimer <= 0 && hasIdleHand(ai)) {
    if (Math.random() < config.slapAccuracy) {
      // Random hand 50/50
      const hand = pickAlternateHand(ai);
      slapLeft = hand.slapLeft;
      slapRight = hand.slapRight;
    }
    aiState.slapIntervalTimer = config.slapInterval[0] + Math.random() * (config.slapInterval[1] - config.slapInterval[0]);
  }

  // Double slap on timer: every 15-20s, mostly at wrong range
  if (aiState.doubleSlapTimer <= 0 && bothHandsIdle(ai)) {
    // 20% chance of being at correct range — rest are whiffs
    if (Math.random() < config.doubleSlapRangeAcc || dist(ai.pos, opponent.pos) < config.slapRange) {
      slapLeft = true;
      slapRight = true;
    }
    aiState.doubleSlapTimer = config.doubleSlapInterval + (Math.random() - 0.5) * 4;
  }

  // Random ability use
  if (shouldUseBurrito(ai, opponent, config, 'easy')
    || shouldUseMelon(ai, opponent, config, 'easy')
    || shouldUseChild(ai, config, 'easy')) {
    wantAbility = true;
  }

  const movement = worldDirToInput(moveDir, facingAngle);
  return { ...movement, slapLeft, slapRight, ability: wantAbility };
}

// ============================================================
// Medium AI — "The Regular"
// ============================================================

function evaluateMedium(
  state: GameState, aiState: AIState, config: AIDifficultyConfig,
): PlayerInput {
  const ai = state.players[1];
  const opponent = state.players[0];
  if (!ai.isAlive || ai.isFalling) return { ...EMPTY_INPUT };

  const d = dist(ai.pos, opponent.pos);
  const selfEdge = edgeDistances(ai.pos);
  const facingAngle = Math.atan2(opponent.pos.y - ai.pos.y, opponent.pos.x - ai.pos.x);
  const toOpponent = normalize({ x: opponent.pos.x - ai.pos.x, y: opponent.pos.y - ai.pos.y });
  const strafeDir: Vec2 = { x: -toOpponent.y, y: toOpponent.x };

  let moveDir: Vec2 = { x: 0, y: 0 };
  let slapLeft = false;
  let slapRight = false;
  let wantAbility = false;

  // Score sensitivity: more aggressive when behind
  const score = getScoreState(state);
  const aggressionMod = score.roundsBehind * config.scoreSensitivity * 0.1;
  const effectiveAggression = Math.min(1, config.aggressionBias + aggressionMod);

  // Priority 1: Edge flee (backward only)
  if (selfEdge.min < config.edgeFearDist) {
    // Medium retreats backward (toward opponent's side), not toward center
    moveDir = { x: -toOpponent.x, y: -toOpponent.y };
    // Actually backward from edge = away from nearest edge. But retreatMode=backward means
    // retreat linearly away from opponent direction — exploitable
    const centerDir = vecToCenter(ai.pos);
    // Use center direction but mixed with backward retreat
    moveDir = normalize({
      x: centerDir.x * 0.3 + (-toOpponent.x) * 0.7,
      y: centerDir.y * 0.3 + (-toOpponent.y) * 0.7,
    });
  }
  // Priority 2: Dodge incoming (biased direction)
  else if (opponentWindingUp(opponent) && Math.random() < config.dodgeProbability) {
    // Strafe in biased direction 65% of the time
    const dodgeSign = Math.random() < config.strafeBias ? aiState.strafeSide : -aiState.strafeSide;
    moveDir = { x: strafeDir.x * dodgeSign, y: strafeDir.y * dodgeSign };
  }
  // Priority 3: Hesitation
  else if (aiState.hesitationTimer > 0) {
    const wanderAngle = aiState.jitterAngle * Math.PI / 180;
    moveDir = { x: Math.cos(wanderAngle), y: Math.sin(wanderAngle) };
  }
  // Priority 4: Attack in range
  else if (d <= config.slapRange) {
    const canSlap = hasIdleHand(ai) && aiState.slapCooldownTimer <= 0
      && aiState.consecutiveSlaps < config.maxConsecutiveSlaps && aiState.tellPauseTimer <= 0;

    if (canSlap && Math.random() < config.slapAccuracy) {
      // 60/40 hand bias (exploitable)
      const hand = pickBiasedSlapHand(ai, aiState.preferredHand, config.handBias);
      slapLeft = hand.slapLeft;
      slapRight = hand.slapRight;

      // Frustrated double-tap: if previous slap whiffed, immediately throw other hand
      if (config.frustrationOnWhiff && aiState.lastSlapWhiffed && hasIdleHand(ai)) {
        // Throw the opposite hand
        const otherHand = slapLeft
          ? { slapLeft: false, slapRight: ai.hands[1].state === 'idle' }
          : { slapLeft: ai.hands[0].state === 'idle', slapRight: false };
        slapLeft = slapLeft || otherHand.slapLeft;
        slapRight = slapRight || otherHand.slapRight;
      }
      aiState.lastSlapWhiffed = false;
    }

    // Micro-position in range
    if (d < config.approachDist * 0.7) {
      moveDir = { x: -toOpponent.x, y: -toOpponent.y };
    } else if (d > config.slapRange * 0.85) {
      moveDir = toOpponent;
    }
  }
  // Priority 5: Double slap (when opponent close + not moving laterally)
  else if (aiState.doubleSlapTimer <= 0 && bothHandsIdle(ai) && d < config.slapRange * 1.3) {
    const oppVelMag = Math.sqrt(opponent.vel.x ** 2 + opponent.vel.y ** 2);
    if (oppVelMag < 1.0 && Math.random() < config.doubleSlapRangeAcc) {
      slapLeft = true;
      slapRight = true;
      aiState.doubleSlapTimer = config.doubleSlapInterval + (Math.random() - 0.5) * 3;
    }
  }
  // Priority 6: Melon detonation
  else if (checkMelonDoubleSlap(ai, opponent, state, config)) {
    slapLeft = true;
    slapRight = true;
  }
  // Priority 7: Ability use
  else if (shouldUseBurrito(ai, opponent, config, 'medium')
    || shouldUseMelon(ai, opponent, config, 'medium')
    || shouldUseChild(ai, config, 'medium')) {
    wantAbility = true;
    if (ai.ability !== 'child') moveDir = toOpponent;
  }
  // Priority 8: Approach with strafe bias
  else {
    if (d > config.approachDist) {
      const strafeMod = Math.random() < config.strafeBias ? aiState.strafeSide : -aiState.strafeSide;
      moveDir = normalize({
        x: toOpponent.x * effectiveAggression + strafeDir.x * (1 - effectiveAggression) * strafeMod,
        y: toOpponent.y * effectiveAggression + strafeDir.y * (1 - effectiveAggression) * strafeMod,
      });
    } else {
      const strafeMod = Math.random() < config.strafeBias ? aiState.strafeSide : -aiState.strafeSide;
      moveDir = { x: strafeDir.x * strafeMod, y: strafeDir.y * strafeMod };
    }

    // Center drift when far
    if (d > config.approachDist * 2) {
      const centerDir = vecToCenter(ai.pos);
      moveDir = normalize({
        x: moveDir.x * 0.7 + centerDir.x * 0.3,
        y: moveDir.y * 0.7 + centerDir.y * 0.3,
      });
    }
  }

  // Child hit-and-run
  if (ai.ability === 'child' && (slapLeft || slapRight)) {
    moveDir = { x: -toOpponent.x, y: -toOpponent.y };
  }

  // Apply jitter
  if (config.moveJitterDeg > 0 && (moveDir.x !== 0 || moveDir.y !== 0)) {
    moveDir = rotateVec(moveDir, aiState.jitterAngle);
  }

  const movement = worldDirToInput(moveDir, facingAngle);
  return { ...movement, slapLeft, slapRight, ability: wantAbility };
}

// ============================================================
// Hard AI — "The Competitor"
// ============================================================

function evaluateHard(
  state: GameState, aiState: AIState, config: AIDifficultyConfig,
): PlayerInput {
  const ai = state.players[1];
  const opponent = state.players[0];
  if (!ai.isAlive || ai.isFalling) return { ...EMPTY_INPUT };

  const d = dist(ai.pos, opponent.pos);
  const selfEdge = edgeDistances(ai.pos);
  const oppEdge = edgeDistances(opponent.pos);
  const facingAngle = Math.atan2(opponent.pos.y - ai.pos.y, opponent.pos.x - ai.pos.x);
  const toOpponent = normalize({ x: opponent.pos.x - ai.pos.x, y: opponent.pos.y - ai.pos.y });
  const strafeDir: Vec2 = { x: -toOpponent.y, y: toOpponent.x };

  let moveDir: Vec2 = { x: 0, y: 0 };
  let slapLeft = false;
  let slapRight = false;
  let wantAbility = false;

  // Score sensitivity
  const score = getScoreState(state);
  let effectiveEdgeFear = config.edgeFearDist;
  let effectiveAggression = config.aggressionBias;
  if (score.isAhead) {
    effectiveEdgeFear += 0.5; // more conservative
    effectiveAggression -= 0.15;
  } else if (score.isBehind) {
    effectiveEdgeFear -= 0.3;
    effectiveAggression += 0.15;
  }
  if (score.isDeciding) {
    effectiveAggression = Math.min(effectiveAggression, 0.65); // tighter play
  }

  // Priority 1: Edge flee toward center
  if (selfEdge.min < effectiveEdgeFear) {
    moveDir = vecToCenter(ai.pos);
  }
  // Priority 2: Intentional clash — when near edge and opponent attacking, match hand
  else if (selfEdge.min < effectiveEdgeFear + 1.0 && opponentWindingUp(opponent) && d < config.slapRange * 1.5) {
    // Match opponent's hand to force a clash (deny push when in danger)
    const hand = pickMatchingHand(ai, opponent);
    slapLeft = hand.slapLeft;
    slapRight = hand.slapRight;
    // Strafe while clashing
    const dodgeSign = aiState.adaptation?.preferredDodgeDir === 'right' ? -1 : 1;
    moveDir = { x: strafeDir.x * dodgeSign, y: strafeDir.y * dodgeSign };
  }
  // Priority 3: Dodge incoming attack (adaptation-based direction)
  else if (opponentWindingUp(opponent) && Math.random() < config.dodgeProbability) {
    let dodgeSign = Math.random() < 0.5 ? 1 : -1;
    if (aiState.adaptation?.preferredDodgeDir) {
      dodgeSign = aiState.adaptation.preferredDodgeDir === 'right' ? -1 : 1;
    }
    moveDir = { x: strafeDir.x * dodgeSign, y: strafeDir.y * dodgeSign };
  }
  // Priority 4: Punish opponent recovery (behavior-triggered attack)
  else if (opponentInRecovery(opponent) && d <= config.slapRange && hasIdleHand(ai)) {
    // Guaranteed punish during recovery frames
    const hand = pickAlternateHand(ai);
    slapLeft = hand.slapLeft;
    slapRight = hand.slapRight;
    moveDir = toOpponent; // close in for the punish
  }
  // Priority 5: Micro-spacing at range boundary
  else if (d > config.slapRange * 0.8 && d < config.slapRange * 1.3) {
    // Oscillate forward/back to bait attacks
    aiState.microSpacePhase += 0.05;
    const oscillate = Math.sin(aiState.microSpacePhase * Math.PI * 2);
    moveDir = {
      x: toOpponent.x * oscillate * 0.5 + strafeDir.x * 0.5,
      y: toOpponent.y * oscillate * 0.5 + strafeDir.y * 0.5,
    };

    // Attack when in range and opponent committed
    if (d <= config.slapRange && hasIdleHand(ai) && aiState.slapCooldownTimer <= 0
        && aiState.consecutiveSlaps < config.maxConsecutiveSlaps) {
      if (Math.random() < config.slapAccuracy) {
        // Adaptive hand choice: counter opponent's pattern
        const hand = adaptiveHandChoice(ai, aiState, config);
        slapLeft = hand.slapLeft;
        slapRight = hand.slapRight;
      }
    }
  }
  // Priority 6: Double slap setup (opponent near edge + trapped)
  else if (oppEdge.min < 2.0 && d < config.slapRange * 1.5 && bothHandsIdle(ai)
           && aiState.doubleSlapTimer <= 0 && Math.random() < config.doubleSlapRangeAcc) {
    // Check if opponent's lateral escape is limited
    const oppVelMag = Math.sqrt(opponent.vel.x ** 2 + opponent.vel.y ** 2);
    if (oppVelMag < 2.0) {
      slapLeft = true;
      slapRight = true;
      aiState.doubleSlapTimer = config.doubleSlapInterval + (Math.random() - 0.5) * 2;
    }
  }
  // Priority 7: Melon detonation
  else if (checkMelonDoubleSlap(ai, opponent, state, config)) {
    slapLeft = true;
    slapRight = true;
  }
  // Priority 8: Ability use
  else if (shouldUseBurrito(ai, opponent, config, 'hard')
    || shouldUseMelon(ai, opponent, config, 'hard')
    || shouldUseChild(ai, config, 'hard')) {
    wantAbility = true;
    if (ai.ability !== 'child') moveDir = toOpponent;
  }
  // Priority 9: Herding approach
  else {
    if (d > config.approachDist) {
      moveDir = normalize({
        x: toOpponent.x * effectiveAggression + strafeDir.x * (1 - effectiveAggression),
        y: toOpponent.y * effectiveAggression + strafeDir.y * (1 - effectiveAggression),
      });
    } else {
      moveDir = strafeDir;
    }

    // Herding: angle approach to push opponent toward nearest edge
    if (oppEdge.min < 2.5 && d > config.approachDist) {
      const centerToOpp = normalize({ x: opponent.pos.x, y: opponent.pos.y });
      moveDir = normalize({
        x: toOpponent.x * 0.6 + centerToOpp.x * 0.4,
        y: toOpponent.y * 0.6 + centerToOpp.y * 0.4,
      });
    }

    // Center drift
    if (d > config.approachDist * 2) {
      const centerDir = vecToCenter(ai.pos);
      moveDir = normalize({
        x: moveDir.x * 0.7 + centerDir.x * 0.3,
        y: moveDir.y * 0.7 + centerDir.y * 0.3,
      });
    }
  }

  // Slap feint: brief forward movement to bait reactions
  // (When circling at range, occasionally step forward then back)
  if (!slapLeft && !slapRight && d > config.slapRange * 0.9 && d < config.slapRange * 1.2) {
    if (Math.random() < 0.05) {
      moveDir = toOpponent; // brief forward step (feint)
    }
  }

  // Child hit-and-run
  if (ai.ability === 'child' && (slapLeft || slapRight)) {
    const centerDir = vecToCenter(ai.pos);
    moveDir = normalize({
      x: -toOpponent.x * 0.5 + centerDir.x * 0.5,
      y: -toOpponent.y * 0.5 + centerDir.y * 0.5,
    });
  }

  // Force consecutive slap pause
  if (aiState.consecutiveSlaps >= config.maxConsecutiveSlaps) {
    slapLeft = false;
    slapRight = false;
    moveDir = { x: -toOpponent.x, y: -toOpponent.y };
  }

  // Apply jitter
  if (config.moveJitterDeg > 0 && (moveDir.x !== 0 || moveDir.y !== 0)) {
    moveDir = rotateVec(moveDir, aiState.jitterAngle);
  }

  const movement = worldDirToInput(moveDir, facingAngle);
  return { ...movement, slapLeft, slapRight, ability: wantAbility };
}

/** Adaptive hand choice for Hard+: counter opponent's recent pattern */
function adaptiveHandChoice(
  ai: PlayerState, aiState: AIState, _config: AIDifficultyConfig,
): { slapLeft: boolean; slapRight: boolean } {
  if (!aiState.adaptation) return pickAlternateHand(ai);

  const pat = aiState.adaptation.opponentSlapPatterns;
  const total = pat.leftFirst + pat.rightFirst;
  if (total < 4) return pickAlternateHand(ai); // not enough data

  // Counter: if opponent favors left, throw right (avoid clash, land hit)
  const oppFavorsLeft = pat.leftFirst / total > 0.55;
  const oppFavorsRight = pat.rightFirst / total > 0.55;

  if (oppFavorsLeft && ai.hands[1].state === 'idle') {
    return { slapLeft: false, slapRight: true };
  }
  if (oppFavorsRight && ai.hands[0].state === 'idle') {
    return { slapLeft: true, slapRight: false };
  }
  return pickAlternateHand(ai);
}

// ============================================================
// Expert AI — "The Master"
// ============================================================

function evaluateExpert(
  state: GameState, aiState: AIState, config: AIDifficultyConfig,
): PlayerInput {
  const ai = state.players[1];
  const opponent = state.players[0];
  if (!ai.isAlive || ai.isFalling) return { ...EMPTY_INPUT };

  const d = dist(ai.pos, opponent.pos);
  const selfEdge = edgeDistances(ai.pos);
  const oppEdge = edgeDistances(opponent.pos);
  const facingAngle = Math.atan2(opponent.pos.y - ai.pos.y, opponent.pos.x - ai.pos.x);
  const toOpponent = normalize({ x: opponent.pos.x - ai.pos.x, y: opponent.pos.y - ai.pos.y });
  const strafeDir: Vec2 = { x: -toOpponent.y, y: toOpponent.x };

  let moveDir: Vec2 = { x: 0, y: 0 };
  let slapLeft = false;
  let slapRight = false;
  let wantAbility = false;

  // Humanization: intentional misread (~15%)
  const isMisread = Math.random() < config.misreadChance;

  // Score sensitivity (advanced)
  const score = getScoreState(state);
  let effectiveEdgeFear = config.edgeFearDist;
  let effectiveAggression = config.aggressionBias;
  if (score.isAhead) {
    effectiveAggression -= 0.1; // controlled, not reckless
  } else if (score.isBehind) {
    effectiveAggression += 0.2;
    effectiveEdgeFear -= 0.5; // willing to take more risks
  }
  if (score.isDeciding) {
    effectiveAggression = Math.min(effectiveAggression, 0.7);
  }

  // Hot/cold streak affects accuracy
  const streakAccuracyMod = aiState.isHotStreak ? 0.02 : -0.05;
  const effectiveAccuracy = Math.min(1, config.slapAccuracy + streakAccuracyMod);

  // Priority 1: Edge flee toward center
  if (selfEdge.min < effectiveEdgeFear) {
    moveDir = vecToCenter(ai.pos);
    // Expert: strafe while retreating for unpredictability
    const lateralMix = 0.3;
    const dodgeSign = Math.random() < 0.5 ? 1 : -1;
    moveDir = normalize({
      x: moveDir.x * (1 - lateralMix) + strafeDir.x * dodgeSign * lateralMix,
      y: moveDir.y * (1 - lateralMix) + strafeDir.y * dodgeSign * lateralMix,
    });
  }
  // Priority 2: Intentional clash when in danger
  else if (selfEdge.min < effectiveEdgeFear + 1.5 && opponentWindingUp(opponent) && d < config.slapRange * 1.5) {
    if (!isMisread) {
      const hand = pickMatchingHand(ai, opponent);
      slapLeft = hand.slapLeft;
      slapRight = hand.slapRight;
    } else {
      // Misread: throw wrong hand (opponent's hit lands)
      const hand = pickAlternateHand(ai);
      slapLeft = hand.slapLeft;
      slapRight = hand.slapRight;
    }
    // Strafe toward center while clashing
    const centerDir = vecToCenter(ai.pos);
    moveDir = normalize({
      x: strafeDir.x * 0.5 + centerDir.x * 0.5,
      y: strafeDir.y * 0.5 + centerDir.y * 0.5,
    });
  }
  // Priority 3: Dodge (with adaptation-based prediction)
  else if (opponentWindingUp(opponent) && Math.random() < config.dodgeProbability) {
    let dodgeSign = 1;
    if (!isMisread && aiState.adaptation) {
      // Predict opponent's hand and dodge to correct side
      const pat = aiState.adaptation.opponentSlapPatterns;
      if (pat.leftFirst + pat.rightFirst > 5) {
        dodgeSign = pat.leftFirst > pat.rightFirst ? -1 : 1;
      } else if (aiState.adaptation.preferredDodgeDir) {
        dodgeSign = aiState.adaptation.preferredDodgeDir === 'right' ? -1 : 1;
      }
    } else if (isMisread) {
      dodgeSign = Math.random() < 0.5 ? 1 : -1; // random on misread
    }
    moveDir = { x: strafeDir.x * dodgeSign, y: strafeDir.y * dodgeSign };

    // Counter-slap after dodge
    if (hasIdleHand(ai)) {
      const hand = adaptiveHandChoice(ai, aiState, config);
      slapLeft = hand.slapLeft;
      slapRight = hand.slapRight;
    }
  }
  // Priority 4: Punish recovery (guaranteed hit)
  else if (opponentInRecovery(opponent) && d <= config.slapRange && hasIdleHand(ai)) {
    const hand = adaptiveHandChoice(ai, aiState, config);
    slapLeft = hand.slapLeft;
    slapRight = hand.slapRight;
    moveDir = toOpponent;
  }
  // Priority 5: Micro-spacing with timing mixups
  else if (d > config.slapRange * 0.75 && d < config.slapRange * 1.4) {
    // Oscillate for micro-spacing
    aiState.microSpacePhase += 0.06;
    const oscillate = Math.sin(aiState.microSpacePhase * Math.PI * 2);
    moveDir = {
      x: toOpponent.x * oscillate * 0.4 + strafeDir.x * 0.6,
      y: toOpponent.y * oscillate * 0.4 + strafeDir.y * 0.6,
    };
    // Change strafe direction unpredictably
    if (Math.random() < 0.02) {
      moveDir = { x: -moveDir.x, y: -moveDir.y };
    }

    // Attack with timing mixups
    if (d <= config.slapRange && hasIdleHand(ai) && aiState.slapCooldownTimer <= 0
        && aiState.consecutiveSlaps < config.maxConsecutiveSlaps) {
      // Timing mixup: immediate (70%), delayed (20%), or skip for fake (10%)
      const timing = Math.random();
      if (timing < 0.7 && Math.random() < effectiveAccuracy) {
        const hand = adaptiveHandChoice(ai, aiState, config);
        slapLeft = hand.slapLeft;
        slapRight = hand.slapRight;
      } else if (timing < 0.9) {
        // Delayed: add slight tell pause for this slap
        aiState.tellPauseTimer = 0.08 + Math.random() * 0.12;
      }
      // else: skip (double-pump fake — step forward as if to slap, pull back)
    }
  }
  // Priority 6: Double slap as precision kill tool
  else if (oppEdge.min < 1.5 && d < config.slapRange * 1.3 && bothHandsIdle(ai)
           && aiState.doubleSlapTimer <= 0) {
    // Only if opponent is trapped (low velocity near edge)
    const oppVelMag = Math.sqrt(opponent.vel.x ** 2 + opponent.vel.y ** 2);
    if (oppVelMag < 1.5 && Math.random() < config.doubleSlapRangeAcc) {
      if (!isMisread) {
        slapLeft = true;
        slapRight = true;
      }
      aiState.doubleSlapTimer = config.doubleSlapInterval + (Math.random() - 0.5) * 1;
    }
  }
  // Priority 7: Melon detonation
  else if (checkMelonDoubleSlap(ai, opponent, state, config)) {
    slapLeft = true;
    slapRight = true;
  }
  // Priority 8: Ability use
  else if (shouldUseBurrito(ai, opponent, config, 'expert')
    || shouldUseMelon(ai, opponent, config, 'expert')
    || shouldUseChild(ai, config, 'expert')) {
    wantAbility = true;
    if (ai.ability !== 'child') moveDir = toOpponent;
  }
  // Priority 9: Angular pressure toward corners + herding
  else {
    if (d > config.approachDist) {
      moveDir = normalize({
        x: toOpponent.x * effectiveAggression + strafeDir.x * (1 - effectiveAggression),
        y: toOpponent.y * effectiveAggression + strafeDir.y * (1 - effectiveAggression),
      });
    } else {
      moveDir = strafeDir;
    }

    // Angular pressure: herd toward nearest corner (not just edge)
    if (oppEdge.min < 3.5 && d > config.approachDist) {
      const corner = nearestCorner(opponent.pos);
      const toCorner = normalize({ x: corner.x - opponent.pos.x, y: corner.y - opponent.pos.y });
      // Approach from direction that pushes opponent toward corner
      const herdDir = normalize({
        x: toOpponent.x * 0.4 + (-toCorner.x) * 0.6,
        y: toOpponent.y * 0.4 + (-toCorner.y) * 0.6,
      });
      // Use retreat bias to approach from direction opponent won't escape
      if (aiState.adaptation) {
        const rb = aiState.adaptation.retreatBias;
        const rbMag = Math.sqrt(rb.x ** 2 + rb.y ** 2);
        if (rbMag > 0.1) {
          moveDir = normalize({
            x: herdDir.x - rb.x * 0.3,
            y: herdDir.y - rb.y * 0.3,
          });
        } else {
          moveDir = herdDir;
        }
      } else {
        moveDir = herdDir;
      }
    }

    // Center control: when not engaging, drift toward center
    const aiDistToCenter = Math.sqrt(ai.pos.x ** 2 + ai.pos.y ** 2);
    if (aiDistToCenter > 2 && d > config.slapRange * 1.5) {
      const centerDir = vecToCenter(ai.pos);
      moveDir = normalize({
        x: moveDir.x * 0.4 + centerDir.x * 0.6,
        y: moveDir.y * 0.4 + centerDir.y * 0.6,
      });
    }

    // Max aggression when opponent near edge
    if (oppEdge.min < 1.5) {
      moveDir = toOpponent;
    }
  }

  // Child hit-and-run: retreat toward center
  if (ai.ability === 'child' && (slapLeft || slapRight)) {
    const centerDir = vecToCenter(ai.pos);
    moveDir = normalize({
      x: -toOpponent.x * 0.5 + centerDir.x * 0.5,
      y: -toOpponent.y * 0.5 + centerDir.y * 0.5,
    });
  }

  // Consecutive slap limit
  if (aiState.consecutiveSlaps >= config.maxConsecutiveSlaps) {
    slapLeft = false;
    slapRight = false;
    moveDir = { x: -toOpponent.x, y: -toOpponent.y };
  }

  // Minimal jitter (nearly perfect movement)
  if (config.moveJitterDeg > 0 && (moveDir.x !== 0 || moveDir.y !== 0)) {
    moveDir = rotateVec(moveDir, aiState.jitterAngle);
  }

  const movement = worldDirToInput(moveDir, facingAngle);
  return { ...movement, slapLeft, slapRight, ability: wantAbility };
}

// ============================================================
// Decision Dispatch
// ============================================================

function evaluateDecision(
  state: GameState, aiState: AIState, config: AIDifficultyConfig, difficulty: AIDifficulty,
): PlayerInput {
  switch (difficulty) {
    case 'easy': return evaluateEasy(state, aiState, config);
    case 'medium': return evaluateMedium(state, aiState, config);
    case 'hard': return evaluateHard(state, aiState, config);
    case 'expert': return evaluateExpert(state, aiState, config);
  }
}

// ============================================================
// Main Export
// ============================================================

export function updateAI(
  state: GameState, aiState: AIState, difficulty: AIDifficulty, dt: number,
): PlayerInput {
  const config = AI_CONFIGS[difficulty];
  const ai = state.players[1];
  const opponent = state.players[0];

  if (!ai.isAlive || ai.isFalling) return { ...EMPTY_INPUT };

  // Update timers
  aiState.gameTime += dt;
  aiState.slapCooldownTimer = Math.max(0, aiState.slapCooldownTimer - dt);
  aiState.hesitationTimer = Math.max(0, aiState.hesitationTimer - dt);
  aiState.tellPauseTimer = Math.max(0, aiState.tellPauseTimer - dt);
  aiState.doubleSlapTimer = Math.max(0, aiState.doubleSlapTimer - dt);

  // Easy: slap interval timer
  if (config.useTimerSlap) {
    aiState.slapIntervalTimer -= dt;
  }

  // Update jitter
  aiState.jitterTimer -= dt;
  if (aiState.jitterTimer <= 0) {
    aiState.jitterAngle = (Math.random() - 0.5) * 2 * config.moveJitterDeg;
    aiState.jitterTimer = config.jitterChangeInterval;
  }

  // Update adaptation (Hard and Expert)
  if (difficulty === 'hard' || difficulty === 'expert') {
    if (!aiState.adaptation) aiState.adaptation = createEmptyAdaptation();
    updateAdaptation(aiState.adaptation, opponent, ai, dt);
  }

  // Expert: hot/cold streaks
  if (difficulty === 'expert') {
    aiState.streakTimer -= dt;
    if (aiState.streakTimer <= 0) {
      aiState.isHotStreak = !aiState.isHotStreak;
      aiState.streakTimer = aiState.isHotStreak ? 2.5 + Math.random() * 1.0 : 1.5 + Math.random() * 1.0;
    }
  }

  // Decision tick
  aiState.decisionTimer -= dt;
  if (aiState.decisionTimer <= 0) {
    // Compute effective reaction delay (with Expert R3 penalty)
    let effectiveReactionDelay = config.reactionDelay;
    if (difficulty === 'expert') {
      const score = getScoreState(state);
      if (score.isDeciding) {
        effectiveReactionDelay += config.r3ReactionPenalty;
      }
      // Cold streak: slightly slower
      if (!aiState.isHotStreak) {
        effectiveReactionDelay += 0.02;
      }
    }

    aiState.decisionTimer = config.decisionInterval + (Math.random() - 0.5) * config.decisionInterval * 0.3;

    // Roll hesitation (Medium only)
    if (config.hesitationChance > 0 && aiState.hesitationTimer <= 0 && Math.random() < config.hesitationChance) {
      aiState.hesitationTimer = config.hesitationDuration;
    }

    // Tell pause: one-time delay on entering slap range
    const d = dist(ai.pos, opponent.pos);
    const inRange = d <= config.slapRange;
    if (inRange && !aiState.wasInSlapRange && config.tellFactor > 0) {
      aiState.tellPauseTimer = config.tellFactor * 0.15;
    }
    aiState.wasInSlapRange = inRange;

    // Evaluate decision
    const newInput = evaluateDecision(state, aiState, config, difficulty);

    // Track consecutive slaps
    if (newInput.slapLeft || newInput.slapRight) {
      aiState.consecutiveSlaps++;
      aiState.slapCooldownTimer = config.slapCooldown;
    }
    if (!newInput.slapLeft && !newInput.slapRight && !opponentAttacking(opponent)) {
      if (aiState.slapCooldownTimer <= 0) {
        aiState.consecutiveSlaps = 0;
      }
    }

    // Queue with reaction delay
    aiState.pendingInput = newInput;
    aiState.reactionTimer = effectiveReactionDelay;
  }

  // Drain reaction queue
  aiState.reactionTimer -= dt;
  if (aiState.reactionTimer <= 0 && aiState.pendingInput) {
    aiState.currentInput = aiState.pendingInput;
    aiState.pendingInput = null;
  }

  // Edge-triggered: after returning slap/ability, clear them
  const result = { ...aiState.currentInput };
  aiState.currentInput.slapLeft = false;
  aiState.currentInput.slapRight = false;
  aiState.currentInput.ability = false;

  return result;
}
