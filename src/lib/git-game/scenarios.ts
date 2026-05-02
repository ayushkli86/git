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
    committedFiles: [],
    stash: [],
    tags: [],
    HEAD: '',
    ...overrides,
  };
}

function commit(msg: string, branch: string, files: Record<string, string>, parents: string[] = [], parentHashes: string[] = []): import('./types').Commit {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 40; i++) hash += chars[Math.floor(Math.random() * 16)];
  return {
    hash,
    shortHash: hash.substring(0, 7),
    message: msg,
    branch,
    timestamp: Date.now() - Math.random() * 100000,
    parents: parentHashes,
    files: { ...files },
  };
}

export const scenarios: Scenario[] = [
  // ============ MISSION 1: GENESIS ============
  {
    id: 'genesis',
    level: 1,
    title: 'Genesis',
    subtitle: 'Initialize Your First Repository',
    story: `Welcome, Agent. You've been assigned to a classified project codenamed "GENESIS." Your mission: establish a secure code repository from scratch.\n\nThe agency needs you to:\n1. Initialize a new Git repository\n2. Create your first file (README.md)\n3. Stage it and commit it\n\nThis is where every great project begins — with a single command.`,
    objectives: [
      {
        id: 'init',
        description: 'Initialize a new Git repository (git init)',
        completed: false,
        check: (state) => state.initialized,
      },
      {
        id: 'touch',
        description: 'Create a file called README.md (touch README.md)',
        completed: false,
        check: (state, history) => history.some(l => l.type === 'input' && l.content.match(/touch\s+README\.md/)),
      },
      {
        id: 'add',
        description: 'Stage README.md (git add README.md)',
        completed: false,
        check: (state) => state.stagedFiles.includes('README.md'),
      },
      {
        id: 'commit',
        description: 'Commit with message "initial commit"',
        completed: false,
        check: (state) => state.branches['main']?.commits.length > 0 && state.branches['main'].commits[0].message.toLowerCase().includes('initial'),
      },
    ],
    hints: [
      'Step 1: git init',
      'Step 2: touch README.md',
      'Step 3: git add README.md',
      'Step 4: git commit -m "initial commit"',
    ],
    initialState: () => baseState(),
    validate: (state) => {
      if (!state.initialized) return { completed: false, message: 'You haven\'t initialized a repository yet. Try: git init' };
      if (state.branches['main']?.commits.length === 0) return { completed: false, message: 'No commits yet. Create a file with touch, then git add and git commit.' };
      return { completed: true, message: 'Mission Complete! You\'ve successfully created your first Git repository and made your initial commit. Every developer\'s journey starts here.' };
    },
    reward: 100,
    commands: ['git init', 'touch', 'git add', 'git commit'],
  },

  // ============ MISSION 2: THE CLONE PROTOCOL ============
  {
    id: 'clone-protocol',
    level: 2,
    title: 'The Clone Protocol',
    subtitle: 'Join an Existing Project',
    story: `Intel reports that a top-secret project exists on the agency's remote server. Your mission: infiltrate by cloning the repository.\n\nOnce inside:\n1. Check what files were cloned\n2. View the branch structure\n3. Review the commit history\n\nKnowledge is power, Agent.`,
    objectives: [
      {
        id: 'clone',
        description: 'Clone the repo from https://github.com/agency/secret-project.git',
        completed: false,
        check: (state) => state.cloned,
      },
      {
        id: 'ls',
        description: 'List files in the cloned repo (ls)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.trim() === 'ls'),
      },
      {
        id: 'cat',
        description: 'View the README.md file (cat README.md)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.match(/cat\s+README/)),
      },
      {
        id: 'branch-list',
        description: 'List all branches including remote (git branch -a)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git branch') && l.content.includes('-a')),
      },
      {
        id: 'log',
        description: 'View the commit history (git log --oneline)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git log')),
      },
    ],
    hints: [
      'Clone: git clone https://github.com/agency/secret-project.git',
      'See files: ls',
      'Read a file: cat README.md',
      'See branches: git branch -a',
      'See history: git log --oneline',
    ],
    initialState: () => baseState(),
    validate: (state) => {
      if (!state.cloned) return { completed: false, message: 'You haven\'t cloned the repository yet.' };
      return { completed: true, message: 'Mission Complete! You\'ve successfully cloned a repository and explored its structure. You now know how to join any project team.' };
    },
    reward: 120,
    commands: ['git clone', 'ls', 'cat', 'git branch', 'git log'],
  },

  // ============ MISSION 3: PARALLEL WORLDS ============
  {
    id: 'parallel-worlds',
    level: 3,
    title: 'Parallel Worlds',
    subtitle: 'Create and Switch Branches',
    story: `The agency needs you to work on a new feature while keeping the main code stable. Your mission: create a parallel development line — a "branch."\n\nOn your feature branch:\n1. Create a new file called login.js\n2. Write some code in it\n3. Commit it\n4. Switch back to main\n\nWelcome to parallel universes, Agent.`,
    objectives: [
      {
        id: 'create-branch',
        description: 'Create and switch to branch "feature-login" (git checkout -b feature-login)',
        completed: false,
        check: (state) => state.currentBranch === 'feature-login' && !!state.branches['feature-login'],
      },
      {
        id: 'create-file',
        description: 'Create login.js file (touch login.js)',
        completed: false,
        check: (state, history) => history.some(l => l.type === 'input' && l.content.match(/touch\s+login\.js/)),
      },
      {
        id: 'write-code',
        description: 'Write code to login.js (echo "..." > login.js)',
        completed: false,
        check: (state) => state.workspaceFiles['login.js'] && state.workspaceFiles['login.js'].length > 0,
      },
      {
        id: 'commit',
        description: 'Commit on feature-login with message about login',
        completed: false,
        check: (state) => state.branches['feature-login']?.commits.some(c => c.message.toLowerCase().includes('login')),
      },
      {
        id: 'switch-back',
        description: 'Switch back to main (git checkout main)',
        completed: false,
        check: (state) => state.currentBranch === 'main',
      },
    ],
    hints: [
      'Create + switch branch: git checkout -b feature-login',
      'Create file: touch login.js',
      'Write code: echo "function login() {}" > login.js',
      'Stage: git add login.js',
      'Commit: git commit -m "add login functionality"',
      'Go back: git checkout main',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            commit('Initial commit', 'main', { 'README.md': '# Project' }, []),
          ],
          isActive: true,
          color: '#00ff41',
        },
      },
      HEAD: 'init123',
      workspaceFiles: { 'README.md': '# Project' },
      committedFiles: ['README.md'],
    }),
    validate: (state) => {
      if (!state.branches['feature-login']) return { completed: false, message: 'You haven\'t created the feature-login branch.' };
      if (!state.branches['feature-login'].commits.some(c => c.message.toLowerCase().includes('login'))) return { completed: false, message: 'Commit something about login on your feature branch.' };
      if (state.currentBranch !== 'main') return { completed: false, message: 'Switch back to main to complete the mission.' };
      return { completed: true, message: 'Mission Complete! You\'ve mastered branching — creating parallel lines of development. This is the #1 most important Git skill!' };
    },
    reward: 150,
    commands: ['git checkout -b', 'touch', 'echo', 'git add', 'git commit', 'git checkout'],
  },

  // ============ MISSION 4: UPLOAD TRANSMISSION ============
  {
    id: 'upload-transmission',
    level: 4,
    title: 'Upload Transmission',
    subtitle: 'Push Your Code to the Cloud',
    story: `You've been working on a feature locally. Now it's time to transmit your code to the agency's central server.\n\nYour mission:\n1. Create a feature branch for payment\n2. Create and write a payment.js file\n3. Commit it\n4. Push it to the remote server\n\nThe -u flag sets up tracking — remember it well, Agent.`,
    objectives: [
      {
        id: 'create-feature',
        description: 'Create and switch to feature-payment branch',
        completed: false,
        check: (state) => state.currentBranch === 'feature-payment' && !!state.branches['feature-payment'],
      },
      {
        id: 'create-file',
        description: 'Create payment.js and write content to it',
        completed: false,
        check: (state) => state.workspaceFiles['payment.js'] && state.workspaceFiles['payment.js'].length > 0,
      },
      {
        id: 'commit-work',
        description: 'Commit with message about payment module',
        completed: false,
        check: (state) => state.branches['feature-payment']?.commits.some(c => c.message.toLowerCase().includes('payment')),
      },
      {
        id: 'push-branch',
        description: 'Push feature-payment to remote with tracking',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'success' && l.content.includes('feature-payment')),
      },
    ],
    hints: [
      'git checkout -b feature-payment',
      'touch payment.js',
      'echo "function processPayment() {}" > payment.js',
      'git add payment.js',
      'git commit -m "add payment module"',
      'git push -u origin feature-payment',
    ],
    initialState: () => baseState({
      initialized: true,
      currentBranch: 'main',
      branches: {
        main: {
          name: 'main',
          commits: [
            commit('Initial commit', 'main', { 'README.md': '# Project' }, []),
          ],
          isActive: true,
          color: '#00ff41',
        },
      },
      HEAD: 'init123',
      workspaceFiles: { 'README.md': '# Project' },
      committedFiles: ['README.md'],
      remotes: {
        origin: {
          name: 'origin',
          url: 'https://github.com/agency/project.git',
          branches: {
            main: {
              name: 'main',
              commits: [commit('Initial commit', 'main', { 'README.md': '# Project' }, [])],
            },
          },
        },
      },
    }),
    validate: (state) => {
      if (!state.branches['feature-payment']) return { completed: false, message: 'Create the feature-payment branch first.' };
      if (!state.branches['feature-payment'].commits.some(c => c.message.toLowerCase().includes('payment'))) return { completed: false, message: 'Commit your payment module work.' };
      if (!state.remotes['origin']?.branches['feature-payment']) return { completed: false, message: 'Push your branch to the remote: git push -u origin feature-payment' };
      return { completed: true, message: 'Mission Complete! Your code has been transmitted to the remote server. Your team can now review your work.' };
    },
    reward: 150,
    commands: ['git checkout -b', 'touch', 'echo', 'git add', 'git commit', 'git push -u'],
  },

  // ============ MISSION 5: SYNC STATION ============
  {
    id: 'sync-station',
    level: 5,
    title: 'Sync Station',
    subtitle: 'Pull and Fetch Remote Changes',
    story: `Alert! Your teammates have pushed new updates to the main branch while you were away.\n\nYour mission: synchronize your local repository with the remote.\n1. Preview changes with fetch (download without applying)\n2. Check what branches exist\n3. Apply changes with pull (download + merge)\n4. Verify sync status\n\nThe difference between fetch and pull is crucial, Agent.`,
    objectives: [
      {
        id: 'fetch',
        description: 'Fetch changes from remote (git fetch origin)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git fetch')),
      },
      {
        id: 'branch-list',
        description: 'Check branch status (git branch -a)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git branch') && l.content.includes('-a')),
      },
      {
        id: 'pull',
        description: 'Pull latest changes from origin/main',
        completed: false,
        check: (state) => {
          const localMain = state.branches['main']?.commits || [];
          const remoteMain = state.remotes['origin']?.branches['main']?.commits || [];
          return localMain.length >= remoteMain.length && localMain.length > 1;
        },
      },
      {
        id: 'status',
        description: 'Verify sync with git status',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.match(/git\s+status\s*$/)),
      },
    ],
    hints: [
      'Preview changes: git fetch origin',
      'See all branches: git branch -a',
      'Download + apply: git pull origin main',
      'Check status: git status',
    ],
    initialState: () => (() => {
      const c1 = commit('Initial commit', 'main', { 'README.md': '# Project' }, []);
      const c2 = commit('Add project structure', 'main', { 'README.md': '# Project\n\nSetup complete.', 'index.html': '<html></html>' }, [c1.hash]);
      const c3 = commit('Update README with team info', 'main', { 'README.md': '# Project\n\nBy: Team Alpha\n\nSetup complete.', 'index.html': '<html></html>' }, [c2.hash]);
      return baseState({
        initialized: true,
        currentBranch: 'main',
        branches: {
          main: {
            name: 'main',
            commits: [c1, c2],
            isActive: true,
            color: '#00ff41',
          },
        },
        HEAD: c2.hash,
        workspaceFiles: { 'README.md': '# Project\n\nSetup complete.', 'index.html': '<html></html>' },
        committedFiles: ['README.md', 'index.html'],
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/agency/project.git',
            branches: {
              main: { name: 'main', commits: [c1, c2, c3] },
            },
          },
        },
      });
    })(),
    validate: (state) => {
      const localMain = state.branches['main'];
      const remoteMain = state.remotes['origin']?.branches['main'];
      if (!localMain || !remoteMain) return { completed: false, message: 'Something went wrong.' };
      if (localMain.commits.length < remoteMain.commits.length) return { completed: false, message: 'You haven\'t pulled the latest changes yet.' };
      return { completed: true, message: 'Mission Complete! You\'re now synchronized with your team. Remember: fetch = preview, pull = download + merge.' };
    },
    reward: 130,
    commands: ['git fetch', 'git pull', 'git status', 'git branch -a'],
  },

  // ============ MISSION 6: CODE COLLISION ============
  {
    id: 'code-collision',
    level: 6,
    title: 'Code Collision',
    subtitle: 'Merge Branches',
    story: `Critical situation! Your feature branch has dashboard code that needs to go into main. You need to merge the branches — combining parallel universes into one.\n\nYour mission:\n1. Switch to main\n2. Merge feature/dashboard into main\n3. Push the merged result to remote\n4. Clean up by deleting the feature branch\n\nHandle this carefully, Agent — merges are where many stumble.`,
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
        check: (state) => state.branches['main']?.commits.some(c => c.message.toLowerCase().includes('merge') && c.message.toLowerCase().includes('dashboard')),
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
        description: 'Delete the merged feature/dashboard branch',
        completed: false,
        check: (state) => !state.branches['feature/dashboard'],
      },
    ],
    hints: [
      'git checkout main',
      'git merge feature/dashboard',
      'git push origin main',
      'git branch -d feature/dashboard',
    ],
    initialState: () => (() => {
      const c1 = commit('Initial commit', 'main', { 'README.md': '# Project' }, []);
      const c2 = commit('Add dashboard layout', 'feature/dashboard', { 'README.md': '# Project', 'dashboard.js': '// layout code' }, [c1.hash]);
      const c3 = commit('Add dashboard widgets', 'feature/dashboard', { 'README.md': '# Project', 'dashboard.js': '// layout + widgets' }, [c2.hash]);
      return baseState({
        initialized: true,
        currentBranch: 'main',
        branches: {
          main: {
            name: 'main',
            commits: [c1],
            isActive: true,
            color: '#00ff41',
          },
          'feature/dashboard': {
            name: 'feature/dashboard',
            commits: [c1, c2, c3],
            isActive: false,
            color: '#00f0ff',
          },
        },
        HEAD: c1.hash,
        workspaceFiles: { 'README.md': '# Project' },
        committedFiles: ['README.md'],
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/agency/project.git',
            branches: {
              main: { name: 'main', commits: [c1] },
              'feature/dashboard': { name: 'feature/dashboard', commits: [c1, c2, c3] },
            },
          },
        },
      });
    })(),
    validate: (state) => {
      if (!state.branches['main']?.commits.some(c => c.message.toLowerCase().includes('merge'))) return { completed: false, message: 'You haven\'t merged the feature branch yet.' };
      if (state.branches['feature/dashboard']) return { completed: false, message: 'Delete the merged branch: git branch -d feature/dashboard' };
      return { completed: true, message: 'Mission Complete! You\'ve successfully merged and cleaned up. This is the standard Pull Request workflow!' };
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
    story: `RED ALERT! You're in the middle of developing a search feature when HQ reports a production bug. You can't commit half-finished work, but can't abandon it either.\n\nYour mission:\n1. Create your work-in-progress files (search.js and search.test.js)\n2. Stage and prepare to stash\n3. Stash your work-in-progress\n4. Switch to main and fix the urgent bug\n5. Go back and restore your work with stash pop\n\nThis is real-world Git mastery, Agent.`,
    objectives: [
      {
        id: 'create-files',
        description: 'Create search.js and search.test.js files (touch search.js search.test.js)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.match(/touch\s+search/)),
      },
      {
        id: 'write-code',
        description: 'Write code to search.js (echo "..." > search.js)',
        completed: false,
        check: (state) => state.workspaceFiles['search.js'] && state.workspaceFiles['search.js'].length > 0,
      },
      {
        id: 'stash-work',
        description: 'Stage files and stash your work (git add . then git stash)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'success' && l.content.includes('stash') && l.content.includes('Saved')),
      },
      {
        id: 'switch-main',
        description: 'Switch to main branch',
        completed: false,
        check: (state) => state.currentBranch === 'main',
      },
      {
        id: 'create-hotfix',
        description: 'Create hotfix/urgent-fix branch and commit a fix',
        completed: false,
        check: (state) => !!state.branches['hotfix/urgent-fix'] && state.branches['hotfix/urgent-fix'].commits.length > 1,
      },
      {
        id: 'go-back',
        description: 'Switch back to feature/search',
        completed: false,
        check: (state) => state.currentBranch === 'feature/search',
      },
      {
        id: 'restore',
        description: 'Restore stashed work (git stash pop)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'success' && l.content.includes('Restored')),
      },
    ],
    hints: [
      'Create search files: touch search.js search.test.js',
      'Write code: echo "function search() {}" > search.js',
      'Stage all: git add .',
      'Save work: git stash',
      'Switch: git checkout main',
      'Create hotfix: git checkout -b hotfix/urgent-fix',
      'Create fix file: touch fix.js && echo "bug fixed" > fix.js',
      'Commit: git add fix.js && git commit -m "fix urgent bug"',
      'Go back: git checkout feature/search',
      'Restore: git stash pop',
    ],
    initialState: () => (() => {
      const c1 = commit('Initial commit', 'main', { 'README.md': '# Project' }, []);
      const c2 = commit('Set up project', 'main', { 'README.md': '# Project\nReady.', 'app.js': '// main app' }, [c1.hash]);
      return baseState({
        initialized: true,
        currentBranch: 'feature/search',
        branches: {
          main: { name: 'main', commits: [c1, c2], isActive: false, color: '#00ff41' },
          'feature/search': { name: 'feature/search', commits: [c1, c2], isActive: true, color: '#f0ff00' },
        },
        HEAD: c2.hash,
        workspaceFiles: {
          'README.md': '# Project\nReady.',
          'app.js': '// main app',
        },
        stagedFiles: [],
        committedFiles: ['README.md', 'app.js'],
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/agency/project.git',
            branches: {
              main: { name: 'main', commits: [c1, c2] },
            },
          },
        },
      });
    })(),
    validate: (state) => {
      if (!state.branches['hotfix/urgent-fix']) return { completed: false, message: 'Create the hotfix branch.' };
      if (state.currentBranch !== 'feature/search') return { completed: false, message: 'Return to feature/search branch.' };
      return { completed: true, message: 'Mission Complete! You handled a real-world emergency like a pro. Stashing saves developers daily!' };
    },
    reward: 200,
    commands: ['touch', 'echo', 'git add', 'git stash', 'git stash pop', 'git checkout', 'git commit'],
  },

  // ============ MISSION 8: TIME REWIND ============
  {
    id: 'time-rewind',
    level: 8,
    title: 'Time Rewind',
    subtitle: 'Undo Mistakes with Reset',
    story: `Disaster! An accidental commit pushed broken code into your feature branch. You need to rewind time — but carefully.\n\n--soft keeps your changes (safe)\n--hard destroys them (danger!)\n\nYour mission:\n1. Check the commit history to find the bad commit\n2. Undo it with --soft (safe undo)\n3. Verify your changes are still there\n\nChoose wisely, Agent.`,
    objectives: [
      {
        id: 'view-log',
        description: 'View commit history (git log --oneline)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git log')),
      },
      {
        id: 'soft-reset',
        description: 'Undo last commit with --soft (git reset --soft HEAD~1)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('reset') && l.content.includes('--soft')),
      },
      {
        id: 'verify',
        description: 'Verify changes are preserved (git status)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git status')),
      },
    ],
    hints: [
      'See commits: git log --oneline',
      'Safe undo: git reset --soft HEAD~1 (keeps your changes)',
      'Verify: git status',
      'WARNING: git reset --hard HEAD~1 would DELETE everything!',
    ],
    initialState: () => (() => {
      const c1 = commit('Initial commit', 'main', { 'README.md': '# Project' }, []);
      const c2 = commit('Add user model', 'feature/auth', { 'README.md': '# Project', 'user.js': 'class User {}' }, [c1.hash]);
      const c3 = commit('Add auth middleware', 'feature/auth', { 'README.md': '# Project', 'user.js': 'class User {}', 'auth.js': 'function auth() {}' }, [c2.hash]);
      const c4 = commit('BROKEN: accidentally pushed debug code', 'feature/auth', { 'README.md': '# Project', 'user.js': 'class User {}', 'auth.js': 'function auth() {}', 'debug.js': 'console.log everywhere' }, [c3.hash]);
      return baseState({
        initialized: true,
        currentBranch: 'feature/auth',
        branches: {
          main: { name: 'main', commits: [c1], isActive: false, color: '#00ff41' },
          'feature/auth': { name: 'feature/auth', commits: [c1, c2, c3, c4], isActive: true, color: '#bf5af2' },
        },
        HEAD: c4.hash,
        workspaceFiles: { 'README.md': '# Project', 'user.js': 'class User {}', 'auth.js': 'function auth() {}', 'debug.js': 'console.log everywhere' },
        committedFiles: ['README.md', 'user.js', 'auth.js', 'debug.js'],
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/agency/project.git',
            branches: {
              main: { name: 'main', commits: [c1] },
            },
          },
        },
      });
    })(),
    validate: (state) => {
      const authBranch = state.branches['feature/auth'];
      if (!authBranch) return { completed: false, message: 'Branch not found.' };
      if (authBranch.commits.length >= 4 && authBranch.commits[3].message.includes('BROKEN')) return { completed: false, message: 'The broken commit is still there! Use: git reset --soft HEAD~1' };
      return { completed: true, message: 'Mission Complete! You\'ve safely undone a mistake. --soft preserves changes, --hard destroys them. Remember the difference!' };
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
    story: `The agency is ready to deploy version 1.0.0 of the project. How will anyone know which commit represents the release?\n\nYour mission: use Git tags to mark the release point.\n1. Check the commit history\n2. Create an annotated tag v1.0.0\n3. List all tags\n4. Push the tag to remote\n\nTags are like bookmarks — they mark important milestones.`,
    objectives: [
      {
        id: 'check-log',
        description: 'View commit history (git log --oneline)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git log')),
      },
      {
        id: 'create-tag',
        description: 'Create annotated tag v1.0.0 with a message',
        completed: false,
        check: (state) => state.tags.includes('v1.0.0'),
      },
      {
        id: 'view-tags',
        description: 'List all tags (git tag)',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.match(/git\s+tag\s*$/)),
      },
      {
        id: 'push-tag',
        description: 'Push the tag to remote',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git push origin v1.0.0')),
      },
    ],
    hints: [
      'View history: git log --oneline',
      'Create annotated tag: git tag -a v1.0.0 -m "first release"',
      'List tags: git tag',
      'Push tag: git push origin v1.0.0',
    ],
    initialState: () => (() => {
      const c1 = commit('Initial commit', 'main', { 'README.md': '# Project' }, []);
      const c2 = commit('Add core features', 'main', { 'README.md': '# Project\n\nCore ready.', 'app.js': '// core' }, [c1.hash]);
      const c3 = commit('Add auth system', 'main', { 'README.md': '# Project\n\nCore ready.\nAuth added.', 'app.js': '// core + auth', 'auth.js': 'function login() {}' }, [c2.hash]);
      const c4 = commit('Fix security issues', 'main', { 'README.md': '# Project\n\nCore ready.\nAuth added.', 'app.js': '// core + auth (patched)', 'auth.js': 'function login() {} // patched' }, [c3.hash]);
      const c5 = commit('Ready for v1.0.0 release', 'main', { 'README.md': '# Project v1.0.0\n\nProduction ready.', 'app.js': '// core + auth (patched)', 'auth.js': 'function login() {} // patched' }, [c4.hash]);
      return baseState({
        initialized: true,
        currentBranch: 'main',
        branches: {
          main: { name: 'main', commits: [c1, c2, c3, c4, c5], isActive: true, color: '#00ff41' },
        },
        HEAD: c5.hash,
        workspaceFiles: { 'README.md': '# Project v1.0.0\n\nProduction ready.', 'app.js': '// core + auth (patched)', 'auth.js': 'function login() {} // patched' },
        committedFiles: ['README.md', 'app.js', 'auth.js'],
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/agency/project.git',
            branches: {
              main: { name: 'main', commits: [c1, c2, c3, c4, c5] },
            },
          },
        },
      });
    })(),
    validate: (state) => {
      if (!state.tags.includes('v1.0.0')) return { completed: false, message: 'Create the v1.0.0 tag: git tag -a v1.0.0 -m "first release"' };
      return { completed: true, message: 'Mission Complete! Tags mark important milestones. Your team can always checkout a specific version!' };
    },
    reward: 150,
    commands: ['git log', 'git tag', 'git tag -a', 'git push'],
  },

  // ============ MISSION 10: FINAL DEPLOYMENT ============
  {
    id: 'final-deployment',
    level: 10,
    title: 'Final Deployment',
    subtitle: 'The Complete Workflow',
    story: `This is it, Agent. The final mission. Demonstrate complete mastery of the Git workflow.\n\n1. Pull latest code from main\n2. Create a feature branch\n3. Create a file, write code, stage, commit\n4. Push your branch to remote\n5. Merge back to main\n6. Tag the release as v2.0.0\n\nExecute the complete real-world developer workflow. The agency is counting on you.`,
    objectives: [
      {
        id: 'pull',
        description: 'Pull latest changes from main',
        completed: false,
        check: (_state, history) => history.some(l => l.type === 'input' && l.content.includes('git pull')),
      },
      {
        id: 'create-branch',
        description: 'Create and switch to feature/final-feature branch',
        completed: false,
        check: (state) => state.currentBranch === 'feature/final-feature' && !!state.branches['feature/final-feature'],
      },
      {
        id: 'create-file',
        description: 'Create feature.js and write content to it',
        completed: false,
        check: (state) => state.workspaceFiles['feature.js'] && state.workspaceFiles['feature.js'].length > 0,
      },
      {
        id: 'commit',
        description: 'Stage and commit your feature',
        completed: false,
        check: (state) => {
          const fb = state.branches['feature/final-feature'];
          const main = state.branches['main'];
          if (!fb || !main) return false;
          return fb.commits.length > main.commits.length;
        },
      },
      {
        id: 'push',
        description: 'Push feature branch to remote',
        completed: false,
        check: (state) => !!state.remotes['origin']?.branches['feature/final-feature'],
      },
      {
        id: 'merge',
        description: 'Merge feature into main and push',
        completed: false,
        check: (state) => state.branches['main']?.commits.some(c => c.message.toLowerCase().includes('merge') && c.message.toLowerCase().includes('feature')),
      },
      {
        id: 'tag',
        description: 'Tag the release as v2.0.0',
        completed: false,
        check: (state) => state.tags.includes('v2.0.0'),
      },
    ],
    hints: [
      'git pull origin main',
      'git checkout -b feature/final-feature',
      'touch feature.js && echo "export const feature = () => {}" > feature.js',
      'git add feature.js',
      'git commit -m "add final feature"',
      'git push origin feature/final-feature',
      'git checkout main && git merge feature/final-feature',
      'git push origin main',
      'git tag v2.0.0 -m "final release"',
    ],
    initialState: () => (() => {
      const c1 = commit('Initial commit', 'main', { 'README.md': '# Project' }, []);
      const c2 = commit('Set up project structure', 'main', { 'README.md': '# Project\n\nv1.0', 'index.html': '<html></html>' }, [c1.hash]);
      const c3 = commit('Add v1.0 features', 'main', { 'README.md': '# Project\n\nv1.0', 'index.html': '<html></html>', 'app.js': '// v1 app' }, [c2.hash]);
      return baseState({
        initialized: true,
        currentBranch: 'main',
        branches: {
          main: { name: 'main', commits: [c1, c2, c3], isActive: true, color: '#00ff41' },
        },
        HEAD: c3.hash,
        workspaceFiles: { 'README.md': '# Project\n\nv1.0', 'index.html': '<html></html>', 'app.js': '// v1 app' },
        committedFiles: ['README.md', 'index.html', 'app.js'],
        remotes: {
          origin: {
            name: 'origin',
            url: 'https://github.com/agency/project.git',
            branches: {
              main: { name: 'main', commits: [c1, c2, c3] },
            },
          },
        },
      });
    })(),
    validate: (state) => {
      const main = state.branches['main'];
      if (!main?.commits.some(c => c.message.toLowerCase().includes('merge'))) return { completed: false, message: 'Merge the feature branch into main.' };
      if (!state.tags.includes('v2.0.0')) return { completed: false, message: 'Tag the release: git tag v2.0.0 -m "final release"' };
      return { completed: true, message: 'MISSION ACCOMPLISHED! You\'ve demonstrated complete Git mastery — from init to deploy. You\'re ready for real-world development!' };
    },
    reward: 300,
    commands: ['git pull', 'git checkout -b', 'touch', 'echo', 'git add', 'git commit', 'git push', 'git merge', 'git tag'],
  },
];
