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
  wantsDoubleSlap: boolean;
  gameTime: number;
  tellPauseTimer: number;
  wasInSlapRange: boolean;            // for one-time tell pause on entering range
  adaptation: AdaptationData | null;  // only used for Hard
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
}

export const AI_CONFIGS: Record<AIDifficulty, AIDifficultyConfig> = {
  easy: {
    decisionInterval: 0.35,
    reactionDelay: 0.25,
    moveJitterDeg: 30,
    jitterChangeInterval: 0.5,
    slapRange: 2.2,
    slapAccuracy: 0.5,
    slapCooldown: 0.6,
    edgeFearDist: 0.5,
    approachDist: 2.0,
    abilityUseChance: 0.3,
    melonDoubleSlap: 'never',
    melonDetonateChance: 0,
    hesitationChance: 0.4,
    hesitationDuration: 0.8,
    aggressionBias: 0.2,
    dodgeProbability: 0.1,
    maxConsecutiveSlaps: 2,
    tellFactor: 1.0,
  },
  medium: {
    decisionInterval: 0.2,
    reactionDelay: 0.12,
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
  },
  hard: {
    decisionInterval: 0.1,
    reactionDelay: 0.05,
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
  },
};

// --- Empty input constant ---

export const EMPTY_INPUT: PlayerInput = {
  forward: false, back: false, left: false, right: false,
  slapLeft: false, slapRight: false, ability: false,
};
