import { Scene } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Control } from '@babylonjs/gui';
import type { GameState } from '../types.ts';

export interface HudElements {
  ui: AdvancedDynamicTexture;
  winText: TextBlock;
  restartText: TextBlock;
  p1Label: TextBlock;
  p2Label: TextBlock;
  controlsText: TextBlock;
  p1Cooldown: TextBlock;
  p2Cooldown: TextBlock;
}

const ABILITY_NAMES: Record<string, string> = {
  burrito: 'Black Bean Burrito',
  child: 'Literal Child',
  melon: 'Melon',
};

export function createHud(scene: Scene): HudElements {
  const ui = AdvancedDynamicTexture.CreateFullscreenUI('ui', true, scene);

  const winText = new TextBlock('winText', '');
  winText.fontSize = 48;
  winText.color = '#ffffff';
  winText.fontFamily = 'monospace';
  winText.top = '-40px';
  winText.isVisible = false;
  ui.addControl(winText);

  const restartText = new TextBlock('restartText', 'Press SPACE to restart');
  restartText.fontSize = 20;
  restartText.color = '#aaaaaa';
  restartText.fontFamily = 'monospace';
  restartText.top = '20px';
  restartText.isVisible = false;
  ui.addControl(restartText);

  const p1Label = new TextBlock('p1Label', 'P1: WASD + C/V + E');
  p1Label.fontSize = 14;
  p1Label.color = '#4488ff';
  p1Label.fontFamily = 'monospace';
  p1Label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  p1Label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  p1Label.left = '20px';
  p1Label.top = '10px';
  ui.addControl(p1Label);

  const p2Label = new TextBlock('p2Label', 'P2: OKL; + \u2190/\u2192 + P');
  p2Label.fontSize = 14;
  p2Label.color = '#ff4444';
  p2Label.fontFamily = 'monospace';
  p2Label.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  p2Label.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  p2Label.left = '-20px';
  p2Label.top = '10px';
  ui.addControl(p2Label);

  const p1Cooldown = new TextBlock('p1Cooldown', '');
  p1Cooldown.fontSize = 13;
  p1Cooldown.color = '#4488ff';
  p1Cooldown.fontFamily = 'monospace';
  p1Cooldown.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
  p1Cooldown.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  p1Cooldown.left = '20px';
  p1Cooldown.top = '28px';
  ui.addControl(p1Cooldown);

  const p2Cooldown = new TextBlock('p2Cooldown', '');
  p2Cooldown.fontSize = 13;
  p2Cooldown.color = '#ff4444';
  p2Cooldown.fontFamily = 'monospace';
  p2Cooldown.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
  p2Cooldown.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
  p2Cooldown.left = '-20px';
  p2Cooldown.top = '28px';
  ui.addControl(p2Cooldown);

  const controlsText = new TextBlock('controlsText', 'SLAP your opponent off the arena!');
  controlsText.fontSize = 14;
  controlsText.color = '#666688';
  controlsText.fontFamily = 'monospace';
  controlsText.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
  controlsText.top = '-15px';
  ui.addControl(controlsText);

  return { ui, winText, restartText, p1Label, p2Label, controlsText, p1Cooldown, p2Cooldown };
}

export function updateHud(hud: HudElements, state: GameState): void {
  if (state.winner !== null) {
    hud.winText.text = `Player ${state.winner + 1} wins!`;
    hud.winText.color = state.winner === 0 ? '#4488ff' : '#ff4444';
    hud.winText.isVisible = true;
    hud.restartText.isVisible = true;
  } else {
    hud.winText.isVisible = false;
    hud.restartText.isVisible = false;
  }

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

export function setHudVisible(hud: HudElements, visible: boolean): void {
  hud.p1Label.isVisible = visible;
  hud.p2Label.isVisible = visible;
  hud.p1Cooldown.isVisible = visible;
  hud.p2Cooldown.isVisible = visible;
  hud.controlsText.isVisible = visible;
  hud.winText.isVisible = false;
  hud.restartText.isVisible = false;
}
