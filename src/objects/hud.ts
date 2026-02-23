import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control, StackPanel } from '@babylonjs/gui';
import type { GameState } from '../types.ts';
import {
  HUD_WIN_FONT_SIZE, HUD_RESTART_FONT_SIZE, HUD_SCORE_FONT_SIZE,
  HUD_COOLDOWN_FONT_SIZE, HUD_CONTROLS_FONT_SIZE,
  HUD_TEXT_COLOR, HUD_RESTART_COLOR, HUD_CONTROLS_COLOR,
  P1_HUD_COLOR, P2_HUD_COLOR,
  HUD_WIN_TOP, HUD_RESTART_TOP, HUD_SCORE_TOP,
  HUD_LABEL_BOTTOM, HUD_COOLDOWN_BOTTOM, HUD_SIDE_MARGIN, HUD_CONTROLS_TOP,
  HUD_OUTLINE_COLOR, HUD_WIN_OUTLINE_WIDTH, HUD_SCORE_OUTLINE_WIDTH,
  HUD_LIVE_SCORE_TOP, HUD_LIVE_SCORE_FONT_SIZE,
} from '../constants.ts';
import {
  KB_ICONS,
  P1_KB_MOVE, P1_KB_SLAP, P1_KB_ABILITY,
  P2_KB_MOVE, P2_KB_SLAP, P2_KB_ABILITY,
} from '../ui/inputIcons.ts';
import { createIconRow, iconsFromKeys, ICON_SIZE } from '../ui/iconRow.ts';
import type { IconRowItem } from '../ui/iconRow.ts';

export interface HudElements {
  ui: AdvancedDynamicTexture;
  winText: TextBlock;
  restartText: TextBlock;
  scoreText: TextBlock;
  liveScore: TextBlock;
  p1Label: StackPanel;
  p2Label: StackPanel;
  controlsText: TextBlock;
  p1Cooldown: TextBlock;
  p2Cooldown: TextBlock;
  fadeAlpha: number;
  winFadeAlpha: number;
  prevWinVisible: boolean;
}

const ABILITY_NAMES: Record<string, string> = {
  burrito: 'Black Bean Burrito',
  child: 'Literal Child',
  melon: 'Melon',
};

