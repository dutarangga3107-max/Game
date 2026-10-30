import { START_GOLD, START_LIVES } from '../config/constants';
import { Ev, EventBus } from './EventBus';

export class GameState {
  private _gold = START_GOLD;
  private _lives = START_LIVES;

  get gold(): number {
    return this._gold;
  }

  get lives(): number {
    return this._lives;
  }

  get isDefeated(): boolean {
    return this._lives <= 0;
  }

  canAfford(amount: number): boolean {
    return this._gold >= amount;
  }

  /** Mengembalikan false kalau gold tidak cukup; saldo tidak berubah. */
  spend(amount: number): boolean {
    if (this._gold < amount) return false;
    this._gold -= amount;
    EventBus.emit(Ev.GoldChanged, this._gold);
    return true;
  }

  earn(amount: number): void {
    if (amount <= 0) return;
    this._gold += amount;
    EventBus.emit(Ev.GoldChanged, this._gold);
  }

  loseLives(amount: number): void {
    this._lives = Math.max(0, this._lives - amount);
    EventBus.emit(Ev.LivesChanged, this._lives);
  }

  /** Dipanggil sekali setelah HUD siap, supaya nilai awal ikut terkirim. */
  broadcast(): void {
    EventBus.emit(Ev.GoldChanged, this._gold);
    EventBus.emit(Ev.LivesChanged, this._lives);
  }
}
