import { MonteCarloAgent } from './monte-carlo-agent';

describe('MonteCarloAgent', () => {
  it('should select winning move when game can be finished immediately', () => {
    const agent = new MonteCarloAgent(700);

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
});
