import { GitState, TerminalLine, CommandResult, Commit, BRANCH_COLORS } from './types';

let commitCounter = 0;
let stashCounter = 0;

function generateHash(): { hash: string; shortHash: string } {
  commitCounter++;
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 40; i++) {
    hash += chars[Math.floor(Math.random() * 16)];
  }
  return { hash, shortHash: hash.substring(0, 7) };
}

function createCommit(message: string, branch: string, parentHashes: string[] = []): Commit {
  const { hash, shortHash } = generateHash();
  return {
    hash,
    shortHash,
    message,
    branch,
    timestamp: Date.now(),
    parents: parentHashes,
  };
}

function getLatestCommit(state: GitState, branch?: string): Commit | null {
  const b = branch || state.currentBranch;
  const branchData = state.branches[b];
  if (!branchData || branchData.commits.length === 0) return null;
  return branchData.commits[branchData.commits.length - 1];
}

export function createInitialState(): GitState {
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
  };
}

export function processCommand(state: GitState, command: string): CommandResult {
  const trimmed = command.trim();
  const parts = trimmed.split(/\s+/);
  const args = parts.slice(1);

  if (parts[0] !== 'git') {
    return { success: false, message: `Command not found: ${parts[0]}. Type 'git' commands to interact with the repository.` };
  }

  if (args.length === 0) {
    return {
      success: false,
      message: `usage: git <command> [<args>]\n\nThese are common Git commands:\n  init         Initialize a new repository\n  clone        Clone a repository\n  add          Add file contents to the index\n  commit       Record changes to the repository\n  branch       List, create, or delete branches\n  checkout     Switch branches or restore working tree\n  push         Update remote refs\n  pull         Fetch from and integrate with another repo\n  merge        Join two or more development histories\n  stash        Stash changes\n  status        Show the working tree status\n  log          Show commit logs\n  diff         Show changes\n  tag          Create, list, delete or verify tags\n  remote       Manage set of tracked repositories\n  fetch        Download objects and refs from another repository\n  reset        Reset current HEAD to the specified state\n  revert       Revert some existing commits`
    };
  }

  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'init':
      return handleInit(state);
    case 'clone':
      return handleClone(state, subArgs);
    case 'add':
      return handleAdd(state, subArgs);
    case 'commit':
      return handleCommit(state, subArgs);
    case 'branch':
      return handleBranch(state, subArgs);
    case 'checkout':
      return handleCheckout(state, subArgs);
    case 'switch':
      return handleSwitch(state, subArgs);
    case 'push':
      return handlePush(state, subArgs);
    case 'pull':
      return handlePull(state, subArgs);
    case 'fetch':
      return handleFetch(state, subArgs);
    case 'merge':
      return handleMerge(state, subArgs);
    case 'stash':
      return handleStash(state, subArgs);
    case 'status':
      return handleStatus(state);
    case 'log':
      return handleLog(state, subArgs);
    case 'diff':
      return handleDiff(state, subArgs);
    case 'tag':
      return handleTag(state, subArgs);
    case 'remote':
      return handleRemote(state, subArgs);
    case 'reset':
      return handleReset(state, subArgs);
    case 'revert':
      return handleRevert(state, subArgs);
    case 'show':
      return handleShow(state, subArgs);
    default:
      return { success: false, message: `git: '${subcommand}' is not a git command. See 'git --help'.` };
  }
}

function handleInit(state: GitState): CommandResult {
  if (state.initialized) {
    return { success: false, message: 'Reinitialized existing Git repository in .git/' };
  }
  const newState: Partial<GitState> = {
    initialized: true,
    branches: {
      ...state.branches,
      main: {
        name: 'main',
        commits: [],
        isActive: true,
        color: BRANCH_COLORS[0],
      },
    },
    currentBranch: 'main',
    HEAD: '',
  };
  return {
    success: true,
    message: 'Initialized empty Git repository in .git/\nCreated default branch: main',
    stateChanges: newState,
  };
}

