import { RandomAgent } from './random-agent';

describe('RandomAgent', () => {
  it('should pick an available cell', () => {
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
    const agent = new RandomAgent();

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
});
