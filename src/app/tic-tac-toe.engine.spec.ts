import { TicTacToeEngine } from './tic-tac-toe.engine';

describe('TicTacToeEngine', () => {
  it('should detect winner and stop progress', () => {
    const engine = new TicTacToeEngine();

    engine.play(0); // X
    engine.play(3); // O
    engine.play(1); // X
    engine.play(4); // O
    engine.play(2); // X wins

    expect(engine.gameState.winner).toBe('X');
    expect(engine.play(5)).toBe(false);
  });
});