function handleClone(state: GitState, args: string[]): CommandResult {
  if (state.initialized) {
    return { success: false, message: 'fatal: destination path already exists and is not an empty directory.' };
  }
  if (args.length === 0) {
    return { success: false, message: 'usage: git clone <url> [<directory>]' };
  }
  const url = args[0];
  const folderName = args[1] || url.split('/').pop()?.replace('.git', '') || 'project';

  const initialCommit = createCommit('Initial commit', 'main');
  const newState: Partial<GitState> = {
    initialized: true,
    cloned: true,
    currentBranch: 'main',
    branches: {
      main: {
        name: 'main',
        commits: [initialCommit],
        isActive: true,
        color: BRANCH_COLORS[0],
      },
    },
    remotes: {
      origin: {
        name: 'origin',
        url: url,
        branches: {
          main: {
            name: 'main',
            commits: [{ ...initialCommit }],
          },
        },
      },
    },
    HEAD: initialCommit.hash,
    workspaceFiles: {
      'README.md': '# Welcome to ' + folderName,
    },
    tags: [],
    stash: [],
  };

  return {
    success: true,
    message: `Cloning into '${folderName}'...\nremote: Enumerating objects: 42, done.\nremote: Counting objects: 100% (42/42), done.\nReceiving objects: 100% (42/42), done.\nResolving deltas: 100% (20/20), done.`,
    stateChanges: newState,
  };
}

function handleAdd(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git' };
  }

  if (args.length === 0) {
    return { success: false, message: 'Nothing specified, nothing added.\nusage: git add [<options>] [--] <pathspec>...' };
  }

  if (args[0] === '.') {
    const allFiles = Object.keys(state.workspaceFiles);
    if (allFiles.length === 0 && state.stagedFiles.length === 0) {
      return { success: false, message: 'nothing to commit, working tree clean' };
    }
    return {
      success: true,
      message: `Added ${allFiles.length} file(s) to staging area:\n${allFiles.map(f => `  ${f}`).join('\n')}`,
      stateChanges: { stagedFiles: [...allFiles] },
    };
  }

  const filesToAdd = args.filter(f => !f.startsWith('-'));
  const existingFiles = filesToAdd.filter(f => state.workspaceFiles[f] !== undefined);

  if (existingFiles.length === 0) {
    return { success: false, message: `fatal: pathspec '${args.join(' ')}' did not match any files` };
  }

  const newStaged = [...new Set([...state.stagedFiles, ...existingFiles])];
  return {
    success: true,
    message: `Added ${existingFiles.length} file(s) to staging area:\n${existingFiles.map(f => `  ${f}`).join('\n')}`,
    stateChanges: { stagedFiles: newStaged },
  };
}

