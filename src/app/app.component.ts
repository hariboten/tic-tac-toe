import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { AgentType, Cell, Player, Winner } from './game.types';
import { MinimaxAgent } from './agents/minimax-agent';
import { MonteCarloAgent } from './agents/monte-carlo-agent';
import { QLearningAgent, QLearningTrainingConfig } from './agents/q-learning-agent';
import { RandomAgent } from './agents/random-agent';
import { TicTacToeEngine } from './tic-tac-toe.engine';

type QLearningProfileId = 'A' | 'B' | 'C';
type OverlayAssistantType = 'OFF' | 'MONTE_CARLO' | 'MINIMAX' | 'Q_LEARNING';

type QLearningProfile = {
  id: QLearningProfileId;
  label: string;
  agent: QLearningAgent;
  trainingConfig: QLearningTrainingConfig;
  trainingMessage: string;
  trainedEpisodes: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NgClass, FormsModule, DecimalPipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  protected readonly availableAgents: Array<{ value: AgentType; label: string }> = [
    { value: 'HUMAN', label: 'ヒューマン' },
    { value: 'RANDOM', label: 'ランダム' },
    { value: 'MONTE_CARLO', label: 'モンテカルロ' },
    { value: 'MINIMAX', label: 'ミニマックス' },
    { value: 'Q_LEARNING', label: 'Q学習' }
  ];
  protected agents: Record<Player, AgentType> = {
    X: 'HUMAN',
    O: 'HUMAN'
  };
  protected activeTab: 'PLAY' | 'AGENT' = 'PLAY';
  protected isAgentThinking = false;
  protected isTraining = false;
  protected selectedTrainingProfileId: QLearningProfileId = 'A';
  protected selectedPlayProfileId: QLearningProfileId = 'A';
  protected persistenceMessage = '保存データ未読み込み';
  protected portableJson = '';
  protected readonly availableOverlayAssistants: Array<{ value: OverlayAssistantType; label: string }> = [
    { value: 'OFF', label: 'オフ' },
    { value: 'MONTE_CARLO', label: 'モンテカルロ' },
    { value: 'MINIMAX', label: 'ミニマックス' },
    { value: 'Q_LEARNING', label: 'Q学習' }
  ];
  protected overlayAssistant: OverlayAssistantType = 'OFF';
  protected monteCarloOverlay: Map<number, number> = new Map();

  private readonly randomMoveDelayMs = 550;
  private readonly monteCarloSimulationCount = 700;
  private readonly trainingChunkSize = 500;
  private readonly qLearningStorageKeyPrefix = 'tic-tac-toe.q-learning.v2.profile';
  private readonly engine = new TicTacToeEngine();
  private readonly randomAgent = new RandomAgent();
  private readonly minimaxAgent = new MinimaxAgent();
  private readonly qLearningProfiles: QLearningProfile[] = [
    this.createProfile('A', 'プロファイル A'),
    this.createProfile('B', 'プロファイル B'),
    this.createProfile('C', 'プロファイル C')
  ];
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

  protected get trainingProfiles(): Array<{ id: QLearningProfileId; label: string }> {
    return this.qLearningProfiles.map(({ id, label }) => ({ id, label }));
  }

  protected get selectedTrainingProfile(): QLearningProfile {
    return this.profileById(this.selectedTrainingProfileId);
  }

  protected get selectedPlayProfile(): QLearningProfile {
    return this.profileById(this.selectedPlayProfileId);
  }

  protected get trainingConfig(): QLearningTrainingConfig {
    return this.selectedTrainingProfile.trainingConfig;
  }

  protected get trainingMessage(): string {
    return this.selectedTrainingProfile.trainingMessage;
  }

  protected get trainedEpisodes(): number {
    return this.selectedTrainingProfile.trainedEpisodes;
  }

  protected get trainedStateCount(): number {
    return this.selectedTrainingProfile.agent.tableSize;
  }

  protected get totalTrainedEpisodes(): number {
    return this.selectedTrainingProfile.agent.totalTrainedEpisodes;
  }

  protected get profileSummaries(): Array<{ label: string; totalEpisodes: number; stateCount: number; message: string }> {
    return this.qLearningProfiles.map((profile) => ({
      label: profile.label,
      totalEpisodes: profile.agent.totalTrainedEpisodes,
      stateCount: profile.agent.tableSize,
      message: profile.trainingMessage
    }));
  }

  ngOnInit(): void {
    const messages = this.qLearningProfiles.map((profile) => {
      const loadResult = profile.agent.loadFromStorage(this.storageKey(profile.id));
      if (loadResult.ok) {
        profile.trainingMessage = '保存データから学習結果を復元しました';
      }

      profile.trainedEpisodes = profile.agent.totalTrainedEpisodes;
      return `${profile.label}: ${loadResult.ok ? '復元成功' : '復元なし'}（${loadResult.message}）`;
    });

    this.persistenceMessage = `自動復元結果: ${messages.join(' / ')}`;
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

  protected setOverlayAssistant(assistant: OverlayAssistantType): void {
    if (this.overlayAssistant === assistant) {
      return;
    }

    this.overlayAssistant = assistant;
    this.updateOverlay();
  }

  protected setTrainingProfile(profileId: QLearningProfileId): void {
    this.selectedTrainingProfileId = profileId;
  }

  protected setPlayProfile(profileId: QLearningProfileId): void {
    if (this.selectedPlayProfileId === profileId) {
      return;
    }

    this.selectedPlayProfileId = profileId;
    this.updateOverlay();
  }

  protected startTraining(): void {
    if (this.isTraining) {
      return;
    }

    const profile = this.selectedTrainingProfile;
    const sanitized = this.sanitizeTrainingConfig(profile.trainingConfig);
    profile.trainingConfig = sanitized;
    this.isTraining = true;
    profile.trainingMessage = 'トレーニング中...';

    let remainingEpisodes = sanitized.episodes;
    let epsilon = sanitized.epsilon;

    const runChunk = (): void => {
      const chunkEpisodes = Math.min(this.trainingChunkSize, remainingEpisodes);
      epsilon = profile.agent.train({ ...sanitized, episodes: chunkEpisodes }, epsilon);
      remainingEpisodes -= chunkEpisodes;
      profile.trainedEpisodes += chunkEpisodes;
      profile.trainingMessage = `トレーニング中... 残り ${remainingEpisodes.toLocaleString()} エピソード`;

      if (remainingEpisodes <= 0) {
        this.isTraining = false;
        profile.trainingMessage = `${sanitized.episodes.toLocaleString()} エピソードを学習しました`;
        const saveResult = profile.agent.saveToStorage(this.storageKey(profile.id));
        this.persistenceMessage = `${profile.label}: ${saveResult.message}`;
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

    const profile = this.selectedTrainingProfile;
    profile.agent.clear();
    profile.trainedEpisodes = profile.agent.totalTrainedEpisodes;
    profile.trainingMessage = '学習データを削除しました';
  }

  protected saveTrainingData(): void {
    if (this.isTraining) {
      return;
    }

    const profile = this.selectedTrainingProfile;
    const result = profile.agent.saveToStorage(this.storageKey(profile.id));
    this.persistenceMessage = `${profile.label}: ${result.message}`;
  }

  protected loadTrainingData(): void {
    if (this.isTraining) {
      return;
    }

    const profile = this.selectedTrainingProfile;
    const result = profile.agent.loadFromStorage(this.storageKey(profile.id));
    profile.trainedEpisodes = profile.agent.totalTrainedEpisodes;
    profile.trainingMessage = result.ok ? '保存データから学習結果を復元しました' : profile.trainingMessage;
    this.persistenceMessage = `${profile.label}: ${result.message}`;
  }

  protected deleteTrainingData(): void {
    if (this.isTraining) {
      return;
    }

    const profile = this.selectedTrainingProfile;
    const result = profile.agent.deleteFromStorage(this.storageKey(profile.id));
    this.persistenceMessage = `${profile.label}: ${result.message}`;
  }

  protected exportTrainingData(): void {
    const profile = this.selectedTrainingProfile;
    this.portableJson = profile.agent.exportToJson();
    this.persistenceMessage = `${profile.label}: 学習データをJSONに出力しました。`;
  }

  protected importTrainingData(): void {
    if (this.isTraining) {
      return;
    }

    const profile = this.selectedTrainingProfile;
    const result = profile.agent.importFromJson(this.portableJson);
    profile.trainedEpisodes = profile.agent.totalTrainedEpisodes;
    if (result.ok) {
      profile.trainingMessage = 'JSONから学習データを復元しました';
    }

    this.persistenceMessage = `${profile.label}: ${result.message}`;
  }

  protected updateEpisodes(value: number): void {
    this.selectedTrainingProfile.trainingConfig.episodes = Math.max(1, Math.floor(value || 0));
  }

  protected updateLearningRate(value: number): void {
    this.selectedTrainingProfile.trainingConfig.learningRate = this.clamp(value, 0.01, 1);
  }

  protected updateDiscountFactor(value: number): void {
    this.selectedTrainingProfile.trainingConfig.discountFactor = this.clamp(value, 0, 0.99);
  }

  protected updateEpsilon(value: number): void {
    this.selectedTrainingProfile.trainingConfig.epsilon = this.clamp(value, 0, 1);
  }

  protected updateEpsilonDecay(value: number): void {
    this.selectedTrainingProfile.trainingConfig.epsilonDecay = this.clamp(value, 0.9, 1);
  }

  protected updateMinEpsilon(value: number): void {
    this.selectedTrainingProfile.trainingConfig.minEpsilon = this.clamp(value, 0, 1);
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
      return this.selectedPlayProfile.agent.pickMove(this.engine.gameState, player);
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

    this.monteCarloOverlay = this.selectedPlayProfile.agent.evaluateMoveWinRates(this.engine.gameState, this.currentPlayer);
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

    return `Q学習（${this.selectedPlayProfile.label}）`;
  }

  private overlayAssistantLabel(): string {
    if (this.overlayAssistant === 'MONTE_CARLO') {
      return 'モンテカルロ';
    }

    if (this.overlayAssistant === 'MINIMAX') {
      return 'ミニマックス';
    }

    if (this.overlayAssistant === 'Q_LEARNING') {
      return `Q学習 ${this.selectedPlayProfile.label}`;
    }

    return 'オフ';
  }

  private createProfile(id: QLearningProfileId, label: string): QLearningProfile {
    return {
      id,
      label,
      agent: new QLearningAgent(),
      trainingConfig: {
        episodes: 10000,
        learningRate: 0.15,
        discountFactor: 0.95,
        epsilon: 1,
        epsilonDecay: 0.9997,
        minEpsilon: 0.05
      },
      trainingMessage: '未学習',
      trainedEpisodes: 0
    };
  }

  private profileById(profileId: QLearningProfileId): QLearningProfile {
    return this.qLearningProfiles.find((profile) => profile.id === profileId) ?? this.qLearningProfiles[0];
  }

  private storageKey(profileId: QLearningProfileId): string {
    return `${this.qLearningStorageKeyPrefix}.${profileId}`;
  }
}
