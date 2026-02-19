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
  protected overlayAssistant: 'OFF' | 'MONTE_CARLO' | 'MINIMAX' | 'Q_LEARNING' = 'OFF';
  protected monteCarloOverlay: Map<number, number> = new Map();

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

  protected get showOverlay(): boolean {
    return this.overlayAssistant !== 'OFF' && !this.winner && this.monteCarloOverlay.size > 0;
  }

  protected get overlayStatusText(): string {
    return `${this.overlayAssistantLabel()}の現在局面評価（${this.currentPlayer} 視点）`;
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


  protected onAgentSelect(player: Player, value: string): void {
    if (!this.isAgentType(value)) {
      return;
    }

    this.setAgent(player, value);
  }

  protected onOverlayAssistantSelect(value: string): void {
    if (!this.isOverlayAssistantType(value)) {
      return;
    }

    this.setOverlayAssistant(value);
  }
  protected setOverlayAssistant(assistant: 'OFF' | 'MONTE_CARLO' | 'MINIMAX' | 'Q_LEARNING'): void {
    if (this.overlayAssistant === assistant) {
      return;
    }

    this.overlayAssistant = assistant;
    this.updateOverlay();
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

    this.updateOverlay();
    this.triggerAgentTurn();
  }

  protected reset(): void {
    this.clearPendingRandomTurn();
    this.engine.reset();
    this.isAgentThinking = false;
    this.updateOverlay();
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
      this.updateOverlay();
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
    this.updateOverlay();
  }

  protected overlayWinRate(index: number): number | null {
    const rate = this.monteCarloOverlay.get(index);
    return rate === undefined ? null : rate * 100;
  }

  private updateOverlay(): void {
    if (this.winner || this.overlayAssistant === 'OFF') {
      this.monteCarloOverlay = new Map();
      return;
    }

    if (this.overlayAssistant === 'MONTE_CARLO') {
      const monteCarloAgent = new MonteCarloAgent(this.monteCarloSimulationCount);
      this.monteCarloOverlay = monteCarloAgent.evaluateMoveWinRates(this.engine.gameState, this.currentPlayer);
      return;
    }

    if (this.overlayAssistant === 'MINIMAX') {
      this.monteCarloOverlay = this.minimaxAgent.evaluateMoveWinRates(this.engine.gameState, this.currentPlayer);
      return;
    }

    this.monteCarloOverlay = this.qLearningAgent.evaluateMoveWinRates(this.engine.gameState, this.currentPlayer);
  }


  private isAgentType(value: string): value is AgentType {
    return value === 'HUMAN' || value === 'RANDOM' || value === 'MONTE_CARLO' || value === 'MINIMAX' || value === 'Q_LEARNING';
  }

  private isOverlayAssistantType(value: string): value is 'OFF' | 'MONTE_CARLO' | 'MINIMAX' | 'Q_LEARNING' {
    return value === 'OFF' || value === 'MONTE_CARLO' || value === 'MINIMAX' || value === 'Q_LEARNING';
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

  private overlayAssistantLabel(): string {
    if (this.overlayAssistant === 'MONTE_CARLO') {
      return 'モンテカルロ';
    }

    if (this.overlayAssistant === 'MINIMAX') {
      return 'ミニマックス';
    }

    if (this.overlayAssistant === 'Q_LEARNING') {
      return 'Q学習';
    }

    return 'オフ';
  }
}
