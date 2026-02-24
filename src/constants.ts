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

// Slap arc angles
export const IDLE_ANGLE = Math.PI / 2;       // 90° — perpendicular at side
export const WINDUP_ANGLE = Math.PI * 0.8;   // 144° — pulled back behind
export const SWING_END_ANGLE = -Math.PI * 0.3; // -54° — swung past front
export const SLAP_REACH = 0.85;

// Clash (same-hand cancel)
export const CLASH_PUSHBACK = 3;

// Double slap (both hands — slow, powerful)
export const DOUBLE_SLAP_WINDUP = 0.3;
export const DOUBLE_SLAP_KB_MULT = 2.5;
export const DOUBLE_SLAP_WINDUP_ANGLE = Math.PI * 0.95; // ~171° — pulled way back

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

// Input thresholds
export const STICK_DEADZONE = 0.25;
export const TRIGGER_THRESHOLD = 0.3;

// Abilities
export const ABILITY_COOLDOWN = 3;
export const DASH_SPEED = 12;
export const DASH_DURATION = 0.3;
export const DASH_KNOCKBACK = 5;
export const STINK_CLOUD_DURATION = 3;
export const STINK_CLOUD_RADIUS = 1.2;
export const STINK_CLOUD_SLOW = 0.5;
export const STINK_CLOUD_COLOR: Color3Tuple = [0.2, 0.8, 0.2];
export const CHILD_SCALE = 0.7;
export const CHILD_SPEED_MULT = 2.0;
export const CHILD_KB_MULT = 0.2;
export const CHILD_VS_CHILD_KB_MULT = 1.0;
export const TAUNT_DURATION = 0.4;
export const TAUNT_COOLDOWN = 1;
export const MELON_RADIUS = 0.35;
export const MELON_SPEED = 8;
export const MELON_INVULN_TIME = 0.3;
export const MELON_FRICTION = 0.95;
export const MELON_KNOCKBACK = 8;
export const MELON_EXPLODE_RADIUS = 2.5;
export const MELON_EXPLODE_KB = 20;
export const MELON_COLOR: Color3Tuple = [0.2, 0.7, 0.1];
export const MELON_SPAWN_OFFSET = 0.1;
export const MELON_SLAP_FORCE = 10;
export const JUICE_MARK_DURATION = 5;
export const JUICE_MARK_COLOR: Color3Tuple = [0.8, 0.1, 0.1];
export const DOUBLE_SLAP_WINDOW = 0.15;

// Restart
export const RESTART_DELAY = 0.5; // seconds

// Fall animation
export const FALL_DURATION = 0.5;
export const FALL_GRAVITY = 20;

// Countdown animation
export const COUNTDOWN_STEPS = ['3', '2', '1', 'TIME TO SLAP!!!'] as const;
export const COUNTDOWN_ZOOM_IN_TIME = 0.25;
export const COUNTDOWN_STEP_DURATION = 0.75;
export const COUNTDOWN_HOLD_TIME = 0.5; // extra hold on final step
export const COUNTDOWN_FONT_SIZE = 120;
export const COUNTDOWN_FINAL_FONT_SIZE = 72;
export const COUNTDOWN_TEXT_COLOR = '#ffffff';
export const COUNTDOWN_OUTLINE_COLOR = '#000000';
export const COUNTDOWN_OUTLINE_WIDTH = 4;
export const COUNTDOWN_START_SCALE = 0.3;
export const COUNTDOWN_ZOOM_RANGE = 0.7;  // 0.3 → 1.0
export const COUNTDOWN_GROW_RANGE = 0.5;  // 1.0 → 1.5

// Scene
export const SCENE_BG_COLOR: [number, number, number, number] = [0.1, 0.1, 0.18, 1];
export const CAMERA_POS: [number, number, number] = [0, 14, -10];
export const CAMERA_TARGET: [number, number, number] = [0, 0, 1];
export const LIGHT_INTENSITY = 0.7;

// Arena mesh
export const PLATFORM_HEIGHT = 0.1;
export const PLATFORM_Y = -0.05;
export const DANGER_ZONE_ALPHA = 0.5;
export const DANGER_ZONE_OVERLAY_HEIGHT = 0.11;
export const DANGER_ZONE_Y = -0.045;
export const BORDER_WIDTH = 0.06;
export const BORDER_HEIGHT = 0.15;