function handleCommit(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  const msgIndex = args.indexOf('-m');
  if (msgIndex === -1 || msgIndex + 1 >= args.length) {
    return { success: false, message: 'usage: git commit -m "commit message"' };
  }

  const message = args[msgIndex + 1].replace(/^["']|["']$/g, '');

  if (state.stagedFiles.length === 0) {
    return {
      success: false,
      message: 'nothing to commit, working tree clean\n\n(no changes added to commit)\n\nUse "git add" to track files.',
    };
  }

  const parentCommit = getLatestCommit(state);
  const commit = createCommit(
    message,
    state.currentBranch,
    parentCommit ? [parentCommit.hash] : []
  );

  const currentBranch = state.branches[state.currentBranch];
  if (!currentBranch) {
    return { success: false, message: `fatal: branch '${state.currentBranch}' not found` };
  }

  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = {
    ...currentBranch,
    commits: [...currentBranch.commits, commit],
  };

  // Auto-create workspace files if they don't exist (for game purposes)
  const newWorkspaceFiles = { ...state.workspaceFiles };
  state.stagedFiles.forEach(f => {
    if (!newWorkspaceFiles[f]) {
      newWorkspaceFiles[f] = '// content of ' + f;
    }
  });

  // Update remote tracking if it exists
  const updatedRemotes = { ...state.remotes };
  if (updatedRemotes['origin'] && updatedRemotes['origin'].branches[state.currentBranch]) {
    // Don't update remote - push is needed separately
  }

  return {
    success: true,
    message: `[${state.currentBranch} ${commit.shortHash}] ${message}\n ${state.stagedFiles.length} file(s) changed`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: commit.hash,
      stagedFiles: [],
      workspaceFiles: newWorkspaceFiles,
    },
  };
}

function handleBranch(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  // List branches
  if (args.length === 0 || (args.length === 1 && args[0] === '-a')) {
    const localBranches = Object.keys(state.branches);
    let output = localBranches.map(b => {
      const prefix = b === state.currentBranch ? '* ' : '  ';
      return `${prefix}${b}`;
    }).join('\n');

    if (args[0] === '-a') {
      const remoteBranches: string[] = [];
      Object.values(state.remotes).forEach(remote => {
        Object.keys(remote.branches).forEach(b => {
          remoteBranches.push(`  remotes/${remote.name}/${b}`);
        });
      });
      if (remoteBranches.length > 0) {
        output += '\n' + remoteBranches.join('\n');
      }
    }

    return { success: true, message: output || 'No branches yet.' };
  }

  // Delete branch
  if (args[0] === '-d' || args[0] === '-D') {
    const branchName = args[1];
    if (!branchName) {
      return { success: false, message: `fatal: branch name required` };
    }
    if (branchName === state.currentBranch) {
      return { success: false, message: `error: Cannot delete branch '${branchName}' checked out` };
    }
    if (!state.branches[branchName]) {
      return { success: false, message: `error: branch '${branchName}' not found.` };
    }

    const updatedBranches = { ...state.branches };
    delete updatedBranches[branchName];

    return {
      success: true,
      message: `Deleted branch ${branchName} (${args[0] === '-D' ? 'force' : 'was'}).`,
      stateChanges: { branches: updatedBranches },
    };
  }

  // Create branch
  const branchName = args[0];
  if (state.branches[branchName]) {
    return { success: false, message: `fatal: A branch named '${branchName}' already exists.` };
  }

  const currentBranchCommits = state.branches[state.currentBranch]?.commits || [];
  const colorIndex = Object.keys(state.branches).length % BRANCH_COLORS.length;

  const updatedBranches = {
    ...state.branches,
    [branchName]: {
      name: branchName,
      commits: [...currentBranchCommits],
      isActive: false,
      color: BRANCH_COLORS[colorIndex],
    },
  };

  return {
    success: true,
    message: `Created branch '${branchName}' (pointing to ${getLatestCommit(state)?.shortHash || 'starting point'})`,
    stateChanges: { branches: updatedBranches },
  };
}

function handleCheckout(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0) {
    return { success: false, message: 'error: no branch or file specified' };
  }

  // checkout -b <branch> (create + switch)
  if (args[0] === '-b') {
    const branchName = args[1];
    if (!branchName) {
      return { success: false, message: `fatal: branch name required with -b` };
    }
    if (state.branches[branchName]) {
      return { success: false, message: `fatal: A branch named '${branchName}' already exists.` };
    }

    const currentBranchCommits = state.branches[state.currentBranch]?.commits || [];
    const colorIndex = Object.keys(state.branches).length % BRANCH_COLORS.length;

    const updatedBranches = {
      ...state.branches,
      [branchName]: {
        name: branchName,
        commits: [...currentBranchCommits],
        isActive: true,
        color: BRANCH_COLORS[colorIndex],
      },
    };

    // Deactivate current branch
    if (state.branches[state.currentBranch]) {
      updatedBranches[state.currentBranch] = {
        ...updatedBranches[state.currentBranch],
        isActive: false,
      };
    }

    const latestCommit = getLatestCommit(state);

    return {
      success: true,
      message: `Switched to a new branch '${branchName}'\nBranch '${branchName}' set up to track local branch '${branchName}' from '${branchName}'.`,
      stateChanges: {
        branches: updatedBranches,
        currentBranch: branchName,
        HEAD: latestCommit?.hash || '',
        stagedFiles: [],
      },
    };
  }

  // checkout <branch>
  const branchName = args[0];
  if (!state.branches[branchName]) {
    return { success: false, message: `error: pathspec '${branchName}' did not match any file(s) known to git` };
  }

  if (branchName === state.currentBranch) {
    return { success: true, message: `Already on '${branchName}'` };
  }

  const updatedBranches = {
    ...state.branches,
    [branchName]: {
      ...state.branches[branchName],
      isActive: true,
    },
  };

  if (state.branches[state.currentBranch]) {
    updatedBranches[state.currentBranch] = {
      ...updatedBranches[state.currentBranch],
      isActive: false,
    };
  }

  const latestCommit = getLatestCommit(state, branchName);

  return {
    success: true,
    message: `Switched to branch '${branchName}'`,
    stateChanges: {
      branches: updatedBranches,
      currentBranch: branchName,
      HEAD: latestCommit?.hash || '',
      stagedFiles: [],
    },
  };
}

