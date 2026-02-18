import { QLearningAgent } from './q-learning-agent';

describe('QLearningAgent', () => {
  it('should pick an available cell', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
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
    randomSpy.mockRestore();
  });

  it('should pick random action on unseen state', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9999);
    const agent = new QLearningAgent();

    const pickedCell = agent.pickMove(
      {
        board: [null, null, null, null, null, null, null, null, null],
        currentPlayer: 'X',
        winner: null
      },
      'X'
    );

    expect(pickedCell).toBe(8);
    randomSpy.mockRestore();
  });

  it('should return the only available cell', () => {
    const agent = new QLearningAgent();

    const pickedCell = agent.pickMove(
      {
        board: ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', null],
        currentPlayer: 'X',
        winner: null
      },
      'X'
    );

    expect(pickedCell).toBe(8);
  });

  it('should update Q-table when training', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
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
    randomSpy.mockRestore();
  });

  it('should clear trained table', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const agent = new QLearningAgent();

    agent.train({
      episodes: 50,
      learningRate: 0.2,
      discountFactor: 0.95,
      epsilon: 1,
      epsilonDecay: 0.99,
      minEpsilon: 0.1
    });

    expect(agent.tableSize).toBeGreaterThan(0);

    agent.clear();

    expect(agent.tableSize).toBe(0);
    randomSpy.mockRestore();
  });
});
