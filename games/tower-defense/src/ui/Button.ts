import Phaser from 'phaser';
import { COLORS, FONT } from '../config/constants';

export interface ButtonOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  sub?: string;
  accent?: number;
  onClick: () => void;
}

/** Tombol panel sederhana: rect + label + subteks opsional. */
export class Button {
  readonly bg: Phaser.GameObjects.Rectangle;
  private readonly labelText: Phaser.GameObjects.Text;
  private readonly subText: Phaser.GameObjects.Text | null;
  private readonly accent: number;
  private enabled = true;
  private active = false;

  constructor(scene: Phaser.Scene, private readonly opts: ButtonOptions) {
    this.accent = opts.accent ?? COLORS.text;

    this.bg = scene.add
      .rectangle(opts.x, opts.y, opts.width, opts.height, COLORS.panel)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.line)
      .setInteractive({ useHandCursor: true });

    // Kartu dengan subteks rata kiri; tombol aksi polos dibuat center.
    const hasSub = opts.sub !== undefined;
    this.labelText = scene.add
      .text(
        hasSub ? opts.x + 10 : opts.x + opts.width / 2,
        hasSub ? opts.y + 8 : opts.y + opts.height / 2,
        opts.label,
        {
          fontFamily: FONT,
          fontSize: '13px',
          color: Phaser.Display.Color.IntegerToColor(this.accent).rgba,
          fontStyle: 'bold',
        },
      )
      .setOrigin(hasSub ? 0 : 0.5, hasSub ? 0 : 0.5);

    this.subText = hasSub
      ? scene.add
          .text(opts.x + 10, opts.y + 26, opts.sub as string, {
            fontFamily: FONT,
            fontSize: '10px',
            color: Phaser.Display.Color.IntegerToColor(COLORS.textDim).rgba,
            wordWrap: { width: opts.width - 20 },
          })
          .setOrigin(0, 0)
      : null;

    this.bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () => {
      if (this.enabled) this.bg.setFillStyle(COLORS.panelHover);
    });
    this.bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.repaint());
    this.bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      if (this.enabled) this.opts.onClick();
    });
  }

  setEnabled(value: boolean): this {
    this.enabled = value;
    this.labelText.setAlpha(value ? 1 : 0.4);
    this.subText?.setAlpha(value ? 1 : 0.35);
    this.bg.setAlpha(value ? 1 : 0.6);
    if (this.bg.input) this.bg.input.cursor = value ? 'pointer' : 'default';
    this.repaint();
    return this;
  }

  setHighlight(value: boolean): this {
    this.active = value;
    this.repaint();
    return this;
  }

  setLabel(label: string): this {
    this.labelText.setText(label);
    return this;
  }

  setSub(sub: string): this {
    this.subText?.setText(sub);
    return this;
  }

  setVisible(value: boolean): this {
    this.bg.setVisible(value);
    this.labelText.setVisible(value);
    this.subText?.setVisible(value);
    return this;
  }

  private repaint(): void {
    this.bg.setFillStyle(this.active ? COLORS.panelHover : COLORS.panel);
    this.bg.setStrokeStyle(this.active ? 2 : 1, this.active ? this.accent : COLORS.line);
  }
}
