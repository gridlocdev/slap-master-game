// Arena (centered at origin, all values ÷50 from pixel space)
export const ARENA_W = 18;
export const ARENA_H = 10;
export const ARENA_X = -ARENA_W / 2; // -9
export const ARENA_Y = -ARENA_H / 2; // -5

// Player
export const PLAYER_RADIUS = 0.56;
export const HAND_RADIUS = 0.28;
export const HAND_OFFSET = 0.6;
export const MOVE_SPEED = 4;

// Knockback
export const KNOCKBACK_FORCE = 15;
export const KNOCKBACK_FRICTION = 0.9;

// Slap timing (seconds, converted from frames at 60fps)
export const WINDUP_TIME = 0.133;
export const ACTIVE_TIME = 0.1;
export const RECOVERY_TIME = 0.167;
export const HAND_EXTEND_DISTANCE = 0.5;

// Spawn positions (relative to arena center)
export const P1_SPAWN_X = ARENA_X + ARENA_W * 0.3;
export const P1_SPAWN_Y = ARENA_Y + ARENA_H * 0.5;
export const P2_SPAWN_X = ARENA_X + ARENA_W * 0.7;
export const P2_SPAWN_Y = ARENA_Y + ARENA_H * 0.5;

// Colors as [r, g, b] float tuples
export type Color3Tuple = [number, number, number];
export const P1_BODY_COLOR: Color3Tuple = [0.267, 0.533, 1.0];
export const P1_HAND_COLOR: Color3Tuple = [0.4, 0.667, 1.0];
export const P2_BODY_COLOR: Color3Tuple = [1.0, 0.267, 0.267];
export const P2_HAND_COLOR: Color3Tuple = [1.0, 0.4, 0.4];
export const HAND_WINDUP_COLOR: Color3Tuple = [1.0, 1.0, 0.267];
export const HAND_ACTIVE_COLOR: Color3Tuple = [1.0, 1.0, 1.0];
export const ARENA_FILL_COLOR: Color3Tuple = [0.165, 0.165, 0.29];
export const ARENA_BORDER_COLOR: Color3Tuple = [0.333, 0.333, 0.667];
export const ARENA_DANGER_COLOR: Color3Tuple = [0.267, 0.2, 0.2];

// Arena danger zone (edge indicator)
export const DANGER_ZONE_WIDTH = 0.8;

// Ability input keys
export const P1_ABILITY_KEY = 'KeyE';
export const P2_ABILITY_KEY = 'KeyP';

// Input mappings (DOM event.code values)
export const P1_KEYS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  slapLeft: 'KeyC',
  slapRight: 'KeyV',
  ability: P1_ABILITY_KEY,
} as const;

export const P2_KEYS = {
  forward: 'KeyO',
  back: 'KeyL',
  left: 'KeyK',
  right: 'Semicolon',
  slapLeft: 'ArrowLeft',
  slapRight: 'ArrowRight',
  ability: P2_ABILITY_KEY,
} as const;

// Abilities
export const ABILITY_COOLDOWN = 3;
export const DASH_SPEED = 12;
export const DASH_DURATION = 0.3;
export const DASH_KNOCKBACK = 5;
export const STINK_CLOUD_DURATION = 3;
export const STINK_CLOUD_RADIUS = 1.2;
export const STINK_CLOUD_COLOR: Color3Tuple = [0.2, 0.8, 0.2];
export const CHILD_SCALE = 0.7;
export const CHILD_SPEED_MULT = 1.3;
export const CHILD_KB_MULT = 0.7;
export const TAUNT_DURATION = 0.5;
export const TAUNT_COOLDOWN = 1;
export const MELON_RADIUS = 0.35;
export const MELON_SPEED = 8;
export const MELON_INVULN_TIME = 0.3;
export const MELON_FRICTION = 0.95;
export const MELON_KNOCKBACK = 8;
export const MELON_EXPLODE_RADIUS = 2.5;
export const MELON_EXPLODE_KB = 20;
export const MELON_COLOR: Color3Tuple = [0.2, 0.7, 0.1];
export const JUICE_MARK_DURATION = 5;
export const JUICE_MARK_COLOR: Color3Tuple = [0.8, 0.1, 0.1];
export const DOUBLE_SLAP_WINDOW = 0.15;

// Restart
export const RESTART_DELAY = 0.5; // seconds

// Fall animation
export const FALL_DURATION = 0.5;
export const FALL_GRAVITY = 20;
