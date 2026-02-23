import type { GameState, PlayerInput, AIDifficulty, Vec2, PlayerState } from '../types.ts';
import type { AIState, AIDifficultyConfig, AdaptationData } from './aiConfig.ts';
import { AI_CONFIGS, EMPTY_INPUT } from './aiConfig.ts';
import {
  ARENA_X, ARENA_W, ARENA_Y, ARENA_H,
  MELON_EXPLODE_RADIUS,
  DASH_SPEED, DASH_DURATION,
} from '../constants.ts';

// --- Helpers ---

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

function opponentWindingUp(opponent: PlayerState): boolean {
  return opponent.hands[0].state === 'windup' || opponent.hands[1].state === 'windup';
}

function opponentAttacking(opponent: PlayerState): boolean {
  return opponent.hands[0].state === 'active' || opponent.hands[1].state === 'active';
}

function pickSlapHand(ai: PlayerState): { slapLeft: boolean; slapRight: boolean } {
  const leftIdle = ai.hands[0].state === 'idle';
  const rightIdle = ai.hands[1].state === 'idle';
  if (leftIdle && rightIdle) {
    // Alternate: pick the one that slapped less recently
    if (ai.lastSlapLeftTime <= ai.lastSlapRightTime) {
      return { slapLeft: true, slapRight: false };
    }
    return { slapLeft: false, slapRight: true };
  }
  if (leftIdle) return { slapLeft: true, slapRight: false };
  if (rightIdle) return { slapLeft: false, slapRight: true };
  return { slapLeft: false, slapRight: false };
}

// --- State Creation ---

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

function isHighDifficulty(difficulty: AIDifficulty): boolean {
  return difficulty === 'hard' || difficulty === 'expert';
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
    wantsDoubleSlap: false,
    gameTime: 0,
    tellPauseTimer: 0,
    wasInSlapRange: false,
    adaptation: existingAdaptation ?? null,
  };
}

// --- Adaptation (Hard only) ---

function updateAdaptation(adapt: AdaptationData, opponent: PlayerState, ai: PlayerState, dt: number): void {
  adapt.observationTime += dt;

  // Track opponent movement direction as retreat bias
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

  // Track opponent slap frequency
  const isSlapping = opponent.hands[0].state === 'active' || opponent.hands[1].state === 'active';
  if (isSlapping) {
    adapt.totalSlapsSeen++;
  }
  if (adapt.observationTime > 0.5) {
    adapt.slapFrequency = adapt.totalSlapsSeen / adapt.observationTime;
  }

  // Expert: track which hand opponent leads with
  const leftWinding = opponent.hands[0].state === 'windup';
  const rightWinding = opponent.hands[1].state === 'windup';
  const leftIdle = opponent.hands[0].state === 'idle';
  const rightIdle = opponent.hands[1].state === 'idle';
  if (leftWinding && rightIdle) adapt.opponentSlapPatterns.leftFirst++;
  if (rightWinding && leftIdle) adapt.opponentSlapPatterns.rightFirst++;

  // Expert: track post-knockback direction (where opponent DIs after being hit)
  const kbMag = Math.sqrt(opponent.knockbackVel.x ** 2 + opponent.knockbackVel.y ** 2);
  if (adapt.lastOpponentKBMag > 1 && kbMag < 0.5 && moveMag > 0.01) {
    // Opponent just recovered from knockback — record their DI
    const w = 0.1;
    adapt.postKnockbackDir.x = adapt.postKnockbackDir.x * (1 - w) + (dx / moveMag) * w;
    adapt.postKnockbackDir.y = adapt.postKnockbackDir.y * (1 - w) + (dy / moveMag) * w;
  }
  adapt.lastOpponentKBMag = kbMag;

  // Expert: track edge panic behavior
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

  // Expert: track approach angle bias
  const toAi = Math.atan2(ai.pos.y - opponent.pos.y, ai.pos.x - opponent.pos.x);
  const moveAngle = Math.atan2(dy, dx);
  const angleDiff = moveAngle - toAi;
  if (moveMag > 0.01) {
    const aw = 0.03;
    adapt.approachAngleBias = adapt.approachAngleBias * (1 - aw) + angleDiff * aw;
  }

  adapt.lastOpponentPos = { x: opponent.pos.x, y: opponent.pos.y };
}

