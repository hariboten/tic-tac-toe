import { Cell, Player, Winner } from '../game.types';
import { evaluateWinner, getAvailableCells, nextPlayer } from '../tic-tac-toe.engine';
import { ValidatedTrainingConfig } from './q-learning-config';
import { QLearningPolicy } from './q-learning-policy';
import { QLearningReward } from './q-learning-reward';
import { QLearningStateEncoder } from './q-learning-state-encoder';
import { QLearningEpisodeStep } from './q-learning.types';
import { QLearningValueTable } from './q-learning-value-table';

export class QLearningTrainer {
  constructor(
    private readonly policy: QLearningPolicy,
    private readonly valueTable: QLearningValueTable,
    private readonly stateEncoder: QLearningStateEncoder,
    private readonly reward: QLearningReward
  ) {}

  runEpisode(config: ValidatedTrainingConfig, epsilon: number): void {
    const board: Cell[] = Array(9).fill(null);
    const history: QLearningEpisodeStep[] = [];
    let turn: Player = 'X';

    while (true) {
      const availableCells = getAvailableCells(board);
      const stateKey = this.stateEncoder.encode(board, turn);
      const action = this.policy.selectAction(board, turn, availableCells, epsilon);

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
    history: QLearningEpisodeStep[],
    winner: Winner,
    learningRate: number,
    discountFactor: number
  ): void {
    let discountedReturn = 0;

    for (let i = history.length - 1; i >= 0; i -= 1) {
      const step = history[i];
      const immediateReward = this.reward.getReward(winner, step.player);
      discountedReturn = immediateReward + discountFactor * discountedReturn;
      this.valueTable.updateQValue(step.stateKey, step.action, discountedReturn, learningRate);
    }
  }
}