function handleSwitch(state: GitState, args: string[]): CommandResult {
  // Alias for checkout -c
  if (args[0] === '-c') {
    const result = handleCheckout(state, ['-b', ...args.slice(1)]);
    return result;
  }
  return handleCheckout(state, args);
}

function handlePush(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (!state.remotes['origin']) {
    return { success: false, message: 'fatal: No configured push destination.\nPlease specify the repository URL with:\n  git remote add origin <url>' };
  }

  // push --delete <branch>
  const deleteIndex = args.indexOf('--delete');
  if (deleteIndex !== -1) {
    const branchName = args[deleteIndex + 1];
    if (!branchName || !state.remotes['origin'].branches[branchName]) {
      return { success: false, message: `error: unable to delete '${branchName}': remote ref does not exist` };
    }
    const updatedRemotes = { ...state.remotes };
    const originBranches = { ...updatedRemotes['origin'].branches };
    delete originBranches[branchName];
    updatedRemotes['origin'] = { ...updatedRemotes['origin'], branches: originBranches };

    return {
      success: true,
      message: `- [deleted] origin/${branchName}`,
      stateChanges: { remotes: updatedRemotes },
    };
  }

  // push -u origin <branch>
  const hasU = args.includes('-u') || args.includes('--set-upstream');
  const filteredArgs = args.filter(a => a !== '-u' && a !== '--set-upstream');

  const remoteName = filteredArgs[0] || 'origin';
  const branchName = filteredArgs[1] || state.currentBranch;

  if (!state.remotes[remoteName]) {
    return { success: false, message: `fatal: '${remoteName}' does not appear to be a git repository` };
  }

  if (!state.branches[branchName]) {
    return { success: false, message: `error: src refspec ${branchName} does not match any` };
  }

  const branchCommits = state.branches[branchName].commits;
  const remoteCommits = state.remotes[remoteName].branches[branchName]?.commits || [];

  const newCommits = branchCommits.slice(remoteCommits.length);
  if (newCommits.length === 0) {
    return { success: true, message: `Everything up-to-date` };
  }

  const updatedRemotes = { ...state.remotes };
  updatedRemotes[remoteName] = {
    ...updatedRemotes[remoteName],
    branches: {
      ...updatedRemotes[remoteName].branches,
      [branchName]: {
        name: branchName,
        commits: [...branchCommits],
      },
    },
  };

  let message = `Enumerating objects: ${newCommits.length * 5}, done.\n`;
  message += `Counting objects: 100% (${newCommits.length * 5}/${newCommits.length * 5}), done.\n`;
  message += `Writing objects: 100% (${newCommits.length * 3}/${newCommits.length * 3}), done.\n`;
  message += `To ${state.remotes[remoteName].url}\n`;
  newCommits.forEach(c => {
    message += `   ${remoteCommits.length > 0 ? '' : '[new branch]'} ${c.shortHash} ${c.message}\n`;
  });

  if (hasU) {
    message += `Branch '${branchName}' set up to track remote branch '${branchName}' from '${remoteName}'.`;
  }

  return {
    success: true,
    message,
    stateChanges: { remotes: updatedRemotes },
  };
}

