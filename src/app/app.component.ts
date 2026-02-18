import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { AgentType, Cell, Player, Winner } from './game.types';
import { MinimaxAgent } from './agents/minimax-agent';
import { MonteCarloAgent } from './agents/monte-carlo-agent';
import { QLearningAgent, QLearningTrainingConfig } from './agents/q-learning-agent';
import { RandomAgent } from './agents/random-agent';
import { TicTacToeEngine } from './tic-tac-toe.engine';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass, FormsModule, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnDestroy {
  protected agents: Record<Player, AgentType> = {
    X: 'HUMAN',
    O: 'HUMAN'
  };
  protected activeTab: 'PLAY' | 'AGENT' = 'PLAY';
  protected isAgentThinking = false;
  protected isTraining = false;
  protected trainingConfig: QLearningTrainingConfig = {
    episodes: 10000,
    learningRate: 0.15,
    discountFactor: 0.95,
    epsilon: 1,
    epsilonDecay: 0.9997,
    minEpsilon: 0.05
  };
  protected trainedEpisodes = 0;
  protected trainingMessage = '未学習';
  protected monteCarloOverlay: Map<number, number> = new Map();
  protected monteCarloOverlayMode: 'CURRENT' | 'PREVIOUS' | null = null;

  private readonly randomMoveDelayMs = 550;
  private readonly monteCarloSimulationCount = 700;
  private readonly trainingChunkSize = 500;
  private readonly engine = new TicTacToeEngine();
  private readonly randomAgent = new RandomAgent();
  private readonly minimaxAgent = new MinimaxAgent();
  private readonly qLearningAgent = new QLearningAgent();
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

  protected get showMonteCarloOverlay(): boolean {
    return !this.winner && this.monteCarloOverlayMode !== null && this.monteCarloOverlay.size > 0;
  }

  protected get monteCarloOverlayStatusText(): string {
    if (this.monteCarloOverlayMode === 'CURRENT') {
      return 'モンテカルロの現在局面評価';
    }

    return '直前手のモンテカルロ評価（比較用）';
  }

  protected get trainedStateCount(): number {
    return this.qLearningAgent.tableSize;
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

  protected switchTab(tab: 'PLAY' | 'AGENT'): void {
    this.activeTab = tab;
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

  protected startTraining(): void {
    if (this.isTraining) {
      return;
    }

    const sanitized = this.sanitizeTrainingConfig(this.trainingConfig);
    this.trainingConfig = sanitized;
    this.isTraining = true;
    this.trainingMessage = 'トレーニング中...';

    let remainingEpisodes = sanitized.episodes;
    let epsilon = sanitized.epsilon;

    const runChunk = (): void => {
      const chunkEpisodes = Math.min(this.trainingChunkSize, remainingEpisodes);
      epsilon = this.qLearningAgent.train({ ...sanitized, episodes: chunkEpisodes }, epsilon);
      remainingEpisodes -= chunkEpisodes;
      this.trainedEpisodes += chunkEpisodes;
      this.trainingMessage = `トレーニング中... 残り ${remainingEpisodes.toLocaleString()} エピソード`;

      if (remainingEpisodes <= 0) {
        this.isTraining = false;
        this.trainingMessage = `${sanitized.episodes.toLocaleString()} エピソードを学習しました`;
        return;
      }

      setTimeout(runChunk, 0);
    };

    setTimeout(runChunk, 0);
  }

  protected clearTrainingData(): void {
    if (this.isTraining) {
      return;
    }

    this.qLearningAgent.clear();
    this.trainedEpisodes = 0;
    this.trainingMessage = '学習データを削除しました';
  }

  protected updateEpisodes(value: number): void {
    this.trainingConfig.episodes = Math.max(1, Math.floor(value || 0));
  }

  protected updateLearningRate(value: number): void {
    this.trainingConfig.learningRate = this.clamp(value, 0.01, 1);
  }

  protected updateDiscountFactor(value: number): void {
    this.trainingConfig.discountFactor = this.clamp(value, 0, 0.99);
  }

  protected updateEpsilon(value: number): void {
    this.trainingConfig.epsilon = this.clamp(value, 0, 1);
  }

  protected updateEpsilonDecay(value: number): void {
    this.trainingConfig.epsilonDecay = this.clamp(value, 0.9, 1);
  }

  protected updateMinEpsilon(value: number): void {
    this.trainingConfig.minEpsilon = this.clamp(value, 0, 1);
  }

  protected play(index: number): void {
    const played = this.engine.play(index);
    if (!played) {
      return;
    }

    this.updateMonteCarloOverlay();
    this.triggerAgentTurn();
  }

  protected reset(): void {
    this.clearPendingRandomTurn();
    this.engine.reset();
    this.isAgentThinking = false;
    this.updateMonteCarloOverlay();
    this.triggerAgentTurn();
  }

  protected pickAgentCell(player: Player): number {
    if (this.agents[player] === 'MONTE_CARLO') {
      const monteCarloAgent = new MonteCarloAgent(this.monteCarloSimulationCount);
      this.monteCarloOverlay = monteCarloAgent.evaluateMoveWinRates(this.engine.gameState, player);
      this.monteCarloOverlayMode = 'CURRENT';
      return monteCarloAgent.pickMove(this.engine.gameState, player);
    }

    if (this.agents[player] === 'MINIMAX') {
      return this.minimaxAgent.pickMove(this.engine.gameState, player);
    }

    if (this.agents[player] === 'Q_LEARNING') {
      return this.qLearningAgent.pickMove(this.engine.gameState, player);
    }

    return this.randomAgent.pickMove(this.engine.gameState, player);
  }

  private sanitizeTrainingConfig(config: QLearningTrainingConfig): QLearningTrainingConfig {
    const minEpsilon = this.clamp(config.minEpsilon, 0, 1);
    const epsilon = this.clamp(config.epsilon, minEpsilon, 1);

    return {
      episodes: Math.max(1, Math.floor(config.episodes)),
      learningRate: this.clamp(config.learningRate, 0.01, 1),
      discountFactor: this.clamp(config.discountFactor, 0, 0.99),
      epsilon,
      epsilonDecay: this.clamp(config.epsilonDecay, 0.9, 1),
      minEpsilon
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private triggerAgentTurn(): void {
    if (!this.winner && this.agents[this.currentPlayer] !== 'HUMAN' && !this.randomMoveTimeoutId) {
      this.isAgentThinking = true;
      this.updateMonteCarloOverlay();
      this.randomMoveTimeoutId = setTimeout(() => {
        this.randomMoveTimeoutId = null;

        if (this.winner || this.agents[this.currentPlayer] === 'HUMAN') {
          this.isAgentThinking = false;
          return;
        }

        this.isAgentThinking = false;
        this.play(this.pickAgentCell(this.currentPlayer));
      }, this.randomMoveDelayMs);
      return;
    }

    this.isAgentThinking = false;
    this.updateMonteCarloOverlay();
  }

  protected overlayWinRate(index: number): number | null {
    const rate = this.monteCarloOverlay.get(index);
    return rate === undefined ? null : rate * 100;
  }

  private updateMonteCarloOverlay(): void {
    if (this.winner) {
      this.monteCarloOverlay = new Map();
      this.monteCarloOverlayMode = null;
      return;
    }

    if (this.agents[this.currentPlayer] === 'MONTE_CARLO') {
      const monteCarloAgent = new MonteCarloAgent(this.monteCarloSimulationCount);
      this.monteCarloOverlay = monteCarloAgent.evaluateMoveWinRates(this.engine.gameState, this.currentPlayer);
      this.monteCarloOverlayMode = 'CURRENT';
      return;
    }

    if (this.monteCarloOverlayMode === 'CURRENT' && this.monteCarloOverlay.size > 0) {
      this.monteCarloOverlayMode = 'PREVIOUS';
      return;
    }

    if (this.agents.X !== 'MONTE_CARLO' && this.agents.O !== 'MONTE_CARLO') {
      this.monteCarloOverlay = new Map();
      this.monteCarloOverlayMode = null;
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

    if (agent === 'MONTE_CARLO') {
      return 'モンテカルロ';
    }

    if (agent === 'MINIMAX') {
      return 'ミニマックス';
    }

    return 'Q学習';
  }
}
