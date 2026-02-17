import { Component, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';

type Player = 'X' | 'O';
type Cell = Player | null;
type AgentType = 'HUMAN' | 'RANDOM';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  protected board: Cell[] = Array(9).fill(null);
  protected currentPlayer: Player = 'X';
  protected winner: Player | 'DRAW' | null = null;
  protected isRandomThinking = false;
  protected agents: Record<Player, AgentType> = {
    X: 'HUMAN',
    O: 'HUMAN'
  };
  private readonly randomMoveDelayMs = 550;
  private randomMoveTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected get modeText(): string {
    return `X: ${this.agentLabel(this.agents.X)} / O: ${this.agentLabel(this.agents.O)}`;
  }

  protected get isCurrentPlayerRandom(): boolean {
    return this.agents[this.currentPlayer] === 'RANDOM';
  }

  protected get statusText(): string {
    if (this.winner === 'DRAW') {
      return '引き分けです';
    }

    if (this.winner) {
      return `勝者: ${this.winner}`;
    }

    if (this.isRandomThinking) {
      return `${this.currentPlayer} が考え中...`;
    }

    return `現在の手番: ${this.currentPlayer}`;
  }

  ngOnDestroy(): void {
    this.clearPendingRandomTurn();
  }

  protected setAgent(player: Player, agent: AgentType): void {
    if (this.agents[player] === agent) {
      return;
    }

    this.agents = {
      ...this.agents,
      [player]: agent
    };

    this.reset();
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
    this.triggerRandomTurn();
  }

  protected reset(): void {
    this.clearPendingRandomTurn();
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
    this.isRandomThinking = false;
    this.triggerRandomTurn();
  }

  private triggerRandomTurn(): void {
    if (!this.winner && this.agents[this.currentPlayer] === 'RANDOM' && !this.randomMoveTimeoutId) {
      this.isRandomThinking = true;
      this.randomMoveTimeoutId = setTimeout(() => {
        this.randomMoveTimeoutId = null;

        if (this.winner || this.agents[this.currentPlayer] !== 'RANDOM') {
          this.isRandomThinking = false;
          return;
        }

        this.isRandomThinking = false;
        this.play(this.pickRandomCell());
      }, this.randomMoveDelayMs);
    }
  }

  private clearPendingRandomTurn(): void {
    if (this.randomMoveTimeoutId) {
      clearTimeout(this.randomMoveTimeoutId);
      this.randomMoveTimeoutId = null;
    }
  }

  private pickRandomCell(): number {
    const availableCells = this.board
      .map((cell, index) => (cell === null ? index : null))
      .filter((index): index is number => index !== null);

    const randomIndex = Math.floor(Math.random() * availableCells.length);

    return availableCells[randomIndex];
  }

  private agentLabel(agent: AgentType): string {
    return agent === 'HUMAN' ? 'ヒューマン' : 'ランダム';
  }
}