function handlePull(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  const remoteName = args[0] || 'origin';
  const branchName = args[1] || state.currentBranch;

  if (!state.remotes[remoteName]) {
    return { success: false, message: `fatal: '${remoteName}' does not appear to be a git repository` };
  }

  const remoteBranch = state.remotes[remoteName].branches[branchName];
  if (!remoteBranch) {
    return { success: false, message: `fatal: Couldn't find remote ref ${branchName}` };
  }

  const localCommits = state.branches[state.currentBranch]?.commits || [];
  const remoteCommits = remoteBranch.commits;

  const newCommits = remoteCommits.slice(localCommits.length);
  if (newCommits.length === 0) {
    return { success: true, message: 'Already up to date.' };
  }

  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = {
    ...updatedBranches[state.currentBranch],
    commits: [...localCommits, ...newCommits],
  };

  const latestCommit = newCommits[newCommits.length - 1];

  return {
    success: true,
    message: `From ${state.remotes[remoteName].url}\nUpdating ${localCommits.length > 0 ? localCommits[localCommits.length - 1].shortHash + '..' : ''}${latestCommit.shortHash}\nFast-forward\n${newCommits.map(c => ` ${c.message}`).join('\n')}\n ${newCommits.length} file(s) changed`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: latestCommit.hash,
    },
  };
}

function handleFetch(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  const remoteName = args[0] || 'origin';

  if (!state.remotes[remoteName]) {
    return { success: false, message: `fatal: '${remoteName}' does not appear to be a git repository` };
  }

  let message = `From ${state.remotes[remoteName].url}\n`;
  const branches = Object.keys(state.remotes[remoteName].branches);
  branches.forEach(b => {
    const commits = state.remotes[remoteName].branches[b].commits;
    if (commits.length > 0) {
      message += `   ${commits[commits.length - 1].shortHash} origin/${b} -> origin/${b}\n`;
    }
  });

  return {
    success: true,
    message: message.trim() || 'Everything up-to-date.',
  };
}

function handleMerge(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0) {
    return { success: false, message: 'usage: git merge <branch>' };
  }

  const branchName = args[0];

  if (branchName === state.currentBranch) {
    return { success: false, message: `Already up to date.` };
  }

  if (!state.branches[branchName]) {
    // Check if it's a remote branch
    const remoteMatch = branchName.match(/^origin\/(.+)$/);
    if (remoteMatch) {
      const localBranch = remoteMatch[1];
      if (!state.remotes['origin']?.branches[localBranch]) {
        return { success: false, message: `merge: ${branchName} - not something we can merge` };
      }
      return handleMerge(state, [localBranch]);
    }
    return { success: false, message: `merge: ${branchName} - not something we can merge` };
  }

  const currentBranch = state.branches[state.currentBranch];
  const sourceBranch = state.branches[branchName];

  if (!currentBranch || !sourceBranch) {
    return { success: false, message: 'fatal: branch not found' };
  }

  // Check if already up to date
  const currentLatest = currentBranch.commits[currentBranch.commits.length - 1];
  const sourceLatest = sourceBranch.commits[sourceBranch.commits.length - 1];

  if (currentLatest && sourceLatest && currentLatest.hash === sourceLatest.hash) {
    return { success: true, message: 'Already up to date.' };
  }

  // Find new commits from source
  const currentCommitHashes = new Set(currentBranch.commits.map(c => c.hash));
  const newCommits = sourceBranch.commits.filter(c => !currentCommitHashes.has(c.hash));

  if (newCommits.length === 0) {
    return { success: true, message: 'Already up to date.' };
  }

  // Simple fast-forward merge
  const parentHashes = [
    ...(currentLatest ? [currentLatest.hash] : []),
    ...(sourceLatest ? [sourceLatest.hash] : []),
  ];

  const mergeCommit = createCommit(
    `Merge branch '${branchName}' into ${state.currentBranch}`,
    state.currentBranch,
    parentHashes
  );

  const allCommits = [
    ...currentBranch.commits,
    ...newCommits,
    mergeCommit,
  ];

  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = {
    ...currentBranch,
    commits: allCommits,
  };

  return {
    success: true,
    message: `Merge made by the 'ort' strategy.\n${newCommits.map(c => ` ${c.shortHash} ${c.message}`).join('\n')}\n\nMerge commit: ${mergeCommit.shortHash}`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: mergeCommit.hash,
    },
  };
}

