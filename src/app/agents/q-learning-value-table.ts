import { QValues, StateKey } from './q-learning.types';

export const DEFAULT_Q_VALUE = 0;

export class QLearningValueTable {
  private readonly qTable = new Map<StateKey, QValues>();

  get size(): number {
    return this.qTable.size;
  }

  clear(): void {
    this.qTable.clear();
  }

  hasNonDefaultQValues(stateKey: StateKey, availableCells: number[]): boolean {
    const qValues = this.qTable.get(stateKey);
    if (!qValues) {
      return false;
    }

    return availableCells.some((cellIndex) => qValues[cellIndex] !== DEFAULT_Q_VALUE);
  }

  updateQValue(stateKey: StateKey, action: number, targetValue: number, learningRate: number): void {
    const qValues = this.getQValues(stateKey);
    const currentValue = qValues[action];
    qValues[action] = currentValue + learningRate * (targetValue - currentValue);
  }

  getQValues(stateKey: StateKey): QValues {
    const existing = this.qTable.get(stateKey);
    if (existing) {
      return existing;
    }

    const initial = Array(9).fill(DEFAULT_Q_VALUE);
    this.qTable.set(stateKey, initial);
    return initial;
  }
}
