import { RandomSource } from './q-learning.types';
import { QLearningPolicy } from './q-learning-policy';
import { QLearningStateEncoder } from './q-learning-state-encoder';
import { QLearningValueTable } from './q-learning-value-table';

class SequenceRandomSource implements RandomSource {
  constructor(private readonly values: number[]) {}

  next(): number {
    return this.values.shift() ?? 0;
  }
}

describe('QLearningPolicy', () => {
  it('should choose random action when epsilon condition is met', () => {
    const random = new SequenceRandomSource([0.1, 0.9]);
    const policy = new QLearningPolicy(new QLearningValueTable(), new QLearningStateEncoder(), random);

    const action = policy.selectAction(Array(9).fill(null), 'X', [1, 2, 8], 0.5);

    expect(action).toBe(8);
  });

  it('should choose best action when epsilon condition is not met', () => {
    const random = new SequenceRandomSource([0.9, 0]);
    const table = new QLearningValueTable();
    const encoder = new QLearningStateEncoder();
    const stateKey = encoder.encode(Array(9).fill(null), 'X');
    table.updateQValue(stateKey, 1, 0.4, 1);
    table.updateQValue(stateKey, 2, 0.8, 1);

    const policy = new QLearningPolicy(table, encoder, random);
    const action = policy.selectAction(Array(9).fill(null), 'X', [1, 2], 0.5);

    expect(action).toBe(2);
  });
});
