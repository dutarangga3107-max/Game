import Phaser from 'phaser';
import { COLORS, FONT, FONT_MONO, GAME_H, PLAYFIELD_W, SIDEBAR_W } from '../config/constants';
import { TOWERS, TOWER_ORDER } from '../config/towers';
import { Ev, EventBus, type WaveStatusPayload } from '../core/EventBus';
import { Button } from '../ui/Button';
import { TARGET_MODE_LABEL, type TowerInfo, type TowerKind } from '../types';

const PAD = 14;
const X = PLAYFIELD_W + PAD;
const W = SIDEBAR_W - PAD * 2;

/**
 * Sidebar: berjalan sebagai scene terpisah di atas GameScene dan hanya
 * berkomunikasi lewat EventBus, jadi logika game tidak tercampur UI.
 */
export class HudScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  private shopButtons = new Map<TowerKind, Button>();
  private detailTitle!: Phaser.GameObjects.Text;
  private detailStats!: Phaser.GameObjects.Text;
  private detailHint!: Phaser.GameObjects.Text;
  private upgradeBtn!: Button;
  private sellBtn!: Button;
  private targetBtn!: Button;
  private waveBtn!: Button;
  private speedBtn!: Button;
  private pauseBtn!: Button;

  private gold = 0;
  private selected: TowerInfo | null = null;
  private buildKind: TowerKind | null = null;

  constructor() {
    super('hud');
  }

  create(): void {
    this.drawChrome();
    this.buildStatsPanel();
    this.buildShop();
    this.buildDetailPanel();
    this.buildFooter();

    this.bindBus();
    this.refreshShop();
    this.refreshDetail();
    EventBus.emit(Ev.HudReady);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unbindBus());
  }

  // --------------------------------------------------------------- Layout

  private drawChrome(): void {
    const g = this.add.graphics();
    g.fillStyle(COLORS.sidebar, 1);
    g.fillRect(PLAYFIELD_W, 0, SIDEBAR_W, GAME_H);
    g.lineStyle(1, COLORS.line, 1);
    g.lineBetween(PLAYFIELD_W + 0.5, 0, PLAYFIELD_W + 0.5, GAME_H);
  }

  private label(x: number, y: number, text: string, size: number, color: number, mono = false): Phaser.GameObjects.Text {
    return this.add.text(x, y, text, {
      fontFamily: mono ? FONT_MONO : FONT,
      fontSize: `${size}px`,
      color: Phaser.Display.Color.IntegerToColor(color).rgba,
    });
  }

  private buildStatsPanel(): void {
    this.add.rectangle(X, 14, W, 78, COLORS.panel).setOrigin(0, 0).setStrokeStyle(1, COLORS.line);

    this.label(X + 10, 22, 'GOLD', 9, COLORS.textDim);
    this.goldText = this.label(X + 10, 33, '0', 20, COLORS.gold, true).setFontStyle('bold');

    this.label(X + 112, 22, 'NYAWA', 9, COLORS.textDim);
    this.livesText = this.label(X + 112, 33, '0', 20, COLORS.heart, true).setFontStyle('bold');

    this.label(X + 10, 62, 'WAVE', 9, COLORS.textDim);
    this.waveText = this.label(X + 48, 60, '-', 12, COLORS.text, true);
    this.statusText = this.label(X + 112, 60, '', 11, COLORS.textDim);
  }

  private buildShop(): void {
    this.label(X, 104, 'TOWER', 10, COLORS.textDim).setLetterSpacing(1);

    let y = 120;
    for (const kind of TOWER_ORDER) {
      const def = TOWERS[kind];
      const lvl = def.levels[0];
      const btn = new Button(this, {
        x: X,
        y,
        width: W,
        height: 54,
        label: `${def.hotkey}  ${def.name}  ·  ${lvl.cost}g`,
        sub: `${lvl.damage} dmg · ${lvl.fireRate}/s · ${lvl.range}r — ${def.blurb}`,
        accent: def.tint,
        onClick: () => EventBus.emit(Ev.ReqBuild, kind),
      });
      this.shopButtons.set(kind, btn);
      y += 60;
    }
  }

  private buildDetailPanel(): void {
    const top = 364;
    this.add.rectangle(X, top, W, 204, COLORS.panel).setOrigin(0, 0).setStrokeStyle(1, COLORS.line);

    this.detailTitle = this.label(X + 10, top + 10, '', 14, COLORS.text).setFontStyle('bold');
    this.detailStats = this.label(X + 10, top + 34, '', 11, COLORS.textDim, true).setLineSpacing(2);
    this.detailHint = this.label(X + 10, top + 34, 'Klik tower di peta\nuntuk upgrade / jual.', 11, COLORS.textDim).setLineSpacing(4);

    this.upgradeBtn = new Button(this, {
      x: X + 8,
      y: top + 124,
      width: W - 16,
      height: 32,
      label: 'Upgrade',
      accent: COLORS.buildOk,
      onClick: () => EventBus.emit(Ev.ReqUpgrade),
    });

    this.targetBtn = new Button(this, {
      x: X + 8,
      y: top + 160,
      width: (W - 24) / 2,
      height: 32,
      label: 'Target',
      accent: COLORS.range,
      onClick: () => EventBus.emit(Ev.ReqTargetMode),
    });

    this.sellBtn = new Button(this, {
      x: X + 16 + (W - 24) / 2,
      y: top + 160,
      width: (W - 24) / 2,
      height: 32,
      label: 'Jual',
      accent: COLORS.buildBad,
      onClick: () => EventBus.emit(Ev.ReqSell),
    });
  }

  private buildFooter(): void {
    this.waveBtn = new Button(this, {
      x: X,
      y: 578,
      width: W,
      height: 40,
      label: 'Mulai wave (Space)',
      accent: COLORS.base,
      onClick: () => EventBus.emit(Ev.ReqStartWave),
    });

    this.speedBtn = new Button(this, {
      x: X,
      y: 626,
      width: (W - 8) / 2,
      height: 32,
      label: '1x  (F)',
      accent: COLORS.gold,
      onClick: () => EventBus.emit(Ev.ReqSpeed),
    });

    this.pauseBtn = new Button(this, {
      x: X + (W - 8) / 2 + 8,
      y: 626,
      width: (W - 8) / 2,
      height: 32,
      label: 'Pause (P)',
      accent: COLORS.textDim,
      onClick: () => EventBus.emit(Ev.ReqTogglePause),
    });

    this.label(X, 666, 'Klik kanan / Esc: batal\nU upgrade · X jual · T target', 10, COLORS.textDim).setLineSpacing(3);
  }

  // ----------------------------------------------------------------- Bus

  private bindBus(): void {
    EventBus.on(Ev.GoldChanged, this.onGold, this);
    EventBus.on(Ev.LivesChanged, this.onLives, this);
    EventBus.on(Ev.WaveChanged, this.onWave, this);
    EventBus.on(Ev.WaveStatus, this.onWaveStatus, this);
    EventBus.on(Ev.TowerSelected, this.onTowerSelected, this);
    EventBus.on(Ev.BuildMode, this.onBuildMode, this);
    EventBus.on(Ev.SpeedChanged, this.onSpeed, this);
    EventBus.on(Ev.PauseChanged, this.onPause, this);
  }

  private unbindBus(): void {
    EventBus.off(Ev.GoldChanged, this.onGold, this);
    EventBus.off(Ev.LivesChanged, this.onLives, this);
    EventBus.off(Ev.WaveChanged, this.onWave, this);
    EventBus.off(Ev.WaveStatus, this.onWaveStatus, this);
    EventBus.off(Ev.TowerSelected, this.onTowerSelected, this);
    EventBus.off(Ev.BuildMode, this.onBuildMode, this);
    EventBus.off(Ev.SpeedChanged, this.onSpeed, this);
    EventBus.off(Ev.PauseChanged, this.onPause, this);
  }

  private onGold(gold: number): void {
    this.gold = gold;
    this.goldText.setText(String(gold));
    this.refreshShop();
    this.refreshDetail();
  }

  private onLives(lives: number): void {
    this.livesText.setText(String(lives));
  }

  private onWave(payload: { wave: number; total: number }): void {
    this.waveText.setText(`${payload.wave} / ${payload.total}`);
  }

  private onWaveStatus(payload: WaveStatusPayload): void {
    if (payload.phase === 'break') {
      const secs = Math.ceil(payload.breakRemainingMs / 1000);
      this.statusText.setText(`jeda ${secs}s`);
      this.waveBtn.setEnabled(true).setLabel('Mulai wave (Space)');
    } else {
      this.statusText.setText(`${payload.enemiesAlive} musuh`);
      this.waveBtn.setEnabled(false).setLabel(payload.phase === 'spawning' ? 'Wave berjalan…' : 'Bersihkan sisa…');
    }
  }

  private onTowerSelected(info: TowerInfo | null): void {
    this.selected = info;
    this.refreshDetail();
  }

  private onBuildMode(kind: TowerKind | null): void {
    this.buildKind = kind;
    this.refreshShop();
  }

  private onSpeed(mult: number): void {
    this.speedBtn.setLabel(`${mult}x  (F)`);
  }

  private onPause(paused: boolean): void {
    this.pauseBtn.setLabel(paused ? 'Lanjut (P)' : 'Pause (P)').setHighlight(paused);
  }

  // ------------------------------------------------------------- Refresh

  private refreshShop(): void {
    for (const kind of TOWER_ORDER) {
      const btn = this.shopButtons.get(kind);
      if (!btn) continue;
      btn.setEnabled(this.gold >= TOWERS[kind].levels[0].cost);
      btn.setHighlight(this.buildKind === kind);
    }
  }

  private refreshDetail(): void {
    const info = this.selected;
    const hasSelection = info !== null;

    this.detailHint.setVisible(!hasSelection);
    this.detailTitle.setVisible(hasSelection);
    this.detailStats.setVisible(hasSelection);
    this.upgradeBtn.setVisible(hasSelection);
    this.targetBtn.setVisible(hasSelection);
    this.sellBtn.setVisible(hasSelection);

    if (!info) return;

    this.detailTitle.setText(`${info.name}  Lv.${info.level}/${info.maxLevel}`);
    this.detailStats.setText(
      [
        `damage   ${info.damage}`,
        `rate     ${info.fireRate.toFixed(2)}/s`,
        `dps      ${(info.damage * info.fireRate).toFixed(1)}`,
        `range    ${info.range}`,
        `target   ${info.canHitAir ? 'darat + udara' : 'darat'}`,
      ].join('\n'),
    );

    this.upgradeBtn
      .setLabel(info.canUpgrade ? `Upgrade  ·  ${info.upgradeCost}g  (U)` : 'Level maksimum')
      .setEnabled(info.canUpgrade && this.gold >= info.upgradeCost);

    this.targetBtn.setLabel(TARGET_MODE_LABEL[info.targetMode]);
    this.sellBtn.setLabel(`Jual ${info.sellValue}g`);
  }
}
