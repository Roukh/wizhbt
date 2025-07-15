import { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, Zap, CheckCircle, Clock, BarChart3 } from 'lucide-react';

interface StatsData {
  totalHabits: number;
  completedToday: number;
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: number;
  monthlyProgress: number;
  totalCompletions: number;
  averageDaily: number;
}

interface ProgressData {
  date: string;
  completed: number;
  total: number;
}

interface StatsVisualizationProps {
  stats: StatsData;
  weeklyData: ProgressData[];
  monthlyData: ProgressData[];
  className?: string;
  pomodoroDailyStats?: Record<string, { totalSessions: number; totalDuration: number; sessions: any[] }>;
  avgPomodoroMinutesWeek?: number;
}

export function StatsVisualization({ stats, weeklyData, monthlyData, className = '', pomodoroDailyStats = {}, avgPomodoroMinutesWeek }: StatsVisualizationProps) {
  const [activePeriod, setActivePeriod] = useState<'week' | 'month'>('week');
  const [selectedMetric, setSelectedMetric] = useState<keyof StatsData>('completedToday');

  const metrics = [
    {
      key: 'completedToday' as keyof StatsData,
      label: 'Today',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10'
    },
    {
      key: 'currentStreak' as keyof StatsData,
      label: 'Streak',
      icon: Zap,
      color: 'text-warning',
      bgColor: 'bg-warning/10'
    },
    {
      key: 'weeklyProgress' as keyof StatsData,
      label: 'This Week',
      icon: Calendar,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      isPomodoro: true
    },
    {
      key: 'totalHabits' as keyof StatsData,
      label: 'Total Habits',
      icon: Target,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10'
    }
  ];

  const calculateProgress = (completed: number, total: number) => {
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-success';
    if (progress >= 60) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className={`space-mobile ${className}`}>
      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          // Show avgPomodoroMinutesWeek for 'This Week', else use stats
          const value = metric.isPomodoro && typeof avgPomodoroMinutesWeek === 'number'
            ? `${avgPomodoroMinutesWeek} min`
            : stats[metric.key];
          const isPercentage = metric.key.includes('Progress') && !metric.isPomodoro;
          return (
            <div key={metric.key} className="neumorphic-card text-center group cursor-pointer touch-target"
                 onClick={() => setSelectedMetric(metric.key)}>
              <div className={`inline-flex p-3 rounded-xl mb-3 ${metric.bgColor} group-hover:scale-110 transition-transform`}>
                <Icon className={`h-6 w-6 ${metric.color}`} />
              </div>
              <div className="stats-number">
                {value}
              </div>
              <div className="stats-label">{metric.label}</div>
              {/* Progress Ring for percentage metrics (not Pomodoro) */}
              {isPercentage && (
                <div className="mt-3 relative">
                  <svg className="w-12 h-12 mx-auto" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--muted))"
                      strokeWidth="2"
                    />
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="hsl(var(--success))"
                      strokeWidth="2"
                      strokeDasharray={`${stats[metric.key]}, 100`}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {stats[metric.key]}%
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Pomodoro Per-Day Bar Chart */}
      <div className="neumorphic-card mt-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Pomodoro Minutes Per Day
        </h3>
        <div className="space-y-2">
          {Object.entries(pomodoroDailyStats).length === 0 ? (
            <div className="text-muted-foreground">No Pomodoro data for this month.</div>
          ) : (
            Object.entries(pomodoroDailyStats).map(([date, stats]) => (
              <div key={date} className="flex items-center gap-3">
                <div className="w-20 text-xs text-muted-foreground">
                  {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1">
                  <div className="w-full bg-muted rounded-full h-2 neumorphic-inset">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${Math.min(stats.totalDuration / 60, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right font-mono text-foreground">
                  {Math.round(stats.totalDuration / 60)} min
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detailed Stats Section */}
      <div className="neumorphic-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Progress Overview</h3>
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setActivePeriod('week')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                activePeriod === 'week' 
                  ? 'bg-primary text-primary-foreground shadow-inset' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setActivePeriod('month')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                activePeriod === 'month' 
                  ? 'bg-primary text-primary-foreground shadow-inset' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Month
            </button>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="space-y-4">
          {(activePeriod === 'week' ? weeklyData : monthlyData).map((day, index) => {
            const progress = calculateProgress(day.completed, day.total);
            const progressColor = getProgressColor(progress);
            
            return (
              <div key={day.date} className="flex items-center space-x-4">
                <div className="w-16 text-sm text-muted-foreground">
                  {new Date(day.date).toLocaleDateString('en-US', { 
                    weekday: 'short',
                    month: activePeriod === 'month' ? 'short' : undefined,
                    day: 'numeric'
                  })}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">
                      {day.completed}/{day.total} completed
                    </span>
                    <span className={progressColor}>{progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 neumorphic-inset">
                    <div
                      className={`h-2 rounded-full transition-all duration-1000 ease-out ${
                        progress >= 80 ? 'bg-success' : 
                        progress >= 60 ? 'bg-warning' : 'bg-destructive'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-border">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.longestStreak}</div>
            <div className="text-sm text-muted-foreground">Longest Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{stats.averageDaily}</div>
            <div className="text-sm text-muted-foreground">Avg Daily</div>
          </div>
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="neumorphic-card">
        <h3 className="text-lg font-semibold text-foreground mb-4">Achievements</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Target, label: 'First Habit', achieved: stats.totalHabits > 0 },
            { icon: Zap, label: '7 Day Streak', achieved: stats.currentStreak >= 7 },
            { icon: Calendar, label: 'Perfect Week', achieved: stats.weeklyProgress >= 100 },
            { icon: TrendingUp, label: 'Consistent', achieved: stats.averageDaily >= 5 }
          ].map((achievement, index) => {
            const Icon = achievement.icon;
            return (
              <div
                key={index}
                className={`p-4 rounded-xl text-center transition-all ${
                  achievement.achieved
                    ? 'bg-success/10 text-success shadow-soft'
                    : 'bg-muted/50 text-muted-foreground'
                }`}
              >
                <Icon className={`h-8 w-8 mx-auto mb-2 ${
                  achievement.achieved ? 'text-success' : 'text-muted-foreground'
                }`} />
                <div className="text-sm font-medium">{achievement.label}</div>
                {achievement.achieved && (
                  <div className="text-xs mt-1">✓ Earned</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 