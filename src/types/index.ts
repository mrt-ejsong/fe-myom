export type CellType = 'ultimate_goal' | 'sub_goal' | 'action_item';
export type CellStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface Plan {
  id: string;
  title: string;
  core_objective: string | null;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Cell {
  id: string;
  plan_id: string;
  position: number;
  content: string | null;
  cell_type: CellType;
  status: CellStatus;
  updated_at: string;
}

export interface PlanWithCells extends Plan {
  cells: Cell[];
}

// Position constants for the 9x9 grid
export const ULTIMATE_GOAL_POSITION = 40;
export const SUB_GOAL_POSITIONS = [30, 31, 32, 39, 41, 48, 49, 50];

export function getCellType(position: number): CellType {
  if (position === ULTIMATE_GOAL_POSITION) return 'ultimate_goal';
  if (SUB_GOAL_POSITIONS.includes(position)) return 'sub_goal';
  return 'action_item';
}

// Map sub-goal position to its corresponding mini-grid positions
export const SUB_GOAL_TO_ACTION_POSITIONS: Record<number, number[]> = {
  30: [0, 1, 2, 9, 10, 11, 18, 19, 20],      // Top-left
  31: [3, 4, 5, 12, 13, 14, 21, 22, 23],     // Top-center
  32: [6, 7, 8, 15, 16, 17, 24, 25, 26],     // Top-right
  39: [27, 28, 29, 36, 37, 38, 45, 46, 47],  // Middle-left
  41: [33, 34, 35, 42, 43, 44, 51, 52, 53],  // Middle-right
  48: [54, 55, 56, 63, 64, 65, 72, 73, 74],  // Bottom-left
  49: [57, 58, 59, 66, 67, 68, 75, 76, 77],  // Bottom-center
  50: [60, 61, 62, 69, 70, 71, 78, 79, 80],  // Bottom-right
};

// Get the center position of each mini-grid (where the sub-goal label appears)
export const MINI_GRID_CENTERS: Record<number, number> = {
  30: 10, 31: 13, 32: 16,
  39: 37, 41: 43,
  48: 64, 49: 67, 50: 70,
};
