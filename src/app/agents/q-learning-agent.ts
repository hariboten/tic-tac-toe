import { Cell, GameState, Player, Winner } from '../game.types';
import { evaluateWinner, getAvailableCells, nextPlayer } from '../tic-tac-toe.engine';
import { TicTacToeAgent } from './tic-tac-toe-agent';

export interface QLearningTrainingConfig {
  episodes: number;
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonDecay: number;
  minEpsilon: number;
}

interface EpisodeStep {
  action: number;
  player: Player;
  stateKey: string;
}

const DEFAULT_Q_VALUE = 0;

export class QLearningAgent implements TicTacToeAgent {
  private readonly qTable = new Map<string, number[]>();

  get tableSize(): number {
    return this.qTable.size;
  }

  clear(): void {
    this.qTable.clear();
  }

  pickMove(state: GameState, player: Player): number {
    const availableCells = getAvailableCells(state.board);
    const stateKey = this.getStateKey(state.board, player);

    if (!this.hasNonDefaultQValues(stateKey, availableCells)) {
      return availableCells[Math.floor(Math.random() * availableCells.length)];
    }

    return this.selectAction(state.board, player, availableCells, 0);
  }

  train(config: QLearningTrainingConfig, initialEpsilon = config.epsilon): number {
    let epsilon = initialEpsilon;

    for (let episode = 0; episode < config.episodes; episode += 1) {
      this.runEpisode(config, epsilon);
      epsilon = Math.max(config.minEpsilon, epsilon * config.epsilonDecay);
    }

    return epsilon;
  }

  private runEpisode(config: QLearningTrainingConfig, epsilon: number): void {
    const board: Cell[] = Array(9).fill(null);
    const history: EpisodeStep[] = [];
    let turn: Player = 'X';

    while (true) {
      const availableCells = getAvailableCells(board);
      const stateKey = this.getStateKey(board, turn);
      const action = this.selectAction(board, turn, availableCells, epsilon);

      history.push({ stateKey, action, player: turn });
      board[action] = turn;

      const winner = evaluateWinner(board);
      const isDraw = !winner && getAvailableCells(board).length === 0;

      if (winner || isDraw) {
        this.updateEpisodeHistory(history, winner ?? 'DRAW', config.learningRate, config.discountFactor);
        return;
      }

      turn = nextPlayer(turn);
    }
  }

  private updateEpisodeHistory(
    history: EpisodeStep[],
    winner: Winner,
    learningRate: number,
    discountFactor: number
  ): void {
    let discountedReturn = 0;

    for (let i = history.length - 1; i >= 0; i -= 1) {
      const step = history[i];
      const immediateReward = this.getRewardForStep(winner, step.player);
      discountedReturn = immediateReward + discountFactor * discountedReturn;
      this.updateQValue(step.stateKey, step.action, discountedReturn, learningRate);
    }
  }

  private getRewardForStep(winner: Winner, player: Player): number {
    if (winner === 'DRAW') {
      return 0.2;
    }

    return winner === player ? 1 : -1;
  }

  private selectAction(board: Cell[], player: Player, availableCells: number[], epsilon: number): number {
    if (availableCells.length === 1) {
      return availableCells[0];
    }

    if (Math.random() < epsilon) {
      return availableCells[Math.floor(Math.random() * availableCells.length)];
    }

    const stateKey = this.getStateKey(board, player);
    const qValues = this.getQValues(stateKey);
    let bestValue = Number.NEGATIVE_INFINITY;
    const bestActions: number[] = [];

    for (const action of availableCells) {
      const value = qValues[action];
      if (value > bestValue) {
        bestValue = value;
        bestActions.length = 0;
        bestActions.push(action);
        continue;
      }

      if (value === bestValue) {
        bestActions.push(action);
      }
    }

    return bestActions[Math.floor(Math.random() * bestActions.length)];
  }

  private hasNonDefaultQValues(stateKey: string, availableCells: number[]): boolean {
    const qValues = this.qTable.get(stateKey);
    if (!qValues) {
      return false;
    }

    return availableCells.some((cellIndex) => qValues[cellIndex] !== DEFAULT_Q_VALUE);
  }

  private updateQValue(stateKey: string, action: number, targetValue: number, learningRate: number): void {
    const qValues = this.getQValues(stateKey);
    const currentValue = qValues[action];
    qValues[action] = currentValue + learningRate * (targetValue - currentValue);
  }

  private getQValues(stateKey: string): number[] {
    const existing = this.qTable.get(stateKey);
    if (existing) {
      return existing;
    }

    const initial = Array(9).fill(DEFAULT_Q_VALUE);
    this.qTable.set(stateKey, initial);
    return initial;
  }

  private getStateKey(board: Cell[], player: Player): string {
    const boardKey = board.map((cell) => cell ?? '-').join('');
    return `${boardKey}:${player}`;
  }
}
