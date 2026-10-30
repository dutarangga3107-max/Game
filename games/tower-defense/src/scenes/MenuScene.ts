import Phaser from 'phaser';
import { COLORS, FONT, FONT_MONO, GAME_H, GAME_W } from '../config/constants';
import { LEVEL } from '../config/level';
import { TOWERS, TOWER_ORDER } from '../config/towers';
import { scores } from '../scores';
import { Button } from '../ui/Button';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    this.add.rectangle(0, 0, GAME_W, GAME_H, COLORS.bg).setOrigin(0, 0);

    const cx = GAME_W / 2;
    const rgba = (c: number) => Phaser.Display.Color.IntegerToColor(c).rgba;

    this.add
      .text(cx, 150, 'TOWER DEFENSE', {
        fontFamily: FONT,
        fontSize: '58px',
        color: rgba(COLORS.text),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 200, `${LEVEL.name}  ·  ${LEVEL.waves.length} wave`, {
        fontFamily: FONT_MONO,
        fontSize: '15px',
        color: rgba(COLORS.textDim),
      })
      .setOrigin(0.5);

    const best = scores.best('wave');
    if (best > 0) {
      this.add
        .text(cx, 230, `Rekor: wave ${best}`, { fontFamily: FONT_MONO, fontSize: '13px', color: rgba(COLORS.gold) })
        .setOrigin(0.5);
    }

    const lines = TOWER_ORDER.map((k) => {
      const d = TOWERS[k];
      return `${d.hotkey}  ${d.name.padEnd(8)} ${String(d.levels[0].cost).padStart(4)}g   ${d.blurb}`;
    });

    this.add
      .text(cx, 320, lines.join('\n'), {
        fontFamily: FONT_MONO,
        fontSize: '13px',
        color: rgba(COLORS.textDim),
        align: 'left',
      })
      .setOrigin(0.5)
      .setLineSpacing(8);

    this.add
      .text(
        cx,
        440,
        'Klik tile kosong untuk bangun  ·  Space panggil wave lebih cepat\nF ubah kecepatan  ·  P pause  ·  Klik tower untuk upgrade / jual',
        { fontFamily: FONT, fontSize: '13px', color: rgba(COLORS.textDim), align: 'center' },
      )
      .setOrigin(0.5)
      .setLineSpacing(6);

    new Button(this, {
      x: cx - 110,
      y: 520,
      width: 220,
      height: 52,
      label: 'MULAI  (Enter)',
      accent: COLORS.base,
      onClick: () => this.startGame(),
    });

    this.input.keyboard?.once('keydown-ENTER', () => this.startGame());
    this.input.keyboard?.once('keydown-SPACE', () => this.startGame());
  }

  private startGame(): void {
    this.scene.start('game');
  }
}
