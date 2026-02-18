import { Player, Winner } from '../game.types';

export class QLearningReward {
  getReward(winner: Winner, player: Player): number {
    if (winner === 'DRAW') {
      return 0.2;
    }

    return winner === player ? 1 : -1;
  }
}
