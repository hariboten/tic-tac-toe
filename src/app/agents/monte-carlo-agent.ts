import { Cell, GameState, Player, Winner } from '../game.types';
import { evaluateWinner, getAvailableCells, nextPlayer } from '../tic-tac-toe.engine';
import { TicTacToeAgent } from './tic-tac-toe-agent';

export class MonteCarloAgent implements TicTacToeAgent {
  constructor(private readonly simulationCount: number) {}

  evaluateMoveWinRates(state: GameState, player: Player): Map<number, number> {
    const scoreByCell = this.simulateScores(state, player);
    const maxScore = this.simulationCount;
    const minScore = -this.simulationCount;
    const range = maxScore - minScore;

    return new Map(
      Array.from(scoreByCell.entries(), ([index, score]) => [index, (score - minScore) / range])
    );
  }

  pickMove(state: GameState, player: Player): number {
    const availableCells = getAvailableCells(state.board);
    const scoreByCell = this.simulateScores(state, player);

    let bestCell = availableCells[0];
    let bestScore = scoreByCell.get(bestCell) ?? Number.NEGATIVE_INFINITY;

    for (const index of availableCells.slice(1)) {
      const score = scoreByCell.get(index) ?? Number.NEGATIVE_INFINITY;
      if (score > bestScore) {
        bestScore = score;
        bestCell = index;
      }
    }

    return bestCell;
  }

  private simulateScores(state: GameState, player: Player): Map<number, number> {
    const availableCells = getAvailableCells(state.board);
    const scoreByCell = new Map<number, number>();

    availableCells.forEach((index) => scoreByCell.set(index, 0));

    for (let i = 0; i < this.simulationCount; i += 1) {
      for (const index of availableCells) {
        const nextBoard = [...state.board];
        nextBoard[index] = player;
        const winner = this.simulateRandomGame(nextBoard, nextPlayer(player));

        if (winner === player) {
          scoreByCell.set(index, (scoreByCell.get(index) ?? 0) + 1);
        } else if (winner && winner !== 'DRAW') {
          scoreByCell.set(index, (scoreByCell.get(index) ?? 0) - 1);
        }
      }
    }

    return scoreByCell;
  }

  private simulateRandomGame(board: Cell[], currentPlayer: Player): Winner {
    const simulatedBoard = [...board];
    let turn = currentPlayer;

    while (true) {
      const winner = evaluateWinner(simulatedBoard);
      if (winner) {
        return winner;
      }

      const availableCells = getAvailableCells(simulatedBoard);
      if (!availableCells.length) {
        return 'DRAW';
      }

      const randomIndex = Math.floor(Math.random() * availableCells.length);
      simulatedBoard[availableCells[randomIndex]] = turn;
      turn = nextPlayer(turn);
    }
  }
}
