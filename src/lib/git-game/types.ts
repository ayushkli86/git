export interface Commit {
  hash: string;
  shortHash: string;
  message: string;
  branch: string;
  timestamp: number;
  parents: string[];
  files: Record<string, string>; // snapshot of files at this commit
}

export interface Branch {
  name: string;
  commits: Commit[];
  isActive: boolean;
  color: string;
}

export interface RemoteBranch {
  name: string;
  commits: Commit[];
}

export interface Remote {
  name: string;
  url: string;
  branches: Record<string, RemoteBranch>;
}

export interface StashEntry {
  id: string;
  message: string;
  stagedFiles: string[];
  workspaceFiles: Record<string, string>;
  timestamp: number;
}

export interface GitState {
  initialized: boolean;
  cloned: boolean;
  currentBranch: string;
  branches: Record<string, Branch>;
  remotes: Record<string, Remote>;
  workspaceFiles: Record<string, string>;  // files on disk (untracked + tracked)
  stagedFiles: string[];                   // files added to staging area
  committedFiles: string[];                // files that exist in the latest commit
  stash: StashEntry[];
  tags: string[];
  HEAD: string;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'success' | 'info' | 'warning' | 'system';
  content: string;
  timestamp: number;
}

export interface Scenario {
  id: string;
  level: number;
  title: string;
  subtitle: string;
  story: string;
  objectives: Objective[];
  hints: string[];
  initialState: () => GitState;
  validate: (state: GitState) => { completed: boolean; message: string };
  reward: number;
  commands: string[];
}

export interface Objective {
  id: string;
  description: string;
  completed: boolean;
  check: (state: GitState, history: TerminalLine[]) => boolean;
}

export interface GameState {
  currentScenario: number;
  gitState: GitState;
  terminalHistory: TerminalLine[];
  score: number;
  xp: number;
  level: number;
  completedScenarios: string[];
  commandHistory: string[];
  commandHistoryIndex: number;
}

export type CommandResult = {
  success: boolean;
  message: string;
  stateChanges?: Partial<GitState>;
};

export const BRANCH_COLORS = [
  '#00ff41', // green (main)
  '#00f0ff', // cyan
  '#f0ff00', // yellow
  '#ff6b35', // orange
  '#ff0066', // pink
  '#bf5af2', // purple
  '#30d158', // lime
  '#64d2ff', // sky
  '#ffd60a', // gold
  '#ff453a', // red
];
