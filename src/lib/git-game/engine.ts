import { GitState, CommandResult, Commit, BRANCH_COLORS } from './types';

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

function createCommit(message: string, branch: string, files: Record<string, string>, parentHashes: string[] = []): Commit {
  const { hash, shortHash } = generateHash();
  return {
    hash,
    shortHash,
    message,
    branch,
    timestamp: Date.now(),
    parents: parentHashes,
    files: { ...files }, // snapshot of files at this commit
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
    committedFiles: [],
    stash: [],
    tags: [],
    HEAD: '',
  };
}

export function processCommand(state: GitState, command: string): CommandResult {
  const trimmed = command.trim();
  if (!trimmed) return { success: false, message: '' };

  const parts = trimmed.split(/\s+/);

  // Shell commands (non-git)
  switch (parts[0]) {
    case 'touch':    return handleTouch(state, parts.slice(1));
    case 'echo':     return handleEcho(state, parts.slice(1));
    case 'cat':      return handleCat(state, parts.slice(1));
    case 'ls':       return handleLs(state, parts.slice(1));
    case 'mkdir':    return handleMkdir(state, parts.slice(1));
    case 'rm':       return handleRm(state, parts.slice(1));
    case 'pwd':      return { success: true, message: '/home/agent/project' };
    case 'clear':    return { success: true, message: '__CLEAR__' };
    case 'help':     return handleHelp();
  }

  // Git commands
  if (parts[0] !== 'git') {
    return { success: false, message: `bash: ${parts[0]}: command not found.\n\nType 'help' for available commands.` };
  }

  if (parts.length === 1) {
    return {
      success: false,
      message: `usage: git <command> [<args>]\n\nThese are common Git commands:\n  init         Initialize a new repository\n  clone        Clone a repository\n  add          Add file contents to the index\n  commit       Record changes to the repository\n  branch       List, create, or delete branches\n  checkout     Switch branches or restore working tree\n  push         Update remote refs\n  pull         Fetch from and integrate with another repo\n  merge        Join two or more development histories\n  stash        Stash changes\n  status        Show the working tree status\n  log          Show commit logs\n  diff         Show changes\n  tag          Create, list, delete or verify tags\n  remote       Manage set of tracked repositories\n  fetch        Download objects and refs from another repository\n  reset        Reset current HEAD to the specified state\n  revert       Revert some existing commits\n\nShell commands: touch, echo, cat, ls, mkdir, rm, pwd, clear, help`
    };
  }

  const args = parts.slice(2);
  const subcommand = parts[1];

  switch (subcommand) {
    case 'init':      return handleInit(state);
    case 'clone':     return handleClone(state, args);
    case 'add':       return handleAdd(state, args);
    case 'commit':    return handleCommit(state, args);
    case 'branch':    return handleBranch(state, args);
    case 'checkout':  return handleCheckout(state, args);
    case 'switch':    return handleSwitch(state, args);
    case 'push':      return handlePush(state, args);
    case 'pull':      return handlePull(state, args);
    case 'fetch':     return handleFetch(state, args);
    case 'merge':     return handleMerge(state, args);
    case 'stash':     return handleStash(state, args);
    case 'status':    return handleStatus(state);
    case 'log':       return handleLog(state, args);
    case 'diff':      return handleDiff(state, args);
    case 'tag':       return handleTag(state, args);
    case 'remote':    return handleRemote(state, args);
    case 'reset':     return handleReset(state, args);
    case 'revert':    return handleRevert(state, args);
    case 'show':      return handleShow(state, args);
    default:
      return { success: false, message: `git: '${subcommand}' is not a git command. See 'git --help'.` };
  }
}

// =============================================
// SHELL COMMANDS
// =============================================

function handleTouch(state: GitState, args: string[]): CommandResult {
  if (args.length === 0) {
    return { success: false, message: 'touch: missing file operand' };
  }

  const newFiles = { ...state.workspaceFiles };
  const created: string[] = [];

  for (const arg of args) {
    if (arg.startsWith('-')) continue; // skip flags
    if (newFiles[arg] !== undefined) continue; // already exists
    newFiles[arg] = ''; // create empty file
    created.push(arg);
  }

  if (created.length === 0) {
    return { success: true, message: '' }; // touch existing files silently
  }

  return {
    success: true,
    message: `Created file(s): ${created.map(f => `'${f}'`).join(', ')}`,
    stateChanges: { workspaceFiles: newFiles },
  };
}

