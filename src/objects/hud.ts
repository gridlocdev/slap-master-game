import type { GameState } from '../types.ts';
import { GAME_W, GAME_H } from '../constants.ts';

export interface HudElements {
  winText: Phaser.GameObjects.Text;
  restartText: Phaser.GameObjects.Text;
  p1Label: Phaser.GameObjects.Text;
  p2Label: Phaser.GameObjects.Text;
  controlsText: Phaser.GameObjects.Text;
}

export function createHud(scene: Phaser.Scene): HudElements {
  const winText = scene.add.text(GAME_W / 2, GAME_H / 2 - 40, '', {
    fontSize: '48px',
    color: '#ffffff',
    fontFamily: 'monospace',
  }).setOrigin(0.5).setVisible(false);

  const restartText = scene.add.text(GAME_W / 2, GAME_H / 2 + 20, 'Press SPACE to restart', {
    fontSize: '20px',
    color: '#aaaaaa',
    fontFamily: 'monospace',
  }).setOrigin(0.5).setVisible(false);

  const p1Label = scene.add.text(20, 10, 'P1: WASD + C/V', {
    fontSize: '14px',
    color: '#4488ff',
    fontFamily: 'monospace',
  });

  const p2Label = scene.add.text(GAME_W - 20, 10, 'P2: OKL; + ←/→', {
    fontSize: '14px',
    color: '#ff4444',
    fontFamily: 'monospace',
  }).setOrigin(1, 0);

  const controlsText = scene.add.text(GAME_W / 2, GAME_H - 15, 'SLAP your opponent off the arena!', {
    fontSize: '14px',
    color: '#666688',
    fontFamily: 'monospace',
  }).setOrigin(0.5);

  return { winText, restartText, p1Label, p2Label, controlsText };
}

export function updateHud(hud: HudElements, state: GameState): void {
  if (state.winner !== null) {
    hud.winText.setText(`Player ${state.winner + 1} wins!`);
    hud.winText.setColor(state.winner === 0 ? '#4488ff' : '#ff4444');
    hud.winText.setVisible(true);
    hud.restartText.setVisible(true);
  } else {
    hud.winText.setVisible(false);
    hud.restartText.setVisible(false);
  }
}
