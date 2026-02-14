export interface Vec2 {
  x: number;
  y: number;
}

export type HandSide = 'left' | 'right';
export type HandState = 'idle' | 'windup' | 'active' | 'recovery';

export interface Hand {
  side: HandSide;
  offset: Vec2;
  state: HandState;
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
}

export interface PlayerInput {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  slapLeft: boolean;
  slapRight: boolean;
}