export function createHud(scene: Scene): HudElements {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, scene);

  const winText = new TextBlock('winText', '');
  winText.fontSize = HUD_WIN_FONT_SIZE;
  winText.fontWeight = 'bold';
  winText.color = HUD_TEXT_COLOR;
  winText.fontFamily = 'monospace';
  winText.outlineColor = HUD_OUTLINE_COLOR;
  winText.outlineWidth = HUD_WIN_OUTLINE_WIDTH;
  winText.top = HUD_WIN_TOP;
  winText.isVisible = false;
  ui.addControl(winText);

  const restartText = new TextBlock('restartText', '');
  restartText.fontSize = HUD_RESTART_FONT_SIZE;
  restartText.fontWeight = 'bold';
  restartText.color = HUD_RESTART_COLOR;
  restartText.fontFamily = 'monospace';
  restartText.top = HUD_RESTART_TOP;
  restartText.isVisible = false;
  ui.addControl(restartText);

  const scoreText = new TextBlock('scoreText', '');
  scoreText.fontSize = HUD_SCORE_FONT_SIZE;
  scoreText.fontWeight = 'bold';
  scoreText.color = HUD_TEXT_COLOR;
  scoreText.fontFamily = 'monospace';
  scoreText.outlineColor = HUD_OUTLINE_COLOR;
  scoreText.outlineWidth = HUD_SCORE_OUTLINE_WIDTH;
  scoreText.top = HUD_SCORE_TOP;
  scoreText.isVisible = false;
  ui.addControl(scoreText);

  const liveScore = new TextBlock('liveScore', '0 - 0');
  liveScore.fontSize = HUD_LIVE_SCORE_FONT_SIZE;
  liveScore.fontWeight = 'bold';
  liveScore.color = HUD_TEXT_COLOR;
  liveScore.fontFamily = 'monospace';
  liveScore.outlineColor = HUD_OUTLINE_COLOR;
  liveScore.outlineWidth = HUD_SCORE_OUTLINE_WIDTH;
  liveScore.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  liveScore.top = HUD_LIVE_SCORE_TOP;
  ui.addControl(liveScore);

  // P1 control label with icons
  const p1Items: IconRowItem[] = [
    { text: 'P1:' },
    ...iconsFromKeys(P1_KB_MOVE, KB_ICONS),
    { text: '+' },
    ...iconsFromKeys(P1_KB_SLAP, KB_ICONS),
    { text: '+' },
    ...iconsFromKeys(P1_KB_ABILITY, KB_ICONS),
  ];
  const p1Label = createIconRow(p1Items, {
    iconSize: ICON_SIZE.sm,
    fontSize: 14,
    color: P1_HUD_COLOR,
    gap: 1,
    name: 'p1Label',
  });
  p1Label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  p1Label.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  p1Label.left = HUD_SIDE_MARGIN;
  p1Label.top = `-${HUD_LABEL_BOTTOM}`;
  ui.addControl(p1Label);

  // P2 control label with icons
  const p2Items: IconRowItem[] = [
    { text: 'P2:' },
    ...iconsFromKeys(P2_KB_MOVE, KB_ICONS),
    { text: '+' },
    ...iconsFromKeys(P2_KB_SLAP, KB_ICONS),
    { text: '+' },
    ...iconsFromKeys(P2_KB_ABILITY, KB_ICONS),
  ];
  const p2Label = createIconRow(p2Items, {
    iconSize: ICON_SIZE.sm,
    fontSize: 14,
    color: P2_HUD_COLOR,
    gap: 1,
    name: 'p2Label',
  });
  p2Label.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  p2Label.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  p2Label.left = `-${HUD_SIDE_MARGIN}`;
  p2Label.top = `-${HUD_LABEL_BOTTOM}`;
  ui.addControl(p2Label);

  const p1Cooldown = new TextBlock('p1Cooldown', '');
  p1Cooldown.fontSize = HUD_COOLDOWN_FONT_SIZE;
  p1Cooldown.fontWeight = 'bold';
  p1Cooldown.color = P1_HUD_COLOR;
  p1Cooldown.fontFamily = 'monospace';
  p1Cooldown.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  p1Cooldown.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  p1Cooldown.left = HUD_SIDE_MARGIN;
  p1Cooldown.top = `-${HUD_COOLDOWN_BOTTOM}`;
  ui.addControl(p1Cooldown);

  const p2Cooldown = new TextBlock('p2Cooldown', '');
  p2Cooldown.fontSize = HUD_COOLDOWN_FONT_SIZE;
  p2Cooldown.fontWeight = 'bold';
  p2Cooldown.color = P2_HUD_COLOR;
  p2Cooldown.fontFamily = 'monospace';
  p2Cooldown.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  p2Cooldown.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  p2Cooldown.left = `-${HUD_SIDE_MARGIN}`;
  p2Cooldown.top = `-${HUD_COOLDOWN_BOTTOM}`;
  ui.addControl(p2Cooldown);

  const controlsText = new TextBlock('controlsText', 'SLAP your opponent off the arena!');
  controlsText.fontSize = HUD_CONTROLS_FONT_SIZE;
  controlsText.color = HUD_CONTROLS_COLOR;
  controlsText.fontFamily = 'monospace';
  controlsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  controlsText.top = HUD_CONTROLS_TOP;
  ui.addControl(controlsText);

  return {
    ui, winText, restartText, scoreText, liveScore, p1Label, p2Label, controlsText, p1Cooldown, p2Cooldown,
    fadeAlpha: 0, winFadeAlpha: 0, prevWinVisible: false,
  };
}

const HUD_FADE_SPEED = 4; // full opacity in 0.25s

