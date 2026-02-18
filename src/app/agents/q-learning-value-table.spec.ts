import { QLearningValueTable } from './q-learning-value-table';

describe('QLearningValueTable', () => {
  it('should initialize and update q-values', () => {
    const table = new QLearningValueTable();

    expect(table.size).toBe(0);

    const stateKey = '---------:X';
    const values = table.getQValues(stateKey);
    expect(values[0]).toBe(0);
    expect(table.size).toBe(1);

    table.updateQValue(stateKey, 0, 1, 0.5);

    expect(table.getQValues(stateKey)[0]).toBe(0.5);
    expect(table.hasNonDefaultQValues(stateKey, [0])).toBe(true);
  });
});
