import { Scenario, GitState } from './types';

function baseState(overrides?: Partial<GitState>): GitState {
  return {
    initialized: false,
    cloned: false,
    currentBranch: 'main',
    branches: {},
    remotes: {},
    workspaceFiles: {},
    stagedFiles: [],
    stash: [],
    tags: [],
    HEAD: '',
    ...overrides,
  };
}

export const scenarios: Scenario[] = [
  // ============ MISSION 1: GENESIS ============
  {
    id: 'genesis',
    level: 1,
    title: 'Genesis',
    subtitle: 'Initialize Your First Repository',
    story: `Welcome, Agent. You've been assigned to a classified project codenamed "GENESIS." Your mission: establish a secure code repository from scratch. The agency needs you to initialize a new Git repository, create the first file, and record the initial commit. This is where every great project begins — with a single command.`,
    objectives: [
      {
        id: 'init',
        description: 'Initialize a new Git repository',
        completed: false,
        check: (state) => state.initialized,
      },
      {
        id: 'add-readme',
        description: 'Stage README.md (use: touch README.md, then git add README.md)',
        completed: false,
        check: (state) => state.stagedFiles.includes('README.md') || (state.branches['main']?.commits.length > 0),
      },
      {
        id: 'commit',
        description: 'Create your first commit with message "initial commit"',
        completed: false,
        check: (state) => state.branches['main']?.commits.length > 0 && state.branches['main']?.commits[0].message.toLowerCase().includes('initial'),
      },
    ],
    hints: [
      'Start with: git init',
      'Create a file first: The game auto-creates files when you git add them — just type: git add README.md',
      'Commit your changes: git commit -m "initial commit"',
    ],
    initialState: () => baseState(),
    validate: (state) => {
      if (!state.initialized) return { completed: false, message: 'You haven\'t initialized a repository yet.' };
      if (!state.branches['main'] || state.branches['main'].commits.length === 0) return { completed: false, message: 'You haven\'t made a commit yet.' };
      return { completed: true, message: 'Mission Complete! You\'ve successfully created your first Git repository and made your initial commit. Every developer\'s journey starts here.' };
    },
    reward: 100,
    commands: ['git init', 'git add', 'git commit'],
  },

  // ============ MISSION 2: THE CLONE PROTOCOL ============
  {
    id: 'clone-protocol',
    level: 2,
    title: 'The Clone Protocol',
    subtitle: 'Join an Existing Project',
    story: `Intel reports that a top-secret project exists on the agency's remote server. Your mission: infiltrate by cloning the repository. Once inside, analyze the codebase — check the branch structure and review the commit history. Knowledge is power, Agent.`,
    objectives: [
      {
        id: 'clone',
        description: 'Clone the repository from https://github.com/agency/secret-project.git',
        completed: false,
        check: (state) => state.cloned,
      },
      {
        id: 'branch-list',
        description: 'List all branches (local and remote)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git branch') && l.content.includes('-a')),
      },
      {
        id: 'check-log',
        description: 'View the commit history',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git log')),
      },
    ],
    hints: [
      'Clone the repo: git clone https://github.com/agency/secret-project.git',
      'See all branches: git branch -a',
      'View history: git log --oneline',
    ],
    initialState: () => baseState(),
    validate: (state) => {
      if (!state.cloned) return { completed: false, message: 'You haven\'t cloned the repository yet.' };
      if (!state.initialized) return { completed: false, message: 'Repository not properly set up.' };
      return { completed: true, message: 'Mission Complete! You\'ve successfully cloned a repository and explored its structure. You now know how to join any project team.' };
    },
    reward: 120,
    commands: ['git clone', 'git branch', 'git log'],
  },

  // ============ MISSION 3: PARALLEL WORLDS ============
  {
    id: 'parallel-worlds',
    level: 3,
    title: 'Parallel Worlds',
    subtitle: 'Create and Switch Branches',
    story: `The agency needs you to work on a new feature while keeping the main code stable. Your mission: create a parallel development line — a "branch." You'll learn the fundamental skill of working on multiple features simultaneously without risking the main codebase. Welcome to parallel universes, Agent.`,
    objectives: [
      {
        id: 'create-branch',
        description: 'Create a new branch called "feature-login"',
        completed: false,
        check: (state) => !!state.branches['feature-login'],
      },
      {
        id: 'switch-branch',
        description: 'Switch to the feature-login branch',
        completed: false,
        check: (state) => state.currentBranch === 'feature-login',
      },
      {
        id: 'commit-feature',
        description: 'Make a commit on feature-login with message "add login form"',
        completed: false,
        check: (state) => state.branches['feature-login']?.commits.some(c => c.message.toLowerCase().includes('login')),
      },
      {
        id: 'switch-back',
        description: 'Switch back to main branch',
        completed: false,
        check: (state, history) => {
          const switchCommands = history.filter(l => l.type === 'input' && l.content.includes('checkout main'));
          return switchCommands.length >= 1 && state.currentBranch === 'main';
        },
      },
    ],
    hints: [
      'Create and switch in one step: git checkout -b feature-login',
      'Make a commit: first git add README.md, then git commit -m "add login form"',
      'Go back: git checkout main',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 100000,
              parents: [],
            },
          ],
          isActive: true,
          color: '#00ff41',
        },
      },
      HEAD: 'a1b2c3d4e5f6g7h8i9j0',
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [{
                hash: 'a1b2c3d4e5f6g7h8i9j0',
                shortHash: 'a1b2c3d',
                message: 'Initial commit',
                branch: 'main',
                timestamp: Date.now() - 100000,
                parents: [],
              }],
            },
          },
        },
      },
    }),
    validate: (state) => {
      if (!state.branches['feature-login']) return { completed: false, message: 'You haven\'t created the feature-login branch.' };
      if (!state.branches['feature-login'].commits.some(c => c.message.toLowerCase().includes('login'))) return { completed: false, message: 'You haven\'t committed to the feature branch.' };
      if (state.currentBranch !== 'main') return { completed: false, message: 'Switch back to main to complete the mission.' };
      return { completed: true, message: 'Mission Complete! You\'ve mastered the art of branching — creating parallel worlds for different features. This is the #1 most important Git skill for team collaboration.' };
    },
    reward: 150,
    commands: ['git branch', 'git checkout', 'git checkout -b'],
  },

  // ============ MISSION 4: UPLOAD TRANSMISSION ============
  {
    id: 'upload-transmission',
    level: 4,
    title: 'Upload Transmission',
    subtitle: 'Push Your Code to the Cloud',
    story: `You've been working on a feature locally. Now it's time to transmit your code to the agency's central server. Your mission: push your local branch to the remote repository so your teammates can see your work. The -u flag will set up tracking for future pushes — remember it well, Agent.`,
    objectives: [
      {
        id: 'create-feature',
        description: 'Create and switch to feature-payment branch',
        completed: false,
        check: (state) => state.currentBranch === 'feature-payment' && !!state.branches['feature-payment'],
      },
      {
        id: 'commit-work',
        description: 'Make a commit with message "add payment module"',
        completed: false,
        check: (state) => state.branches['feature-payment']?.commits.some(c => c.message.toLowerCase().includes('payment')),
      },
      {
        id: 'push-branch',
        description: 'Push feature-payment to remote (with tracking)',
        completed: false,
        check: (state) => !!state.remotes['origin']?.branches['feature-payment'],
      },
    ],
    hints: [
      'Create the branch: git checkout -b feature-payment',
      'Commit: git add README.md && git commit -m "add payment module"',
      'Push with tracking: git push -u origin feature-payment',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'x1y2z3a4b5c6d7e8f9g0',
              shortHash: 'x1y2z3a',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 100000,
              parents: [],
            },
          ],
          isActive: true,
          color: '#00ff41',
        },
      },
      HEAD: 'x1y2z3a4b5c6d7e8f9g0',
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [{
                hash: 'x1y2z3a4b5c6d7e8f9g0',
                shortHash: 'x1y2z3a',
                message: 'Initial commit',
                branch: 'main',
                timestamp: Date.now() - 100000,
                parents: [],
              }],
            },
          },
        },
      },
    }),
    validate: (state) => {
      if (!state.branches['feature-payment']) return { completed: false, message: 'Create the feature-payment branch first.' };
      if (!state.branches['feature-payment'].commits.some(c => c.message.toLowerCase().includes('payment'))) return { completed: false, message: 'You need to commit your payment module work.' };
      if (!state.remotes['origin']?.branches['feature-payment']) return { completed: false, message: 'Push your branch to the remote.' };
      return { completed: true, message: 'Mission Complete! Your code has been transmitted to the remote server. Your team can now review and collaborate on your feature branch.' };
    },
    reward: 150,
    commands: ['git checkout -b', 'git push', 'git push -u'],
  },

  // ============ MISSION 5: SYNC STATION ============
  {
    id: 'sync-station',
    level: 5,
    title: 'Sync Station',
    subtitle: 'Pull and Fetch Remote Changes',
    story: `Alert! Your teammates have pushed new updates to the main branch while you were away. Your mission: synchronize your local repository with the remote. You'll learn the crucial difference between fetch (preview changes) and pull (download + apply). Staying in sync is essential for team harmony, Agent.`,
    objectives: [
      {
        id: 'fetch',
        description: 'Fetch changes from remote without applying them',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git fetch')),
      },
      {
        id: 'check-remote',
        description: 'Check remote branch status',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git branch') && l.content.includes('-a')),
      },
      {
        id: 'pull',
        description: 'Pull latest changes from origin/main',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git pull')),
      },
      {
        id: 'verify-sync',
        description: 'Verify you\'re up to date with git status',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git status')),
      },
    ],
    hints: [
      'Preview changes: git fetch origin',
      'See all branches: git branch -a',
      'Download and apply: git pull origin main',
      'Check status: git status',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 200000,
              parents: [],
            },
            {
              hash: 'f1e2d3c4b5a6f7e8d9c0',
              shortHash: 'f1e2d3c',
              message: 'Add project structure',
              branch: 'main',
              timestamp: Date.now() - 100000,
              parents: ['a1b2c3d4e5f6g7h8i9j0'],
            },
          ],
          isActive: true,
          color: '#00ff41',
        },
      },
      HEAD: 'f1e2d3c4b5a6f7e8d9c0',
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [
                {
                  hash: 'a1b2c3d4e5f6g7h8i9j0',
                  shortHash: 'a1b2c3d',
                  message: 'Initial commit',
                  branch: 'main',
                  timestamp: Date.now() - 200000,
                  parents: [],
                },
                {
                  hash: 'f1e2d3c4b5a6f7e8d9c0',
                  shortHash: 'f1e2d3c',
                  message: 'Add project structure',
                  branch: 'main',
                  timestamp: Date.now() - 100000,
                  parents: ['a1b2c3d4e5f6g7h8i9j0'],
                },
                {
                  hash: 'z9y8x7w6v5u4t3s2r1q0',
                  shortHash: 'z9y8x7w',
                  message: 'Update README with team info',
                  branch: 'main',
                  timestamp: Date.now() - 50000,
                  parents: ['f1e2d3c4b5a6f7e8d9c0'],
                },
              ],
            },
          },
        },
      },
    }),
    validate: (state) => {
      const localMain = state.branches['main'];
      const remoteMain = state.remotes['origin']?.branches['main'];
      if (!localMain || !remoteMain) return { completed: false, message: 'Something went wrong with the repository.' };
      if (localMain.commits.length < remoteMain.commits.length) return { completed: false, message: 'You haven\'t pulled the latest changes yet.' };
      return { completed: true, message: 'Mission Complete! You\'re now fully synchronized with your team. The difference between fetch (preview) and pull (download+merge) is a key Git concept you\'ve mastered.' };
    },
    reward: 130,
    commands: ['git fetch', 'git pull', 'git status'],
  },

  // ============ MISSION 6: CODE COLLISION ============
  {
    id: 'code-collision',
    level: 6,
    title: 'Code Collision',
    subtitle: 'Merge Branches',
    story: `Critical situation! Your feature branch is ready, but the code exists only in isolation. You need to merge it back into main — combining the parallel universes into one. Your mission: merge the feature branch into main and push the unified code to the remote. Handle this carefully, Agent — merges are where many developers stumble.`,
    objectives: [
      {
        id: 'switch-main',
        description: 'Switch to the main branch',
        completed: false,
        check: (state) => state.currentBranch === 'main',
      },
      {
        id: 'merge-feature',
        description: 'Merge feature/dashboard into main',
        completed: false,
        check: (state) => {
          const mainBranch = state.branches['main'];
          return mainBranch?.commits.some(c => c.message.toLowerCase().includes('merge') && c.message.toLowerCase().includes('dashboard'));
        },
      },
      {
        id: 'push-merged',
        description: 'Push the merged main to remote',
        completed: false,
        check: (state, history) => {
          const pushMain = history.some(l => l.type === 'input' && l.content.includes('git push') && l.content.includes('main'));
          const remoteMain = state.remotes['origin']?.branches['main'];
          const localMain = state.branches['main'];
          return pushMain && remoteMain && localMain && remoteMain.commits.length === localMain.commits.length;
        },
      },
      {
        id: 'cleanup',
        description: 'Delete the merged feature branch (local)',
        completed: false,
        check: (state) => !state.branches['feature/dashboard'],
      },
    ],
    hints: [
      'Switch to main: git checkout main',
      'Merge the feature: git merge feature/dashboard',
      'Push merged code: git push origin main',
      'Clean up: git branch -d feature/dashboard',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 200000,
              parents: [],
            },
          ],
          isActive: true,
          color: '#00ff41',
        },
        'feature/dashboard': {
          name: 'feature/dashboard',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 200000,
              parents: [],
            },
            {
              hash: 'b2c3d4e5f6g7h8i9j0k1',
              shortHash: 'b2c3d4e',
              message: 'Add dashboard layout',
              branch: 'feature/dashboard',
              timestamp: Date.now() - 100000,
              parents: ['a1b2c3d4e5f6g7h8i9j0'],
            },
            {
              hash: 'c3d4e5f6g7h8i9j0k1l2',
              shortHash: 'c3d4e5f',
              message: 'Add dashboard widgets',
              branch: 'feature/dashboard',
              timestamp: Date.now() - 50000,
              parents: ['b2c3d4e5f6g7h8i9j0k1'],
            },
          ],
          isActive: false,
          color: '#00f0ff',
        },
      },
      HEAD: 'a1b2c3d4e5f6g7h8i9j0',
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [{
                hash: 'a1b2c3d4e5f6g7h8i9j0',
                shortHash: 'a1b2c3d',
                message: 'Initial commit',
                branch: 'main',
                timestamp: Date.now() - 200000,
                parents: [],
              }],
            },
            'feature/dashboard': {
              name: 'feature/dashboard',
              commits: [
                {
                  hash: 'a1b2c3d4e5f6g7h8i9j0',
                  shortHash: 'a1b2c3d',
                  message: 'Initial commit',
                  branch: 'main',
                  timestamp: Date.now() - 200000,
                  parents: [],
                },
                {
                  hash: 'b2c3d4e5f6g7h8i9j0k1',
                  shortHash: 'b2c3d4e',
                  message: 'Add dashboard layout',
                  branch: 'feature/dashboard',
                  timestamp: Date.now() - 100000,
                  parents: ['a1b2c3d4e5f6g7h8i9j0'],
                },
                {
                  hash: 'c3d4e5f6g7h8i9j0k1l2',
                  shortHash: 'c3d4e5f',
                  message: 'Add dashboard widgets',
                  branch: 'feature/dashboard',
                  timestamp: Date.now() - 50000,
                  parents: ['b2c3d4e5f6g7h8i9j0k1'],
                },
              ],
            },
          },
        },
      },
    }),
    validate: (state) => {
      const mainBranch = state.branches['main'];
      if (!mainBranch?.commits.some(c => c.message.toLowerCase().includes('merge'))) return { completed: false, message: 'You haven\'t merged the feature branch yet.' };
      if (state.branches['feature/dashboard']) return { completed: false, message: 'Delete the merged branch to clean up.' };
      return { completed: true, message: 'Mission Complete! You\'ve successfully merged a feature branch and cleaned up. This is the standard workflow used by millions of developers every day through Pull Requests.' };
    },
    reward: 200,
    commands: ['git checkout', 'git merge', 'git push', 'git branch -d'],
  },

  // ============ MISSION 7: EMERGENCY PROTOCOL ============
  {
    id: 'emergency-protocol',
    level: 7,
    title: 'Emergency Protocol',
    subtitle: 'Stash and Context Switch',
    story: `RED ALERT! You're in the middle of developing a critical feature when HQ reports a production bug. You can't commit half-finished work, but you can't abandon it either. Your mission: use Git Stash to save your work-in-progress, switch to main to fix the urgent bug, then restore your work and continue. This is real-world Git mastery, Agent.`,
    objectives: [
      {
        id: 'stash-work',
        description: 'Stash your current work-in-progress',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'success' && l.content.includes('stash') && l.content.includes('Saved')),
      },
      {
        id: 'switch-main',
        description: 'Switch to main branch',
        completed: false,
        check: (state, history) => {
          return state.currentBranch === 'main' && history.filter(l => l.type === 'input' && l.content.includes('checkout main')).length >= 1;
        },
      },
      {
        id: 'fix-bug',
        description: 'Create hotfix/urgent-fix branch and commit a fix',
        completed: false,
        check: (state) => !!state.branches['hotfix/urgent-fix'] && state.branches['hotfix/urgent-fix'].commits.length > 1,
      },
      {
        id: 'restore-work',
        description: 'Go back to feature branch and restore stashed work',
        completed: false,
        check: (state, history) => {
          return state.currentBranch === 'feature/search' && history.some(l => l.type === 'input' && l.content.includes('stash pop'));
        },
      },
    ],
    hints: [
      'Save your work: git stash',
      'Switch: git checkout main',
      'Create hotfix: git checkout -b hotfix/urgent-fix',
      'Add and commit: git add README.md && git commit -m "fix critical bug"',
      'Go back: git checkout feature/search',
      'Restore: git stash pop',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'feature/search',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 200000,
              parents: [],
            },
            {
              hash: 'f1e2d3c4b5a6f7e8d9c0',
              shortHash: 'f1e2d3c',
              message: 'Set up project',
              branch: 'main',
              timestamp: Date.now() - 100000,
              parents: ['a1b2c3d4e5f6g7h8i9j0'],
            },
          ],
          isActive: false,
          color: '#00ff41',
        },
        'feature/search': {
          name: 'feature/search',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 200000,
              parents: [],
            },
            {
              hash: 'f1e2d3c4b5a6f7e8d9c0',
              shortHash: 'f1e2d3c',
              message: 'Set up project',
              branch: 'main',
              timestamp: Date.now() - 100000,
              parents: ['a1b2c3d4e5f6g7h8i9j0'],
            },
          ],
          isActive: true,
          color: '#f0ff00',
        },
      },
      HEAD: 'f1e2d3c4b5a6f7e8d9c0',
      workspaceFiles: {
        'search.js': 'export function search() { /* TODO: implement */ }',
        'search.test.js': '// tests for search',
      },
      stagedFiles: ['search.js', 'search.test.js'],
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [
                {
                  hash: 'a1b2c3d4e5f6g7h8i9j0',
                  shortHash: 'a1b2c3d',
                  message: 'Initial commit',
                  branch: 'main',
                  timestamp: Date.now() - 200000,
                  parents: [],
                },
                {
                  hash: 'f1e2d3c4b5a6f7e8d9c0',
                  shortHash: 'f1e2d3c',
                  message: 'Set up project',
                  branch: 'main',
                  timestamp: Date.now() - 100000,
                  parents: ['a1b2c3d4e5f6g7h8i9j0'],
                },
              ],
            },
          },
        },
      },
    }),
    validate: (state) => {
      if (!state.branches['hotfix/urgent-fix']) return { completed: false, message: 'You need to create the hotfix branch.' };
      if (state.currentBranch !== 'feature/search') return { completed: false, message: 'Return to the feature/search branch.' };
      return { completed: true, message: 'Mission Complete! You\'ve handled a real-world emergency like a pro. Stashing is one of Git\'s most underrated features — it saves developers daily!' };
    },
    reward: 200,
    commands: ['git stash', 'git stash pop', 'git checkout'],
  },

  // ============ MISSION 8: TIME REWIND ============
  {
    id: 'time-rewind',
    level: 8,
    title: 'Time Rewind',
    subtitle: 'Undo Mistakes with Reset',
    story: `Disaster! An accidental commit pushed broken code into your feature branch. The agency needs you to rewind time — but carefully. Your mission: learn the different ways to undo commits. --soft keeps your changes, --hard destroys them. Choose wisely, Agent. One wrong move and your work could vanish forever.`,
    objectives: [
      {
        id: 'view-log',
        description: 'View commit history to identify the bad commit',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git log')),
      },
      {
        id: 'soft-reset',
        description: 'Use git reset --soft HEAD~1 to undo the last commit (keep changes)',
        completed: false,
        check: (state, history) => {
          return history.some(l => l.type === 'input' && l.content.includes('reset') && l.content.includes('--soft'));
        },
      },
      {
        id: 'verify-changes',
        description: 'Verify your changes are still there with git status',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git status')),
      },
    ],
    hints: [
      'See your commits: git log --oneline',
      'Undo last commit, keep changes: git reset --soft HEAD~1',
      'Check if changes are preserved: git status',
      'WARNING: git reset --hard HEAD~1 would DELETE your changes!',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'feature/auth',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 300000,
              parents: [],
            },
          ],
          isActive: false,
          color: '#00ff41',
        },
        'feature/auth': {
          name: 'feature/auth',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 300000,
              parents: [],
            },
            {
              hash: 'p1q2r3s4t5u6v7w8x9y0',
              shortHash: 'p1q2r3s',
              message: 'Add user model',
              branch: 'feature/auth',
              timestamp: Date.now() - 200000,
              parents: ['a1b2c3d4e5f6g7h8i9j0'],
            },
            {
              hash: 'q2r3s4t5u6v7w8x9y0z1',
              shortHash: 'q2r3s4t',
              message: 'Add auth middleware',
              branch: 'feature/auth',
              timestamp: Date.now() - 100000,
              parents: ['p1q2r3s4t5u6v7w8x9y0'],
            },
            {
              hash: 'r3s4t5u6v7w8x9y0z1a2',
              shortHash: 'r3s4t5u',
              message: 'BROKEN: accidentally pushed debug code',
              branch: 'feature/auth',
              timestamp: Date.now() - 50000,
              parents: ['q2r3s4t5u6v7w8x9y0z1'],
            },
          ],
          isActive: true,
          color: '#bf5af2',
        },
      },
      HEAD: 'r3s4t5u6v7w8x9y0z1a2',
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [{
                hash: 'a1b2c3d4e5f6g7h8i9j0',
                shortHash: 'a1b2c3d',
                message: 'Initial commit',
                branch: 'main',
                timestamp: Date.now() - 300000,
                parents: [],
              }],
            },
          },
        },
      },
    }),
    validate: (state) => {
      const authBranch = state.branches['feature/auth'];
      if (!authBranch) return { completed: false, message: 'Branch not found.' };
      if (authBranch.commits.length >= 4 && authBranch.commits[3].message.includes('BROKEN')) return { completed: false, message: 'The broken commit is still there. Use git reset --soft HEAD~1 to undo it.' };
      return { completed: true, message: 'Mission Complete! You\'ve learned to undo mistakes safely. Remember: --soft preserves changes, --hard destroys them. Use --soft when you want to re-commit with a better message or fix something first.' };
    },
    reward: 180,
    commands: ['git log', 'git reset --soft', 'git status'],
  },

  // ============ MISSION 9: THE RELEASE ============
  {
    id: 'the-release',
    level: 9,
    title: 'The Release',
    subtitle: 'Tag Your Milestones',
    story: `The agency is ready to deploy version 1.0.0 of the project. But how will anyone know which commit represents the release? Your mission: use Git tags to mark the release point. Tags are like bookmarks in your project history — they mark important milestones that you can always come back to. Version management starts here, Agent.`,
    objectives: [
      {
        id: 'create-tag',
        description: 'Create an annotated tag v1.0.0 with a message',
        completed: false,
        check: (state) => state.tags.includes('v1.0.0'),
      },
      {
        id: 'view-tags',
        description: 'List all tags',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.match(/git tag\s*$/)),
      },
      {
        id: 'push-tag',
        description: 'Push the tag to remote',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'success' && l.content.includes('v1.0.0') && l.content.includes('push')),
      },
    ],
    hints: [
      'Create annotated tag: git tag -a v1.0.0 -m "first release"',
      'List tags: git tag',
      'Push tag: git push origin v1.0.0',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 400000,
              parents: [],
            },
            {
              hash: 'b2c3d4e5f6g7h8i9j0k1',
              shortHash: 'b2c3d4e',
              message: 'Add core features',
              branch: 'main',
              timestamp: Date.now() - 300000,
              parents: ['a1b2c3d4e5f6g7h8i9j0'],
            },
            {
              hash: 'c3d4e5f6g7h8i9j0k1l2',
              shortHash: 'c3d4e5f',
              message: 'Add authentication system',
              branch: 'main',
              timestamp: Date.now() - 200000,
              parents: ['b2c3d4e5f6g7h8i9j0k1'],
            },
            {
              hash: 'd4e5f6g7h8i9j0k1l2m3',
              shortHash: 'd4e5f6g',
              message: 'Fix critical security issues',
              branch: 'main',
              timestamp: Date.now() - 100000,
              parents: ['c3d4e5f6g7h8i9j0k1l2'],
            },
            {
              hash: 'e5f6g7h8i9j0k1l2m3n4',
              shortHash: 'e5f6g7h',
              message: 'Ready for v1.0.0 release',
              branch: 'main',
              timestamp: Date.now() - 50000,
              parents: ['d4e5f6g7h8i9j0k1l2m3'],
            },
          ],
          isActive: true,
          color: '#00ff41',
        },
      },
      HEAD: 'e5f6g7h8i9j0k1l2m3n4',
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [
                {
                  hash: 'a1b2c3d4e5f6g7h8i9j0',
                  shortHash: 'a1b2c3d',
                  message: 'Initial commit',
                  branch: 'main',
                  timestamp: Date.now() - 400000,
                  parents: [],
                },
                {
                  hash: 'b2c3d4e5f6g7h8i9j0k1',
                  shortHash: 'b2c3d4e',
                  message: 'Add core features',
                  branch: 'main',
                  timestamp: Date.now() - 300000,
                  parents: ['a1b2c3d4e5f6g7h8i9j0'],
                },
                {
                  hash: 'c3d4e5f6g7h8i9j0k1l2',
                  shortHash: 'c3d4e5f',
                  message: 'Add authentication system',
                  branch: 'main',
                  timestamp: Date.now() - 200000,
                  parents: ['b2c3d4e5f6g7h8i9j0k1'],
                },
                {
                  hash: 'd4e5f6g7h8i9j0k1l2m3',
                  shortHash: 'd4e5f6g',
                  message: 'Fix critical security issues',
                  branch: 'main',
                  timestamp: Date.now() - 100000,
                  parents: ['c3d4e5f6g7h8i9j0k1l2'],
                },
                {
                  hash: 'e5f6g7h8i9j0k1l2m3n4',
                  shortHash: 'e5f6g7h',
                  message: 'Ready for v1.0.0 release',
                  branch: 'main',
                  timestamp: Date.now() - 50000,
                  parents: ['d4e5f6g7h8i9j0k1l2m3'],
                },
              ],
            },
          },
        },
      },
    }),
    validate: (state) => {
      if (!state.tags.includes('v1.0.0')) return { completed: false, message: 'Create the v1.0.0 tag first.' };
      return { completed: true, message: 'Mission Complete! You\'ve tagged your first release. Tags are essential for version management — they let your team know exactly which code is in production.' };
    },
    reward: 150,
    commands: ['git tag', 'git tag -a', 'git push'],
  },

  // ============ MISSION 10: FINAL DEPLOYMENT ============
  {
    id: 'final-deployment',
    level: 10,
    title: 'Final Deployment',
    subtitle: 'The Complete Workflow',
    story: `This is it, Agent. The final mission. You must demonstrate complete mastery of the Git workflow: pull the latest code, create a feature branch, make commits, push to remote, merge back to main, and deploy. The agency is counting on you. Show them everything you've learned across all previous missions. This is the real-world developer workflow — execute it flawlessly.`,
    objectives: [
      {
        id: 'pull-latest',
        description: 'Pull latest changes from main',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git pull')),
      },
      {
        id: 'create-feature',
        description: 'Create and switch to feature/final-feature branch',
        completed: false,
        check: (state) => state.currentBranch === 'feature/final-feature' && !!state.branches['feature/final-feature'],
      },
      {
        id: 'commit-work',
        description: 'Make at least one commit on your feature branch',
        completed: false,
        check: (state) => {
          const fb = state.branches['feature/final-feature'];
          const main = state.branches['main'];
          if (!fb || !main) return false;
          return fb.commits.length > main.commits.length;
        },
      },
      {
        id: 'push-feature',
        description: 'Push feature branch to remote',
        completed: false,
        check: (state) => !!state.remotes['origin']?.branches['feature/final-feature'],
      },
      {
        id: 'merge-main',
        description: 'Merge feature into main and push',
        completed: false,
        check: (state) => {
          const main = state.branches['main'];
          return main?.commits.some(c => c.message.toLowerCase().includes('merge') && c.message.toLowerCase().includes('feature'));
        },
      },
      {
        id: 'tag-release',
        description: 'Tag the release as v2.0.0',
        completed: false,
        check: (state) => state.tags.includes('v2.0.0'),
      },
    ],
    hints: [
      'git pull origin main',
      'git checkout -b feature/final-feature',
      'git add README.md && git commit -m "add final feature"',
      'git push origin feature/final-feature',
      'git checkout main && git merge feature/final-feature',
      'git tag v2.0.0 -m "final release"',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            {
              hash: 'a1b2c3d4e5f6g7h8i9j0',
              shortHash: 'a1b2c3d',
              message: 'Initial commit',
              branch: 'main',
              timestamp: Date.now() - 500000,
              parents: [],
            },
            {
              hash: 'b2c3d4e5f6g7h8i9j0k1',
              shortHash: 'b2c3d4e',
              message: 'Set up project structure',
              branch: 'main',
              timestamp: Date.now() - 400000,
              parents: ['a1b2c3d4e5f6g7h8i9j0'],
            },
            {
              hash: 'c3d4e5f6g7h8i9j0k1l2',
              shortHash: 'c3d4e5f',
              message: 'Add v1.0 features',
              branch: 'main',
              timestamp: Date.now() - 300000,
              parents: ['b2c3d4e5f6g7h8i9j0k1'],
            },
          ],
          isActive: true,
          color: '#00ff41',
        },
      },
      HEAD: 'c3d4e5f6g7h8i9j0k1l2',
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [
                {
                  hash: 'a1b2c3d4e5f6g7h8i9j0',
                  shortHash: 'a1b2c3d',
                  message: 'Initial commit',
                  branch: 'main',
                  timestamp: Date.now() - 500000,
                  parents: [],
                },
                {
                  hash: 'b2c3d4e5f6g7h8i9j0k1',
                  shortHash: 'b2c3d4e',
                  message: 'Set up project structure',
                  branch: 'main',
                  timestamp: Date.now() - 400000,
                  parents: ['a1b2c3d4e5f6g7h8i9j0'],
                },
                {
                  hash: 'c3d4e5f6g7h8i9j0k1l2',
                  shortHash: 'c3d4e5f',
                  message: 'Add v1.0 features',
                  branch: 'main',
                  timestamp: Date.now() - 300000,
                  parents: ['b2c3d4e5f6g7h8i9j0k1'],
                },
              ],
            },
          },
        },
      },
    }),
    validate: (state) => {
      const main = state.branches['main'];
      if (!main?.commits.some(c => c.message.toLowerCase().includes('merge'))) return { completed: false, message: 'You need to merge the feature branch into main.' };
      if (!state.tags.includes('v2.0.0')) return { completed: false, message: 'Tag the release as v2.0.0.' };
      return { completed: true, message: 'MISSION ACCOMPLISHED! You\'ve demonstrated complete Git mastery — from init to deploy. You\'re now ready for real-world development. The agency is proud of you, Agent. Go forth and code!' };
    },
    reward: 300,
    commands: ['git pull', 'git checkout -b', 'git commit', 'git push', 'git merge', 'git tag'],
  },
];
