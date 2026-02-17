import { GameState, Player } from '../game.types';
import { getAvailableCells } from '../tic-tac-toe.engine';
import { TicTacToeAgent } from './tic-tac-toe-agent';

export class RandomAgent implements TicTacToeAgent {
  pickMove(state: GameState, _player: Player): number {
    const availableCells = getAvailableCells(state.board);
    const randomIndex = Math.floor(Math.random() * availableCells.length);

    return availableCells[randomIndex];
  }
}
