import type { ControlScheme } from './types.ts';
import type { KeyMap } from './input.ts';
import { P1_KEYS, P2_KEYS } from './constants.ts';
import { SETTINGS_STORAGE_KEY, SETTINGS_DEFAULT_VOL } from './constants.ts';
import { setP1Device, setP2Device } from './ui/inputAssign.ts';

interface Settings {
  musicVolume: number;
  sfxVolume: number;
  p1Scheme: ControlScheme;
  p2Scheme: ControlScheme;
  hitlagEnabled: boolean;
  screenShakeEnabled: boolean;
}

const defaults: Settings = {
  musicVolume: SETTINGS_DEFAULT_VOL,
  sfxVolume: SETTINGS_DEFAULT_VOL,
  p1Scheme: { type: 'kb1' },
  p2Scheme: { type: 'kb2' },
  hitlagEnabled: true,
  screenShakeEnabled: true,
};

let settings: Settings = { ...defaults };

function clampVol(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function isValidScheme(s: unknown): s is ControlScheme {
  if (!s || typeof s !== 'object') return false;
  const obj = s as Record<string, unknown>;
  if (obj.type === 'kb1' || obj.type === 'kb2') return true;
  if (obj.type === 'gamepad' && typeof obj.index === 'number' && obj.index >= 0) return true;
  return false;
}

export function loadSettings(): void {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (typeof parsed.musicVolume === 'number') settings.musicVolume = clampVol(parsed.musicVolume);
    if (typeof parsed.sfxVolume === 'number') settings.sfxVolume = clampVol(parsed.sfxVolume);
    if (isValidScheme(parsed.p1Scheme)) settings.p1Scheme = parsed.p1Scheme;
    if (isValidScheme(parsed.p2Scheme)) settings.p2Scheme = parsed.p2Scheme;
    if (typeof parsed.hitlagEnabled === 'boolean') settings.hitlagEnabled = parsed.hitlagEnabled;
    if (typeof parsed.screenShakeEnabled === 'boolean') settings.screenShakeEnabled = parsed.screenShakeEnabled;
  } catch {
    // parse error — keep defaults
  }
}

export function saveSettings(): void {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function getSettings(): Readonly<Settings> {
  return settings;
}

export function setMusicVolume(v: number): void {
  settings.musicVolume = clampVol(v);
  saveSettings();
}

export function setSfxVolume(v: number): void {
  settings.sfxVolume = clampVol(v);
  saveSettings();
}

export function setHitlagEnabled(v: boolean): void {
  settings.hitlagEnabled = v;
  saveSettings();
}

export function setScreenShakeEnabled(v: boolean): void {
  settings.screenShakeEnabled = v;
  saveSettings();
}

export function setP1Scheme(s: ControlScheme): void {
  settings.p1Scheme = s;
  saveSettings();
  applySettingsToInputAssign();
}

export function setP2Scheme(s: ControlScheme): void {
  settings.p2Scheme = s;
  saveSettings();
  applySettingsToInputAssign();
}

function schemeToDevice(s: ControlScheme) {
  if (s.type === 'gamepad') return { type: 'gamepad' as const, index: s.index };
  return { type: 'keyboard' as const };
}

export function applySettingsToInputAssign(): void {
  setP1Device(schemeToDevice(settings.p1Scheme));
  setP2Device(schemeToDevice(settings.p2Scheme));
}

export function getP1KeyMap(): KeyMap | null {
  if (settings.p1Scheme.type === 'kb1') return P1_KEYS;
  if (settings.p1Scheme.type === 'kb2') return P2_KEYS;
  return null;
}

export function getP2KeyMap(): KeyMap | null {
  if (settings.p2Scheme.type === 'kb1') return P1_KEYS;
  if (settings.p2Scheme.type === 'kb2') return P2_KEYS;
  return null;
}

export function getP1PadIndex(): number | null {
  return settings.p1Scheme.type === 'gamepad' ? settings.p1Scheme.index : null;
}

export function getP2PadIndex(): number | null {
  return settings.p2Scheme.type === 'gamepad' ? settings.p2Scheme.index : null;
}

export function hasSavedSettings(): boolean {
  return localStorage.getItem(SETTINGS_STORAGE_KEY) !== null;
}
