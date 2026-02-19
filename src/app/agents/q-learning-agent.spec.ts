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

  it('should export and import trained data as json', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const trainedAgent = new QLearningAgent();
    trainedAgent.train({
      episodes: 30,
      learningRate: 0.2,
      discountFactor: 0.95,
      epsilon: 1,
      epsilonDecay: 0.99,
      minEpsilon: 0.1
    });

    const exported = trainedAgent.exportToJson();
    const restoredAgent = new QLearningAgent();
    const result = restoredAgent.importFromJson(exported);

    expect(result.ok).toBe(true);
    expect(restoredAgent.tableSize).toBe(trainedAgent.tableSize);
    expect(restoredAgent.totalTrainedEpisodes).toBe(trainedAgent.totalTrainedEpisodes);

    randomSpy.mockRestore();
  });

  it('should reject invalid json import', () => {
    const agent = new QLearningAgent();

    const result = agent.importFromJson('{"version":999}');

    expect(result.ok).toBe(false);
    expect(agent.tableSize).toBe(0);
  });

  it('should save and load with storage', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const storage = new Map<string, string>();
    const storageLike = {
      getItem: (key: string): string | null => storage.get(key) ?? null,
      setItem: (key: string, value: string): void => {
        storage.set(key, value);
      },
      removeItem: (key: string): void => {
        storage.delete(key);
      }
    };
    const key = 'q-learning';

    const trainedAgent = new QLearningAgent();
    trainedAgent.train({
      episodes: 20,
      learningRate: 0.2,
      discountFactor: 0.95,
      epsilon: 1,
      epsilonDecay: 0.99,
      minEpsilon: 0.1
    });

    expect(trainedAgent.saveToStorage(key, storageLike).ok).toBe(true);

    const restoredAgent = new QLearningAgent();
    const loadResult = restoredAgent.loadFromStorage(key, storageLike);
    expect(loadResult.ok).toBe(true);
    expect(restoredAgent.tableSize).toBe(trainedAgent.tableSize);

    expect(restoredAgent.deleteFromStorage(key, storageLike).ok).toBe(true);
    expect(storage.has(key)).toBe(false);

    randomSpy.mockRestore();
  });
});
