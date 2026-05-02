'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Scenario, GitState, TerminalLine, BRANCH_COLORS } from '@/lib/git-game/types';
import { createInitialState, processCommand } from '@/lib/git-game/engine';
import { scenarios } from '@/lib/git-game/scenarios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Terminal, GitBranch, Trophy, Star, Zap, ChevronRight,
  Play, RotateCcw, Lightbulb, CheckCircle2, Circle,
  Lock, Unlock, Rocket, Shield, Database, Cpu,
  ArrowRight, Sparkles, Volume2, VolumeX,
} from 'lucide-react';

// ============ AUDIO ENGINE ============
function useSound() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const play = useCallback((type: 'success' | 'error' | 'typing' | 'complete' | 'levelup') => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.value = 0.08;

      switch (type) {
        case 'success':
          osc.frequency.value = 600;
          osc.type = 'sine';
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
          osc.start(); osc.stop(ctx.currentTime + 0.15);
          break;
        case 'error':
          osc.frequency.value = 200;
          osc.type = 'sawtooth';
          gain.gain.value = 0.05;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
          osc.start(); osc.stop(ctx.currentTime + 0.2);
          break;
        case 'complete':
          osc.frequency.value = 523;
          osc.type = 'sine';
          osc.start();
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(784, ctx.currentTime + 0.2);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
          osc.stop(ctx.currentTime + 0.4);
          break;
        case 'levelup':
          osc.frequency.value = 440;
          osc.type = 'sine';
          osc.start();
          osc.frequency.setValueAtTime(554, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(659, ctx.currentTime + 0.2);
          osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
          osc.stop(ctx.currentTime + 0.5);
          break;
        case 'typing':
          osc.frequency.value = 800 + Math.random() * 200;
          osc.type = 'square';
          gain.gain.value = 0.02;
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
          osc.start(); osc.stop(ctx.currentTime + 0.03);
          break;
      }
    } catch { /* silent fail */ }
  }, []);

  return { play };
}

// ============ MATRIX RAIN BACKGROUND ============
function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const chars = 'git commit push pull branch merge stash fetch clone tag add status log diff reset revert01';
    const fontSize = 14;
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(10, 14, 23, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#00ff4115';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" style={{ opacity: 0.4 }} />;
}

// ============ TERMINAL COMPONENT ============
function GameTerminal({
  history,
  onCommand,
  currentBranch,
}: {
  history: TerminalLine[];
  onCommand: (cmd: string) => void;
  currentBranch: string;
}) {
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setCmdHistory(prev => [input, ...prev]);
    setHistoryIdx(-1);
    onCommand(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(nextIdx);
      if (cmdHistory[nextIdx]) setInput(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(nextIdx);
      setInput(nextIdx >= 0 ? cmdHistory[nextIdx] : '');
    }
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-cyan-400';
      case 'system': return 'text-purple-400';
      case 'input': return 'text-gray-300';
      default: return 'text-gray-400';
    }
  };

  return (
    <div
      className="h-full flex flex-col bg-[#0a0e17] rounded-xl border border-green-900/30 overflow-hidden font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#0d1117] border-b border-green-900/30">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-green-500/70 text-xs tracking-wider">GITQUEST TERMINAL</span>
        </div>
        <GitBranch size={14} className="text-green-500/50" />
      </div>

      {/* Terminal Content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin">
        {history.map((line) => (
          <div key={line.id} className={`${getLineColor(line.type)} whitespace-pre-wrap break-all leading-relaxed`}>
            {line.type === 'input' ? (
              <span>
                <span className="text-green-500 font-bold">agent@gitquest</span>
                <span className="text-gray-500">:</span>
                <span className="text-cyan-500">{currentBranch}</span>
                <span className="text-gray-500">$ </span>
                <span className="text-white">{line.content}</span>
              </span>
            ) : (
              line.content
            )}
          </div>
        ))}
      </div>

      {/* Terminal Input */}
      <form onSubmit={handleSubmit} className="flex items-center px-4 py-3 border-t border-green-900/30 bg-[#0d1117]">
        <span className="text-green-500 font-bold mr-1">agent@gitquest</span>
        <span className="text-gray-500">:</span>
        <span className="text-cyan-500 mr-1">{currentBranch}</span>
        <span className="text-gray-500 mr-1">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-white outline-none caret-green-500 font-mono text-sm"
          placeholder="Type git command..."
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </div>
  );
}