function handleStash(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0 || args[0] === 'push') {
    // Check if there are changes to stash
    if (state.stagedFiles.length === 0 && Object.keys(state.workspaceFiles).length === 0) {
      return { success: true, message: 'No local changes to save.' };
    }

    stashCounter++;
    const stashEntry = {
      id: `stash@{${stashCounter - 1}}`,
      message: args.includes('-m') ? args[args.indexOf('-m') + 1]?.replace(/"/g, '') || 'WIP' : 'WIP on ' + state.currentBranch,
      files: [...state.stagedFiles],
      timestamp: Date.now(),
    };

    return {
      success: true,
      message: `Saved working directory and index state ${stashEntry.message}`,
      stateChanges: {
        stash: [...state.stash, stashEntry],
        stagedFiles: [],
      },
    };
  }

  if (args[0] === 'pop') {
    if (state.stash.length === 0) {
      return { success: false, message: `error: No stash entries found.` };
    }

    const stashEntry = state.stash[state.stash.length - 1];
    const remainingStash = state.stash.slice(0, -1);

    return {
      success: true,
      message: `On branch ${state.currentBranch}\nChanges restored from ${stashEntry.id}:`,
      stateChanges: {
        stash: remainingStash,
        stagedFiles: stashEntry.files,
      },
    };
  }

  if (args[0] === 'list') {
    if (state.stash.length === 0) {
      return { success: true, message: '' };
    }

    const list = state.stash.map((s, i) => `stash@{${i}}: ${s.message}`).join('\n');
    return { success: true, message: list };
  }

  if (args[0] === 'drop') {
    if (state.stash.length === 0) {
      return { success: false, message: `error: No stash entries found.` };
    }
    const remainingStash = state.stash.slice(0, -1);
    return {
      success: true,
      message: `Dropped stash@{${state.stash.length - 1}}`,
      stateChanges: { stash: remainingStash },
    };
  }

  return { success: false, message: `error: unknown stash subcommand '${args[0]}'` };
}

function handleStatus(state: GitState): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  let output = `On branch ${state.currentBranch}\n`;

  if (state.remotes['origin']?.branches[state.currentBranch]) {
    const localCommits = state.branches[state.currentBranch]?.commits || [];
    const remoteCommits = state.remotes['origin'].branches[state.currentBranch]?.commits || [];
    if (localCommits.length > remoteCommits.length) {
      output += `Your branch is ahead of 'origin/${state.currentBranch}' by ${localCommits.length - remoteCommits.length} commit(s).\n`;
    } else if (remoteCommits.length > localCommits.length) {
      output += `Your branch is behind 'origin/${state.currentBranch}' by ${remoteCommits.length - localCommits.length} commit(s).\n`;
    } else {
      output += `Your branch is up to date with 'origin/${state.currentBranch}'.\n`;
    }
  }

  if (state.stagedFiles.length > 0) {
    output += '\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n';
    state.stagedFiles.forEach(f => {
      output += `\tnew file:   ${f}\n`;
    });
  }

  if (Object.keys(state.workspaceFiles).length > state.stagedFiles.filter(f => state.workspaceFiles[f]).length || state.stagedFiles.length === 0) {
    const unstaged = Object.keys(state.workspaceFiles).filter(f => !state.stagedFiles.includes(f));
    if (unstaged.length > 0) {
      output += '\nUntracked files:\n  (use "git add <file>..." to include)\n';
      unstaged.forEach(f => {
        output += `\t${f}\n`;
      });
    }
  }

  if (state.stagedFiles.length === 0 && Object.keys(state.workspaceFiles).length === 0) {
    output += 'nothing to commit, working tree clean\n';
  }

  return { success: true, message: output };
}

