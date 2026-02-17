import { MinimaxAgent } from './minimax-agent';

describe('MinimaxAgent', () => {
  it('should select winning move when game can be finished immediately', () => {
    const agent = new MinimaxAgent();

    const pickedCell = agent.pickMove(
      {
        board: ['O', 'O', null, 'X', 'X', null, null, null, null],
        currentPlayer: 'O',
        winner: null
      },
      'O'
    );

    expect(pickedCell).toBe(2);
  });

  it('should block opponent winning line when required', () => {
    const agent = new MinimaxAgent();

    const pickedCell = agent.pickMove(
      {
        board: ['X', 'X', null, null, 'O', null, null, null, null],
        currentPlayer: 'O',
        winner: null
      },
      'O'
    );

    expect(pickedCell).toBe(2);
  });

  it('should pick randomly among equally optimal moves', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);
    const agent = new MinimaxAgent();

    const pickedCell = agent.pickMove(
      {
        board: [null, null, null, null, null, null, null, null, null],
        currentPlayer: 'X',
        winner: null
      },
      'X'
    );

    expect([0, 1, 2, 3, 4, 5, 6, 7, 8]).toContain(pickedCell);
    expect(pickedCell).toBe(8);

    randomSpy.mockRestore();
  });
});
