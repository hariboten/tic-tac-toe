import { Player } from '../game.types';

export type StateKey = string;
export type QValues = number[];

export interface RandomSource {
  next(): number;
}

export interface QLearningEpisodeStep {
  action: number;
  player: Player;
  stateKey: StateKey;
}
