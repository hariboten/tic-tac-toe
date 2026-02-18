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

  it('should return win rates for available cells', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const agent = new MonteCarloAgent(10);

    const rates = agent.evaluateMoveWinRates(
      {
        board: ['X', null, null, null, null, null, null, null, null],
        currentPlayer: 'O',
        winner: null
      },
      'O'
    );

    expect(rates.size).toBe(8);
    expect(Array.from(rates.values()).every((rate) => rate >= 0 && rate <= 1)).toBe(true);

    randomSpy.mockRestore();
  });
});
