import { Component, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';
import { AgentType, Cell, Player, Winner } from './game.types';
import { MinimaxAgent } from './agents/minimax-agent';
import { MonteCarloAgent } from './agents/monte-carlo-agent';
import { RandomAgent } from './agents/random-agent';
import { TicTacToeEngine } from './tic-tac-toe.engine';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  protected agents: Record<Player, AgentType> = {
    X: 'HUMAN',
    O: 'HUMAN'
  };
  protected isAgentThinking = false;

  private readonly randomMoveDelayMs = 550;
  private readonly monteCarloSimulationCount = 700;
  private readonly engine = new TicTacToeEngine();
  private readonly randomAgent = new RandomAgent();
  private readonly minimaxAgent = new MinimaxAgent();
  private randomMoveTimeoutId: ReturnType<typeof setTimeout> | null = null;

  protected get board(): Cell[] {
    return this.engine.gameState.board;
  }

  protected get currentPlayer(): Player {
    return this.engine.gameState.currentPlayer;
  }

  protected get winner(): Winner {
    return this.engine.gameState.winner;
  }

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
    const played = this.engine.play(index);
    if (!played) {
      return;
    }

    this.triggerAgentTurn();
  }

  protected reset(): void {
    this.clearPendingRandomTurn();
    this.engine.reset();
    this.isAgentThinking = false;
    this.triggerAgentTurn();
  }

  protected pickAgentCell(player: Player): number {
    if (this.agents[player] === 'MONTE_CARLO') {
      const monteCarloAgent = new MonteCarloAgent(this.monteCarloSimulationCount);
      return monteCarloAgent.pickMove(this.engine.gameState, player);
    }

    if (this.agents[player] === 'MINIMAX') {
      return this.minimaxAgent.pickMove(this.engine.gameState, player);
    }

    return this.randomAgent.pickMove(this.engine.gameState, player);
  }


  private triggerAgentTurn(): void {
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

  private agentLabel(agent: AgentType): string {
    if (agent === 'HUMAN') {
      return 'ヒューマン';
    }

    if (agent === 'RANDOM') {
      return 'ランダム';
    }

    return agent === 'MONTE_CARLO' ? 'モンテカルロ' : 'ミニマックス';
  }
}
