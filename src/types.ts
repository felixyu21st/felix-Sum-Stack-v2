export type GameMode = 'classic' | 'time';

export interface BlockData {
  id: string;
  value: number;
  row: number;
  col: number;
  isSelected?: boolean;
}

export interface GameState {
  grid: BlockData[];
  targetSum: number;
  currentSum: number;
  score: number;
  gameOver: boolean;
  mode: GameMode;
  timeLeft: number;
  level: number;
}

export const GRID_ROWS = 10;
export const GRID_COLS = 6;
export const INITIAL_ROWS = 4;
export const MAX_VALUE = 9;
export const TIME_LIMIT = 10; // seconds for time mode
