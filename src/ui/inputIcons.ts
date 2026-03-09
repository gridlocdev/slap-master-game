/**
 * Input prompt icon assets — Kenney Input Prompts 1.4.1
 *
 * Files are served statically from public/kenney-input-prompts/.
 * The exported maps let any UI module look up an icon URL by a friendly key.
 */

// ---- Keyboard icons (filled variants) ----
const kb_w           = '/kenney-input-prompts/keyboard/keyboard_w.png';
const kb_a           = '/kenney-input-prompts/keyboard/keyboard_a.png';
const kb_s           = '/kenney-input-prompts/keyboard/keyboard_s.png';
const kb_d           = '/kenney-input-prompts/keyboard/keyboard_d.png';
const kb_c           = '/kenney-input-prompts/keyboard/keyboard_c.png';
const kb_v           = '/kenney-input-prompts/keyboard/keyboard_v.png';
const kb_e           = '/kenney-input-prompts/keyboard/keyboard_e.png';
const kb_o           = '/kenney-input-prompts/keyboard/keyboard_o.png';
const kb_k           = '/kenney-input-prompts/keyboard/keyboard_k.png';
const kb_l           = '/kenney-input-prompts/keyboard/keyboard_l.png';
const kb_p           = '/kenney-input-prompts/keyboard/keyboard_p.png';
const kb_semicolon   = '/kenney-input-prompts/keyboard/keyboard_semicolon.png';
const kb_arrow_left  = '/kenney-input-prompts/keyboard/keyboard_arrow_left.png';
const kb_arrow_right = '/kenney-input-prompts/keyboard/keyboard_arrow_right.png';
const kb_space       = '/kenney-input-prompts/keyboard/keyboard_space.png';
const kb_shift       = '/kenney-input-prompts/keyboard/keyboard_shift.png';
const kb_escape      = '/kenney-input-prompts/keyboard/keyboard_escape.png';
const kb_backspace   = '/kenney-input-prompts/keyboard/keyboard_backspace.png';
const kb_device      = '/kenney-input-prompts/keyboard/keyboard.png';

// ---- Xbox controller icons (filled / color variants) ----
const gp_stick_l    = '/kenney-input-prompts/xbox/xbox_stick_l.png';
const gp_dpad_left  = '/kenney-input-prompts/xbox/xbox_dpad_left.png';
const gp_dpad_right = '/kenney-input-prompts/xbox/xbox_dpad_right.png';
const gp_dpad_up    = '/kenney-input-prompts/xbox/xbox_dpad_up.png';
const gp_dpad_down  = '/kenney-input-prompts/xbox/xbox_dpad_down.png';
const gp_dpad       = '/kenney-input-prompts/xbox/xbox_dpad.png';
const gp_lt         = '/kenney-input-prompts/xbox/xbox_lt.png';
const gp_rt         = '/kenney-input-prompts/xbox/xbox_rt.png';
const gp_x          = '/kenney-input-prompts/xbox/xbox_button_color_x.png';
const gp_b          = '/kenney-input-prompts/xbox/xbox_button_color_b.png';
const gp_a          = '/kenney-input-prompts/xbox/xbox_button_color_a.png';
const gp_back       = '/kenney-input-prompts/xbox/xbox_button_back_icon.png';
const gp_view       = '/kenney-input-prompts/xbox/xbox_button_view.png';
const gp_device     = '/kenney-input-prompts/xbox/controller_xboxseries.png';

// ---- Lookup maps ----

/** Keyboard key icons keyed by friendly name. */
export const KB_ICONS: Record<string, string> = {
  w: kb_w,
  a: kb_a,
  s: kb_s,
  d: kb_d,
  c: kb_c,
  v: kb_v,
  e: kb_e,
  o: kb_o,
  k: kb_k,
  l: kb_l,
  p: kb_p,
  semicolon: kb_semicolon,
  arrow_left: kb_arrow_left,
  arrow_right: kb_arrow_right,
  space: kb_space,
  shift: kb_shift,
  escape: kb_escape,
  backspace: kb_backspace,
  device: kb_device,
};

/** Gamepad (Xbox) button icons keyed by friendly name. */
export const GP_ICONS: Record<string, string> = {
  stick_l: gp_stick_l,
  dpad: gp_dpad,
  dpad_left: gp_dpad_left,
  dpad_right: gp_dpad_right,
  dpad_up: gp_dpad_up,
  dpad_down: gp_dpad_down,
  lt: gp_lt,
  rt: gp_rt,
  x: gp_x,
  b: gp_b,
  a: gp_a,
  back: gp_back,
  view: gp_view,
  device: gp_device,
};

// ---- P1 / P2 keyboard icon sequences for control hints ----

/** P1 keyboard: movement (W/A/S/D), slap (C/V), ability (E) */
export const P1_KB_MOVE = ['w', 'a', 's', 'd'] as const;
export const P1_KB_SLAP = ['c', 'v'] as const;
export const P1_KB_ABILITY = ['e'] as const;

/** P2 keyboard: movement (O/K/L/;), slap (arrow left/right), ability (P) */
export const P2_KB_MOVE = ['o', 'k', 'l', 'semicolon'] as const;
export const P2_KB_SLAP = ['arrow_left', 'arrow_right'] as const;
export const P2_KB_ABILITY = ['p'] as const;

/** Selection screen: P1 cycle (A/D), confirm (C/V) */
export const P1_SEL_CYCLE = ['a', 'd'] as const;
export const P1_SEL_CONFIRM = ['c', 'v'] as const;

/** Selection screen: P2 cycle (K/;), confirm (arrow left/right) */
export const P2_SEL_CYCLE = ['k', 'semicolon'] as const;
export const P2_SEL_CONFIRM = ['arrow_left', 'arrow_right'] as const;

/** Gamepad selection: cycle = stick/dpad, confirm = X, back = B */
export const GP_SEL_CYCLE = ['stick_l'] as const;
export const GP_SEL_CONFIRM = ['x'] as const;
export const GP_SEL_BACK = ['b'] as const;
