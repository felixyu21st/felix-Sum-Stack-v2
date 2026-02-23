import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Timer, Trophy, RotateCcw, Play, Pause, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from './lib/utils';
import { 
  BlockData, 
  GameMode, 
  GRID_ROWS, 
  GRID_COLS, 
  INITIAL_ROWS, 
  MAX_VALUE, 
  TIME_LIMIT 
} from './types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const getRandomValue = () => Math.floor(Math.random() * MAX_VALUE) + 1;

export default function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [grid, setGrid] = useState<BlockData[]>([]);
  const [targetSum, setTargetSum] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize game
  const initGame = useCallback((selectedMode: GameMode) => {
    const initialGrid: BlockData[] = [];
    for (let r = 0; r < INITIAL_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        initialGrid.push({
          id: generateId(),
          value: getRandomValue(),
          row: GRID_ROWS - 1 - r,
          col: c
        });
      }
    }
    setGrid(initialGrid);
    setMode(selectedMode);
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
    setTimeLeft(TIME_LIMIT);
    generateTarget(initialGrid);
    setSelectedIds([]);
  }, []);

  const generateTarget = (currentGrid: BlockData[]) => {
    if (currentGrid.length === 0) return;
    
    // Pick 2-4 random blocks to sum up for a guaranteed solvable target
    const numToSum = Math.min(currentGrid.length, Math.floor(Math.random() * 3) + 2);
    const shuffled = [...currentGrid].sort(() => 0.5 - Math.random());
    const sum = shuffled.slice(0, numToSum).reduce((acc, b) => acc + b.value, 0);
    setTargetSum(sum);
  };

  const addNewRow = useCallback(() => {
    setGrid(prev => {
      // Check for game over (any block at row 0)
      if (prev.some(b => b.row === 0)) {
        setGameOver(true);
        return prev;
      }

      // Shift existing blocks up
      const shifted = prev.map(b => ({ ...b, row: b.row - 1 }));
      
      // Add new row at bottom
      const newRow: BlockData[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        newRow.push({
          id: generateId(),
          value: getRandomValue(),
          row: GRID_ROWS - 1,
          col: c
        });
      }
      
      return [...shifted, ...newRow];
    });
    
    if (mode === 'time') {
      setTimeLeft(TIME_LIMIT);
    }
  }, [mode]);

  // Timer logic
  useEffect(() => {
    if (mode === 'time' && !gameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addNewRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, gameOver, isPaused, addNewRow]);

  const currentSum = grid
    .filter(b => selectedIds.includes(b.id))
    .reduce((acc, b) => acc + b.value, 0);

  const handleBlockClick = (id: string) => {
    if (gameOver || isPaused) return;

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  // Check sum
  useEffect(() => {
    if (currentSum === targetSum && targetSum > 0) {
      // Success!
      const points = selectedIds.length * 10;
      setScore(s => s + points);
      
      setGrid(prev => {
        const remaining = prev.filter(b => !selectedIds.includes(b.id));
        
        // Apply gravity: for each column, make blocks fall
        const newGrid: BlockData[] = [];
        for (let c = 0; c < GRID_COLS; c++) {
          const colBlocks = remaining
            .filter(b => b.col === c)
            .sort((a, b) => b.row - a.row); // bottom to top
          
          colBlocks.forEach((b, idx) => {
            newGrid.push({
              ...b,
              row: GRID_ROWS - 1 - idx
            });
          });
        }
        
        // After clearing, if classic mode, add a row
        if (mode === 'classic') {
          // We'll handle this in a separate effect or timeout to ensure state is clean
        }
        
        return newGrid;
      });

      setSelectedIds([]);
      
      if (mode === 'classic') {
        setTimeout(addNewRow, 300);
      } else {
        setTimeLeft(TIME_LIMIT);
      }

      // Small celebration
      if (points > 30) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#00ff41', '#ffffff']
        });
      }
    } else if (currentSum > targetSum) {
      // Failed - clear selection
      setSelectedIds([]);
    }
  }, [currentSum, targetSum, selectedIds, mode, addNewRow]);

  // Regenerate target when grid changes and no target exists
  useEffect(() => {
    if (grid.length > 0 && (targetSum === 0 || currentSum === 0)) {
      // Only regenerate if we just cleared or started
      // But we need to be careful not to regenerate while user is selecting
    }
  }, [grid]);

  // Separate effect for target generation to avoid loops
  useEffect(() => {
    if (selectedIds.length === 0 && grid.length > 0) {
      generateTarget(grid);
    }
  }, [grid, selectedIds.length]);

  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-scanline">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-black tracking-tighter text-white italic">
              SUM<span className="text-[var(--accent)]">STRIKE</span>
            </h1>
            <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Mathematical Elimination Protocol</p>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={() => initGame('classic')}
              className="group relative overflow-hidden bg-white text-black font-bold py-4 px-8 rounded-xl transition-all hover:scale-105 active:scale-95"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Trophy size={20} />
                CLASSIC MODE
              </div>
              <div className="absolute inset-0 bg-[var(--accent)] translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            </button>

            <button 
              onClick={() => initGame('time')}
              className="group relative overflow-hidden border border-white/20 text-white font-bold py-4 px-8 rounded-xl transition-all hover:bg-white/5 active:scale-95"
            >
              <div className="relative z-10 flex items-center justify-center gap-2">
                <Timer size={20} />
                TIME ATTACK
              </div>
            </button>
          </div>

          <div className="pt-8 text-left space-y-4 border-t border-white/10">
            <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Instructions</h3>
            <ul className="text-sm text-zinc-400 space-y-2 font-mono">
              <li className="flex gap-2"><span className="text-[var(--accent)]">01</span> Select numbers to match the target sum.</li>
              <li className="flex gap-2"><span className="text-[var(--accent)]">02</span> Clear blocks to prevent them from reaching the top.</li>
              <li className="flex gap-2"><span className="text-[var(--accent)]">03</span> In Time Attack, you must clear before the clock hits zero.</li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-scanline font-sans">
      {/* Header */}
      <div className="p-4 md:p-6 flex items-center justify-between border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setMode(null)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <RotateCcw size={20} className="text-zinc-400" />
          </button>
          <div>
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Score</div>
            <div className="text-2xl font-black font-mono">{score.toLocaleString()}</div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center gap-1">
            <Target size={10} /> Target Sum
          </div>
          <motion.div 
            key={targetSum}
            initial={{ scale: 1.5, color: '#00ff41' }}
            animate={{ scale: 1, color: '#ffffff' }}
            className="text-4xl font-black font-mono"
          >
            {targetSum}
          </motion.div>
        </div>

        <div className="flex items-center gap-4">
          {mode === 'time' && (
            <div className="text-right">
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest flex items-center justify-end gap-1">
                <Timer size={10} /> Time
              </div>
              <div className={cn(
                "text-2xl font-black font-mono",
                timeLeft <= 3 ? "text-red-500 animate-pulse" : "text-white"
              )}>
                {timeLeft}s
              </div>
            </div>
          )}
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 overflow-hidden">
        <div 
          className="relative bg-zinc-900/50 rounded-2xl border border-white/5 overflow-hidden shadow-2xl"
          style={{
            width: 'min(90vw, 400px)',
            aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
          }}
        >
          {/* Grid Background Lines */}
          <div className="absolute inset-0 grid grid-cols-6 grid-rows-10 pointer-events-none">
            {Array.from({ length: GRID_COLS * GRID_ROWS }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-white/[0.02]" />
            ))}
          </div>

          {/* Blocks */}
          <AnimatePresence>
            {grid.map((block) => (
              <motion.button
                key={block.id}
                layoutId={block.id}
                initial={{ 
                  scale: 0, 
                  opacity: 0,
                  left: `${block.col * (100 / GRID_COLS)}%`,
                  top: `${block.row * (100 / GRID_ROWS)}%`,
                }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  left: `${block.col * (100 / GRID_COLS)}%`,
                  top: `${block.row * (100 / GRID_ROWS)}%`,
                }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={() => handleBlockClick(block.id)}
                className={cn(
                  "absolute flex items-center justify-center font-mono font-bold text-xl md:text-2xl rounded-lg transition-all",
                  "w-[16.66%] h-[10%]",
                  selectedIds.includes(block.id) 
                    ? "bg-[var(--accent)] text-black scale-90 z-10 shadow-[0_0_20px_rgba(0,255,65,0.4)]" 
                    : "bg-white/5 text-white hover:bg-white/10"
                )}
                style={{
                  padding: '2px',
                }}
              >
                <div className="w-full h-full flex items-center justify-center rounded-md border border-white/5">
                  {block.value}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {/* Warning Line */}
          <div className="absolute top-[10%] left-0 w-full h-[2px] bg-red-500/20 flex items-center justify-center">
            <div className="bg-red-500 text-[8px] px-2 py-0.5 rounded font-mono uppercase tracking-tighter text-white opacity-50">
              Danger Zone
            </div>
          </div>
        </div>

        {/* Current Selection Floating Indicator */}
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl z-30"
            >
              <div className="flex gap-1">
                {selectedIds.map(id => (
                  <div key={id} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-mono text-sm">
                    {grid.find(b => b.id === id)?.value}
                  </div>
                ))}
              </div>
              <div className="h-4 w-[1px] bg-white/20" />
              <div className="flex flex-col">
                <span className="text-[8px] font-mono text-zinc-500 uppercase">Current Sum</span>
                <span className={cn(
                  "text-xl font-black font-mono",
                  currentSum > targetSum ? "text-red-500" : "text-[var(--accent)]"
                )}>
                  {currentSum}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Overlays */}
      <AnimatePresence>
        {(gameOver || isPaused) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-sm w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center space-y-6 shadow-2xl"
            >
              {gameOver ? (
                <>
                  <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                    <AlertTriangle size={40} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black italic">GAME OVER</h2>
                    <p className="text-zinc-500 font-mono text-sm">Grid capacity exceeded.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="bg-white/5 p-4 rounded-2xl">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Final Score</div>
                      <div className="text-2xl font-black font-mono">{score}</div>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Mode</div>
                      <div className="text-sm font-bold uppercase">{mode}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => initGame(mode!)}
                    className="w-full bg-[var(--accent)] text-black font-bold py-4 rounded-2xl hover:scale-105 transition-transform"
                  >
                    TRY AGAIN
                  </button>
                  <button 
                    onClick={() => setMode(null)}
                    className="w-full text-zinc-500 font-mono text-xs uppercase hover:text-white transition-colors"
                  >
                    Back to Menu
                  </button>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-white/10 text-white rounded-full flex items-center justify-center mx-auto">
                    <Pause size={40} />
                  </div>
                  <h2 className="text-3xl font-black italic">PAUSED</h2>
                  <button 
                    onClick={() => setIsPaused(false)}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:scale-105 transition-transform"
                  >
                    RESUME
                  </button>
                  <button 
                    onClick={() => setMode(null)}
                    className="w-full text-zinc-500 font-mono text-xs uppercase hover:text-white transition-colors"
                  >
                    Quit Game
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
