import { QLearningAgent } from './q-learning-agent';

describe('QLearningAgent', () => {
  it('should pick an available cell', () => {
    const agent = new QLearningAgent();

    const pickedCell = agent.pickMove(
      {
        board: ['X', null, 'O', null, null, null, null, null, null],
        currentPlayer: 'O',
        winner: null
      },
      'O'
    );

    expect([1, 3, 4, 5, 6, 7, 8]).toContain(pickedCell);
  });


  it('should invert opponent state value when bootstrapping', () => {
    const agent = new QLearningAgent() as any;

    expect(agent.getOpponentValue(0.8)).toBeCloseTo(-0.8);
    expect(agent.getOpponentValue(-0.4)).toBeCloseTo(0.4);
  });

  it('should update Q-table when training', () => {
    const agent = new QLearningAgent();

    agent.train({
      episodes: 200,
      learningRate: 0.2,
      discountFactor: 0.95,
      epsilon: 1,
      epsilonDecay: 0.99,
      minEpsilon: 0.1
    });

    expect(agent.tableSize).toBeGreaterThan(0);
  });
});
