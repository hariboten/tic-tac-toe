import { GameState, Player } from '../game.types';
import { getAvailableCells } from '../tic-tac-toe.engine';
import { TicTacToeAgent } from './tic-tac-toe-agent';
import { QLearningPolicy } from './q-learning-policy';
import { QLearningReward } from './q-learning-reward';
import { QLearningStateEncoder } from './q-learning-state-encoder';
import { ValidatedTrainingConfig, QLearningTrainingConfig, validateTrainingConfig } from './q-learning-config';
import { RandomSource } from './q-learning.types';
import { QLearningTrainer } from './q-learning-trainer';
import { QLearningValueTable } from './q-learning-value-table';

export type { QLearningTrainingConfig } from './q-learning-config';

class MathRandomSource implements RandomSource {
  next(): number {
    return Math.random();
  }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type PersistedQLearningDataV1 = {
  version: 1;
  totalTrainedEpisodes: number;
  qTable: Record<string, number[]>;
};

export type PersistenceResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export class QLearningAgent implements TicTacToeAgent {
  evaluateMoveWinRates(state: GameState, player: Player): Map<number, number> {
    const availableCells = getAvailableCells(state.board);
    const stateKey = this.stateEncoder.encode(state.board, player);
    const qValues = this.valueTable.getQValues(stateKey);

    return new Map(availableCells.map((index) => [index, this.normalizeQValue(qValues[index])]));
  }

  private readonly valueTable = new QLearningValueTable();
  private readonly stateEncoder = new QLearningStateEncoder();
  private readonly reward = new QLearningReward();
  private readonly policy: QLearningPolicy;
  private readonly trainer: QLearningTrainer;
  private totalEpisodes = 0;

  constructor(randomSource: RandomSource = new MathRandomSource()) {
    this.policy = new QLearningPolicy(this.valueTable, this.stateEncoder, randomSource);
    this.trainer = new QLearningTrainer(this.policy, this.valueTable, this.stateEncoder, this.reward);
  }

  get tableSize(): number {
    return this.valueTable.size;
  }

  get totalTrainedEpisodes(): number {
    return this.totalEpisodes;
  }

  clear(): void {
    this.valueTable.clear();
    this.totalEpisodes = 0;
  }

  pickMove(state: GameState, player: Player): number {
    const availableCells = getAvailableCells(state.board);
    const stateKey = this.stateEncoder.encode(state.board, player);

    if (!this.valueTable.hasNonDefaultQValues(stateKey, availableCells)) {
      return this.policy.pickRandom(availableCells);
    }

    return this.policy.selectAction(state.board, player, availableCells, 0);
  }

  train(config: QLearningTrainingConfig, initialEpsilon = config.epsilon): number {
    const validatedConfig = this.normalizeConfig(config);
    let epsilon = Math.max(validatedConfig.minEpsilon, initialEpsilon);

    for (let episode = 0; episode < validatedConfig.episodes; episode += 1) {
      this.trainer.runEpisode(validatedConfig, epsilon);
      epsilon = Math.max(validatedConfig.minEpsilon, epsilon * validatedConfig.epsilonDecay);
    }

    this.totalEpisodes += validatedConfig.episodes;

    return epsilon;
  }

  saveToStorage(storageKey: string, storage: StorageLike = localStorage): PersistenceResult {
    try {
      storage.setItem(storageKey, JSON.stringify(this.createSnapshot()));
      return { ok: true, message: '学習データを保存しました。' };
    } catch {
      return { ok: false, message: '学習データの保存に失敗しました。ストレージ容量を確認してください。' };
    }
  }

  loadFromStorage(storageKey: string, storage: StorageLike = localStorage): PersistenceResult {
    const raw = storage.getItem(storageKey);
    if (!raw) {
      return { ok: false, message: '保存済みの学習データが見つかりません。' };
    }

    return this.importFromJson(raw);
  }

  deleteFromStorage(storageKey: string, storage: StorageLike = localStorage): PersistenceResult {
    storage.removeItem(storageKey);
    return { ok: true, message: '保存済みの学習データを削除しました。' };
  }

  exportToJson(): string {
    return JSON.stringify(this.createSnapshot(), null, 2);
  }

  importFromJson(json: string): PersistenceResult {
    try {
      const parsed: unknown = JSON.parse(json);
      const snapshot = this.parseSnapshot(parsed);
      this.valueTable.replaceAll(snapshot.entries);
      this.totalEpisodes = snapshot.totalTrainedEpisodes;
      return { ok: true, message: `学習データを読み込みました（状態数: ${snapshot.entries.length.toLocaleString()}）。` };
    } catch {
      return { ok: false, message: '学習データの形式が不正です。読み込みを中止しました。' };
    }
  }

  private createSnapshot(): PersistedQLearningDataV1 {
    const qTable = Object.fromEntries(this.valueTable.entries());

    return {
      version: 1,
      totalTrainedEpisodes: this.totalEpisodes,
      qTable
    };
  }

  private parseSnapshot(value: unknown): { totalTrainedEpisodes: number; entries: Array<[string, number[]]> } {
    if (!value || typeof value !== 'object') {
      throw new Error('invalid snapshot');
    }

    const snapshot = value as Partial<PersistedQLearningDataV1>;
    if (snapshot.version !== 1 || typeof snapshot.qTable !== 'object' || snapshot.qTable === null) {
      throw new Error('invalid version');
    }

    const totalTrainedEpisodes = snapshot.totalTrainedEpisodes;
    if (typeof totalTrainedEpisodes !== 'number' || !Number.isInteger(totalTrainedEpisodes) || totalTrainedEpisodes < 0) {
      throw new Error('invalid episodes');
    }

    const entries = Object.entries(snapshot.qTable).map(([stateKey, qValues]) => {
      if (!Array.isArray(qValues) || qValues.length !== 9 || qValues.some((value) => !Number.isFinite(value))) {
        throw new Error('invalid q values');
      }

      return [stateKey, [...qValues]] as [string, number[]];
    });

    return {
      totalTrainedEpisodes,
      entries
    };
  }

  private normalizeQValue(value: number): number {
    return this.clamp((value + 1) / 2, 0, 1);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private normalizeConfig(config: QLearningTrainingConfig): ValidatedTrainingConfig {
    const normalized = validateTrainingConfig(config);

    return {
      ...normalized,
      minEpsilon: Math.min(normalized.minEpsilon, normalized.epsilon)
    };
  }
}
