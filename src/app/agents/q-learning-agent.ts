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
    return this.selectAction(state.board, player, availableCells, 0);
  }

  train(config: QLearningTrainingConfig): void {
    let epsilon = config.epsilon;

    for (let episode = 0; episode < config.episodes; episode += 1) {
      this.runEpisode(config, epsilon);
      epsilon = Math.max(config.minEpsilon, epsilon * config.epsilonDecay);
    }
  }

  private runEpisode(config: QLearningTrainingConfig, epsilon: number): void {
    const board: Cell[] = Array(9).fill(null);
    let currentPlayer: Player = 'X';

    while (true) {
      const stateKey = this.getStateKey(board, currentPlayer);
      const availableCells = getAvailableCells(board);
      const action = this.selectAction(board, currentPlayer, availableCells, epsilon);

      board[action] = currentPlayer;

      const winner = evaluateWinner(board);
      const isDraw = !winner && getAvailableCells(board).length === 0;

      if (winner || isDraw) {
        const reward = this.getTerminalReward(winner ?? 'DRAW', currentPlayer);
        this.updateQValue(stateKey, action, reward, config.learningRate, 0);
        return;
      }

      const nextPlayerTurn = nextPlayer(currentPlayer);
      const nextStateKey = this.getStateKey(board, nextPlayerTurn);
      const nextAvailableCells = getAvailableCells(board);
      const maxNextValue = this.getMaxQValue(nextStateKey, nextAvailableCells);

      this.updateQValue(
        stateKey,
        action,
        0,
        config.learningRate,
        config.discountFactor * this.getOpponentValue(maxNextValue)
      );

      currentPlayer = nextPlayerTurn;
    }
  }

  private getTerminalReward(winner: Winner, player: Player): number {
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
    let bestAction = availableCells[0];
    let bestValue = qValues[bestAction];

    for (const action of availableCells.slice(1)) {
      const value = qValues[action];
      if (value > bestValue) {
        bestValue = value;
        bestAction = action;
      }
    }

    return bestAction;
  }

  private getOpponentValue(opponentStateValue: number): number {
    return -opponentStateValue;
  }

  private getMaxQValue(stateKey: string, availableCells: number[]): number {
    const qValues = this.getQValues(stateKey);
    return availableCells.reduce((max, action) => Math.max(max, qValues[action]), Number.NEGATIVE_INFINITY);
  }

  private updateQValue(
    stateKey: string,
    action: number,
    reward: number,
    learningRate: number,
    discountedFutureValue: number
  ): void {
    const qValues = this.getQValues(stateKey);
    const currentValue = qValues[action];
    qValues[action] = currentValue + learningRate * (reward + discountedFutureValue - currentValue);
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