// --- Ability Decision Helpers ---

function shouldUseBurrito(
  ai: PlayerState, opponent: PlayerState, config: AIDifficultyConfig, difficulty: AIDifficulty,
): boolean {
  if (ai.ability !== 'burrito' || ai.abilityCooldown > 0 || ai.isDashing) return false;
  if (Math.random() > config.abilityUseChance) return false;

  const d = dist(ai.pos, opponent.pos);
  const dashRange = DASH_SPEED * DASH_DURATION;

  if (difficulty === 'easy') {
    return d < dashRange * 1.5; // often too far or too close
  }
  if (difficulty === 'medium') {
    return d >= 2 && d <= 4;
  }

  const oppEdge = edgeDistances(opponent.pos).min;
  const selfEdge = edgeDistances(ai.pos).min;

  // Expert: dash-punch combo — only dash when opponent near edge and AI is
  // between them and center, or to escape a corner
  if (difficulty === 'expert') {
    if (selfEdge < 1.0) return true; // escape corner
    // Only dash when opponent is near edge and AI can push them further out
    const aiDistToCenter = Math.sqrt(ai.pos.x ** 2 + ai.pos.y ** 2);
    const oppDistToCenter = Math.sqrt(opponent.pos.x ** 2 + opponent.pos.y ** 2);
    return d >= 1.2 && d <= dashRange && oppEdge < 2.0 && aiDistToCenter < oppDistToCenter;
  }

  // Hard: dash to push toward edge, or dash to escape edge
  if (selfEdge < 1.0) return true; // escape
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

  // Expert: throw melon to cut off retreat toward center
  // More liberal with throws — any time opponent is near edge or at mid-range
  const oppEdge = edgeDistances(opponent.pos).min;
  if (difficulty === 'expert') {
    return d >= 1.5 && (oppEdge < 3 || d >= 3);
  }

  // Hard: throw when opponent has limited escape routes
  return d >= 2 && oppEdge < 3;
}

