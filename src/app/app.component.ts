import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, NgClass } from '@angular/common';
import { AgentType, Cell, Player, Winner } from './game.types';
import { MinimaxAgent } from './agents/minimax-agent';
import { MonteCarloAgent } from './agents/monte-carlo-agent';
import { QLearningAgent, QLearningTrainingConfig } from './agents/q-learning-agent';
import { RandomAgent } from './agents/random-agent';
import { TicTacToeEngine } from './tic-tac-toe.engine';
import { APP_VERSION } from './version';

type QLearningProfileId = string;
type OverlayAssistantType = 'OFF' | 'MONTE_CARLO' | 'MINIMAX' | 'Q_LEARNING';
type AgentWorkspaceTab = 'TRAINING' | 'DATA' | 'COMPARE';
type ProfileSortKey = 'TOTAL_EPISODES' | 'STATE_COUNT';
type BattleAgentId = 'RANDOM' | 'MONTE_CARLO' | 'MINIMAX' | `Q_${string}`;

type BattleAgentEntry = {
  id: BattleAgentId;
  label: string;
  pickMove: (state: { board: Cell[]; currentPlayer: Player; winner: Winner }, player: Player) => number;
};

type MatchupCellStats = {
  wins: number;
  draws: number;
  losses: number;
  total: number;
};

