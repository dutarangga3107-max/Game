import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W } from './config/constants';
import { BootScene } from './scenes/BootScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  backgroundColor: Phaser.Display.Color.IntegerToColor(COLORS.bg).rgba,
  roundPixels: true,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  // Hanya scene pertama yang auto-start; sisanya dijalankan manual.
  scene: [BootScene, MenuScene, GameScene, HudScene, GameOverScene],
};

new Phaser.Game(config);