// Character visuals
export const HEADBAND_SEGMENTS = 5;
export const HEADBAND_SEG_LENGTH = 0.12;
export const HEADBAND_DAMPING = 0.92;
export const MELON_BODY_Y_SCALE = 1.15;
export const MELON_EMISSIVE_COLOR: Color3Tuple = [0.2, 0.55, 0.2];
export const EYE_SIZE_FACTOR = 0.18;
export const PUPIL_SIZE_FACTOR = 0.6;
export const HEADBAND_TORUS_SCALE = 1.6;
export const HEADBAND_TORUS_THICKNESS = 0.06;
export const HEADBAND_KNOT_DIAMETER = 0.1;
export const HEADBAND_TAIL_W = 0.04;
export const HEADBAND_TAIL_H = 0.02;
export const QUESTION_DISC_RADIUS_FACTOR = 0.9;
export const QUESTION_DISC_COLOR: Color3Tuple = [0.5, 0.5, 0.5];
export const HEADBAND_BAND_Y_FACTOR = 0.65;
export const HEADBAND_KNOT_DIST_FACTOR = 0.8;
export const HEADBAND_SPLAY_ANGLES: [number, number] = [-0.3, 0.3];
export const HEADBAND_GRAVITY = 0.5;
export const HEADBAND_CONSTRAINT_ITERS = 3;
export const DASH_TINT_COLOR: Color3Tuple = [0.2, 0.9, 0.2];
export const HAND_ACTIVE_SCALE = 1.15;
export const EYE_DIST_FACTOR = 0.4;
export const EYE_FORWARD_FACTOR = 0.85;
export const EYE_Y_FACTOR = 0.2;
export const PUPIL_FORWARD_FACTOR = 0.08;
export const TAUNT_EASING_COEFF = 8;

// Impact effects — hitlag
export const HITLAG_BASE = 0.07;
export const HITLAG_FORCE_SCALE = 0.003;
export const HITLAG_MAX = 0.12;
export const HITLAG_VIBRATE = 0.015;

// Impact effects — screen shake
export const SHAKE_DURATION = 0.15;
export const SHAKE_INTENSITY = 0.25;
export const SHAKE_DECAY = 0.85;

// Impact effects — starburst
export const STARBURST_COUNT = 4;
export const STARBURST_SPIKES = 12;
export const STARBURST_SPIKES_STRONG = 16;
export const STARBURST_INNER_R = 0.15;
export const STARBURST_OUTER_R = 0.5;
export const STARBURST_LIFE = 0.3;
export const STARBURST_MAX_SCALE = 3;
export const STARBURST_MAX_SCALE_STRONG = 4.5;
export const STARBURST_SPIN = 3;
export const STARBURST_TIP_COLOR: Color3Tuple = [1, 1, 1];
export const STARBURST_CENTER_HUES: Color3Tuple[] = [
  [1, 0.95, 0.4],   // yellow
  [1, 0.6, 0.2],    // orange
  [1, 0.4, 0.6],    // pink
];
export const STARBURST_VALLEY_HUES: Color3Tuple[] = [
  [1, 0.7, 0.2],    // warm orange (for yellow center)
  [1, 0.4, 0.1],    // deep orange (for orange center)
  [0.9, 0.3, 0.4],  // rose (for pink center)
];

// Impact effects — KO zoom
export const KO_ZOOM_DURATION = 0.5;
export const KO_SLOW_MO = 0.15;
export const KO_ZOOM_AMOUNT = 4;
export const KO_PREDICT_TIME = 0.3;

// Impact effects — ring-out burst
export const BURST_COUNT = 16;
export const BURST_SIZE = 0.12;
export const BURST_SPEED = 12;
export const BURST_LIFE = 0.4;

// Impact effects — speed lines
export const SPEED_LINE_COUNT = 6;
export const SPEED_LINE_THRESHOLD = 5;
export const SPEED_LINE_LENGTH = 0.6;
export const SPEED_LINE_WIDTH = 0.03;
export const SPEED_LINE_LIFE = 0.12;
export const SPEED_LINE_COLOR: Color3Tuple = [1, 1, 1];