function shouldUseChild(
  ai: PlayerState, config: AIDifficultyConfig, difficulty: AIDifficulty,
): boolean {
  if (ai.ability !== 'child' || ai.abilityCooldown > 0 || ai.tauntTimer > 0) return false;
  // Hard/Expert never taunts (waste of frames)
  if (isHighDifficulty(difficulty)) return false;
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
      // Also check AI is in range to detonate
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

// --- Main Decision Evaluation ---

function evaluateDecision(
  state: GameState, aiState: AIState, config: AIDifficultyConfig, difficulty: AIDifficulty,
): PlayerInput {
  const ai = state.players[1];
  const opponent = state.players[0];

  if (!ai.isAlive || ai.isFalling) return { ...EMPTY_INPUT };

  const d = dist(ai.pos, opponent.pos);
  const selfEdge = edgeDistances(ai.pos);
  const facingAngle = Math.atan2(opponent.pos.y - ai.pos.y, opponent.pos.x - ai.pos.x);

  // Compute direction toward opponent
  const toOpponent = normalize({ x: opponent.pos.x - ai.pos.x, y: opponent.pos.y - ai.pos.y });

  // Perpendicular for strafing (pick consistent side)
  const strafeDir: Vec2 = { x: -toOpponent.y, y: toOpponent.x };

  let moveDir: Vec2 = { x: 0, y: 0 };
  let wantSlap = false;
  let slapLeft = false;
  let slapRight = false;
  let wantAbility = false;

  // --- Priority 1: Edge flee ---
  if (selfEdge.min < config.edgeFearDist) {
    const centerDir = vecToCenter(ai.pos);
    moveDir = centerDir;
  }
  // --- Priority 2: Dodge incoming attack ---
  else if (opponentWindingUp(opponent) && Math.random() < config.dodgeProbability) {
    // Sidestep perpendicular to facing; high difficulties dodge based on adaptation
    let dodgeSign = 1;
    if (isHighDifficulty(difficulty) && aiState.adaptation?.preferredDodgeDir) {
      dodgeSign = aiState.adaptation.preferredDodgeDir === 'right' ? -1 : 1;
    }
    // Expert: predict which hand and dodge to the correct side
    if (difficulty === 'expert' && aiState.adaptation) {
      const pat = aiState.adaptation.opponentSlapPatterns;
      if (pat.leftFirst + pat.rightFirst > 5) {
        dodgeSign = pat.leftFirst > pat.rightFirst ? -1 : 1;
      }
    }
    moveDir = { x: strafeDir.x * dodgeSign, y: strafeDir.y * dodgeSign };
    // Expert: queue counter-slap after dodge (opponent will be in recovery soon)
    if (difficulty === 'expert' && hasIdleHand(ai)) {
      wantSlap = true;
      const hand = pickSlapHand(ai);
      slapLeft = hand.slapLeft;
      slapRight = hand.slapRight;
    }
  }
  // --- Priority 3: Hesitation (Easy/Medium) ---
  else if (aiState.hesitationTimer > 0) {
    // Wander randomly
    const wanderAngle = aiState.jitterAngle * Math.PI / 180;
    moveDir = { x: Math.cos(wanderAngle), y: Math.sin(wanderAngle) };
  }
  // --- Priority 4: Attack if in range ---
  else if (d <= config.slapRange) {
    const canSlap = hasIdleHand(ai) && aiState.slapCooldownTimer <= 0
      && aiState.consecutiveSlaps < config.maxConsecutiveSlaps && aiState.tellPauseTimer <= 0;
    if (canSlap && Math.random() < config.slapAccuracy) {
      wantSlap = true;
      const hand = pickSlapHand(ai);
      slapLeft = hand.slapLeft;
      slapRight = hand.slapRight;
    }
    // Position: back off if too close, approach if at outer edge of slap range
    if (d < config.approachDist * 0.7) {
      moveDir = { x: -toOpponent.x, y: -toOpponent.y };
    } else if (d > config.slapRange * 0.85) {
      moveDir = toOpponent; // close in to land the hit
    }
  }
  // --- Priority 5: Melon double-slap check ---
  else if (checkMelonDoubleSlap(ai, opponent, state, config)) {
    slapLeft = true;
    slapRight = true;
    wantSlap = true;
  }
  // --- Priority 6: Use ability ---
  else if (shouldUseBurrito(ai, opponent, config, difficulty)
    || shouldUseMelon(ai, opponent, config, difficulty)
    || shouldUseChild(ai, config, difficulty)) {
    wantAbility = true;
    // Move toward opponent for burrito/melon
    if (ai.ability !== 'child') {
      moveDir = toOpponent;
    }
  }
  // --- Priority 7: Approach/strafe ---
  else {
    if (d > config.approachDist) {
      // Mix approach with strafe based on aggression
      const approach = config.aggressionBias;
      const strafe = 1 - config.aggressionBias;
      moveDir = normalize({
        x: toOpponent.x * approach + strafeDir.x * strafe,
        y: toOpponent.y * approach + strafeDir.y * strafe,
      });
    } else {
      // At desired distance, circle
      moveDir = strafeDir;
    }

    // Hard/Expert: angle approach to push opponent toward edge
    if (isHighDifficulty(difficulty)) {
      const oppEdge = edgeDistances(opponent.pos);
      const herdThreshold = difficulty === 'expert' ? 3.5 : 2.5;
      if (oppEdge.min < herdThreshold && d > config.approachDist) {
        // Approach from center side to herd toward edge
        const centerToOpp = normalize({ x: opponent.pos.x, y: opponent.pos.y });
        const herdStrength = difficulty === 'expert' ? 0.6 : 0.4;
        let herdDir = normalize({
          x: toOpponent.x * (1 - herdStrength) + centerToOpp.x * herdStrength,
          y: toOpponent.y * (1 - herdStrength) + centerToOpp.y * herdStrength,
        });
        // Expert: use retreat bias to approach from direction opponent won't escape toward
        if (difficulty === 'expert' && aiState.adaptation) {
          const rb = aiState.adaptation.retreatBias;
          const rbMag = Math.sqrt(rb.x ** 2 + rb.y ** 2);
          if (rbMag > 0.1) {
            herdDir = normalize({
              x: herdDir.x - rb.x * 0.3,
              y: herdDir.y - rb.y * 0.3,
            });
          }
        }
        moveDir = herdDir;
      }
      // Expert: when opponent near edge, max aggression — close in to spam slaps
      if (difficulty === 'expert' && oppEdge.min < 1.5) {
        moveDir = toOpponent;
      }
    }

    // Expert: center control — when not engaging, return to center
    if (difficulty === 'expert') {
      const aiDistToCenter = Math.sqrt(ai.pos.x ** 2 + ai.pos.y ** 2);
      if (aiDistToCenter > 2 && d > config.slapRange * 1.5) {
        const centerDir = vecToCenter(ai.pos);
        moveDir = normalize({
          x: moveDir.x * 0.4 + centerDir.x * 0.6,
          y: moveDir.y * 0.4 + centerDir.y * 0.6,
        });
      }
    }

    // Center drift when far from opponent
    if (d > config.approachDist * 2) {
      const centerDir = vecToCenter(ai.pos);
      moveDir = normalize({
        x: moveDir.x * 0.7 + centerDir.x * 0.3,
        y: moveDir.y * 0.7 + centerDir.y * 0.3,
      });
    }
  }

  // Child hit-and-run: if just slapped and child, back off
  if (ai.ability === 'child' && wantSlap && difficulty !== 'easy') {
    // Expert: retreat toward center after slap for optimal repositioning
    if (difficulty === 'expert') {
      const centerDir = vecToCenter(ai.pos);
      moveDir = normalize({
        x: -toOpponent.x * 0.5 + centerDir.x * 0.5,
        y: -toOpponent.y * 0.5 + centerDir.y * 0.5,
      });
    } else {
      moveDir = { x: -toOpponent.x, y: -toOpponent.y };
    }
  }

  // Force consecutive slap pause
  if (aiState.consecutiveSlaps >= config.maxConsecutiveSlaps) {
    wantSlap = false;
    moveDir = { x: -toOpponent.x, y: -toOpponent.y };
  }

  // Apply movement jitter
  if (config.moveJitterDeg > 0 && (moveDir.x !== 0 || moveDir.y !== 0)) {
    moveDir = rotateVec(moveDir, aiState.jitterAngle);
  }

  // Convert world-space movement to facing-relative input
  const movement = worldDirToInput(moveDir, facingAngle);

  return {
    ...movement,
    slapLeft: wantSlap && slapLeft,
    slapRight: wantSlap && slapRight,
    ability: wantAbility,
  };
}

// --- Main Export ---

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

  // Update jitter
  aiState.jitterTimer -= dt;
  if (aiState.jitterTimer <= 0) {
    aiState.jitterAngle = (Math.random() - 0.5) * 2 * config.moveJitterDeg;
    aiState.jitterTimer = config.jitterChangeInterval;
  }

  // Update adaptation (Hard and Expert)
  if (isHighDifficulty(difficulty)) {
    if (!aiState.adaptation) aiState.adaptation = createEmptyAdaptation();
    updateAdaptation(aiState.adaptation, opponent, ai, dt);
  }

  // Decision tick
  aiState.decisionTimer -= dt;
  if (aiState.decisionTimer <= 0) {
    aiState.decisionTimer = config.decisionInterval + (Math.random() - 0.5) * config.decisionInterval * 0.3;

    // Roll hesitation
    if (config.hesitationChance > 0 && aiState.hesitationTimer <= 0 && Math.random() < config.hesitationChance) {
      aiState.hesitationTimer = config.hesitationDuration;
    }

    // Tell pause: one-time delay when first entering slap range
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
      // Reset slap counter when not attacking and not under pressure
      if (aiState.slapCooldownTimer <= 0) {
        aiState.consecutiveSlaps = 0;
      }
    }

    // Queue with reaction delay
    aiState.pendingInput = newInput;
    aiState.reactionTimer = config.reactionDelay;
  }

  // Drain reaction queue
  aiState.reactionTimer -= dt;
  if (aiState.reactionTimer <= 0 && aiState.pendingInput) {
    aiState.currentInput = aiState.pendingInput;
    aiState.pendingInput = null;
  }

  // Movement is continuous (held), but slaps/ability are edge-triggered (one frame only)
  // After returning a slap/ability, clear it so it doesn't repeat
  const result = { ...aiState.currentInput };
  aiState.currentInput.slapLeft = false;
  aiState.currentInput.slapRight = false;
  aiState.currentInput.ability = false;

  return result;
}
