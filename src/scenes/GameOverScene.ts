import Phaser from 'phaser';
import { COLORS, FONT, FONT_MONO, GAME_H, GAME_W } from '../config/constants';
import { Ev, EventBus, type GameOverPayload } from '../core/EventBus';
import { Button } from '../ui/Button';

export class GameOverScene extends Phaser.Scene {
  private payload!: GameOverPayload;

  constructor() {
    super('gameover');
  }

  init(data: GameOverPayload): void {
    this.payload = data;
  }

  create(): void {
    const rgba = (c: number) => Phaser.Display.Color.IntegerToColor(c).rgba;
    const cx = GAME_W / 2;
    const { victory, wave, totalWaves, bestWave } = this.payload;

    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.72).setOrigin(0, 0);
    this.add.rectangle(cx - 220, 230, 440, 260, COLORS.panel).setOrigin(0, 0).setStrokeStyle(2, COLORS.line);

    this.add
      .text(cx, 270, victory ? 'BASE SELAMAT' : 'BASE JATUH', {
        fontFamily: FONT,
        fontSize: '34px',
        color: rgba(victory ? COLORS.buildOk : COLORS.buildBad),
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        330,
        [`wave      ${wave} / ${totalWaves}`, `rekor     wave ${bestWave}`].join('\n'),
        { fontFamily: FONT_MONO, fontSize: '15px', color: rgba(COLORS.textDim), align: 'center' },
      )
      .setOrigin(0.5)
      .setLineSpacing(8);

    new Button(this, {
      x: cx - 190,
      y: 400,
      width: 180,
      height: 46,
      label: 'Main lagi (R)',
      accent: COLORS.base,
      onClick: () => this.restart(),
    });

    new Button(this, {
      x: cx + 10,
      y: 400,
      width: 180,
      height: 46,
      label: 'Menu (Esc)',
      accent: COLORS.textDim,
      onClick: () => this.toMenu(),
    });

    this.input.keyboard?.once('keydown-R', () => this.restart());
    this.input.keyboard?.once('keydown-ESC', () => this.toMenu());
  }

  private restart(): void {
    EventBus.emit(Ev.ReqRestart);
  }

  private toMenu(): void {
    EventBus.emit(Ev.ReqMenu);
  }
}