function handleLog(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  const isOneline = args.includes('--oneline');
  const isGraph = args.includes('--graph');
  const isAll = args.includes('--all');

  let allCommits: { commit: Commit; branch: string }[] = [];

  if (isAll) {
    Object.entries(state.branches).forEach(([name, branch]) => {
      branch.commits.forEach(commit => {
        if (!allCommits.find(c => c.commit.hash === commit.hash)) {
          allCommits.push({ commit, branch: name });
        }
      });
    });
  } else {
    const branch = state.branches[state.currentBranch];
    if (branch) {
      allCommits = branch.commits.map(c => ({ commit: c, branch: state.currentBranch }));
    }
  }

  if (allCommits.length === 0) {
    return { success: true, message: 'fatal: your current branch does not have any commits yet' };
  }

  let output = '';
  if (isOneline) {
    allCommits.forEach(({ commit, branch }) => {
      const branchLabel = branch !== state.currentBranch ? ` (${branch})` : '';
      output += `${commit.shortHash}${isGraph ? ' │ ' : ' '}${commit.message}${branchLabel}\n`;
    });
  } else {
    allCommits.forEach(({ commit, branch }) => {
      const branchLabel = branch !== state.currentBranch ? ` (${branch})` : '';
      output += `commit ${commit.hash}${branchLabel}\n`;
      output += `Author: Player <player@gitquest.dev>\n`;
      output += `Date:   ${new Date(commit.timestamp).toLocaleString()}\n\n`;
      output += `    ${commit.message}\n\n`;
    });
  }

  return { success: true, message: output.trimEnd() };
}

function handleDiff(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (state.stagedFiles.length === 0 && !args.includes('--staged')) {
    return { success: true, message: 'No differences found.' };
  }

  let output = '';
  if (args.includes('--staged') || state.stagedFiles.length > 0) {
    output += 'diff --git a/ ... b/ ...\n';
    state.stagedFiles.forEach(f => {
      output += `--- /dev/null\n`;
      output += `+++ b/${f}\n`;
      output += `@@ -0,0 +1,3 @@\n`;
      output += `+// content of ${f}\n`;
    });
  }

  return { success: true, message: output || 'No differences found.' };
}

function handleTag(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0) {
    if (state.tags.length === 0) {
      return { success: true, message: '' };
    }
    return { success: true, message: state.tags.join('\n') };
  }

  if (args[0] === '-a') {
    const tagName = args[1];
    const msgIndex = args.indexOf('-m');
    const tagMsg = msgIndex !== -1 ? args[msgIndex + 1]?.replace(/"/g, '') || '' : '';

    if (state.tags.includes(tagName)) {
      return { success: false, message: `fatal: tag '${tagName}' already exists` };
    }

    return {
      success: true,
      message: `Tagged commit ${getLatestCommit(state)?.shortHash || 'HEAD'} as ${tagName}${tagMsg ? ` (${tagMsg})` : ''}`,
      stateChanges: { tags: [...state.tags, tagName] },
    };
  }

  if (args[0].startsWith('v') || args[0].match(/^\d/)) {
    const tagName = args[0];

    if (state.tags.includes(tagName)) {
      return { success: false, message: `fatal: tag '${tagName}' already exists` };
    }

    return {
      success: true,
      message: `Tagged commit ${getLatestCommit(state)?.shortHash || 'HEAD'} as ${tagName}`,
      stateChanges: { tags: [...state.tags, tagName] },
    };
  }

  // Delete tag
  if (args[0] === '-d') {
    const tagName = args[1];
    if (!state.tags.includes(tagName)) {
      return { success: false, message: `error: tag '${tagName}' not found.` };
    }
    return {
      success: true,
      message: `Deleted tag '${tagName}'`,
      stateChanges: { tags: state.tags.filter(t => t !== tagName) },
    };
  }

  return { success: false, message: `usage: git tag [-a | -s | -u <key-id>] [-f] [-m <msg> | -F <file>] <tagname>` };
}

function handleRemote(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0 || args[0] === '-v') {
    const remotes = Object.entries(state.remotes);
    if (remotes.length === 0) {
      return { success: true, message: '' };
    }

    let output = '';
    remotes.forEach(([name, remote]) => {
      output += `${name}\t${remote.url} (fetch)\n`;
      output += `${name}\t${remote.url} (push)\n`;
    });
    return { success: true, message: output.trimEnd() };
  }

  if (args[0] === 'add') {
    const name = args[1] || 'origin';
    const url = args[2];

    if (!url) {
      return { success: false, message: 'usage: git remote add <name> <url>' };
    }

    if (state.remotes[name]) {
      return { success: false, message: `error: remote ${name} already exists.` };
    }

    const updatedRemotes = {
      ...state.remotes,
      [name]: {
        name,
        url,
        branches: {},
      },
    };

    return {
      success: true,
      message: '',
      stateChanges: { remotes: updatedRemotes },
    };
  }

  if (args[0] === 'set-url') {
    const name = args[1];
    const url = args[2];

    if (!state.remotes[name]) {
      return { success: false, message: `error: No such remote '${name}'` };
    }

    const updatedRemotes = {
      ...state.remotes,
      [name]: { ...state.remotes[name], url },
    };

    return {
      success: true,
      message: `Updated remote ${name} URL to ${url}`,
      stateChanges: { remotes: updatedRemotes },
    };
  }

  return { success: false, message: `usage: git remote [-v | add <name> <url> | set-url <name> <url>]` };
}