// Effects pool
export const MAX_CLOUDS = 8;
export const MAX_MELONS = 8;
export const MAX_JUICE_MARKS = 8;
export const CLOUD_ALPHA = 0.4;
export const JUICE_MARK_DISC_RADIUS = 0.8;
export const JUICE_MARK_ALPHA = 0.6;

// HUD
export const HUD_WIN_FONT_SIZE = 48;
export const HUD_RESTART_FONT_SIZE = 24;
export const HUD_SCORE_FONT_SIZE = 28;
export const HUD_LABEL_FONT_SIZE = 22;
export const HUD_COOLDOWN_FONT_SIZE = 18;
export const HUD_CONTROLS_FONT_SIZE = 16;
export const HUD_TEXT_COLOR = '#ffffff';
export const HUD_RESTART_COLOR = '#aaaaaa';
export const HUD_CONTROLS_COLOR = '#8888aa';
export const P1_HUD_COLOR = '#4488ff';
export const P2_HUD_COLOR = '#ff4444';
export const AI_HUD_COLOR = '#888888';
export const HUD_WIN_TOP = '-60px';
export const HUD_RESTART_TOP = '20px';
export const HUD_SCORE_TOP = '70px';
export const HUD_LABEL_BOTTOM = '38px';
export const HUD_COOLDOWN_BOTTOM = '15px';
export const HUD_SIDE_MARGIN = '20px';
export const HUD_CONTROLS_TOP = '-15px';
export const HUD_LIVE_SCORE_TOP = '15px';
export const HUD_LIVE_SCORE_FONT_SIZE = 36;
export const HUD_OUTLINE_COLOR = '#000000';
export const HUD_WIN_OUTLINE_WIDTH = 8;
export const HUD_SCORE_OUTLINE_WIDTH = 3;

// Selection screen
export const STAGE_CAM_POS: [number, number, number] = [0, 1.2, -5.5];
export const STAGE_CAM_TARGET: [number, number, number] = [0, 0.6, 0];
export const P1_STAGE_X = -2.2;
export const P2_STAGE_X = 2.2;
export const PLAYER_STAGE_Z = 0;
export const PLAYER_STAGE_Y = 1.2;
export const BACKDROP_Z = 2.5;
export const BACKDROP_W = 6;
export const BACKDROP_H = 5;
export const SELECTION_FLOOR_Y = -0.05;
export const BOUNCE_SPEED = 0.8;
export const BOUNCE_AMPLITUDE = 0.15;
export const HAND_BOUNCE_PHASE = 0.8;
export const SELECTION_STICK_THRESHOLD = 0.5;
export const BACKDROP_P1_COLOR: Color3Tuple = [0.8, 0.5, 0.0];
export const BACKDROP_P2_COLOR: Color3Tuple = [0.0, 0.5, 0.7];
export const BACKDROP_ALPHA = 0.7;
export const DIVIDER_WIDTH = 0.08;
export const SELECTION_FLOOR_W = 14;
export const SELECTION_FLOOR_D = 8;
export const SELECTION_FLOOR_COLOR: Color3Tuple = [0.12, 0.12, 0.2];

// Main menu
export const MENU_TITLE_FONT_SIZE = 90;
export const MENU_BUTTON_FONT_SIZE = 22;
export const MENU_STICK_THRESHOLD = 0.5;

// Input assignment overlay
export const GAMEPAD_SELECT_BUTTON = 8;
export const INPUT_ASSIGN_BG = '#000000dd';
export const INPUT_ASSIGN_PANEL_W = '280px';
export const INPUT_ASSIGN_PANEL_H = '220px';
export const INPUT_ASSIGN_ICON_SIZE = 64;
export const INPUT_ASSIGN_LABEL_SIZE = 28;
export const INPUT_ASSIGN_READY_COLOR = '#4488ff';
export const INPUT_ASSIGN_GAP = '60px';
export const INPUT_ASSIGN_STICK_THRESHOLD = 0.5;

// Settings menu
export const SETTINGS_VOL_STEP = 5;
export const SETTINGS_DEFAULT_VOL = 80;
export const SETTINGS_STORAGE_KEY = 'slap-master-settings';
export const SETTINGS_SLIDER_TRACK_W = 200;
