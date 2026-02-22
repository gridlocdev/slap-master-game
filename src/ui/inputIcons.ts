/**
 * Input prompt icon assets — Kenney Input Prompts 1.4.1
 *
 * All paths are resolved by Vite at build time via `import.meta.glob`.
 * The exported maps let any UI module look up an icon URL by a friendly key.
 */

// ---- Keyboard icons (filled variants) ----
import kb_w from '../assets/ui/kenney-input-prompts/keyboard/keyboard_w.png';
import kb_a from '../assets/ui/kenney-input-prompts/keyboard/keyboard_a.png';
import kb_s from '../assets/ui/kenney-input-prompts/keyboard/keyboard_s.png';
import kb_d from '../assets/ui/kenney-input-prompts/keyboard/keyboard_d.png';
import kb_c from '../assets/ui/kenney-input-prompts/keyboard/keyboard_c.png';
import kb_v from '../assets/ui/kenney-input-prompts/keyboard/keyboard_v.png';
import kb_e from '../assets/ui/kenney-input-prompts/keyboard/keyboard_e.png';
import kb_o from '../assets/ui/kenney-input-prompts/keyboard/keyboard_o.png';
import kb_k from '../assets/ui/kenney-input-prompts/keyboard/keyboard_k.png';
import kb_l from '../assets/ui/kenney-input-prompts/keyboard/keyboard_l.png';
import kb_p from '../assets/ui/kenney-input-prompts/keyboard/keyboard_p.png';
import kb_semicolon from '../assets/ui/kenney-input-prompts/keyboard/keyboard_semicolon.png';
import kb_arrow_left from '../assets/ui/kenney-input-prompts/keyboard/keyboard_arrow_left.png';
import kb_arrow_right from '../assets/ui/kenney-input-prompts/keyboard/keyboard_arrow_right.png';
import kb_space from '../assets/ui/kenney-input-prompts/keyboard/keyboard_space.png';
import kb_shift from '../assets/ui/kenney-input-prompts/keyboard/keyboard_shift.png';
import kb_escape from '../assets/ui/kenney-input-prompts/keyboard/keyboard_escape.png';
import kb_backspace from '../assets/ui/kenney-input-prompts/keyboard/keyboard_backspace.png';
import kb_device from '../assets/ui/kenney-input-prompts/keyboard/keyboard.png';

// ---- Xbox controller icons (filled / color variants) ----
import gp_stick_l from '../assets/ui/kenney-input-prompts/xbox/xbox_stick_l.png';
import gp_dpad_left from '../assets/ui/kenney-input-prompts/xbox/xbox_dpad_left.png';
import gp_dpad_right from '../assets/ui/kenney-input-prompts/xbox/xbox_dpad_right.png';
import gp_dpad_up from '../assets/ui/kenney-input-prompts/xbox/xbox_dpad_up.png';
import gp_dpad_down from '../assets/ui/kenney-input-prompts/xbox/xbox_dpad_down.png';
import gp_dpad from '../assets/ui/kenney-input-prompts/xbox/xbox_dpad.png';
import gp_lt from '../assets/ui/kenney-input-prompts/xbox/xbox_lt.png';
import gp_rt from '../assets/ui/kenney-input-prompts/xbox/xbox_rt.png';
import gp_x from '../assets/ui/kenney-input-prompts/xbox/xbox_button_color_x.png';
import gp_b from '../assets/ui/kenney-input-prompts/xbox/xbox_button_color_b.png';
import gp_a from '../assets/ui/kenney-input-prompts/xbox/xbox_button_color_a.png';
import gp_back from '../assets/ui/kenney-input-prompts/xbox/xbox_button_back.png';
import gp_view from '../assets/ui/kenney-input-prompts/xbox/xbox_button_view.png';
import gp_device from '../assets/ui/kenney-input-prompts/xbox/controller_xboxseries.png';

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
