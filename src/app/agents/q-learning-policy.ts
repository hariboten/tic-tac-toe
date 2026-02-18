import { Cell, Player } from '../game.types';
import { RandomSource } from './q-learning.types';
import { QLearningStateEncoder } from './q-learning-state-encoder';
import { QLearningValueTable } from './q-learning-value-table';

export class QLearningPolicy {
  constructor(
    private readonly valueTable: QLearningValueTable,
    private readonly stateEncoder: QLearningStateEncoder,
    private readonly randomSource: RandomSource
  ) {}

  selectAction(board: Cell[], player: Player, availableCells: number[], epsilon: number): number {
    if (availableCells.length === 1) {
      return availableCells[0];
    }

    if (this.randomSource.next() < epsilon) {
      return this.pickRandom(availableCells);
    }

    const stateKey = this.stateEncoder.encode(board, player);
    const qValues = this.valueTable.getQValues(stateKey);
    let bestValue = Number.NEGATIVE_INFINITY;
    const bestActions: number[] = [];

    for (const action of availableCells) {
      const value = qValues[action];
      if (value > bestValue) {
        bestValue = value;
        bestActions.length = 0;
        bestActions.push(action);
        continue;
      }

      if (value === bestValue) {
        bestActions.push(action);
      }
    }

    return this.pickRandom(bestActions);
  }

  pickRandom(availableCells: number[]): number {
    const randomIndex = Math.floor(this.randomSource.next() * availableCells.length);
    return availableCells[randomIndex];
  }
}
