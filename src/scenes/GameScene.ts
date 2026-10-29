import Phaser from 'phaser';
import {
  COLORS,
  COLS,
  DEPTH,
  FONT,
  GAME_H,
  PLAYFIELD_W,
  ROWS,
  SPEEDS,
  TILE,
} from '../config/constants';
import { LEVEL } from '../config/level';
import { CHAIN_JUMP_RANGE, TOWERS } from '../config/towers';
import type { Combat } from '../core/Combat';
import { Ev, EventBus, type GameOverPayload, type WaveStatusPayload } from '../core/EventBus';
import { GameState } from '../core/GameState';
import { Grid } from '../core/Grid';
import { findGroundPath, tilesToWorld } from '../core/Pathfinder';
import { WaveManager } from '../core/WaveManager';
import { Enemy } from '../entities/Enemy';
import { Projectile } from '../entities/Projectile';
import { Tower } from '../entities/Tower';
import { TARGET_MODES, type EnemyKind, type Point, type TowerInfo, type TowerKind } from '../types';

const BEST_WAVE_KEY = 'td.bestWave';
const BULLET_SPEED = 560;
const SHELL_SPEED = 330;
const HIT_RADIUS = 11;

interface FxLine {
  points: Point[];
  color: number;
  width: number;
  ttl: number;
  maxTtl: number;
}

export class GameScene extends Phaser.Scene implements Combat {
  private grid!: Grid;
  private groundPath: Point[] = [];
  private airPath: Point[] = [];
  private state!: GameState;
  private waves!: WaveManager;

  private enemies: Enemy[] = [];
  private enemyPool: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private projectilePool: Projectile[] = [];
  private towers: Tower[] = [];
  private towerAt = new Map<number, Tower>();

  private hpBars!: Phaser.GameObjects.Graphics;
  private fxLayer!: Phaser.GameObjects.Graphics;
  private rangeLayer!: Phaser.GameObjects.Graphics;
  private ghost!: Phaser.GameObjects.Container;
  private selectionMarker!: Phaser.GameObjects.Image;

  private fxLines: FxLine[] = [];
  private buildKind: TowerKind | null = null;
  private selected: Tower | null = null;
  private hoverCol = -1;
  private hoverRow = -1;

  private speedIndex = 0;
  private paused = false;
  private over = false;
  private lastStatusSignature = '';

  constructor() {
    super('game');
  }

