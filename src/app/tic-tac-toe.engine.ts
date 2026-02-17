import { Cell, GameState, Player, Winner } from './game.types';

const WINNING_COMBOS: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

export const nextPlayer = (player: Player): Player => (player === 'X' ? 'O' : 'X');

export const getAvailableCells = (board: Cell[]): number[] =>
  board.map((cell, index) => (cell === null ? index : null)).filter((index): index is number => index !== null);

export const evaluateWinner = (board: Cell[]): Winner => {
  const winnerCombo = WINNING_COMBOS.find(([a, b, c]) => board[a] && board[a] === board[b] && board[b] === board[c]);

  if (!winnerCombo) {
    return null;
  }

  return board[winnerCombo[0]];
};

export class TicTacToeEngine {
  private state: GameState = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null
  };

  get gameState(): GameState {
    return {
      board: [...this.state.board],
      currentPlayer: this.state.currentPlayer,
      winner: this.state.winner
    };
  }

  play(index: number): boolean {
    if (this.state.board[index] || this.state.winner) {
      return false;
    }

    this.state.board[index] = this.state.currentPlayer;

    const winner = evaluateWinner(this.state.board);
    if (winner) {
      this.state.winner = winner;
      return true;
    }

    if (this.state.board.every((cell) => cell !== null)) {
      this.state.winner = 'DRAW';
      return true;
    }

    this.state.currentPlayer = nextPlayer(this.state.currentPlayer);

    return true;
  }

  reset(): void {
    this.state = {
      board: Array(9).fill(null),
      currentPlayer: 'X',
      winner: null
    };
  }

  setState(state: GameState): void {
    this.state = {
      board: [...state.board],
      currentPlayer: state.currentPlayer,
      winner: state.winner
    };
  }
}
