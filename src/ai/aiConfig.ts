import type { Vec2, PlayerInput, AIDifficulty } from '../types.ts';

// --- AI State (persistent between frames) ---

export interface AdaptationData {
  retreatBias: Vec2;              // weighted avg of opponent retreat directions
  slapFrequency: number;          // opponent attacks per second (rolling avg)
  preferredDodgeDir: 'left' | 'right' | null;
  sampleCount: number;            // how many observations collected
  lastOpponentPos: Vec2;
  totalSlapsSeen: number;
  observationTime: number;
  // Expert-level tracking
  opponentSlapPatterns: { leftFirst: number; rightFirst: number };
  postKnockbackDir: Vec2;         // where opponent DIs after being hit
  edgePanicBehavior: 'retreat' | 'dodge' | 'attack' | null;
  approachAngleBias: number;      // weighted avg of opponent approach angle
  lastOpponentKBMag: number;      // to detect knockback recovery start
}

export interface AIState {
  decisionTimer: number;
  currentInput: PlayerInput;
  reactionTimer: number;
  pendingInput: PlayerInput | null;
  slapCooldownTimer: number;
  consecutiveSlaps: number;
  hesitationTimer: number;
  jitterAngle: number;
  jitterTimer: number;
  gameTime: number;
  tellPauseTimer: number;
  wasInSlapRange: boolean;
  adaptation: AdaptationData | null;
  // New fields
  doubleSlapTimer: number;
  preferredHand: 'left' | 'right';
  strafeSide: 1 | -1;
  streakTimer: number;
  isHotStreak: boolean;
  lastSlapWhiffed: boolean;
  slapIntervalTimer: number;
  microSpacePhase: number;
}

// --- Difficulty Config ---

export type MelonDoubleSlapMode = 'never' | 'random' | 'strategic';

export interface AIDifficultyConfig {
  decisionInterval: number;
  reactionDelay: number;
  moveJitterDeg: number;
  jitterChangeInterval: number;
  slapRange: number;
  slapAccuracy: number;
  slapCooldown: number;
  edgeFearDist: number;
  approachDist: number;
  abilityUseChance: number;
  melonDoubleSlap: MelonDoubleSlapMode;
  melonDetonateChance: number;
  hesitationChance: number;
  hesitationDuration: number;
  aggressionBias: number;
  dodgeProbability: number;
  maxConsecutiveSlaps: number;
  tellFactor: number;
  // New fields
  handBias: number;              // 0.5=even, 0.6=60% preferred hand
  strafeBias: number;            // 0=random, 0.65=65% same direction
  retreatMode: 'any' | 'backward';
  doubleSlapInterval: number;    // seconds between double slap attempts
  doubleSlapRangeAcc: number;    // chance of being at correct range
  scoreSensitivity: number;      // 0-1
  frustrationOnWhiff: boolean;
  useTimerSlap: boolean;         // slap on interval not range (Easy)
  slapInterval: [number, number]; // [min, max] seconds for timer slap
  misreadChance: number;         // Expert: probability of intentional misread
  r3ReactionPenalty: number;     // added reaction delay in deciding round
  // Melon awareness
  melonDodgeChance: number;      // prob of dodging incoming fast melon (0-1)
  melonAwarenessRadius: number;  // how far AI "sees" melons (0 = blind)
  melonSlapBackChance: number;   // prob of slapping opponent melon when nearby (0-1)
  melonProximityFear: number;    // flee distance from melons when opponent can detonate (0 = none)
}

