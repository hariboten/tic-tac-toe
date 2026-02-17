import { GameState, Player } from '../game.types';

export interface TicTacToeAgent {
  pickMove(state: GameState, player: Player): number;
}
