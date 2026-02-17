import { Component, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';

type Player = 'X' | 'O';
type Cell = Player | null;
type AgentType = 'HUMAN' | 'RANDOM' | 'MONTE_CARLO';
type Winner = Player | 'DRAW' | null;

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
  protected winner: Winner = null;
  protected isAgentThinking = false;
  protected agents: Record<Player, AgentType> = {
    X: 'HUMAN',
    O: 'HUMAN'
  };
  private readonly randomMoveDelayMs = 550;
  private readonly monteCarloSimulationCount = 700;
  private randomMoveTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected get modeText(): string {
    return `X: ${this.agentLabel(this.agents.X)} / O: ${this.agentLabel(this.agents.O)}`;
  }

  protected get isCurrentPlayerRandom(): boolean {
    return this.agents[this.currentPlayer] !== 'HUMAN';
  }

  protected get statusText(): string {
    if (this.winner === 'DRAW') {
      return '引き分けです';
    }

    if (this.winner) {
      return `勝者: ${this.winner}`;
    }

    if (this.isAgentThinking) {
      return `${this.currentPlayer} のエージェントが考え中...`;
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

    const winner = this.evaluateWinner(this.board);
    if (winner) {
      this.winner = winner;
      return;
    }

    if (this.board.every((cell) => cell !== null)) {
      this.winner = 'DRAW';
      return;
    }

    this.currentPlayer = this.nextPlayer(this.currentPlayer);
    this.triggerRandomTurn();
  }

  protected reset(): void {
    this.clearPendingRandomTurn();
    this.board = Array(9).fill(null);
    this.currentPlayer = 'X';
    this.winner = null;
    this.isAgentThinking = false;
    this.triggerRandomTurn();
  }

  private triggerRandomTurn(): void {
    if (!this.winner && this.agents[this.currentPlayer] !== 'HUMAN' && !this.randomMoveTimeoutId) {
      this.isAgentThinking = true;
      this.randomMoveTimeoutId = setTimeout(() => {
        this.randomMoveTimeoutId = null;

        if (this.winner || this.agents[this.currentPlayer] === 'HUMAN') {
          this.isAgentThinking = false;
          return;
        }

        this.isAgentThinking = false;
        this.play(this.pickAgentCell(this.currentPlayer));
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

  private pickAgentCell(player: Player): number {
    if (this.agents[player] === 'MONTE_CARLO') {
      return this.pickMonteCarloCell(player);
    }

    return this.pickRandomCell();
  }

  private pickMonteCarloCell(player: Player): number {
    const availableCells = this.getAvailableCells(this.board);
    const scoreByCell = new Map<number, number>();

    availableCells.forEach((index) => scoreByCell.set(index, 0));

    for (let i = 0; i < this.monteCarloSimulationCount; i += 1) {
      for (const index of availableCells) {
        const nextBoard = [...this.board];
        nextBoard[index] = player;
        const winner = this.simulateRandomGame(nextBoard, this.nextPlayer(player));

        if (winner === player) {
          scoreByCell.set(index, (scoreByCell.get(index) ?? 0) + 1);
        } else if (winner && winner !== 'DRAW') {
          scoreByCell.set(index, (scoreByCell.get(index) ?? 0) - 1);
        }
      }
    }

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

  private simulateRandomGame(board: Cell[], currentPlayer: Player): Winner {
    let simulatedBoard = [...board];
    let turn = currentPlayer;

    while (true) {
      const winner = this.evaluateWinner(simulatedBoard);
      if (winner) {
        return winner;
      }

      const availableCells = this.getAvailableCells(simulatedBoard);
      if (!availableCells.length) {
        return 'DRAW';
      }

      const randomIndex = Math.floor(Math.random() * availableCells.length);
      simulatedBoard[availableCells[randomIndex]] = turn;
      turn = this.nextPlayer(turn);
    }
  }

  private getAvailableCells(board: Cell[]): number[] {
    return board.map((cell, index) => (cell === null ? index : null)).filter((index): index is number => index !== null);
  }

  private evaluateWinner(board: Cell[]): Winner {
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

    const winnerCombo = winningCombos.find(([a, b, c]) => board[a] && board[a] === board[b] && board[b] === board[c]);

    if (!winnerCombo) {
      return null;
    }

    return board[winnerCombo[0]];
  }

  private nextPlayer(player: Player): Player {
    return player === 'X' ? 'O' : 'X';
  }

  private agentLabel(agent: AgentType): string {
    if (agent === 'HUMAN') {
      return 'ヒューマン';
    }

    return agent === 'RANDOM' ? 'ランダム' : 'モンテカルロ';
  }
}