export const AI_CONFIGS: Record<AIDifficulty, AIDifficultyConfig> = {
  easy: {
    decisionInterval: 0.35,
    reactionDelay: 0.35,
    moveJitterDeg: 5,
    jitterChangeInterval: 0.5,
    slapRange: 3.0,
    slapAccuracy: 0.3,
    slapCooldown: 0.6,
    edgeFearDist: 0,
    approachDist: 2.0,
    abilityUseChance: 0.15,
    melonDoubleSlap: 'never',
    melonDetonateChance: 0,
    hesitationChance: 0,
    hesitationDuration: 0,
    aggressionBias: 0.9,
    dodgeProbability: 0,
    maxConsecutiveSlaps: 2,
    tellFactor: 1.0,
    handBias: 0.5,
    strafeBias: 0,
    retreatMode: 'any',
    doubleSlapInterval: 17,
    doubleSlapRangeAcc: 0.2,
    scoreSensitivity: 0,
    frustrationOnWhiff: false,
    useTimerSlap: true,
    slapInterval: [1.5, 2.5],
    misreadChance: 0,
    r3ReactionPenalty: 0,
    melonDodgeChance: 0,
    melonAwarenessRadius: 0,
    melonSlapBackChance: 0,
    melonProximityFear: 0,
  },
  medium: {
    decisionInterval: 0.2,
    reactionDelay: 0.2,
    moveJitterDeg: 15,
    jitterChangeInterval: 0.4,
    slapRange: 1.8,
    slapAccuracy: 0.75,
    slapCooldown: 0.3,
    edgeFearDist: 1.0,
    approachDist: 1.5,
    abilityUseChance: 0.6,
    melonDoubleSlap: 'random',
    melonDetonateChance: 0.4,
    hesitationChance: 0.1,
    hesitationDuration: 0.4,
    aggressionBias: 0.5,
    dodgeProbability: 0.35,
    maxConsecutiveSlaps: 4,
    tellFactor: 0.5,
    handBias: 0.6,
    strafeBias: 0.65,
    retreatMode: 'backward',
    doubleSlapInterval: 8,
    doubleSlapRangeAcc: 0.5,
    scoreSensitivity: 0.3,
    frustrationOnWhiff: true,
    useTimerSlap: false,
    slapInterval: [1.0, 2.0],
    misreadChance: 0,
    r3ReactionPenalty: 0,
    melonDodgeChance: 0.3,
    melonAwarenessRadius: 4,
    melonSlapBackChance: 0.15,
    melonProximityFear: 1.5,
  },
  hard: {
    decisionInterval: 0.1,
    reactionDelay: 0.08,
    moveJitterDeg: 5,
    jitterChangeInterval: 0.3,
    slapRange: 1.9,
    slapAccuracy: 0.92,
    slapCooldown: 0.1,
    edgeFearDist: 1.5,
    approachDist: 1.3,
    abilityUseChance: 0.85,
    melonDoubleSlap: 'strategic',
    melonDetonateChance: 1.0,
    hesitationChance: 0,
    hesitationDuration: 0,
    aggressionBias: 0.7,
    dodgeProbability: 0.6,
    maxConsecutiveSlaps: 8,
    tellFactor: 0.1,
    handBias: 0.5,
    strafeBias: 0,
    retreatMode: 'any',
    doubleSlapInterval: 5,
    doubleSlapRangeAcc: 0.85,
    scoreSensitivity: 0.7,
    frustrationOnWhiff: false,
    useTimerSlap: false,
    slapInterval: [1.0, 2.0],
    misreadChance: 0,
    r3ReactionPenalty: 0,
    melonDodgeChance: 0.7,
    melonAwarenessRadius: 8,
    melonSlapBackChance: 0.5,
    melonProximityFear: 2.0,
  },
  expert: {
    decisionInterval: 0.07,
    reactionDelay: 0.05,
    moveJitterDeg: 1,
    jitterChangeInterval: 0.3,
    slapRange: 1.72,
    slapAccuracy: 0.98,
    slapCooldown: 0.05,
    edgeFearDist: 2.0,
    approachDist: 1.2,
    abilityUseChance: 0.95,
    melonDoubleSlap: 'strategic',
    melonDetonateChance: 1.0,
    hesitationChance: 0,
    hesitationDuration: 0,
    aggressionBias: 0.8,
    dodgeProbability: 0.85,
    maxConsecutiveSlaps: 12,
    tellFactor: 0,
    handBias: 0.5,
    strafeBias: 0,
    retreatMode: 'any',
    doubleSlapInterval: 3,
    doubleSlapRangeAcc: 0.95,
    scoreSensitivity: 1.0,
    frustrationOnWhiff: false,
    useTimerSlap: false,
    slapInterval: [1.0, 2.0],
    misreadChance: 0.15,
    r3ReactionPenalty: 0.03,
    melonDodgeChance: 0.9,
    melonAwarenessRadius: 12,
    melonSlapBackChance: 0.8,
    melonProximityFear: 2.5,
  },
};

// --- Empty input constant ---

export const EMPTY_INPUT: PlayerInput = {
  forward: false, back: false, left: false, right: false,
  slapLeft: false, slapRight: false, ability: false,
};
