import { Cell, GameState, Player, Winner } from '../game.types';
import { evaluateWinner, getAvailableCells, nextPlayer } from '../tic-tac-toe.engine';
import { TicTacToeAgent } from './tic-tac-toe-agent';

const scoreByWinner = (winner: Winner, player: Player): number => {
  if (winner === player) {
    return 1;
  }

  if (winner === 'DRAW') {
    return 0;
  }

  return -1;
};

export class MinimaxAgent implements TicTacToeAgent {
  pickMove(state: GameState, player: Player): number {
    const availableCells = getAvailableCells(state.board);
    let bestMove = availableCells[0];
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const cellIndex of availableCells) {
      const nextBoard = [...state.board];
      nextBoard[cellIndex] = player;

      const score = this.minimax(nextBoard, nextPlayer(player), player);
      if (score > bestScore) {
        bestScore = score;
        bestMove = cellIndex;
      }
    }

    return bestMove;
  }

  private minimax(board: Cell[], currentPlayer: Player, maximizingPlayer: Player): number {
    const winner = evaluateWinner(board);
    if (winner) {
      return scoreByWinner(winner, maximizingPlayer);
    }

    const availableCells = getAvailableCells(board);
    if (!availableCells.length) {
      return scoreByWinner('DRAW', maximizingPlayer);
    }

    const isMaximizingTurn = currentPlayer === maximizingPlayer;

    if (isMaximizingTurn) {
      let bestScore = Number.NEGATIVE_INFINITY;

      for (const cellIndex of availableCells) {
        const nextBoard = [...board];
        nextBoard[cellIndex] = currentPlayer;

        const score = this.minimax(nextBoard, nextPlayer(currentPlayer), maximizingPlayer);
        bestScore = Math.max(bestScore, score);
      }

      return bestScore;
    }

    let bestScore = Number.POSITIVE_INFINITY;

    for (const cellIndex of availableCells) {
      const nextBoard = [...board];
      nextBoard[cellIndex] = currentPlayer;

      const score = this.minimax(nextBoard, nextPlayer(currentPlayer), maximizingPlayer);
      bestScore = Math.min(bestScore, score);
    }

    return bestScore;
  }
}
