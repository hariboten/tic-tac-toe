import { Component } from '@angular/core';
import { NgClass } from '@angular/common';

type Player = 'X' | 'O';
type Cell = Player | null;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  protected board: Cell[] = Array(9).fill(null);
  protected currentPlayer: Player = 'X';
  protected winner: Player | 'DRAW' | null = null;

  protected get statusText(): string {
    if (this.winner === 'DRAW') {
      return '引き分けです';
    }

    if (this.winner) {
      return `勝者: ${this.winner}`;
    }

    return `現在の手番: ${this.currentPlayer}`;
  }

  protected play(index: number): void {
    if (this.board[index] || this.winner) {
      return;
    }

    this.board[index] = this.currentPlayer;

    const winningCombos = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];

    const hasWinner = winningCombos.some(([a, b, c]) =>
      this.board[a] && this.board[a] === this.board[b] && this.board[b] === this.board[c]
    );

    if (hasWinner) {
      this.winner = this.currentPlayer;
      return;
    }

    if (this.board.every((cell) => cell !== null)) {
      this.winner = 'DRAW';
      return;
    }

    this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
  }

  protected reset(): void {
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
  }
}
