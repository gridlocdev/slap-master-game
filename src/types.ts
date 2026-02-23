export interface Vec2 {
  x: number;
  y: number;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type GameMode = 'local' | 'ai';
export type ControlScheme = { type: 'kb1' } | { type: 'kb2' } | { type: 'gamepad'; index: number };

export type HandSide = 'left' | 'right';
export type HandState = 'idle' | 'windup' | 'active' | 'recovery';

export interface Hand {
  side: HandSide;
  offset: Vec2;
  state: HandState;
  timer: number;
}

export type AbilityType = 'burrito' | 'child' | 'melon';

export type InputDevice =
  | { type: 'keyboard' }
  | { type: 'gamepad'; index: number };

export interface StinkCloud {
  pos: Vec2;
  timer: number;
}

export interface MelonState {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  invulnTimer: number;
  owner: number;
}

export interface JuiceMark {
  pos: Vec2;
  timer: number;
}

export interface PlayerState {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  facingAngle: number;
  hands: [Hand, Hand];
  knockbackVel: Vec2;
  isAlive: boolean;
  isFalling: boolean;
  fallTimer: number;
  fallVelY: number;
  fallAlpha: number;
  ability: AbilityType;
  abilityCooldown: number;
  isDashing: boolean;
  dashTimer: number;
  dashDir: Vec2;
  tauntTimer: number;
  lastSlapLeftTime: number;
  lastSlapRightTime: number;
}

export interface ArenaRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameState {
  players: [PlayerState, PlayerState];
  winner: number | null;
  arenaRect: ArenaRect;
  restartTimer: number;
  stinkClouds: StinkCloud[];
  melons: MelonState[];
  juiceMarks: JuiceMark[];
  phase: 'selecting' | 'playing';
  selections: [AbilityType | null, AbilityType | null];
  scores: [number, number];
  roundsToWin: number;
}

export interface PlayerInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  slapLeft: boolean;
  slapRight: boolean;
  ability: boolean;
}
