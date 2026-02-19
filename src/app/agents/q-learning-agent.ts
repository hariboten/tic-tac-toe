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

  constructor(randomSource: RandomSource = new MathRandomSource()) {
    this.policy = new QLearningPolicy(this.valueTable, this.stateEncoder, randomSource);
    this.trainer = new QLearningTrainer(this.policy, this.valueTable, this.stateEncoder, this.reward);
  }

  get tableSize(): number {
    return this.valueTable.size;
  }

  clear(): void {
    this.valueTable.clear();
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

    return epsilon;
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