function handleReset(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0) {
    return { success: false, message: 'usage: git reset [--soft | --hard] HEAD~<n>' };
  }

  const isSoft = args.includes('--soft');
  const isHard = args.includes('--hard');

  const headMatch = args.find(a => a.startsWith('HEAD~'));
  if (!headMatch) {
    return { success: false, message: 'usage: git reset [--soft | --hard] HEAD~<n>' };
  }

  const n = parseInt(headMatch.replace('HEAD~', ''));
  if (isNaN(n) || n < 1) {
    return { success: false, message: 'fatal: ambiguous argument: unknown revision' };
  }

  const currentBranch = state.branches[state.currentBranch];
  if (!currentBranch || currentBranch.commits.length === 0) {
    return { success: false, message: 'fatal: no commits to reset' };
  }

  const newLength = Math.max(0, currentBranch.commits.length - n);
  const removedCommits = currentBranch.commits.slice(newLength);
  const keptCommits = currentBranch.commits.slice(0, newLength);

  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = {
    ...currentBranch,
    commits: keptCommits,
  };

  const latestCommit = keptCommits.length > 0 ? keptCommits[keptCommits.length - 1] : null;

  if (isHard) {
    return {
      success: true,
      message: `HEAD is now at ${latestCommit?.shortHash || 'initial commit'} ${latestCommit?.message || ''}`,
      stateChanges: {
        branches: updatedBranches,
        HEAD: latestCommit?.hash || '',
        stagedFiles: [],
      },
    };
  }

  // soft reset - keep changes staged
  return {
    success: true,
    message: `Unstaged ${removedCommits.length} commit(s). Changes preserved.`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: latestCommit?.hash || '',
      stagedFiles: isSoft ? state.stagedFiles : [],
    },
  };
}

function handleRevert(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0) {
    return { success: false, message: 'usage: git revert <commit-hash>' };
  }

  const hashArg = args[0];
  let targetCommit: Commit | null = null;

  // Find the commit
  Object.values(state.branches).forEach(branch => {
    const found = branch.commits.find(c => c.hash.startsWith(hashArg) || c.shortHash === hashArg);
    if (found) targetCommit = found;
  });

  if (!targetCommit) {
    return { success: false, message: `fatal: bad revision '${hashArg}'` };
  }

  const parentCommit = getLatestCommit(state);
  const revertCommit = createCommit(
    `Revert "${targetCommit.message}"`,
    state.currentBranch,
    parentCommit ? [parentCommit.hash] : []
  );

  const currentBranch = state.branches[state.currentBranch];
  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = {
    ...currentBranch,
    commits: [...currentBranch.commits, revertCommit],
  };

  return {
    success: true,
    message: `[${state.currentBranch} ${revertCommit.shortHash}] Revert "${targetCommit.message}"\n 1 file changed`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: revertCommit.hash,
    },
  };
}

function handleShow(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  if (args.length === 0) {
    return { success: false, message: 'usage: git show <commit-hash>' };
  }

  const hashArg = args[0];
  let targetCommit: Commit | null = null;

  Object.values(state.branches).forEach(branch => {
    const found = branch.commits.find(c => c.hash.startsWith(hashArg) || c.shortHash === hashArg);
    if (found) targetCommit = found;
  });

  if (!targetCommit) {
    return { success: false, message: `fatal: bad revision '${hashArg}'` };
  }

  return {
    success: true,
    message: `commit ${targetCommit.hash}\nAuthor: Player <player@gitquest.dev>\nDate:   ${new Date(targetCommit.timestamp).toLocaleString()}\n\n    ${targetCommit.message}`,
  };
}
