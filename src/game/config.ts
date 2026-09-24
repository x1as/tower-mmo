import Phaser from 'phaser';
import { GAME_W, GAME_H } from '@tower/shared';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

export const GAME_CONFIG: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_W,
  height: GAME_H,
  parent: 'game-container',
  backgroundColor: '#91db68',
  pixelArt: false,
  roundPixels: true,
  antialias: true,
  scene: [BootScene, GameScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },
};
