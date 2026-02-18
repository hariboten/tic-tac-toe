export type Player = 'X' | 'O';
export type Cell = Player | null;
export type Winner = Player | 'DRAW' | null;
export type AgentType = 'HUMAN' | 'RANDOM' | 'MONTE_CARLO' | 'MINIMAX' | 'Q_LEARNING';

export interface GameState {
  board: Cell[];
  currentPlayer: Player;
  winner: Winner;
}
