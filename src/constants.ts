// Game dimensions
export const GAME_W = 1280;
export const GAME_H = 720;

// Arena (centered)
export const ARENA_W = 900;
export const ARENA_H = 500;
export const ARENA_X = (GAME_W - ARENA_W) / 2;
export const ARENA_Y = (GAME_H - ARENA_H) / 2;

// Player
export const PLAYER_RADIUS = 28;
export const HAND_RADIUS = 14;
export const HAND_OFFSET = 30;
export const MOVE_SPEED = 4;

// Knockback
export const KNOCKBACK_FORCE = 12;
export const KNOCKBACK_FRICTION = 0.9;

// Slap timing (frames)
export const WINDUP_FRAMES = 8;
export const ACTIVE_FRAMES = 6;
export const RECOVERY_FRAMES = 10;
export const HAND_EXTEND_DISTANCE = 25;

// Spawn positions
export const P1_SPAWN_X = ARENA_X + ARENA_W * 0.3;
export const P1_SPAWN_Y = ARENA_Y + ARENA_H * 0.5;
export const P2_SPAWN_X = ARENA_X + ARENA_W * 0.7;
export const P2_SPAWN_Y = ARENA_Y + ARENA_H * 0.5;

// Colors
export const P1_BODY_COLOR = 0x4488ff;
export const P1_HAND_COLOR = 0x66aaff;
export const P2_BODY_COLOR = 0xff4444;
export const P2_HAND_COLOR = 0xff6666;
export const HAND_WINDUP_COLOR = 0xffff44;
export const HAND_ACTIVE_COLOR = 0xffffff;
export const ARENA_FILL_COLOR = 0x2a2a4a;
export const ARENA_BORDER_COLOR = 0x5555aa;
export const ARENA_DANGER_COLOR = 0x443333;

// Arena danger zone (edge indicator)
export const DANGER_ZONE_WIDTH = 40;

// Input mappings
export const P1_KEYS = {
  forward: 'W',
  back: 'S',
  left: 'A',
  right: 'D',
  slapLeft: 'Q',
  slapRight: 'E',
} as const;

export const P2_KEYS = {
  forward: 'O',
  back: 'L',
  left: 'K',
  right: 'SEMICOLON',
  slapLeft: 'U',
  slapRight: 'P',
} as const;

// Restart
export const RESTART_DELAY_FRAMES = 30;
