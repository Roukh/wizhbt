import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, Timer, Coffee, Trees, Leaf, Zap, Target, Link2 } from 'lucide-react';

interface Habit {
  id: string;
  name: string;
  description?: string;
}

interface PomodoroSession {
  id: string;
  habitId?: string;
  type: 'focus' | 'short-break' | 'long-break';
  duration: number;
  completed: boolean;
  startTime?: Date;
  endTime?: Date;
}

interface EnhancedPomodoroProps {
  habits: Habit[];
  onSessionComplete?: (session: PomodoroSession) => void;
  className?: string;
}

const FOCUS_TIME = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes
const SESSIONS_BEFORE_LONG_BREAK = 4;

export function EnhancedPomodoro({ habits, onSessionComplete, className = '' }: EnhancedPomodoroProps) {
  // Debug log for backend data
  console.debug('Pomodoro received habits:', habits);

  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<'focus' | 'short-break' | 'long-break'>('focus');
  const [sessionCount, setSessionCount] = useState(0);
  const [selectedHabit, setSelectedHabit] = useState<string>('');
  const [completedSessions, setCompletedSessions] = useState<PomodoroSession[]>([]);
  const [showHabitSelector, setShowHabitSelector] = useState(false);
  const [noHabitsMessage, setNoHabitsMessage] = useState('');
  const [duration, setDuration] = useState(FOCUS_TIME); // in seconds
  const [draggingHandle, setDraggingHandle] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  // Add a new state for live dragging angle
  const [dragAngle, setDragAngle] = useState<number | null>(null);
  // Add a ref to track if dragging is active
  const draggingRef = useRef(false);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  // When duration changes and timer is not running, update timeLeft
  useEffect(() => {
    if (!isRunning) setTimeLeft(duration);
  }, [duration, isRunning]);

  const handleSessionComplete = useCallback(() => {
    setIsRunning(false);
    const session: PomodoroSession = {
      id: Date.now().toString(),
      habitId: selectedHabit,
      type: currentSession,
      duration: getSessionDuration(currentSession),
      completed: true,
      startTime: new Date(Date.now() - getSessionDuration(currentSession) * 1000),
      endTime: new Date()
    };
    setCompletedSessions(prev => [...prev, session]);
    onSessionComplete?.(session);
    setTimeout(() => {
      if (currentSession === 'focus') {
        const nextSession = (sessionCount + 1) % SESSIONS_BEFORE_LONG_BREAK === 0 ? 'long-break' : 'short-break';
        setCurrentSession(nextSession);
        setTimeLeft(getSessionDuration(nextSession));
        setSessionCount(prev => prev + 1);
      } else {
        setCurrentSession('focus');
        setTimeLeft(FOCUS_TIME);
      }
    }, 2000);
  }, [currentSession, sessionCount, selectedHabit, onSessionComplete]);

  const getSessionDuration = (session: string) => {
    switch (session) {
      case 'focus': return FOCUS_TIME;
      case 'short-break': return SHORT_BREAK;
      case 'long-break': return LONG_BREAK;
      default: return FOCUS_TIME;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Always allow timer to start
  const startTimer = () => {
    setNoHabitsMessage('');
    setIsRunning(true);
  };
  const pauseTimer = () => setIsRunning(false);
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getSessionDuration(currentSession));
  };
  const skipSession = () => {
    handleSessionComplete();
  };

  const getSessionIcon = () => {
    switch (currentSession) {
      case 'focus': return Timer;
      case 'short-break': return Coffee;
      case 'long-break': return Trees;
      default: return Timer;
    }
  };
  const getSessionColor = () => {
    switch (currentSession) {
      case 'focus': return 'text-primary';
      case 'short-break': return 'text-warning';
      case 'long-break': return 'text-success';
      default: return 'text-primary';
    }
  };
  // --- Forest-style circular slider logic ---
  const forestMin = 5;
  const forestMax = 120;
  const forestStep = 5;
  const forestRadius = 45;
  const forestCenter = 50;
  const forestArcStart = -Math.PI / 2; // 12 o'clock

  function forestValueToAngle(value: number) {
    let percent = (value - forestMin) / (forestMax - forestMin);
    return forestArcStart + percent * 2 * Math.PI;
  }
  function forestAngleToValue(angle: number) {
    let percent = (angle + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI);
    return forestMin + percent * (forestMax - forestMin);
  }
  function forestDescribeArc(center: number, radius: number, startAngle: number, endAngle: number) {
    const start = {
      x: center + radius * Math.cos(startAngle),
      y: center + radius * Math.sin(startAngle),
    };
    const end = {
      x: center + radius * Math.cos(endAngle),
      y: center + radius * Math.sin(endAngle),
    };
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArc, 1, end.x, end.y,
    ].join(' ');
  }
  // --- End Forest-style logic ---

  // On drag or click, snap to nearest step
  const getNearestStepFromEvent = (clientX: number, clientY: number) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    let angle = Math.atan2(y, x);
    if (angle < 0) angle += 2 * Math.PI;
    // Find the nearest step
    let minDist = Infinity;
    // Fix: define stepAngles based on forestStep, forestMin, forestMax, and forestArcStart
    let nearestStep = 0;
    const numSteps = Math.floor((forestMax - forestMin) / forestStep) + 1;
    const stepAngles: number[] = [];
    for (let i = 0; i < numSteps; i++) {
      const value = forestMin + i * forestStep;
      const percent = (value - forestMin) / (forestMax - forestMin);
      const stepAngle = (forestArcStart + percent * 2 * Math.PI + 2 * Math.PI) % (2 * Math.PI);
      stepAngles.push(stepAngle);
    }
    for (let i = 0; i < stepAngles.length; i++) {
      let dist = Math.abs(angle - stepAngles[i]);
      if (dist > Math.PI) dist = 2 * Math.PI - dist;
      if (dist < minDist) {
        minDist = dist;
        nearestStep = i;
      }
    }
    return nearestStep;
  };
  // Helper: get angle from event
  function getAngleFromXY(clientX: number, clientY: number) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const dx = clientX - (rect.left + forestCenter);
    const dy = clientY - (rect.top + forestCenter);
    let angle = Math.atan2(dy, dx);
    angle -= forestArcStart;
    if (angle < 0) angle += 2 * Math.PI;
    return angle;
  }

  function handleGlobalMove(e: MouseEvent | TouchEvent) {
    if (!draggingRef.current) return;
    let clientX = 0, clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const angle = getAngleFromXY(clientX, clientY);
    let v = forestMin + (angle / (2 * Math.PI)) * (forestMax - forestMin);
    // Decrease sensitivity: only update if value changes by at least 5 min
    v = Math.round(v / forestStep) * forestStep;
    v = Math.max(forestMin, Math.min(forestMax, v));
    if (v * 60 !== duration) setDuration(v * 60);
  }
  function handleGlobalUp() {
    draggingRef.current = false;
    window.removeEventListener('mousemove', handleGlobalMove as any);
    window.removeEventListener('mouseup', handleGlobalUp as any);
    window.removeEventListener('touchmove', handleGlobalMove as any);
    window.removeEventListener('touchend', handleGlobalUp as any);
    setDraggingHandle(false);
  }

  // Mouse event handlers
  const handleSliderMouseDown = (e: React.MouseEvent<SVGCircleElement>) => {
    draggingRef.current = true;
    setDraggingHandle(true);
    handleGlobalMove(e.nativeEvent);
    window.addEventListener('mousemove', handleGlobalMove as any);
    window.addEventListener('mouseup', handleGlobalUp as any);
  };
  const handleSliderMouseMove = (e: MouseEvent | React.MouseEvent) => {
    if (!draggingHandle) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : 0;
    const clientY = 'clientY' in e ? e.clientY : 0;
    const dx = clientX - (rect.left + forestCenter);
    const dy = clientY - (rect.top + forestCenter);
    let angle = Math.atan2(dy, dx);
    angle -= forestArcStart;
    if (angle < 0) angle += 2 * Math.PI;
    let v = forestMin + (angle / (2 * Math.PI)) * (forestMax - forestMin);
    v = Math.round(v / forestStep) * forestStep;
    v = Math.max(forestMin, Math.min(forestMax, v));
    setDuration(v * 60);
  };
  const handleSliderMouseUp = () => {
    setDraggingHandle(false);
    window.removeEventListener('mousemove', handleSliderMouseMove as any);
    window.removeEventListener('mouseup', handleSliderMouseUp as any);
  };
  // Touch event handlers
  const handleSliderTouchStart = (e: React.TouchEvent<SVGCircleElement>) => {
    draggingRef.current = true;
    setDraggingHandle(true);
    handleGlobalMove(e.nativeEvent);
    window.addEventListener('touchmove', handleGlobalMove as any, { passive: false });
    window.addEventListener('touchend', handleGlobalUp as any);
  };
  const handleSliderTouchMove = (e: TouchEvent | React.TouchEvent) => {
    if (!draggingHandle) return;
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touch = (e as TouchEvent).touches ? (e as TouchEvent).touches[0] : (e as React.TouchEvent).touches[0];
    if (!touch) return;
    const dx = touch.clientX - (rect.left + forestCenter);
    const dy = touch.clientY - (rect.top + forestCenter);
    let angle = Math.atan2(dy, dx);
    angle -= forestArcStart;
    if (angle < 0) angle += 2 * Math.PI;
    let v = forestMin + (angle / (2 * Math.PI)) * (forestMax - forestMin);
    v = Math.round(v / forestStep) * forestStep;
    v = Math.max(forestMin, Math.min(forestMax, v));
    setDuration(v * 60);
  };
  const handleSliderTouchEnd = () => {
    setDraggingHandle(false);
    window.removeEventListener('touchmove', handleSliderTouchMove as any);
    window.removeEventListener('touchend', handleSliderTouchEnd as any);
  };

  // Helper to create SVG arc path from start to end angle
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = {
      x: cx + r * Math.cos(startAngle),
      y: cy + r * Math.sin(startAngle),
    };
    const end = {
      x: cx + r * Math.cos(endAngle),
      y: cy + r * Math.sin(endAngle),
    };
    const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';
    return [
      'M', start.x, start.y,
      'A', r, r, 0, largeArcFlag, 1, end.x, end.y
    ].join(' ');
  }

  const getSelectedHabitName = () => {
    return habits.find(h => h.id === selectedHabit)?.name || '';
  };
  const SessionIcon = getSessionIcon();

  return (
    <div className={`space-mobile ${className}`}>
      {/* Main Timer Display */}
      <div className="neumorphic-card text-center relative overflow-hidden">
        {/* Background pattern and session type indicator removed as requested */}
        {/* Timer Display */}
        <div className="relative mb-8">
          <div className="relative w-64 h-64 mx-auto">
            <svg
              ref={svgRef}
              className="w-full h-full absolute top-0 left-0 z-10 select-none"
              viewBox="0 0 100 100"
              style={{ touchAction: 'none' }}
            >
              {/* Filled arc only, no background arc */}
              <path
                d={forestDescribeArc(forestCenter, forestRadius, forestArcStart, forestValueToAngle(duration / 60))}
                stroke="hsl(var(--success))"
                strokeWidth={7}
                fill="none"
                strokeLinecap="round"
              />
              {/* Handle, rendered after arc for overlap */}
              {!isRunning && (() => {
                const angle = forestValueToAngle(duration / 60);
                const x = forestCenter + forestRadius * Math.cos(angle);
                const y = forestCenter + forestRadius * Math.sin(angle);
                return (
                  <circle
                    cx={x}
                    cy={y}
                    r={draggingHandle ? 8 : 5}
                    fill="hsl(var(--success))"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    style={{
                      filter: draggingHandle
                        ? "drop-shadow(0 4px 16px rgba(0,0,0,0.18))"
                        : "drop-shadow(0 2px 6px rgba(0,0,0,0.10))",
                      transition: "r 0.15s, filter 0.15s",
                      cursor: 'pointer',
                      pointerEvents: 'all',
                    }}
                    onMouseDown={!isRunning ? handleSliderMouseDown : undefined}
                    onTouchStart={!isRunning ? handleSliderTouchStart : undefined}
                  />
                );
              })()}
            </svg>
            {/* Neumorphic inner plate and timer text remain unchanged */}
            <div className="absolute inset-4 rounded-full bg-background shadow-[inset_0_4px_16px_0_rgba(0,0,0,0.10)] flex items-center justify-center z-20">
              <div className="timer-display text-5xl lg:text-6xl font-bold text-foreground select-none">
                {formatTime(isRunning ? timeLeft : duration)}
              </div>
            </div>
          </div>
        </div>
        {/* Link Habit Button (if habits exist) */}
        {habits.length > 0 && (
          <div className="mb-6 flex justify-center">
            <button
              className="neumorphic-button secondary flex items-center gap-2 text-sm touch-target"
              onClick={() => setShowHabitSelector(true)}
              type="button"
            >
              <Link2 className="h-4 w-4" />
              {selectedHabit ? 'Change Linked Habit' : 'Link Habit'}
            </button>
          </div>
        )}
        {/* Controls */}
        <div className="timer-controls flex-wrap">
          {!isRunning ? (
            <button
              onClick={startTimer}
              className="neumorphic-button touch-target"
              type="button"
            >
              <Play className="h-5 w-5 mr-2" />
              Start
            </button>
          ) : (
            <button
              onClick={pauseTimer}
              className="neumorphic-button touch-target"
              type="button"
            >
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </button>
          )}
          <button
            onClick={resetTimer}
            className="neumorphic-button secondary touch-target"
            type="button"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            Reset
          </button>
        </div>
        {/* Session Counter */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Session:</span>
            <span className="font-semibold">{sessionCount + 1}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Completed:</span>
            <span className="font-semibold text-success">{completedSessions.length}</span>
          </div>
        </div>
      </div>
      {/* Habit Selector Modal: centered popup */}
      {showHabitSelector && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowHabitSelector(false)} />
          <div className="neumorphic-card relative z-10 w-full max-w-xs mx-auto p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Select a Habit to Focus On</h3>
            {habits.length === 0 ? (
              <div className="text-center text-muted-foreground mb-4">No habits available. You can still use the timer without linking a habit.</div>
            ) : (
              <div className="grid gap-3">
                {habits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => {
                      setSelectedHabit(habit.id);
                      setShowHabitSelector(false);
                      setNoHabitsMessage('');
                    }}
                    className={`neumorphic-card text-left p-4 hover:shadow-hover transition-all touch-target ${selectedHabit === habit.id ? 'ring-2 ring-primary' : ''}`}
                    type="button"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">{habit.name}</div>
                        {habit.description && (
                          <div className="text-sm text-muted-foreground">{habit.description}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowHabitSelector(false)}
              className="neumorphic-button secondary w-full mt-4"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* No habits fallback message */}
      {noHabitsMessage && (
        <div className="neumorphic-card text-center text-warning mt-4">{noHabitsMessage}</div>
      )}
      {/* Session History */}
      {completedSessions.length > 0 && (
        <div className="neumorphic-card">
          <h3 className="text-lg font-semibold text-foreground mb-4">Today's Sessions</h3>
          <div className="space-y-3">
            {completedSessions.slice(-5).reverse().map((session) => {
              const habit = habits.find(h => h.id === session.habitId);
              const sessionIcon = session.type === 'focus' ? Timer : 
                                session.type === 'short-break' ? Coffee : Trees;
              const SessionIcon = sessionIcon;
              return (
                <div key={session.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <SessionIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">
                      {session.type === 'focus' ? 'Focus Session' : 
                       session.type === 'short-break' ? 'Short Break' : 'Long Break'}
                    </div>
                    {habit && (
                      <div className="text-sm text-muted-foreground">{habit.name}</div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.floor(session.duration / 60)}m
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="neumorphic-card text-center">
          <div className="text-2xl font-bold text-foreground">
            {completedSessions.filter(s => s.type === 'focus').length}
          </div>
          <div className="text-sm text-muted-foreground">Focus Sessions</div>
        </div>
        <div className="neumorphic-card text-center">
          <div className="text-2xl font-bold text-success">
            {Math.floor(completedSessions.reduce((acc, s) => acc + s.duration, 0) / 60)}
          </div>
          <div className="text-sm text-muted-foreground">Minutes Focused</div>
        </div>
      </div>
      {/* Fallback if no habits at all */}
      {habits.length === 0 && (
        <div className="neumorphic-card text-center text-muted-foreground mt-6">
          No habits found. You can use the timer without linking a habit.
        </div>
      )}
    </div>
  );
} 