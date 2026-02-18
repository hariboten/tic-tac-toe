import { Cell, Player } from '../game.types';
import { StateKey } from './q-learning.types';

export class QLearningStateEncoder {
  encode(board: Cell[], player: Player): StateKey {
    const boardKey = board.map((cell) => cell ?? '-').join('');
    return `${boardKey}:${player}`;
  }
}