// ============ BRANCH TREE VISUALIZER ============
function BranchTree({ gitState }: { gitState: GitState }) {
  const allCommits = useMemo(() => {
    const commits: { hash: string; shortHash: string; message: string; branch: string; color: string; timestamp: number }[] = [];
    const seenHashes = new Set<string>();

    Object.entries(gitState.branches).forEach(([name, branch]) => {
      branch.commits.forEach((c, idx) => {
        if (!seenHashes.has(c.hash)) {
          seenHashes.add(c.hash);
          commits.push({
            hash: c.hash,
            shortHash: c.shortHash,
            message: c.message,
            branch: name,
            color: branch.color,
            timestamp: c.timestamp,
          });
        }
      });
    });

    return commits.sort((a, b) => a.timestamp - b.timestamp);
  }, [gitState.branches]);

  const branches = Object.entries(gitState.branches);

  if (allCommits.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
        <div className="text-center">
          <GitBranch size={24} className="mx-auto mb-2 opacity-50" />
          <p>No commits yet</p>
          <p className="text-xs mt-1">Start by initializing a repo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Legend */}
      <div className="px-3 py-2 border-b border-gray-800/50 flex flex-wrap gap-x-3 gap-y-1">
        {branches.map(([name, branch]) => (
          <div key={name} className="flex items-center gap-1.5 text-xs">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: branch.color, boxShadow: name === gitState.currentBranch ? `0 0 6px ${branch.color}` : 'none' }}
            />
            <span className={name === gitState.currentBranch ? 'text-white font-bold' : 'text-gray-500'}>
              {name}
            </span>
            {name === gitState.currentBranch && <span className="text-[10px] text-green-500">←</span>}
          </div>
        ))}
        {gitState.tags.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-yellow-500">
            <Shield size={10} />
            <span>{gitState.tags[gitState.tags.length - 1]}</span>
          </div>
        )}
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin">
        {allCommits.map((commit, idx) => (
          <motion.div
            key={commit.hash}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="flex items-center gap-2 group"
          >
            {/* Branch line */}
            <div className="flex flex-col items-center w-6">
              {idx < allCommits.length - 1 && (
                <div
                  className="w-0.5 h-4"
                  style={{ backgroundColor: commit.color + '40' }}
                />
              )}
              <div
                className="w-3 h-3 rounded-full border-2 transition-transform group-hover:scale-125"
                style={{
                  borderColor: commit.color,
                  backgroundColor: commit.branch === gitState.currentBranch ? commit.color : 'transparent',
                  boxShadow: commit.branch === gitState.currentBranch ? `0 0 8px ${commit.color}40` : 'none',
                }}
              />
            </div>

            {/* Commit info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono" style={{ color: commit.color }}>
                  {commit.shortHash}
                </span>
                <span className="text-xs text-gray-300 truncate">
                  {commit.message}
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Tags */}
        {gitState.tags.length > 0 && (
          <div className="flex items-center gap-2 mt-2 pl-4">
            <div className="flex items-center gap-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5">
              <Shield size={10} className="text-yellow-500" />
              <span className="text-[10px] text-yellow-500 font-mono">
                {gitState.tags[gitState.tags.length - 1]}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ MISSION PANEL ============
function MissionPanel({
  scenario,
  gitState,
  history,
  onHint,
  hintIndex,
}: {
  scenario: Scenario;
  gitState: GitState;
  history: TerminalLine[];
  onHint: () => void;
  hintIndex: number;
}) {
  const [expanded, setExpanded] = useState(true);

  const objectives = scenario.objectives.map(obj => ({
    ...obj,
    completed: obj.check(gitState, history),
  }));

  const completedCount = objectives.filter(o => o.completed).length;
  const progress = (completedCount / objectives.length) * 100;

  return (
    <div className="h-full flex flex-col bg-[#0d1117]/90 rounded-xl border border-cyan-900/30 overflow-hidden">
      {/* Mission Header */}
      <div className="px-4 py-3 border-b border-cyan-900/30 bg-gradient-to-r from-cyan-900/20 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/30 rounded text-[10px] text-cyan-400 font-mono">
              MISSION {scenario.level}
            </div>
            <h3 className="text-white font-bold text-sm">{scenario.title}</h3>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <ChevronRight size={16} className={`transform transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>
        <p className="text-cyan-400/70 text-xs mt-1">{scenario.subtitle}</p>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 overflow-y-auto scrollbar-thin"
          >
            {/* Story */}
            <div className="px-4 py-3 border-b border-gray-800/50">
              <p className="text-gray-400 text-xs leading-relaxed">{scenario.story}</p>
            </div>

            {/* Objectives */}
            <div className="px-4 py-3 border-b border-gray-800/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase tracking-wider">Objectives</span>
                <span className="text-xs text-cyan-400 font-mono">{completedCount}/{objectives.length}</span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 bg-gray-800 rounded-full mb-3 overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-green-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              <div className="space-y-2">
                {objectives.map((obj, idx) => (
                  <motion.div
                    key={obj.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-start gap-2 p-2 rounded-lg transition-colors ${
                      obj.completed ? 'bg-green-500/5 border border-green-500/20' : 'bg-gray-800/30 border border-transparent'
                    }`}
                  >
                    {obj.completed ? (
                      <CheckCircle2 size={14} className="text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <Circle size={14} className="text-gray-600 mt-0.5 shrink-0" />
                    )}
                    <span className={`text-xs leading-relaxed ${obj.completed ? 'text-green-400 line-through' : 'text-gray-300'}`}>
                      {obj.description}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Commands Reference */}
            <div className="px-4 py-3 border-b border-gray-800/50">
              <span className="text-xs text-gray-500 uppercase tracking-wider block mb-2">Commands</span>
              <div className="flex flex-wrap gap-1.5">
                {scenario.commands.map(cmd => (
                  <span key={cmd} className="px-2 py-1 bg-gray-800/60 rounded text-[10px] text-green-400 font-mono border border-gray-700/50">
                    {cmd}
                  </span>
                ))}
              </div>
            </div>

            {/* Hints */}
            <div className="px-4 py-3">
              <button
                onClick={onHint}
                className="flex items-center gap-2 text-xs text-yellow-500/70 hover:text-yellow-400 transition-colors group"
              >
                <Lightbulb size={14} className="group-hover:animate-pulse" />
                <span>Show Hint ({hintIndex}/{scenario.hints.length})</span>
              </button>
              {hintIndex > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 space-y-2"
                >
                  {scenario.hints.slice(0, hintIndex).map((hint, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-500/5 rounded-lg border border-yellow-500/10">
                      <Lightbulb size={12} className="text-yellow-500 mt-0.5 shrink-0" />
                      <span className="text-xs text-yellow-400/80 font-mono">{hint}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ START SCREEN ============
function StartScreen({ onStart, onContinue, hasProgress }: { onStart: () => void; onContinue: () => void; hasProgress: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <MatrixRain />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-lg mx-auto px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, type: 'spring', bounce: 0.5 }}
          className="mb-8"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-green-500/30 mb-4">
            <GitBranch size={48} className="text-green-400" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight"
        >
          <span className="bg-gradient-to-r from-green-400 via-cyan-400 to-green-400 bg-clip-text text-transparent">
            GitQuest
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-400 text-lg mb-2"
        >
          Master the Branch
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-gray-600 text-sm max-w-md mx-auto mb-10 leading-relaxed"
        >
          An interactive terminal simulation game that teaches you Git through
          hands-on missions. Type real git commands, solve scenarios, and become a Git master.
        </motion.p>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="grid grid-cols-3 gap-3 mb-10"
        >
          {[
            { icon: Terminal, label: '10 Missions', sub: 'Progressive difficulty' },
            { icon: GitBranch, label: 'Real Commands', sub: 'Actual git syntax' },
            { icon: Trophy, label: 'Earn XP', sub: 'Track your progress' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="p-3 rounded-xl bg-white/5 border border-white/10">
              <Icon size={20} className="text-cyan-400 mx-auto mb-1" />
              <div className="text-white text-xs font-bold">{label}</div>
              <div className="text-gray-500 text-[10px]">{sub}</div>
            </div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="space-y-3"
        >
          {hasProgress && (
            <button
              onClick={onContinue}
              className="w-full py-3 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold hover:from-cyan-400 hover:to-blue-400 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
            >
              <Rocket size={18} />
              Continue Mission
            </button>
          )}
          <button
            onClick={onStart}
            className="w-full py-3 px-8 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:from-green-400 hover:to-emerald-400 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Play size={18} />
            {hasProgress ? 'Start New Game' : 'Begin Mission'}
          </button>
        </motion.div>

        {/* Bottom info */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-gray-700 text-xs mt-8"
        >
          Type real Git commands in the terminal to complete each mission
        </motion.p>
      </motion.div>
    </div>
  );
}

// ============ MISSION COMPLETE OVERLAY ============
function MissionCompleteOverlay({
  scenario,
  score,
  xp,
  onNext,
  isLast,
}: {
  scenario: Scenario;
  score: number;
  xp: number;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
        className="bg-[#0d1117] border border-green-500/30 rounded-2xl p-8 max-w-md mx-4 text-center relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', bounce: 0.8 }}
        >
          <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-2xl font-bold text-white mb-2"
        >
          Mission Complete!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-cyan-400 text-sm mb-6"
        >
          {scenario.title} — {scenario.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center gap-8 mb-8"
        >
          <div className="text-center">
            <Star size={20} className="text-yellow-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">+{scenario.reward}</div>
            <div className="text-xs text-gray-500">XP</div>
          </div>
          <div className="text-center">
            <Trophy size={20} className="text-amber-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{score}</div>
            <div className="text-xs text-gray-500">SCORE</div>
          </div>
          <div className="text-center">
            <Zap size={20} className="text-cyan-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">Lvl {Math.floor(xp / 200) + 1}</div>
            <div className="text-xs text-gray-500">LEVEL</div>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          onClick={onNext}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:from-green-400 hover:to-emerald-400 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
        >
          {isLast ? (
            <>
              <Sparkles size={18} />
              View Results
            </>
          ) : (
            <>
              Next Mission <ArrowRight size={18} />
            </>
          )}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ============ GAME COMPLETE SCREEN ============
function GameCompleteScreen({ score, xp, completedScenarios, onRestart }: { score: number; xp: number; completedScenarios: string[]; onRestart: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <MatrixRain />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 text-center max-w-lg mx-auto px-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', bounce: 0.5 }}
          className="mb-6"
        >
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30">
            <Trophy size={48} className="text-yellow-400" />
          </div>
        </motion.div>

        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          <span className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent">
            Git Master!
          </span>
        </h1>
        <p className="text-gray-400 text-lg mb-8">
          You&apos;ve completed all missions and mastered Git!
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <Trophy size={24} className="text-amber-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{score}</div>
            <div className="text-xs text-gray-500">Total Score</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <Zap size={24} className="text-cyan-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{xp}</div>
            <div className="text-xs text-gray-500">Total XP</div>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
            <Shield size={24} className="text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{completedScenarios.length}/10</div>
            <div className="text-xs text-gray-500">Missions</div>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider">Achievements Unlocked</h3>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { icon: GitBranch, label: 'Branch Master' },
              { icon: Database, label: 'Merge Expert' },
              { icon: Shield, label: 'Time Traveler' },
              { icon: Cpu, label: 'Stash Pro' },
              { icon: Rocket, label: 'Deployer' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-full">
                <Icon size={14} className="text-yellow-400" />
                <span className="text-xs text-yellow-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-3 px-8 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold hover:from-green-400 hover:to-emerald-400 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
        >
          <RotateCcw size={18} />
          Play Again
        </button>
      </motion.div>
    </div>
  );
}

// ============ MAIN GAME CONTAINER ============
export default function Home() {
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'complete'>('start');
  const [currentScenarioIdx, setCurrentScenarioIdx] = useState(0);
  const [gitState, setGitState] = useState<GitState>(createInitialState());
  const [terminalHistory, setTerminalHistory] = useState<TerminalLine[]>([]);
  const [score, setScore] = useState(0);
  const [xp, setXp] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<string[]>([]);
  const [showComplete, setShowComplete] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { play } = useSound();

  const currentScenario = scenarios[currentScenarioIdx];

  const startGame = useCallback((continueGame = false) => {
    const idx = continueGame ? completedScenarios.length : 0;
    if (idx >= scenarios.length) {
      setGamePhase('complete');
      return;
    }
    setCurrentScenarioIdx(idx);
    setGitState(scenarios[idx].initialState());
    setTerminalHistory([
      {
        id: 'welcome',
        type: 'system',
        content: `╔══════════════════════════════════════════════╗\n║  GITQUEST — Mission ${scenarios[idx].level}: ${scenarios[idx].title.padEnd(32)}║\n╚══════════════════════════════════════════════╝\n\n${scenarios[idx].story}\n\nType 'git' commands to complete your mission. Good luck, Agent!`,
        timestamp: Date.now(),
      },
    ]);
    setGamePhase('playing');
    setShowComplete(false);
    setHintIndex(0);
  }, [completedScenarios.length]);

  const handleCommand = useCallback((command: string) => {
    const lineId = `cmd-${Date.now()}`;

    // Add input line
    setTerminalHistory(prev => [...prev, {
      id: lineId,
      type: 'input',
      content: command,
      timestamp: Date.now(),
    }]);

    // Process command
    const result = processCommand(gitState, command);

    // Update state
    if (result.stateChanges) {
      setGitState(prev => {
        const newState = { ...prev, ...result.stateChanges };
        return newState as GitState;
      });
    }

    // Add result line
    const resultLineId = `result-${Date.now()}`;
    setTerminalHistory(prev => [...prev, {
      id: resultLineId,
      type: result.success ? 'output' : 'error',
      content: result.message,
      timestamp: Date.now(),
    }]);

    if (soundEnabled) {
      play(result.success ? 'success' : 'error');
    }

    // Check if mission is complete
    setTimeout(() => {
      if (result.success && currentScenario) {
        const updatedState = { ...gitState, ...result.stateChanges } as GitState;
        const updatedHistory = [...terminalHistory,
          { id: lineId, type: 'input', content: command, timestamp: Date.now() },
          { id: resultLineId, type: result.success ? 'output' : 'error', content: result.message, timestamp: Date.now() },
        ];
        const validation = currentScenario.validate(updatedState);

        if (validation.completed) {
          if (soundEnabled) play('complete');
          setScore(prev => prev + currentScenario.reward);
          setXp(prev => prev + currentScenario.reward);
          setCompletedScenarios(prev => [...prev, currentScenario.id]);

          setTimeout(() => setShowComplete(true), 500);
        }
      }
    }, 100);
  }, [gitState, currentScenario, terminalHistory, soundEnabled, play]);

  const handleNextMission = useCallback(() => {
    if (currentScenarioIdx + 1 >= scenarios.length) {
      setGamePhase('complete');
      if (soundEnabled) play('levelup');
    } else {
      setCurrentScenarioIdx(prev => prev + 1);
      const next = scenarios[currentScenarioIdx + 1];
      setGitState(next.initialState());
      setTerminalHistory([
        {
          id: 'welcome',
          type: 'system',
          content: `╔══════════════════════════════════════════════╗\n║  GITQUEST — Mission ${next.level}: ${next.title.padEnd(32)}║\n╚══════════════════════════════════════════════╝\n\n${next.story}\n\nType 'git' commands to complete your mission.`,
          timestamp: Date.now(),
        },
      ]);
      setShowComplete(false);
      setHintIndex(0);
      if (soundEnabled) play('levelup');
    }
  }, [currentScenarioIdx, soundEnabled, play]);

  const handleHint = useCallback(() => {
    if (hintIndex < currentScenario.hints.length) {
      setHintIndex(prev => prev + 1);
      setTerminalHistory(prev => [...prev, {
        id: `hint-${Date.now()}`,
        type: 'info',
        content: `💡 Hint: ${currentScenario.hints[hintIndex]}`,
        timestamp: Date.now(),
      }]);
    }
  }, [hintIndex, currentScenario]);

  if (gamePhase === 'start') {
    return (
      <StartScreen
        onStart={() => startGame(false)}
        onContinue={() => startGame(true)}
        hasProgress={completedScenarios.length > 0}
      />
    );
  }

  if (gamePhase === 'complete') {
    return (
      <GameCompleteScreen
        score={score}
        xp={xp}
        completedScenarios={completedScenarios}
        onRestart={() => {
          setScore(0);
          setXp(0);
          setCompletedScenarios([]);
          startGame(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white flex flex-col">
      <MatrixRain />

      {/* Header */}
      <motion.header
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 border-b border-green-900/30 bg-[#0a0e17]/90 backdrop-blur-md"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GitBranch size={20} className="text-green-400" />
              <span className="font-bold text-lg bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                GitQuest
              </span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-gray-800" />
            <span className="hidden sm:block text-xs text-gray-500">
              Mission {currentScenario.level}/10
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Progress dots */}
            <div className="hidden md:flex items-center gap-1">
              {scenarios.map((s, idx) => (
                <div
                  key={s.id}
                  className={`w-2 h-2 rounded-full transition-all ${
                    completedScenarios.includes(s.id)
                      ? 'bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.5)]'
                      : idx === currentScenarioIdx
                      ? 'bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.5)]'
                      : 'bg-gray-700'
                  }`}
                  title={s.title}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <Star size={14} className="text-yellow-400" />
                <span className="text-xs text-yellow-400 font-bold">{xp}</span>
                <span className="text-[10px] text-yellow-400/60">XP</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Trophy size={14} className="text-amber-400" />
                <span className="text-xs text-amber-400 font-bold">{score}</span>
              </div>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors text-gray-500"
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 py-4 flex flex-col gap-4">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
          {/* Mission Panel - Left */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-3 flex flex-col min-h-[300px] lg:min-h-0"
          >
            <MissionPanel
              scenario={currentScenario}
              gitState={gitState}
              history={terminalHistory}
              onHint={handleHint}
              hintIndex={hintIndex}
            />
          </motion.div>

          {/* Terminal - Center */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-6 flex flex-col min-h-[400px] lg:min-h-0"
          >
            <GameTerminal
              history={terminalHistory}
              onCommand={handleCommand}
              currentBranch={gitState.currentBranch}
            />
          </motion.div>

          {/* Branch Tree - Right */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3 flex flex-col min-h-[250px] lg:min-h-0"
          >
            <div className="h-full bg-[#0d1117]/90 rounded-xl border border-gray-800/50 overflow-hidden">
              <div className="px-3 py-2 border-b border-gray-800/50 flex items-center gap-2">
                <GitBranch size={12} className="text-gray-500" />
                <span className="text-xs text-gray-500 uppercase tracking-wider">Branch Tree</span>
              </div>
              <div className="h-[calc(100%-36px)]">
                <BranchTree gitState={gitState} />
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Mission Complete Overlay */}
      <AnimatePresence>
        {showComplete && (
          <MissionCompleteOverlay
            scenario={currentScenario}
            score={score}
            xp={xp}
            onNext={handleNextMission}
            isLast={currentScenarioIdx >= scenarios.length - 1}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
