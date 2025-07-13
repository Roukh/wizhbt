import React from "react";

interface HabitDay {
  id: string | number;
  name: string;
  completed: boolean;
}

interface PomodoroSession {
  id: string | number;
  habitId?: string | number | null;
  duration?: number;
  status?: string;
}

interface DayStatsProps {
  habits: HabitDay[];
  pomodoros: PomodoroSession[];
}

export function DayStats({ habits, pomodoros }: DayStatsProps) {
  // Map habitId to total pomodoro minutes
  const pomodoroMinutesByHabit: Record<string | number, number> = {};
  pomodoros.forEach(p => {
    const hid = p.habitId ?? "general";
    if (!pomodoroMinutesByHabit[hid]) pomodoroMinutesByHabit[hid] = 0;
    pomodoroMinutesByHabit[hid] += p.duration ? Math.round(p.duration / 60) : 0;
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold mb-2">Habits for this day</h3>
      {habits.length === 0 ? (
        <div>No habits for this day.</div>
      ) : (
        <div className="space-y-2">
          {habits.map(habit => (
            <div key={habit.id} className="flex items-center gap-4 p-2 border rounded">
              <div className="flex-1">
                <span className="font-medium">{habit.name}</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${habit.completed ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>{habit.completed ? 'Completed' : 'Not Completed'}</span>
              </div>
              <div className="text-sm">
                Pomodoro: <span className="font-mono">{pomodoroMinutesByHabit[habit.id] || 0} min</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* General Pomodoros */}
      {pomodoroMinutesByHabit["general"] > 0 && (
        <div className="mt-4 p-2 border rounded bg-blue-50">
          <span className="font-medium">General Pomodoro:</span> <span className="font-mono">{pomodoroMinutesByHabit["general"]} min</span>
        </div>
      )}
    </div>
  );
} 