function handleEcho(state: GitState, args: string[]): CommandResult {
  if (args.length === 0) {
    return { success: true, message: '' };
  }

  const fullArgs = args.join(' ');

  // echo "content" > file
  const writeMatch = fullArgs.match(/^(.*?)\s*>\s*(\S+)$/);
  // echo "content" >> file
  const appendMatch = fullArgs.match(/^(.*?)\s*>>\s*(\S+)$/);

  if (writeMatch) {
    const content = writeMatch[1].replace(/^["']|["']$/g, '');
    const file = writeMatch[2];
    const newFiles = { ...state.workspaceFiles, [file]: content + '\n' };
    return {
      success: true,
      message: `Written to '${file}'`,
      stateChanges: { workspaceFiles: newFiles },
    };
  }

  if (appendMatch) {
    const content = appendMatch[1].replace(/^["']|["']$/g, '');
    const file = appendMatch[2];
    const existing = state.workspaceFiles[file] || '';
    const newFiles = { ...state.workspaceFiles, [file]: existing + content + '\n' };
    return {
      success: true,
      message: `Appended to '${file}'`,
      stateChanges: { workspaceFiles: newFiles },
    };
  }

  // just echo
  return { success: true, message: fullArgs.replace(/^["']|["']$/g, '') };
}

function handleCat(state: GitState, args: string[]): CommandResult {
  if (args.length === 0) {
    return { success: false, message: 'cat: missing file operand' };
  }

  const outputs: string[] = [];
  for (const file of args) {
    if (file.startsWith('-')) continue;
    if (!state.workspaceFiles[file]) {
      return { success: false, message: `cat: ${file}: No such file or directory` };
    }
    outputs.push(state.workspaceFiles[file]);
  }

  return { success: true, message: outputs.join('\n') };
}

function handleLs(state: GitState, args: string[]): CommandResult {
  const files = Object.keys(state.workspaceFiles).sort();
  if (files.length === 0) {
    return { success: true, message: '(empty directory)' };
  }
  return { success: true, message: files.join('  ') };
}

function handleMkdir(state: GitState, args: string[]): CommandResult {
  if (args.length === 0) {
    return { success: false, message: 'mkdir: missing operand' };
  }

  // In our simplified model, directories are tracked as files with /
  const newFiles = { ...state.workspaceFiles };
  for (const dir of args) {
    if (dir.startsWith('-')) continue;
    const dirPath = dir.endsWith('/') ? dir : dir + '/';
    // Create a .gitkeep-style marker
    newFiles[dirPath + '.gitkeep'] = '';
  }

  return {
    success: true,
    message: `Created directory(s)`,
    stateChanges: { workspaceFiles: newFiles },
  };
}

function handleRm(state: GitState, args: string[]): CommandResult {
  if (args.length === 0) {
    return { success: false, message: 'rm: missing operand' };
  }

  const flags = args.filter(a => a.startsWith('-'));
  const targets = args.filter(a => !a.startsWith('-'));
  const newFiles = { ...state.workspaceFiles };
  const removed: string[] = [];

  for (const target of targets) {
    if (newFiles[target] !== undefined) {
      delete newFiles[target];
      removed.push(target);
    }
  }

  if (removed.length === 0) {
    return { success: false, message: `rm: cannot remove '${targets[0]}': No such file or directory` };
  }

  // Also remove from staged if present
  const newStaged = state.stagedFiles.filter(f => !removed.includes(f));

  return {
    success: true,
    message: `Removed: ${removed.join(', ')}`,
    stateChanges: { workspaceFiles: newFiles, stagedFiles: newStaged },
  };
}

function handleHelp(): CommandResult {
  return {
    success: true,
    message: `Available commands:

Git:
  git init                    Initialize a new repo
  git clone <url>             Clone a remote repo
  git add <file>              Stage a file
  git add .                   Stage all files
  git commit -m "msg"         Commit staged changes
  git status                  Show working tree status
  git log [--oneline]         Show commit history
  git diff                    Show changes
  git branch                  List branches
  git branch <name>           Create branch
  git checkout <branch>       Switch branch
  git checkout -b <branch>    Create + switch branch
  git merge <branch>          Merge branch
  git push origin <branch>    Push to remote
  git pull origin <branch>    Pull from remote
  git fetch origin            Fetch remote changes
  git stash                   Stash current changes
  git stash pop               Restore stashed changes
  git tag <name>              Create a tag
  git remote add origin <url> Add remote
  git reset --soft HEAD~1     Undo last commit (keep changes)
  git reset --hard HEAD~1     Undo last commit (discard changes)

Shell (for file operations):
  touch <file>                Create an empty file
  echo "text" > <file>        Write text to a file
  echo "text" >> <file>       Append text to a file
  cat <file>                  Display file contents
  ls                          List files in directory
  mkdir <dir>                 Create a directory
  rm <file>                   Remove a file
  pwd                         Print working directory
  clear                       Clear terminal`,
  };
}

// =============================================
// GIT COMMANDS
// =============================================

function handleInit(state: GitState): CommandResult {
  if (state.initialized) {
    return { success: false, message: 'Reinitialized existing Git repository in .git/' };
  }
  return {
    success: true,
    message: 'Initialized empty Git repository in /home/agent/project/.git/\nCreated default branch: main\n\nTip: Now create a file with: touch <filename>',
    stateChanges: {
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
    },
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
  const readme = '# ' + folderName + '\n\nWelcome to ' + folderName + '.';

  const initialCommit = createCommit('Initial commit', 'main', { 'README.md': readme });

  return {
    success: true,
    message: `Cloning into '${folderName}'...\nremote: Enumerating objects: 42, done.\nremote: Counting objects: 100% (42/42), done.\nReceiving objects: 100% (42/42), done.\nResolving deltas: 100% (20/20), done.\n\nFiles cloned:\n  README.md`,
    stateChanges: {
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
      workspaceFiles: { 'README.md': readme },
      committedFiles: ['README.md'],
      stagedFiles: [],
      tags: [],
      stash: [],
    },
  };
}

function handleAdd(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository (or any of the parent directories): .git' };
  }

  if (args.length === 0) {
    return { success: false, message: 'Nothing specified, nothing added.\n\nusage: git add [--] <pathspec>...' };
  }

  if (args[0] === '.') {
    // Stage ALL files in workspace that are not already committed and unchanged
    const allFiles = Object.keys(state.workspaceFiles);
    if (allFiles.length === 0) {
      return { success: false, message: 'nothing to commit, working tree clean\n\n(use "touch <filename>" to create files first)' };
    }

    const newStaged = [...new Set([...state.stagedFiles, ...allFiles])];
    return {
      success: true,
      message: `Staged ${allFiles.length} file(s):\n${allFiles.map(f => `  new file:   ${f}`).join('\n')}`,
      stateChanges: { stagedFiles: newStaged },
    };
  }

  const filesToAdd = args.filter(f => !f.startsWith('-'));
  const existingFiles: string[] = [];
  const missingFiles: string[] = [];

  for (const f of filesToAdd) {
    if (state.workspaceFiles[f] !== undefined) {
      existingFiles.push(f);
    } else {
      missingFiles.push(f);
    }
  }

  if (missingFiles.length > 0 && existingFiles.length === 0) {
    return { success: false, message: `fatal: pathspec '${missingFiles.join(', ')}' did not match any files\n\n  Files do not exist. Create them first with: touch ${missingFiles.join(' ')}` };
  }

  const newStaged = [...new Set([...state.stagedFiles, ...existingFiles])];

  let message = '';
  if (existingFiles.length > 0) {
    message += `Staged ${existingFiles.length} file(s):\n${existingFiles.map(f => `  new file:   ${f}`).join('\n')}`;
  }
  if (missingFiles.length > 0) {
    message += `\n\nwarning: skipped (not found): ${missingFiles.join(', ')}`;
  }

  return {
    success: existingFiles.length > 0,
    message,
    stateChanges: { stagedFiles: newStaged },
  };
}

function handleCommit(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }

  const msgIndex = args.indexOf('-m');
  if (msgIndex === -1 || msgIndex + 1 >= args.length) {
    return { success: false, message: 'error: switch `m\' requires a value\nusage: git commit -m "commit message"' };
  }

  const message = args[msgIndex + 1].replace(/^["']|["']$/g, '');

  if (state.stagedFiles.length === 0) {
    return {
      success: false,
      message: 'nothing to commit, working tree clean\n\nNo files are staged. Use:\n  1. touch <filename>    — create a file\n  2. git add <filename>  — stage the file\n  3. git commit -m "msg" — commit it',
    };
  }

  const parentCommit = getLatestCommit(state);

  // Build the file snapshot for this commit
  const commitFiles: Record<string, string> = {};
  if (parentCommit) {
    // Start with files from parent commit
    Object.assign(commitFiles, parentCommit.files);
  }
  // Apply staged files from workspace
  for (const f of state.stagedFiles) {
    if (state.workspaceFiles[f] !== undefined) {
      commitFiles[f] = state.workspaceFiles[f];
    }
  }

  const commit = createCommit(
    message,
    state.currentBranch,
    commitFiles,
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

  const newCommittedFiles = Object.keys(commitFiles);
  const stagedFileList = state.stagedFiles;

  return {
    success: true,
    message: `[${state.currentBranch} ${commit.shortHash}] ${message}\n ${stagedFileList.length} file(s) changed, ${stagedFileList.length} insertion(s)`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: commit.hash,
      stagedFiles: [],
      committedFiles: newCommittedFiles,
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
    if (!branchName) return { success: false, message: `fatal: branch name required` };
    if (branchName === state.currentBranch) return { success: false, message: `error: Cannot delete branch '${branchName}' checked out` };
    if (!state.branches[branchName]) return { success: false, message: `error: branch '${branchName}' not found.` };

    const updatedBranches = { ...state.branches };
    delete updatedBranches[branchName];
    return { success: true, message: `Deleted branch ${branchName} (${args[0] === '-D' ? 'force' : 'was'}).`, stateChanges: { branches: updatedBranches } };
  }

  // Create branch
  const branchName = args[0];
  if (state.branches[branchName]) {
    return { success: false, message: `fatal: A branch named '${branchName}' already exists.` };
  }

  const currentBranchCommits = state.branches[state.currentBranch]?.commits || [];
  const colorIndex = Object.keys(state.branches).length % BRANCH_COLORS.length;

  return {
    success: true,
    message: `Created branch '${branchName}' (pointing to ${getLatestCommit(state)?.shortHash || 'starting point'})`,
    stateChanges: {
      branches: {
        ...state.branches,
        [branchName]: {
          name: branchName,
          commits: [...currentBranchCommits],
          isActive: false,
          color: BRANCH_COLORS[colorIndex],
        },
      },
    },
  };
}

function handleCheckout(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) {
    return { success: false, message: 'fatal: not a git repository' };
  }
  if (args.length === 0) {
    return { success: false, message: 'error: no branch or file specified' };
  }

  // checkout -b <branch>
  if (args[0] === '-b') {
    const branchName = args[1];
    if (!branchName) return { success: false, message: `fatal: branch name required with -b` };
    if (state.branches[branchName]) return { success: false, message: `fatal: A branch named '${branchName}' already exists.` };

    const currentBranchCommits = state.branches[state.currentBranch]?.commits || [];
    const colorIndex = Object.keys(state.branches).length % BRANCH_COLORS.length;
    const latestCommit = getLatestCommit(state);

    // When switching branches, update workspace to match the branch's file state
    const newWorkspaceFiles = latestCommit ? { ...latestCommit.files } : {};

    const updatedBranches = {
      ...state.branches,
      [branchName]: {
        name: branchName,
        commits: [...currentBranchCommits],
        isActive: true,
        color: BRANCH_COLORS[colorIndex],
      },
    };

    if (state.branches[state.currentBranch]) {
      updatedBranches[state.currentBranch] = { ...updatedBranches[state.currentBranch], isActive: false };
    }

    return {
      success: true,
      message: `Switched to a new branch '${branchName}'`,
      stateChanges: {
        branches: updatedBranches,
        currentBranch: branchName,
        HEAD: latestCommit?.hash || '',
        stagedFiles: [],
        workspaceFiles: newWorkspaceFiles,
        committedFiles: Object.keys(newWorkspaceFiles),
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

  const latestCommit = getLatestCommit(state, branchName);
  const newWorkspaceFiles = latestCommit ? { ...latestCommit.files } : {};

  const updatedBranches = {
    ...state.branches,
    [branchName]: { ...state.branches[branchName], isActive: true },
  };
  if (state.branches[state.currentBranch]) {
    updatedBranches[state.currentBranch] = { ...updatedBranches[state.currentBranch], isActive: false };
  }

  return {
    success: true,
    message: `Switched to branch '${branchName}'${Object.keys(newWorkspaceFiles).length > 0 ? `\nWorkspace updated: ${Object.keys(newWorkspaceFiles).join(', ')}` : ''}`,
    stateChanges: {
      branches: updatedBranches,
      currentBranch: branchName,
      HEAD: latestCommit?.hash || '',
      stagedFiles: [],
      workspaceFiles: newWorkspaceFiles,
      committedFiles: Object.keys(newWorkspaceFiles),
    },
  };
}

function handleSwitch(state: GitState, args: string[]): CommandResult {
  if (args[0] === '-c') return handleCheckout(state, ['-b', ...args.slice(1)]);
  return handleCheckout(state, args);
}

function handlePush(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };
  if (!state.remotes['origin']) return { success: false, message: 'fatal: No configured push destination.\nPlease specify the repository URL with:\n  git remote add origin <url>' };

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
    return { success: true, message: `- [deleted] origin/${branchName}`, stateChanges: { remotes: updatedRemotes } };
  }

  const hasU = args.includes('-u') || args.includes('--set-upstream');
  const filteredArgs = args.filter(a => a !== '-u' && a !== '--set-upstream');
  const remoteName = filteredArgs[0] || 'origin';
  const branchName = filteredArgs[1] || state.currentBranch;

  if (!state.remotes[remoteName]) return { success: false, message: `fatal: '${remoteName}' does not appear to be a git repository` };
  if (!state.branches[branchName]) return { success: false, message: `error: src refspec ${branchName} does not match any` };

  const branchCommits = state.branches[branchName].commits;
  const remoteCommits = state.remotes[remoteName].branches[branchName]?.commits || [];
  const newCommits = branchCommits.slice(remoteCommits.length);

  if (newCommits.length === 0) return { success: true, message: `Everything up-to-date` };

  const updatedRemotes = { ...state.remotes };
  updatedRemotes[remoteName] = {
    ...updatedRemotes[remoteName],
    branches: {
      ...updatedRemotes[remoteName].branches,
      [branchName]: { name: branchName, commits: [...branchCommits] },
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

  return { success: true, message, stateChanges: { remotes: updatedRemotes } };
}

function handlePull(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };

  const remoteName = args[0] || 'origin';
  const branchName = args[1] || state.currentBranch;

  if (!state.remotes[remoteName]) return { success: false, message: `fatal: '${remoteName}' does not appear to be a git repository` };
  const remoteBranch = state.remotes[remoteName].branches[branchName];
  if (!remoteBranch) return { success: false, message: `fatal: Couldn't find remote ref ${branchName}` };

  const localCommits = state.branches[state.currentBranch]?.commits || [];
  const remoteCommits = remoteBranch.commits;
  const newCommits = remoteCommits.slice(localCommits.length);

  if (newCommits.length === 0) return { success: true, message: 'Already up to date.' };

  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = {
    ...updatedBranches[state.currentBranch],
    commits: [...localCommits, ...newCommits],
  };
  const latestCommit = newCommits[newCommits.length - 1];

  // Update workspace with files from the latest pulled commit
  const newWorkspaceFiles = { ...latestCommit.files };

  return {
    success: true,
    message: `From ${state.remotes[remoteName].url}\nUpdating ${localCommits.length > 0 ? localCommits[localCommits.length - 1].shortHash + '..' : ''}${latestCommit.shortHash}\nFast-forward\n${newCommits.map(c => ` ${c.message}`).join('\n')}\n ${Object.keys(newWorkspaceFiles).length} file(s) changed`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: latestCommit.hash,
      workspaceFiles: newWorkspaceFiles,
      committedFiles: Object.keys(newWorkspaceFiles),
    },
  };
}

function handleFetch(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };
  const remoteName = args[0] || 'origin';
  if (!state.remotes[remoteName]) return { success: false, message: `fatal: '${remoteName}' does not appear to be a git repository` };

  let message = `From ${state.remotes[remoteName].url}\n`;
  const branches = Object.keys(state.remotes[remoteName].branches);
  branches.forEach(b => {
    const commits = state.remotes[remoteName].branches[b].commits;
    if (commits.length > 0) {
      message += `   ${commits[commits.length - 1].shortHash} origin/${b} -> origin/${b}\n`;
    }
  });
  return { success: true, message: message.trim() || 'Everything up-to-date.' };
}

function handleMerge(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };
  if (args.length === 0) return { success: false, message: 'usage: git merge <branch>' };

  const branchName = args[0];
  if (branchName === state.currentBranch) return { success: false, message: `Already up to date.` };

  if (!state.branches[branchName]) {
    const remoteMatch = branchName.match(/^origin\/(.+)$/);
    if (remoteMatch) {
      if (!state.remotes['origin']?.branches[remoteMatch[1]]) {
        return { success: false, message: `merge: ${branchName} - not something we can merge` };
      }
      return handleMerge(state, [remoteMatch[1]]);
    }
    return { success: false, message: `merge: ${branchName} - not something we can merge` };
  }

  const currentBranch = state.branches[state.currentBranch];
  const sourceBranch = state.branches[branchName];
  if (!currentBranch || !sourceBranch) return { success: false, message: 'fatal: branch not found' };

  const currentLatest = currentBranch.commits[currentBranch.commits.length - 1];
  const sourceLatest = sourceBranch.commits[sourceBranch.commits.length - 1];

  if (currentLatest && sourceLatest && currentLatest.hash === sourceLatest.hash) {
    return { success: true, message: 'Already up to date.' };
  }

  const currentCommitHashes = new Set(currentBranch.commits.map(c => c.hash));
  const newCommits = sourceBranch.commits.filter(c => !currentCommitHashes.has(c.hash));
  if (newCommits.length === 0) return { success: true, message: 'Already up to date.' };

  // Merge: combine files from both branches
  const mergedFiles: Record<string, string> = {};
  if (currentLatest) Object.assign(mergedFiles, currentLatest.files);
  if (sourceLatest) Object.assign(mergedFiles, sourceLatest.files);

  const mergeCommit = createCommit(
    `Merge branch '${branchName}' into ${state.currentBranch}`,
    state.currentBranch,
    mergedFiles,
    [currentLatest?.hash || '', sourceLatest?.hash || ''].filter(Boolean)
  );

  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = {
    ...currentBranch,
    commits: [...currentBranch.commits, ...newCommits, mergeCommit],
  };

  return {
    success: true,
    message: `Merge made by the 'ort' strategy.\n${newCommits.map(c => ` ${c.shortHash} ${c.message}`).join('\n')}\n\nMerge commit: ${mergeCommit.shortHash}`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: mergeCommit.hash,
      workspaceFiles: mergedFiles,
      committedFiles: Object.keys(mergedFiles),
    },
  };
}

function handleStash(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };

  if (args.length === 0 || args[0] === 'push') {
    if (state.stagedFiles.length === 0 && Object.keys(state.workspaceFiles).length === 0) {
      return { success: false, message: 'No local changes to save.\n\nCreate or modify files first with: touch <filename>' };
    }

    stashCounter++;
    const stashEntry = {
      id: `stash@{${stashCounter - 1}}`,
      message: args.includes('-m') ? args[args.indexOf('-m') + 1]?.replace(/"/g, '') || 'WIP' : 'WIP on ' + state.currentBranch,
      stagedFiles: [...state.stagedFiles],
      workspaceFiles: { ...state.workspaceFiles },
      timestamp: Date.now(),
    };

    return {
      success: true,
      message: `Saved working directory and index state ${stashEntry.message}\nStashed ${Object.keys(state.workspaceFiles).length} file(s)`,
      stateChanges: {
        stash: [...state.stash, stashEntry],
        stagedFiles: [],
        workspaceFiles: {},
      },
    };
  }

  if (args[0] === 'pop') {
    if (state.stash.length === 0) return { success: false, message: `error: No stash entries found.` };
    const stashEntry = state.stash[state.stash.length - 1];
    const remainingStash = state.stash.slice(0, -1);

    return {
      success: true,
      message: `On branch ${state.currentBranch}\nRestored ${Object.keys(stashEntry.workspaceFiles).length} file(s) from ${stashEntry.id}:\n${Object.keys(stashEntry.workspaceFiles).map(f => `  ${f}`).join('\n')}`,
      stateChanges: {
        stash: remainingStash,
        stagedFiles: stashEntry.stagedFiles,
        workspaceFiles: stashEntry.workspaceFiles,
      },
    };
  }

  if (args[0] === 'list') {
    if (state.stash.length === 0) return { success: true, message: '' };
    return { success: true, message: state.stash.map((s, i) => `stash@{${i}}: ${s.message}`).join('\n') };
  }

  if (args[0] === 'drop') {
    if (state.stash.length === 0) return { success: false, message: `error: No stash entries found.` };
    return {
      success: true,
      message: `Dropped stash@{${state.stash.length - 1}}`,
      stateChanges: { stash: state.stash.slice(0, -1) },
    };
  }

  return { success: false, message: `error: unknown stash subcommand '${args[0]}'` };
}

function handleStatus(state: GitState): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };

  let output = `On branch ${state.currentBranch}\n`;

  // Remote status
  if (state.remotes['origin']?.branches[state.currentBranch]) {
    const localCommits = state.branches[state.currentBranch]?.commits || [];
    const remoteCommits = state.remotes['origin'].branches[state.currentBranch]?.commits || [];
    if (localCommits.length > remoteCommits.length) {
      output += `Your branch is ahead of 'origin/${state.currentBranch}' by ${localCommits.length - remoteCommits.length} commit(s).\n`;
    } else if (remoteCommits.length > localCommits.length) {
      output += `Your branch is behind 'origin/${state.currentBranch}' by ${remoteCommits.length - localCommits.length} commit(s).\n`;
      output += `  (use "git pull" to update your local branch)\n`;
    } else {
      output += `Your branch is up to date with 'origin/${state.currentBranch}'.\n`;
    }
  }

  // Staged changes
  if (state.stagedFiles.length > 0) {
    output += '\nChanges to be committed:\n  (use "git restore --staged <file>..." to unstage)\n';
    for (const f of state.stagedFiles) {
      const isTracked = state.committedFiles.includes(f);
      output += isTracked
        ? `\tmodified:   ${f}\n`
        : `\tnew file:   ${f}\n`;
    }
  }

  // Untracked files (files on disk that are not committed and not staged)
  const untracked = Object.keys(state.workspaceFiles).filter(f => !state.committedFiles.includes(f) && !state.stagedFiles.includes(f));

  if (untracked.length > 0) {
    output += '\nUntracked files:\n  (use "git add <file>..." to include in what will be committed)\n';
    for (const f of untracked) {
      output += `\t${f}\n`;
    }
  }

  // Clean state
  if (state.stagedFiles.length === 0 && untracked.length === 0) {
    output += 'nothing to commit, working tree clean\n';
  }

  return { success: true, message: output };
}

function handleLog(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };

  const isOneline = args.includes('--oneline');
  const isGraph = args.includes('--graph');
  const isAll = args.includes('--all');

  let allCommits: { commit: Commit; branch: string }[] = [];
  const seen = new Set<string>();

  if (isAll) {
    Object.entries(state.branches).forEach(([name, branch]) => {
      branch.commits.forEach(commit => {
        if (!seen.has(commit.hash)) {
          seen.add(commit.hash);
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
    return { success: true, message: 'fatal: your current branch does not have any commits yet\n\nCreate a file and make your first commit:\n  touch README.md\n  git add README.md\n  git commit -m "initial commit"' };
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
      output += `Author: Player <player@gitsikau.dev>\n`;
      output += `Date:   ${new Date(commit.timestamp).toLocaleString()}\n\n`;
      output += `    ${commit.message}\n\n`;
    });
  }

  return { success: true, message: output.trimEnd() };
}

function handleDiff(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };

  if (state.stagedFiles.length === 0 && !args.includes('--staged')) {
    return { success: true, message: 'No differences found.\n\n(nothing staged for commit — use "git add" to stage files)' };
  }

  let output = '';
  if (args.includes('--staged') || state.stagedFiles.length > 0) {
    for (const f of state.stagedFiles) {
      const content = state.workspaceFiles[f] || '';
      const lines = content.split('\n').filter(l => l.length > 0);
      output += `diff --git a/${f} b/${f}\n`;
      output += `--- /dev/null\n`;
      output += `+++ b/${f}\n`;
      output += `@@ -0,0 +1,${lines.length} @@\n`;
      lines.forEach(l => { output += `+${l}\n`; });
    }
  }

  return { success: true, message: output || 'No differences found.' };
}

function handleTag(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };

  if (args.length === 0) {
    if (state.tags.length === 0) return { success: true, message: '' };
    return { success: true, message: state.tags.join('\n') };
  }

  if (args[0] === '-a') {
    const tagName = args[1];
    const msgIndex = args.indexOf('-m');
    const tagMsg = msgIndex !== -1 ? args[msgIndex + 1]?.replace(/"/g, '') || '' : '';
    if (state.tags.includes(tagName)) return { success: false, message: `fatal: tag '${tagName}' already exists` };
    return {
      success: true,
      message: `Tagged commit ${getLatestCommit(state)?.shortHash || 'HEAD'} as ${tagName}${tagMsg ? ` (${tagMsg})` : ''}`,
      stateChanges: { tags: [...state.tags, tagName] },
    };
  }

  if (args[0].startsWith('v') || args[0].match(/^\d/)) {
    const tagName = args[0];
    if (state.tags.includes(tagName)) return { success: false, message: `fatal: tag '${tagName}' already exists` };
    return {
      success: true,
      message: `Tagged commit ${getLatestCommit(state)?.shortHash || 'HEAD'} as ${tagName}`,
      stateChanges: { tags: [...state.tags, tagName] },
    };
  }

  if (args[0] === '-d') {
    const tagName = args[1];
    if (!state.tags.includes(tagName)) return { success: false, message: `error: tag '${tagName}' not found.` };
    return { success: true, message: `Deleted tag '${tagName}'`, stateChanges: { tags: state.tags.filter(t => t !== tagName) } };
  }

  return { success: false, message: `usage: git tag [-a | -s | -u <key-id>] [-f] [-m <msg> | -F <file>] <tagname>` };
}

function handleRemote(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };

  if (args.length === 0 || args[0] === '-v') {
    const remotes = Object.entries(state.remotes);
    if (remotes.length === 0) return { success: true, message: '' };
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
    if (!url) return { success: false, message: 'usage: git remote add <name> <url>' };
    if (state.remotes[name]) return { success: false, message: `error: remote ${name} already exists.` };
    return {
      success: true,
      message: '',
      stateChanges: { remotes: { ...state.remotes, [name]: { name, url, branches: {} } } },
    };
  }

  if (args[0] === 'set-url') {
    const name = args[1];
    const url = args[2];
    if (!state.remotes[name]) return { success: false, message: `error: No such remote '${name}'` };
    return {
      success: true,
      message: `Updated remote ${name} URL to ${url}`,
      stateChanges: { remotes: { ...state.remotes, [name]: { ...state.remotes[name], url } } },
    };
  }

  return { success: false, message: `usage: git remote [-v | add <name> <url> | set-url <name> <url>]` };
}

function handleReset(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };
  if (args.length === 0) return { success: false, message: 'usage: git reset [--soft | --hard] HEAD~<n>' };

  const isSoft = args.includes('--soft');
  const isHard = args.includes('--hard');
  const headMatch = args.find(a => a.startsWith('HEAD~'));
  if (!headMatch) return { success: false, message: 'usage: git reset [--soft | --hard] HEAD~<n>' };

  const n = parseInt(headMatch.replace('HEAD~', ''));
  if (isNaN(n) || n < 1) return { success: false, message: 'fatal: ambiguous argument: unknown revision' };

  const currentBranch = state.branches[state.currentBranch];
  if (!currentBranch || currentBranch.commits.length === 0) return { success: false, message: 'fatal: no commits to reset' };

  const newLength = Math.max(0, currentBranch.commits.length - n);
  const removedCommits = currentBranch.commits.slice(newLength);
  const keptCommits = currentBranch.commits.slice(0, newLength);

  const updatedBranches = { ...state.branches };
  updatedBranches[state.currentBranch] = { ...currentBranch, commits: keptCommits };

  const latestCommit = keptCommits.length > 0 ? keptCommits[keptCommits.length - 1] : null;

  if (isHard) {
    // Hard reset: discard everything, go back to committed state
    const newWorkspaceFiles = latestCommit ? { ...latestCommit.files } : {};
    return {
      success: true,
      message: `HEAD is now at ${latestCommit?.shortHash || 'initial commit'} ${latestCommit?.message || ''}`,
      stateChanges: {
        branches: updatedBranches,
        HEAD: latestCommit?.hash || '',
        stagedFiles: [],
        workspaceFiles: newWorkspaceFiles,
        committedFiles: Object.keys(newWorkspaceFiles),
      },
    };
  }

  // Soft reset: keep changes staged
  return {
    success: true,
    message: `Unstaged ${removedCommits.length} commit(s). Changes preserved in staging area.\n\nUse "git status" to see preserved changes.`,
    stateChanges: {
      branches: updatedBranches,
      HEAD: latestCommit?.hash || '',
    },
  };
}

function handleRevert(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };
  if (args.length === 0) return { success: false, message: 'usage: git revert <commit-hash>' };

  const hashArg = args[0];
  let targetCommit: Commit | null = null;

  Object.values(state.branches).forEach(branch => {
    const found = branch.commits.find(c => c.hash.startsWith(hashArg) || c.shortHash === hashArg);
    if (found) targetCommit = found;
  });

  if (!targetCommit) return { success: false, message: `fatal: bad revision '${hashArg}'` };

  const parentCommit = getLatestCommit(state);
  const revertFiles = parentCommit ? { ...parentCommit.files } : {};
  const revertCommit = createCommit(
    `Revert "${targetCommit.message}"`,
    state.currentBranch,
    revertFiles,
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
    stateChanges: { branches: updatedBranches, HEAD: revertCommit.hash },
  };
}

function handleShow(state: GitState, args: string[]): CommandResult {
  if (!state.initialized) return { success: false, message: 'fatal: not a git repository' };
  if (args.length === 0) return { success: false, message: 'usage: git show <commit-hash>' };

  const hashArg = args[0];
  let targetCommit: Commit | null = null;

  Object.values(state.branches).forEach(branch => {
    const found = branch.commits.find(c => c.hash.startsWith(hashArg) || c.shortHash === hashArg);
    if (found) targetCommit = found;
  });

  if (!targetCommit) return { success: false, message: `fatal: bad revision '${hashArg}'` };

  return {
    success: true,
    message: `commit ${targetCommit.hash}\nAuthor: Player <player@gitsikau.dev>\nDate:   ${new Date(targetCommit.timestamp).toLocaleString()}\n\n    ${targetCommit.message}`,
  };
}