  create(): void {
    this.resetRuntime();

    this.grid = new Grid(LEVEL.layout);
    this.groundPath = tilesToWorld(this.grid, findGroundPath(this.grid));
    this.airPath = LEVEL.airRoute.map((t) => this.grid.tileToWorld(t.col, t.row));
    this.state = new GameState();

    this.drawTerrain();
    this.createLayers();
    this.createGhost();

    this.waves = new WaveManager(LEVEL.waves, {
      spawn: (kind, hpScale) => this.spawnEnemy(kind, hpScale),
      onWaveStart: (wave) => EventBus.emit(Ev.WaveChanged, { wave, total: this.waves.totalWaves }),
      onWaveCleared: (_wave, reward) => {
        this.state.earn(reward);
        this.floatText(PLAYFIELD_W / 2, GAME_H / 2, `Wave bersih +${reward}`, COLORS.gold, 22);
      },
      onAllWavesCleared: () => this.endGame(true),
    });

    this.bindInput();
    this.bindBusHandlers();

    // HUD yang memberi aba-aba siap, jadi nilai awal tidak pernah terkirim
    // sebelum listener-nya terpasang.
    this.scene.launch('hud');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  override update(_time: number, delta: number): void {
    if (this.paused || this.over) return;

    const dt = Math.min(delta, 50) * SPEEDS[this.speedIndex];

    for (const e of this.enemies) e.tick(dt);
    this.harvestEnemies();

    for (const t of this.towers) t.tick(dt, this);

    this.updateProjectiles(dt);
    this.waves.update(dt, this.enemies.length);

    this.drawHpBars();
    this.drawFx(dt);
    this.emitWaveStatus();

    if (this.state.isDefeated) this.endGame(false);
  }

  // ---------------------------------------------------------------- Combat

  getEnemies(): readonly Enemy[] {
    return this.enemies;
  }

  spawnBullet(tower: Tower, target: Enemy): void {
    const st = tower.stats;
    this.obtainProjectile().launch({
      kind: 'bullet',
      x: tower.x,
      y: tower.y,
      damage: st.damage,
      splash: 0,
      speed: BULLET_SPEED,
      pierce: st.pierce ?? 0,
      tint: tower.def.tint,
      target,
      tx: target.x,
      ty: target.y,
    });
  }

  spawnShell(tower: Tower, target: Enemy): void {
    const st = tower.stats;
    // Mortar memimpin target: perkirakan posisi saat peluru tiba.
    const dist = Phaser.Math.Distance.Between(tower.x, tower.y, target.x, target.y);
    const travel = dist / SHELL_SPEED;
    const lead = this.predict(target, travel);

    this.obtainProjectile().launch({
      kind: 'shell',
      x: tower.x,
      y: tower.y,
      damage: st.damage,
      splash: st.splash ?? 0,
      speed: SHELL_SPEED,
      pierce: 0,
      tint: tower.def.tint,
      target: null,
      tx: lead.x,
      ty: lead.y,
    });
  }

  fireBeam(tower: Tower, target: Enemy): void {
    const st = tower.stats;
    this.damageEnemy(target, st.damage);
    if (st.slowFactor !== undefined && st.slowDurationMs !== undefined) {
      if (target.isAlive) target.applySlow(st.slowFactor, st.slowDurationMs);
    }
    this.fxLines.push({
      points: [
        { x: tower.x, y: tower.y },
        { x: target.x, y: target.y },
      ],
      color: tower.def.tint,
      width: 3,
      ttl: 120,
      maxTtl: 120,
    });
  }

  fireChain(tower: Tower, target: Enemy): void {
    const st = tower.stats;
    const jumps = st.chain ?? 1;
    const chainPoints: Point[] = [{ x: tower.x, y: tower.y }];
    const hit = new Set<Enemy>();

    let current: Enemy | null = target;
    for (let i = 0; i < jumps && current; i++) {
      hit.add(current);
      chainPoints.push({ x: current.x, y: current.y });
      // Damage menurun 20% tiap lompatan.
      this.damageEnemy(current, st.damage * Math.pow(0.8, i));
      current = this.nearestUnhit(current, hit);
    }

    this.fxLines.push({ points: chainPoints, color: tower.def.tint, width: 2, ttl: 150, maxTtl: 150 });
  }

  // ---------------------------------------------------------- Enemy & gold

  private spawnEnemy(kind: EnemyKind, hpScale: number): void {
    const enemy = this.enemyPool.pop() ?? new Enemy(this);
    const path = kind === 'flyer' ? this.airPath : this.groundPath;
    enemy.spawn(kind, path, hpScale);
    this.enemies.push(enemy);
  }

  private damageEnemy(enemy: Enemy, amount: number): void {
    if (!enemy.isAlive) return;
    enemy.takeDamage(amount);
    if (!enemy.isAlive) this.rewardKill(enemy);
  }

  private rewardKill(enemy: Enemy): void {
    this.state.earn(enemy.def.bounty);
    this.floatText(enemy.x, enemy.y, `+${enemy.def.bounty}`, COLORS.gold, 14);
  }

  /** Buang musuh mati / yang sampai base, lalu kembalikan ke pool. */
  private harvestEnemies(): void {
    let write = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.isAlive) {
        this.enemies[write++] = e;
        continue;
      }
      if (e.reachedBase) {
        this.state.loseLives(e.def.damageToBase);
        this.cameras.main.shake(140, 0.004);
        this.floatText(e.x, e.y, `-${e.def.damageToBase}`, COLORS.heart, 18);
      }
      e.recycle();
      this.enemyPool.push(e);
    }
    this.enemies.length = write;
  }

  private predict(enemy: Enemy, seconds: number): Point {
    // Pendekatan sederhana: lanjutkan arah hadap musuh saat ini.
    const speed = enemy.def.speed * (enemy.isSlowed ? 0.5 : 1);
    return {
      x: enemy.x + Math.cos(enemy.rotation) * speed * seconds,
      y: enemy.y + Math.sin(enemy.rotation) * speed * seconds,
    };
  }

  private nearestUnhit(from: Enemy, exclude: Set<Enemy>): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = CHAIN_JUMP_RANGE * CHAIN_JUMP_RANGE;
    for (const e of this.enemies) {
      if (!e.isAlive || exclude.has(e)) continue;
      const d = (e.x - from.x) ** 2 + (e.y - from.y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  // ----------------------------------------------------------- Projectiles

  private obtainProjectile(): Projectile {
    const p = this.projectilePool.pop() ?? new Projectile(this);
    this.projectiles.push(p);
    return p;
  }

  private updateProjectiles(dt: number): void {
    const step = dt / 1000;
    let write = 0;

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      p.ttl -= dt;
      let done = p.ttl <= 0;

      if (!done && p.kind === 'bullet') {
        done = this.stepBullet(p, step);
      } else if (!done) {
        done = this.stepShell(p, step);
      }

      if (done) {
        p.recycle();
        this.projectilePool.push(p);
      } else {
        this.projectiles[write++] = p;
      }
    }
    this.projectiles.length = write;
  }

  /** @returns true kalau peluru habis dan harus didaur ulang. */
  private stepBullet(p: Projectile, step: number): boolean {
    if (p.target && p.target.isAlive && p.target.spawnId === p.targetId) {
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      p.vx = (dx / d) * p.speed;
      p.vy = (dy / d) * p.speed;
    } else {
      p.target = null;
    }

    p.x += p.vx * step;
    p.y += p.vy * step;
    p.setRotation(Math.atan2(p.vy, p.vx));

    if (p.x < -40 || p.x > PLAYFIELD_W + 40 || p.y < -40 || p.y > GAME_H + 40) return true;

    for (const e of this.enemies) {
      if (!e.isAlive || p.hitAlready.has(e)) continue;
      const r = HIT_RADIUS + e.def.barWidth * 0.25;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 > r * r) continue;

      p.hitAlready.add(e);
      this.damageEnemy(e, p.damage);
      if (p.pierceLeft <= 0) return true;
      p.pierceLeft--;
      p.target = null; // setelah menembus, peluru lanjut lurus
      break;
    }
    return false;
  }

  /** @returns true kalau mortar sudah mendarat. */
  private stepShell(p: Projectile, step: number): boolean {
    const dx = p.tx - p.x;
    const dy = p.ty - p.y;
    const d = Math.hypot(dx, dy);
    const move = p.speed * step;

    if (d > move) {
      p.x += (dx / d) * move;
      p.y += (dy / d) * move;
      return false;
    }

    p.setPosition(p.tx, p.ty);
    this.explode(p.x, p.y, p.damage, p.splash, p.tintTopLeft);
    return true;
  }

  private explode(x: number, y: number, damage: number, splash: number, tint: number): void {
    const r2 = splash * splash;
    for (const e of this.enemies) {
      if (!e.isAlive || e.def.flying) continue;
      const d2 = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d2 > r2) continue;
      // Damage mengecil ke arah pinggir ledakan (minimum 45%).
      const falloff = 1 - 0.55 * Math.sqrt(d2 / r2);
      this.damageEnemy(e, damage * falloff);
    }

    const ring: Point[] = [];
    for (let i = 0; i <= 14; i++) {
      const a = (Math.PI * 2 * i) / 14;
      ring.push({ x: x + Math.cos(a) * splash, y: y + Math.sin(a) * splash });
    }
    this.fxLines.push({ points: ring, color: tint, width: 3, ttl: 220, maxTtl: 220 });
  }

  // ---------------------------------------------------------- Build & sell

  private tryBuild(col: number, row: number): void {
    if (!this.buildKind) return;
    const def = TOWERS[this.buildKind];
    const cost = def.levels[0].cost;

    if (!this.grid.isBuildable(col, row)) {
      this.floatText(...this.tileText(col, row), 'Tidak bisa dibangun', COLORS.buildBad, 14);
      return;
    }
    if (!this.state.spend(cost)) {
      this.floatText(...this.tileText(col, row), 'Gold kurang', COLORS.buildBad, 14);
      return;
    }

    const { x, y } = this.grid.tileToWorld(col, row);
    const tower = new Tower(this, this.buildKind, col, row, x, y);
    this.towers.push(tower);
    this.towerAt.set(this.tileKey(col, row), tower);
    this.grid.setOccupied(col, row, true);

    // Tetap di mode bangun kalau masih mampu beli lagi — enak buat spam awal.
    if (!this.state.canAfford(cost)) this.setBuildMode(null);
  }

  private sellSelected(): void {
    const tower = this.selected;
    if (!tower) return;
    this.state.earn(tower.sellValue);
    this.floatText(tower.x, tower.y, `+${tower.sellValue}`, COLORS.gold, 16);
    this.grid.setOccupied(tower.col, tower.row, false);
    this.towerAt.delete(this.tileKey(tower.col, tower.row));
    this.towers = this.towers.filter((t) => t !== tower);
    tower.destroy();
    this.selectTower(null);
  }

  private upgradeSelected(): void {
    const tower = this.selected;
    if (!tower || !tower.canUpgrade) return;
    if (!this.state.spend(tower.upgradeCost)) {
      this.floatText(tower.x, tower.y, 'Gold kurang', COLORS.buildBad, 14);
      return;
    }
    tower.upgrade();
    EventBus.emit(Ev.TowerSelected, this.towerInfo(tower));
    this.drawRangePreview();
  }

  private selectTower(tower: Tower | null): void {
    this.selected = tower;
    if (tower) {
      this.selectionMarker.setPosition(tower.x, tower.y).setVisible(true);
    } else {
      this.selectionMarker.setVisible(false);
    }
    EventBus.emit(Ev.TowerSelected, tower ? this.towerInfo(tower) : null);
    this.drawRangePreview();
  }

  private setBuildMode(kind: TowerKind | null): void {
    this.buildKind = kind;
    if (kind) this.selectTower(null);
    this.ghost.setVisible(false);
    EventBus.emit(Ev.BuildMode, kind);
    this.updateGhost();
    this.drawRangePreview();
  }

  private towerInfo(t: Tower): TowerInfo {
    return {
      kind: t.def.kind,
      name: t.def.name,
      level: t.displayLevel,
      maxLevel: t.maxLevel,
      damage: t.stats.damage,
      range: t.stats.range,
      fireRate: t.stats.fireRate,
      canUpgrade: t.canUpgrade,
      upgradeCost: t.upgradeCost,
      sellValue: t.sellValue,
      targetMode: t.targetMode,
      canHitAir: t.def.canHitAir,
    };
  }

  // ----------------------------------------------------------- Presentation

  private drawTerrain(): void {
    const g = this.add.graphics().setDepth(DEPTH.ground);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const type = this.grid.typeAt(col, row);
        const x = col * TILE;
        const y = row * TILE;
        const walkable = type === 'path' || type === 'spawn' || type === 'base';

        if (walkable) {
          g.fillStyle(COLORS.path, 1);
          g.fillRect(x, y, TILE, TILE);
          g.lineStyle(1, COLORS.pathEdge, 0.5);
          g.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        } else {
          g.fillStyle((col + row) % 2 === 0 ? COLORS.ground : COLORS.groundAlt, 1);
          g.fillRect(x, y, TILE, TILE);
          g.lineStyle(1, COLORS.gridLine, 0.6);
          g.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
        }
      }
    }

    const spawn = this.grid.tileToWorld(this.grid.spawn.col, this.grid.spawn.row);
    const base = this.grid.tileToWorld(this.grid.base.col, this.grid.base.row);

    g.fillStyle(COLORS.spawn, 0.85);
    g.fillCircle(spawn.x, spawn.y, 14);
    g.fillStyle(COLORS.base, 0.9);
    g.fillCircle(base.x, base.y, 16);
    g.lineStyle(3, COLORS.base, 0.55);
    g.strokeCircle(base.x, base.y, 22);

    const label = (x: number, y: number, text: string, color: number) =>
      this.add
        .text(x, y, text, { fontFamily: FONT, fontSize: '11px', color: Phaser.Display.Color.IntegerToColor(color).rgba })
        .setOrigin(0.5)
        .setDepth(DEPTH.decor);

    label(spawn.x + 10, spawn.y - 22, 'SPAWN', COLORS.spawn);
    label(base.x, base.y + 30, 'BASE', COLORS.base);
  }

  private createLayers(): void {
    this.rangeLayer = this.add.graphics().setDepth(DEPTH.ghost);
    this.hpBars = this.add.graphics().setDepth(DEPTH.hpBar);
    this.fxLayer = this.add.graphics().setDepth(DEPTH.fx);

    this.selectionMarker = this.add
      .image(0, 0, 'tower-ring')
      .setTint(COLORS.buildOk)
      .setScale(2)
      .setDepth(DEPTH.ghost)
      .setVisible(false);
  }

  private createGhost(): void {
    const base = this.add.image(0, 0, 'tower-base');
    const turret = this.add.image(0, 0, 'turret-arrow');
    this.ghost = this.add.container(0, 0, [base, turret]).setDepth(DEPTH.ghost).setAlpha(0.55).setVisible(false);
  }

  private updateGhost(): void {
    if (!this.buildKind || this.hoverCol < 0) {
      this.ghost.setVisible(false);
      return;
    }
    const ok = this.grid.isBuildable(this.hoverCol, this.hoverRow) && this.state.canAfford(TOWERS[this.buildKind].levels[0].cost);
    const { x, y } = this.grid.tileToWorld(this.hoverCol, this.hoverRow);

    const [, turret] = this.ghost.list as Phaser.GameObjects.Image[];
    turret.setTexture(TOWERS[this.buildKind].turretTexture);
    this.ghost.setPosition(x, y).setVisible(true);
    this.ghost.each((child: Phaser.GameObjects.GameObject) => {
      (child as Phaser.GameObjects.Image).setTint(ok ? COLORS.buildOk : COLORS.buildBad);
    });
  }

  private drawRangePreview(): void {
    this.rangeLayer.clear();

    if (this.selected) {
      this.drawRangeCircle(this.selected.x, this.selected.y, this.selected.stats.range, COLORS.range);
      return;
    }
    if (this.buildKind && this.hoverCol >= 0 && this.grid.isBuildable(this.hoverCol, this.hoverRow)) {
      const { x, y } = this.grid.tileToWorld(this.hoverCol, this.hoverRow);
      this.drawRangeCircle(x, y, TOWERS[this.buildKind].levels[0].range, TOWERS[this.buildKind].tint);
    }
  }

  private drawRangeCircle(x: number, y: number, radius: number, color: number): void {
    this.rangeLayer.fillStyle(color, 0.07);
    this.rangeLayer.fillCircle(x, y, radius);
    this.rangeLayer.lineStyle(1.5, color, 0.55);
    this.rangeLayer.strokeCircle(x, y, radius);
  }

  private drawHpBars(): void {
    this.hpBars.clear();
    for (const e of this.enemies) {
      if (!e.isAlive) continue;
      const w = e.def.barWidth;
      const x = e.x - w / 2;
      const y = e.y - (e.def.kind === 'boss' ? 30 : 20);
      const ratio = e.hp / e.maxHp;

      this.hpBars.fillStyle(COLORS.hpBack, 0.85);
      this.hpBars.fillRect(x - 1, y - 1, w + 2, 5);
      this.hpBars.fillStyle(ratio > 0.35 ? COLORS.hpFill : COLORS.hpFillLow, 1);
      this.hpBars.fillRect(x, y, w * ratio, 3);
    }
  }

  private drawFx(dt: number): void {
    this.fxLayer.clear();
    let write = 0;

    for (let i = 0; i < this.fxLines.length; i++) {
      const fx = this.fxLines[i];
      fx.ttl -= dt;
      if (fx.ttl <= 0) continue;

      this.fxLayer.lineStyle(fx.width, fx.color, fx.ttl / fx.maxTtl);
      this.fxLayer.beginPath();
      this.fxLayer.moveTo(fx.points[0].x, fx.points[0].y);
      for (let j = 1; j < fx.points.length; j++) this.fxLayer.lineTo(fx.points[j].x, fx.points[j].y);
      this.fxLayer.strokePath();

      this.fxLines[write++] = fx;
    }
    this.fxLines.length = write;
  }

  private floatText(x: number, y: number, message: string, color: number, size: number): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color: Phaser.Display.Color.IntegerToColor(color).rgba,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.floatText);

    this.tweens.add({
      targets: text,
      y: y - 26,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private tileText(col: number, row: number): [number, number] {
    const { x, y } = this.grid.tileToWorld(col, row);
    return [x, y];
  }

  /** HUD hanya menampilkan detik & jumlah musuh, jadi emit kalau nilainya berubah. */
  private emitWaveStatus(): void {
    const phase = this.waves.currentPhase;
    const secs = Math.ceil(this.waves.breakRemainingMs / 1000);
    const alive = this.enemies.length;
    const signature = `${phase}|${secs}|${alive}`;
    if (signature === this.lastStatusSignature) return;
    this.lastStatusSignature = signature;

    const payload: WaveStatusPayload = {
      phase,
      breakRemainingMs: this.waves.breakRemainingMs,
      enemiesAlive: alive,
    };
    EventBus.emit(Ev.WaveStatus, payload);
  }

  // ----------------------------------------------------------------- Input

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.x >= PLAYFIELD_W) {
        this.hoverCol = -1;
        this.updateGhost();
        return;
      }
      const { col, row } = this.grid.worldToTile(p.x, p.y);
      if (col === this.hoverCol && row === this.hoverRow) return;
      this.hoverCol = col;
      this.hoverRow = row;
      this.updateGhost();
      if (!this.selected) this.drawRangePreview();
    });

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (p.x >= PLAYFIELD_W || this.over) return;

      if (p.rightButtonDown()) {
        this.setBuildMode(null);
        this.selectTower(null);
        return;
      }

      const { col, row } = this.grid.worldToTile(p.x, p.y);
      if (this.buildKind) {
        this.tryBuild(col, row);
        this.updateGhost();
        this.drawRangePreview();
        return;
      }
      this.selectTower(this.towerAt.get(this.tileKey(col, row)) ?? null);
    });

    const kb = this.input.keyboard;
    if (!kb) return;

    const build = (kind: TowerKind) => () => {
      if (!this.over) this.setBuildMode(kind);
    };
    kb.on('keydown-ONE', build('arrow'));
    kb.on('keydown-TWO', build('cannon'));
    kb.on('keydown-THREE', build('frost'));
    kb.on('keydown-FOUR', build('tesla'));
    kb.on('keydown-ESC', () => {
      this.setBuildMode(null);
      this.selectTower(null);
    });
    kb.on('keydown-SPACE', () => this.startWaveEarly());
    kb.on('keydown-U', () => this.upgradeSelected());
    kb.on('keydown-X', () => this.sellSelected());
    kb.on('keydown-T', () => this.cycleSelectedTargetMode());
    kb.on('keydown-F', () => this.cycleSpeed());
    kb.on('keydown-P', () => this.togglePause());
  }

  private bindBusHandlers(): void {
    EventBus.on(Ev.HudReady, this.pushInitialState, this);
    EventBus.on(Ev.ReqBuild, this.onReqBuild, this);
    EventBus.on(Ev.ReqUpgrade, this.upgradeSelected, this);
    EventBus.on(Ev.ReqSell, this.sellSelected, this);
    EventBus.on(Ev.ReqTargetMode, this.cycleSelectedTargetMode, this);
    EventBus.on(Ev.ReqStartWave, this.startWaveEarly, this);
    EventBus.on(Ev.ReqSpeed, this.cycleSpeed, this);
    EventBus.on(Ev.ReqTogglePause, this.togglePause, this);
    EventBus.on(Ev.ReqRestart, this.restart, this);
    EventBus.on(Ev.ReqMenu, this.toMenu, this);
  }

  private onReqBuild(kind: TowerKind): void {
    this.setBuildMode(this.buildKind === kind ? null : kind);
  }

  private cycleSelectedTargetMode(): void {
    if (!this.selected) return;
    this.selected.cycleTargetMode(TARGET_MODES);
    EventBus.emit(Ev.TowerSelected, this.towerInfo(this.selected));
  }

  private startWaveEarly(): void {
    if (this.over || !this.waves.canCallEarly) return;
    const bonus = this.waves.callEarly();
    if (bonus > 0) {
      this.state.earn(bonus);
      this.floatText(PLAYFIELD_W / 2, 40, `Wave dipanggil cepat +${bonus}`, COLORS.gold, 18);
    }
  }

  private cycleSpeed(): void {
    this.speedIndex = (this.speedIndex + 1) % SPEEDS.length;
    EventBus.emit(Ev.SpeedChanged, SPEEDS[this.speedIndex]);
  }

  private togglePause(): void {
    if (this.over) return;
    this.paused = !this.paused;
    EventBus.emit(Ev.PauseChanged, this.paused);
  }

  // ------------------------------------------------------------- Lifecycle

  private endGame(victory: boolean): void {
    if (this.over) return;
    this.over = true;

    const wave = this.waves.currentWave;
    const best = Math.max(wave, Number(localStorage.getItem(BEST_WAVE_KEY) ?? 0) || 0);
    try {
      localStorage.setItem(BEST_WAVE_KEY, String(best));
    } catch {
      // localStorage bisa diblokir (private mode); skor sesi tetap jalan.
    }

    const payload: GameOverPayload = { victory, wave, totalWaves: this.waves.totalWaves, bestWave: best };
    EventBus.emit(Ev.GameOver, payload);
    this.scene.launch('gameover', payload);
  }

  private restart(): void {
    this.scene.stop('gameover');
    this.scene.stop('hud');
    this.scene.restart();
  }

  private toMenu(): void {
    this.scene.stop('gameover');
    this.scene.stop('hud');
    this.scene.start('menu');
  }

  private resetRuntime(): void {
    this.enemies = [];
    this.enemyPool = [];
    this.projectiles = [];
    this.projectilePool = [];
    this.towers = [];
    this.towerAt = new Map();
    this.fxLines = [];
    this.buildKind = null;
    this.selected = null;
    this.hoverCol = -1;
    this.hoverRow = -1;
    this.speedIndex = 0;
    this.paused = false;
    this.over = false;
    this.lastStatusSignature = '';
  }

  private pushInitialState(): void {
    this.state.broadcast();
    EventBus.emit(Ev.WaveChanged, { wave: 0, total: this.waves.totalWaves });
    EventBus.emit(Ev.SpeedChanged, SPEEDS[this.speedIndex]);
    EventBus.emit(Ev.PauseChanged, this.paused);
    EventBus.emit(Ev.TowerSelected, null);
  }

  private teardown(): void {
    EventBus.off(Ev.HudReady, this.pushInitialState, this);
    EventBus.off(Ev.ReqBuild, this.onReqBuild, this);
    EventBus.off(Ev.ReqUpgrade, this.upgradeSelected, this);
    EventBus.off(Ev.ReqSell, this.sellSelected, this);
    EventBus.off(Ev.ReqTargetMode, this.cycleSelectedTargetMode, this);
    EventBus.off(Ev.ReqStartWave, this.startWaveEarly, this);
    EventBus.off(Ev.ReqSpeed, this.cycleSpeed, this);
    EventBus.off(Ev.ReqTogglePause, this.togglePause, this);
    EventBus.off(Ev.ReqRestart, this.restart, this);
    EventBus.off(Ev.ReqMenu, this.toMenu, this);
  }

  private tileKey(col: number, row: number): number {
    return row * COLS + col;
  }
}
