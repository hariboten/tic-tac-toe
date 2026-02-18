import { QLearningStateEncoder } from './q-learning-state-encoder';

describe('QLearningStateEncoder', () => {
  it('should encode board and player into a unique state key', () => {
    const encoder = new QLearningStateEncoder();

    expect(encoder.encode(['X', null, 'O', null, null, null, null, null, null], 'X')).toBe('X-O------:X');
    expect(encoder.encode(['X', null, 'O', null, null, null, null, null, null], 'O')).toBe('X-O------:O');
  });
});
