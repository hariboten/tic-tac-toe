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
});