type MatchupCellSummary = {
  winRate: number;
  drawRate: number;
  scoreRate: number;
};

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
  protected activeAgentWorkspaceTab: AgentWorkspaceTab = 'TRAINING';
  protected profileSortKey: ProfileSortKey = 'TOTAL_EPISODES';
  protected persistenceMessage = '保存データ未読み込み';
  protected portableJson = '';
  protected newProfileLabel = '';
  protected matchupGamesPerPair = 40;
  protected isMatchupRunning = false;
  protected matchupMessage = '未実行';
  protected matchupRows: Array<{ label: string; values: Array<MatchupCellSummary | null>; averageScoreRate: number | null }> = [];
  protected readonly availableOverlayAssistants: Array<{ value: OverlayAssistantType; label: string }> = [
    { value: 'OFF', label: 'オフ' },
    { value: 'MONTE_CARLO', label: 'モンテカルロ' },
    { value: 'MINIMAX', label: 'ミニマックス' },
    { value: 'Q_LEARNING', label: 'Q学習' }
  ];
  protected overlayAssistant: OverlayAssistantType = 'OFF';
  protected monteCarloOverlay: Map<number, number> = new Map();
  protected readonly appVersion = APP_VERSION;

  private readonly randomMoveDelayMs = 550;
  private readonly monteCarloSimulationCount = 700;
  private readonly trainingChunkSize = 500;
  private readonly qLearningStorageKeyPrefix = 'tic-tac-toe.q-learning.v2.profile';
  private readonly engine = new TicTacToeEngine();
  private readonly randomAgent = new RandomAgent();
  private readonly minimaxAgent = new MinimaxAgent();
  private readonly matchupMonteCarloAgent = new MonteCarloAgent(200);
  private readonly qLearningProfiles: QLearningProfile[] = [
    this.createProfile('A', 'プロファイル A'),
    this.createProfile('B', 'プロファイル B'),
    this.createProfile('C', 'プロファイル C')
  ];
  private readonly matchupChunkGames = 24;
  private randomMoveTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private matchupTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private matchupRunId = 0;

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

  protected get profileCount(): number {
    return this.qLearningProfiles.length;
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

  protected get profileSummaries(): Array<{ id: QLearningProfileId; label: string; totalEpisodes: number; stateCount: number; message: string }> {
    const summaries = this.qLearningProfiles.map((profile) => ({
      label: profile.label,
      id: profile.id,
      totalEpisodes: profile.agent.totalTrainedEpisodes,
      stateCount: profile.agent.tableSize,
      message: profile.trainingMessage
    }));

    const sorted = [...summaries].sort((a, b) => {
      if (this.profileSortKey === 'STATE_COUNT') {
        return b.stateCount - a.stateCount;
      }

      return b.totalEpisodes - a.totalEpisodes;
    });

    return sorted;
  }

  protected get isTrainingBusy(): string {
    return this.isTraining ? '実行中' : '待機中';
  }

  protected get matchupColumns(): string[] {
    return this.battleAgents.map((agent) => agent.label);
  }

  protected get latestAgentMessage(): string {
    if (this.isTraining) {
      return this.trainingMessage;
    }

    return this.persistenceMessage;
  }

  protected get latestAgentMessageTone(): 'success' | 'warn' | 'error' {
    return this.messageTone(this.latestAgentMessage);
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
    this.clearPendingMatchupRun();
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
    if (!this.hasProfile(profileId)) {
      return;
    }

    this.selectedTrainingProfileId = profileId;
  }

  protected setAgentWorkspaceTab(tab: AgentWorkspaceTab): void {
    this.activeAgentWorkspaceTab = tab;
  }

  protected setProfileSortKey(sortKey: ProfileSortKey): void {
    this.profileSortKey = sortKey;
  }

  protected setPlayProfile(profileId: QLearningProfileId): void {
    if (this.selectedPlayProfileId === profileId || !this.hasProfile(profileId)) {
      return;
    }

    this.selectedPlayProfileId = profileId;
    this.updateOverlay();
  }

  protected createProfileFromInput(): void {
    const sanitizedLabel = this.newProfileLabel.trim();
    const profileId = this.generateProfileId();
    const profileLabel = sanitizedLabel.length > 0 ? sanitizedLabel : `プロファイル ${profileId}`;
    const profile = this.createProfile(profileId, profileLabel);

    this.qLearningProfiles.push(profile);
    this.selectedTrainingProfileId = profileId;
    this.selectedPlayProfileId = profileId;
    this.newProfileLabel = '';
    this.persistenceMessage = `${profile.label} を追加しました`;
    this.updateOverlay();
  }

  protected removeSelectedTrainingProfile(): void {
    if (this.isTraining || this.qLearningProfiles.length <= 1) {
      return;
    }

    const profile = this.selectedTrainingProfile;
    if (!this.confirmDangerAction(`${profile.label} を削除します。よろしいですか？`)) {
      return;
    }

    const removedIndex = this.qLearningProfiles.findIndex((entry) => entry.id === profile.id);
    if (removedIndex < 0) {
      return;
    }

    this.qLearningProfiles.splice(removedIndex, 1);
    const fallback = this.qLearningProfiles[Math.max(0, removedIndex - 1)] ?? this.qLearningProfiles[0];
    this.selectedTrainingProfileId = fallback.id;
    if (this.selectedPlayProfileId === profile.id) {
      this.selectedPlayProfileId = fallback.id;
    }

    this.persistenceMessage = `${profile.label} を削除しました`;
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

    if (!this.confirmDangerAction('選択中プロファイルの学習データをクリアします。よろしいですか？')) {
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

    if (!this.confirmDangerAction('保存済み学習データを削除します。よろしいですか？')) {
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

  protected updateMatchupGamesPerPair(value: number): void {
    this.matchupGamesPerPair = Math.max(1, Math.floor(value || 0));
  }

  protected refreshMatchupTable(): void {
    if (this.isMatchupRunning) {
      return;
    }

    this.clearPendingMatchupRun();
    const gamesPerPair = Math.max(1, Math.floor(this.matchupGamesPerPair));
    const agents = this.battleAgents;
    const pairs = agents.flatMap((_, rowIndex) =>
      agents
        .map((__, colIndex) => ({ rowIndex, colIndex }))
        .filter(({ rowIndex: r, colIndex: c }) => r !== c)
    );
    const totalGames = pairs.length * gamesPerPair;
    const matrix: Array<Array<MatchupCellStats | null>> = agents.map((_, rowIndex) =>
      agents.map((__, colIndex) => (rowIndex === colIndex ? null : { wins: 0, draws: 0, losses: 0, total: 0 }))
    );

    this.matchupGamesPerPair = gamesPerPair;
    this.isMatchupRunning = true;
    this.matchupMessage = `対戦表を計算中... 進捗 0.0%（0 / ${totalGames} 局）`;

    let completedGames = 0;
    let pairIndex = 0;
    let gameIndexInPair = 0;
    const runId = this.matchupRunId + 1;
    this.matchupRunId = runId;

    const runChunk = (): void => {
      if (this.matchupRunId !== runId) {
        return;
      }

      let processedGames = 0;
      while (pairIndex < pairs.length && processedGames < this.matchupChunkGames) {
        const pair = pairs[pairIndex];
        const attacker = agents[pair.rowIndex];
        const defender = agents[pair.colIndex];
        const attackerStarts = gameIndexInPair >= Math.floor(gamesPerPair / 2);
        const result = this.simulateSingleGame(attacker, defender, attackerStarts);
        const stats = matrix[pair.rowIndex][pair.colIndex];

        if (stats) {
          stats.total += 1;
          if (result === 'ATTACKER_WIN') {
            stats.wins += 1;
          } else if (result === 'DRAW') {
            stats.draws += 1;
          } else {
            stats.losses += 1;
          }
        }

        processedGames += 1;
        completedGames += 1;
        gameIndexInPair += 1;

        if (gameIndexInPair >= gamesPerPair) {
          pairIndex += 1;
          gameIndexInPair = 0;
        }
      }

      const progress = totalGames === 0 ? 100 : (completedGames / totalGames) * 100;
      this.matchupMessage = `対戦表を計算中... 進捗 ${progress.toFixed(1)}%（${completedGames} / ${totalGames} 局）`;

      if (pairIndex >= pairs.length) {
        this.matchupRows = agents.map((agent, rowIndex) => {
          const values = matrix[rowIndex].map((stats) => this.toMatchupCellSummary(stats));
          const scoreRates = values.filter((value): value is MatchupCellSummary => value !== null).map((value) => value.scoreRate);

          return {
            label: agent.label,
            values,
            averageScoreRate: scoreRates.length > 0 ? scoreRates.reduce((sum, value) => sum + value, 0) / scoreRates.length : null
          };
        });

        this.matchupMessage = `${gamesPerPair}局/カードで更新完了（引き分けは0.5点換算で平均スコア率に反映）`;
        this.isMatchupRunning = false;
        this.matchupTimeoutId = null;
        return;
      }

      this.matchupTimeoutId = setTimeout(runChunk, 0);
    };

    this.matchupTimeoutId = setTimeout(runChunk, 0);
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

  private get battleAgents(): BattleAgentEntry[] {
    return [
      {
        id: 'RANDOM',
        label: 'ランダム',
        pickMove: (state, player) => this.randomAgent.pickMove(state, player)
      },
      {
        id: 'MONTE_CARLO',
        label: 'モンテカルロ',
        pickMove: (state, player) => this.matchupMonteCarloAgent.pickMove(state, player)
      },
      {
        id: 'MINIMAX',
        label: 'ミニマックス',
        pickMove: (state, player) => this.minimaxAgent.pickMove(state, player)
      },
      ...this.qLearningProfiles.map((profile) => ({
        id: `Q_${profile.id}` as const,
        label: `Q学習 ${profile.label}`,
        pickMove: (state: { board: Cell[]; currentPlayer: Player; winner: Winner }, player: Player) => profile.agent.pickMove(state, player)
      }))
    ];
  }

  private simulateSingleGame(attacker: BattleAgentEntry, defender: BattleAgentEntry, attackerStarts: boolean): 'ATTACKER_WIN' | 'DEFENDER_WIN' | 'DRAW' {
    const simulationEngine = new TicTacToeEngine();

    while (!simulationEngine.gameState.winner) {
      const state = simulationEngine.gameState;
      const attackerPlayer: Player = attackerStarts ? 'X' : 'O';
      const currentAgent = state.currentPlayer === attackerPlayer ? attacker : defender;
      const index = currentAgent.pickMove(state, state.currentPlayer);
      simulationEngine.play(index);
    }

    const result = simulationEngine.gameState.winner;
    if (result === 'DRAW') {
      return 'DRAW';
    }

    const attackerPlayer: Player = attackerStarts ? 'X' : 'O';
    return result === attackerPlayer ? 'ATTACKER_WIN' : 'DEFENDER_WIN';
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

  private clearPendingMatchupRun(): void {
    this.matchupRunId += 1;
    if (this.matchupTimeoutId) {
      clearTimeout(this.matchupTimeoutId);
      this.matchupTimeoutId = null;
    }
    this.isMatchupRunning = false;
  }

  private toMatchupCellSummary(stats: MatchupCellStats | null): MatchupCellSummary | null {
    if (!stats || stats.total === 0) {
      return null;
    }

    return {
      winRate: (stats.wins / stats.total) * 100,
      drawRate: (stats.draws / stats.total) * 100,
      scoreRate: ((stats.wins + stats.draws * 0.5) / stats.total) * 100
    };
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

  private hasProfile(profileId: QLearningProfileId): boolean {
    return this.qLearningProfiles.some((profile) => profile.id === profileId);
  }

  private generateProfileId(): QLearningProfileId {
    let index = 1;
    while (this.hasProfile(`P${index}`)) {
      index += 1;
    }

    return `P${index}`;
  }

  private storageKey(profileId: QLearningProfileId): string {
    return `${this.qLearningStorageKeyPrefix}.${profileId}`;
  }

  private confirmDangerAction(message: string): boolean {
    if (typeof window.confirm !== 'function') {
      return true;
    }

    return window.confirm(message);
  }

  private messageTone(message: string): 'success' | 'warn' | 'error' {
    if (message.includes('失敗') || message.includes('エラー')) {
      return 'error';
    }

    if (message.includes('未') || message.includes('なし')) {
      return 'warn';
    }

    return 'success';
  }
}
