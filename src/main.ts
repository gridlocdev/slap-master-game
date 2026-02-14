import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene.ts';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  scene: [GameScene],
  backgroundColor: '#1a1a2e',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    width: 1280,
    height: 720,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});