export function updateHud(hud: HudElements, state: GameState, dt: number, isAI = false): void {
  // Fade base HUD elements
  if (hud.fadeAlpha < 1) {
    hud.fadeAlpha = Math.min(1, hud.fadeAlpha + dt * HUD_FADE_SPEED);
  }
  hud.liveScore.alpha = hud.fadeAlpha;
  hud.p1Label.alpha = hud.fadeAlpha;
  hud.p2Label.alpha = hud.fadeAlpha;
  hud.p1Cooldown.alpha = hud.fadeAlpha;
  hud.p2Cooldown.alpha = hud.fadeAlpha;
  hud.controlsText.alpha = hud.fadeAlpha;

  const winVisible = state.winner !== null;
  if (state.winner !== null) {
    const setWon = state.scores[state.winner] >= state.roundsToWin;
    const name = isAI && state.winner === 1 ? 'AI' : `Player ${state.winner + 1}`;
    const color = state.winner === 0 ? P1_HUD_COLOR : P2_HUD_COLOR;

    if (setWon) {
      hud.winText.text = `${name} wins the set!`;
      hud.restartText.text = 'Press SPACE for new set';
    } else {
      hud.winText.text = `${name} wins the round!`;
      hud.restartText.text = 'Press SPACE for next round';
    }
    hud.winText.color = color;
    hud.winText.isVisible = true;
    hud.restartText.isVisible = true;
    hud.scoreText.text = `P1 ${state.scores[0]} - ${state.scores[1]} ${isAI ? 'AI' : 'P2'}`;
    hud.scoreText.isVisible = true;
  } else {
    hud.winText.isVisible = false;
    hud.restartText.isVisible = false;
    hud.scoreText.isVisible = false;
  }

  // Fade win elements
  if (winVisible && !hud.prevWinVisible) {
    hud.winFadeAlpha = 0;
    hud.winText.alpha = 0;
    hud.restartText.alpha = 0;
    hud.scoreText.alpha = 0;
  }
  hud.prevWinVisible = winVisible;
  if (winVisible && hud.winFadeAlpha < 1) {
    hud.winFadeAlpha = Math.min(1, hud.winFadeAlpha + dt * HUD_FADE_SPEED);
  }
  hud.winText.alpha = hud.winFadeAlpha;
  hud.restartText.alpha = hud.winFadeAlpha;
  hud.scoreText.alpha = hud.winFadeAlpha;

  // Live score (always updated)
  hud.liveScore.text = `${state.scores[0]} - ${state.scores[1]}`;

  // Cooldown display
  for (let i = 0; i < 2; i++) {
    const player = state.players[i];
    const cdText = i === 0 ? hud.p1Cooldown : hud.p2Cooldown;
    const name = ABILITY_NAMES[player.ability] || player.ability;

    if (player.abilityCooldown > 0) {
      cdText.text = `${name} [${player.abilityCooldown.toFixed(1)}s]`;
    } else {
      cdText.text = `${name} [READY]`;
    }
  }
}

export function setHudVisible(hud: HudElements, visible: boolean, isAI = false): void {
  hud.p1Label.isVisible = visible;
  hud.p2Label.isVisible = visible && !isAI;
  hud.p1Cooldown.isVisible = visible;
  hud.p2Cooldown.isVisible = visible;
  hud.controlsText.isVisible = visible;
  hud.liveScore.isVisible = visible;
  hud.winText.isVisible = false;
  hud.restartText.isVisible = false;
  hud.scoreText.isVisible = false;
  if (visible) {
    hud.fadeAlpha = 0;
    hud.winFadeAlpha = 0;
    hud.prevWinVisible = false;
    hud.liveScore.alpha = 0;
    hud.p1Label.alpha = 0;
    hud.p2Label.alpha = 0;
    hud.p1Cooldown.alpha = 0;
    hud.p2Cooldown.alpha = 0;
    hud.controlsText.alpha = 0;
  }
}
