import { useState, useEffect } from "react";
import { Plus, Target, BarChart3, Timer, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitCard } from "./HabitCard";
import { HabitCalendar } from "./HabitCalendar";
import { CreateHabitModal } from "./CreateHabitModal";
import { DateSelector } from "./DateSelector";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EnhancedPomodoro } from "./EnhancedPomodoro";
import { StatsVisualization } from "./StatsVisualization";
import { UniversalCalendar } from "./UniversalCalendar";
import { DayStats } from "./DayStats";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  checklist: ChecklistItem[];
  requiredItems: number;
  streak: number;
  startDate: string;
}

export function Dashboard() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const queryClient = useQueryClient();
  const [perDayHabitState, setPerDayHabitState] = useState<{ [habitId: string]: { checklist: any, completed: boolean } }>({});

  // Fetch habits from backend
  const { data: habits = [], isLoading, isError } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await fetch('/habits');
      if (!res.ok) throw new Error('Failed to fetch habits');
      return res.json();
    },
  });

  // Fetch calendar data for the current month
  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth() + 1;
  type CalendarEvent = { habitId: string; completed: boolean; date: string; type: string };
  type CalendarData = { eventsByDate: { [date: string]: CalendarEvent[] } };
  const { data: calendarData = { eventsByDate: {} }, isLoading: isCalendarLoading } = useQuery<CalendarData>({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const res = await fetch(`/calendar?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed to fetch calendar');
      return res.json();
    },
  });

  // Fetch stats data
  const { data: statsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await fetch('/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  // Fetch per-day Pomodoro stats for analytics
  const { data: pomodoroDailyStats = {}, isLoading: isPomodoroStatsLoading } = useQuery({
    queryKey: ['pomodoro-daily-stats'],
    queryFn: async () => {
      // Get current month range
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      const startDate = start.toISOString().split('T')[0];
      const endDate = end.toISOString().split('T')[0];
      const res = await fetch(`/pomodoro/stats/daily?startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error('Failed to fetch pomodoro daily stats');
      return res.json();
    },
  });

  // Create habit mutation
  const createHabitMutation = useMutation({
    mutationFn: async (newHabit: Omit<Habit, 'id' | 'streak'> & { startDate: string }) => {
      const res = await fetch('/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit),
      });
      if (!res.ok) throw new Error('Failed to create habit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      setIsCreateModalOpen(false);
    },
  });

  // Update habit mutation (for checklist, etc.)
  const updateHabitMutation = useMutation({
    mutationFn: async ({ id, updated }: { id: string; updated: Partial<Habit> }) => {
      const res = await fetch(`/habits/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to update habit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });

  const updateHabit = (habitId: string, updatedHabit: Partial<Habit>) => {
    updateHabitMutation.mutate({ id: habitId, updated: updatedHabit });
  };

  const createHabit = (newHabitData: any) => {
    createHabitMutation.mutate(newHabitData);
  };

  // Helper to get calendar data for a habit
  const getHabitCalendarData = (habitId: string) => {
    const eventsByDate = (calendarData as CalendarData).eventsByDate || {};
    const result: { date: Date; status: 'complete' | 'incomplete' | 'pending' | 'skipped' }[] = [];
    Object.entries(eventsByDate).forEach(([dateStr, events]) => {
      const habitEvent = (events as any[]).find(e => e.habitId === habitId);
      if (habitEvent) {
        result.push({
          date: new Date(dateStr),
          status: habitEvent.completed ? 'complete' : 'incomplete',
        });
      }
    });
    return result;
  };

  useEffect(() => {
    const fetchDayData = async () => {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/calendar/date/${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        // Map: habitId -> { checklist, completed }
        const state: { [habitId: string]: { checklist: any, completed: boolean } } = {};
        (data.habits || []).forEach((h: any) => {
          state[h.id] = { checklist: h.checklist, completed: h.completed };
        });
        setPerDayHabitState(state);
      }
    };
    fetchDayData();
  }, [selectedDate, habits]);

  // Mock data for stats visualization (replace with real API data)
  const mockStats = {
    totalHabits: habits.length,
    completedToday: habits.filter(h => h.checklist.filter(c => c.completed).length >= h.requiredItems).length,
    currentStreak: Math.max(...habits.map(h => h.streak), 0),
    longestStreak: Math.max(...habits.map(h => h.streak), 0),
    weeklyProgress: 75,
    monthlyProgress: 68,
    totalCompletions: habits.reduce((acc, h) => acc + h.streak, 0),
    averageDaily: Math.round(habits.reduce((acc, h) => acc + h.streak, 0) / 30)
  };

  // Helper to get progress data for the past week ending today
  const getWeeklyData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const week: { date: string; completed: number; total: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const events = (calendarData.eventsByDate?.[dateStr] || []).filter(e => e.type === 'habit');
      // Group events by habitId (one per habit)
      const habitMap: { [habitId: string]: typeof events[0] } = {};
      events.forEach(e => { if (e.habitId) habitMap[e.habitId] = e; });
      const habits = Object.values(habitMap);
      const total = habits.length;
      const completed = habits.filter(e => e.completed).length;
      week.push({ date: dateStr, completed, total });
    }
    return week;
  };

  // Helper to get progress data for the current month up to today
  const getMonthlyData = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysInMonth = today.getMonth() === month && today.getFullYear() === year
      ? today.getDate()
      : new Date(year, month + 1, 0).getDate();
    const monthData: { date: string; completed: number; total: number }[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      const events = (calendarData.eventsByDate?.[dateStr] || []).filter(e => e.type === 'habit');
      // Group events by habitId (one per habit)
      const habitMap: { [habitId: string]: typeof events[0] } = {};
      events.forEach(e => { if (e.habitId) habitMap[e.habitId] = e; });
      const habits = Object.values(habitMap);
      const total = habits.length;
      const completed = habits.filter(e => e.completed).length;
      monthData.push({ date: dateStr, completed, total });
    }
    return monthData;
  };

  const weeklyData = getWeeklyData();
  const monthlyData = getMonthlyData();
  weeklyData.reverse();
  monthlyData.reverse();

  // Calculate average Pomodoro minutes per day for the past week
  const getAvgPomodoroMinutesWeek = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let totalMinutes = 0;
    let daysWithData = 0;
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const stats = pomodoroDailyStats[dateStr];
      if (stats) {
        totalMinutes += Math.round(stats.totalDuration / 60);
        daysWithData++;
      }
    }
    return daysWithData > 0 ? Math.round(totalMinutes / daysWithData) : 0;
  };
  const avgPomodoroMinutesWeek = getAvgPomodoroMinutesWeek();

  // Calculate real stats for the main cards
  // Today: habits completed today
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = (calendarData.eventsByDate?.[todayStr] || []).filter(e => e.type === 'habit');
  const todayHabitMap: { [habitId: string]: typeof todayEvents[0] } = {};
  todayEvents.forEach(e => { if (e.habitId) todayHabitMap[e.habitId] = e; });
  const todayHabits = Object.values(todayHabitMap);
  const completedToday = todayHabits.filter(e => e.completed).length;
  // Total Habits
  const totalHabits = habits.length;
  // Streak: consecutive days up to today where all habits were completed
  const getStreak = () => {
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; ; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const events = (calendarData.eventsByDate?.[dateStr] || []).filter(e => e.type === 'habit');
      const habitMap: { [habitId: string]: typeof events[0] } = {};
      events.forEach(e => { if (e.habitId) habitMap[e.habitId] = e; });
      const habitsForDay = Object.values(habitMap);
      if (habitsForDay.length === 0) break;
      const allCompleted = habitsForDay.length > 0 && habitsForDay.every(e => e.completed);
      if (allCompleted) streak++;
      else break;
    }
    return streak;
  };
  const currentStreak = getStreak();
  // Compose real stats object
  const realStats = {
    totalHabits,
    completedToday,
    currentStreak,
    longestStreak: Math.max(currentStreak, ...habits.map(h => h.streak)),
    weeklyProgress: weeklyData.length > 0 ? Math.round(100 * weeklyData.reduce((acc, d) => acc + d.completed, 0) / (weeklyData.reduce((acc, d) => acc + d.total, 0) || 1)) : 0,
    monthlyProgress: monthlyData.length > 0 ? Math.round(100 * monthlyData.reduce((acc, d) => acc + d.completed, 0) / (monthlyData.reduce((acc, d) => acc + d.total, 0) || 1)) : 0,
    totalCompletions: monthlyData.reduce((acc, d) => acc + d.completed, 0),
    averageDaily: monthlyData.length > 0 ? Math.round(monthlyData.reduce((acc, d) => acc + d.completed, 0) / monthlyData.length) : 0
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container-mobile">
        {!isLoading && !isError && (
          <Tabs defaultValue="today" className="space-mobile">
            <TabsList className="neumorphic-inset grid w-full grid-cols-4 lg:w-[500px] mx-auto">
              <TabsTrigger value="today" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="hidden sm:inline">Daily</span>
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Stats</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="pomodoro" className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                <span className="hidden sm:inline">Focus</span>
              </TabsTrigger>
          </TabsList>

            <TabsContent value="today" className="space-mobile">
              {/* Date Selector */}
              <DateSelector 
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
              {/* Remove Daily Progress section */}
              {/* Habits List */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">Today's Habits</h2>
                {habits.length === 0 ? (
                  <div className="neumorphic-card text-center py-12">
                    <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No habits yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first habit to get started</p>
                    <button
                      className="neumorphic-button"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Habit
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {habits.map((habit) => (
                      <HabitCard
                        key={habit.id}
                        habit={habit}
                        onUpdateHabit={updateHabit}
                        selectedDate={selectedDate}
                        perDayChecklist={perDayHabitState[habit.id]?.checklist}
                        perDayCompleted={perDayHabitState[habit.id]?.completed}
                      />
                    ))}
                  </div>
                )}
              </div>
              {/* Floating Add Habit Button */}
              <button
                className="fixed bottom-6 right-6 neumorphic-button touch-target z-50"
                onClick={() => setIsCreateModalOpen(true)}
                style={{ borderRadius: '50%', width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}
                aria-label="Add Habit"
              >
                <Plus className="h-7 w-7" />
              </button>
            </TabsContent>

            <TabsContent value="stats" className="space-mobile">
              {isStatsLoading || isPomodoroStatsLoading ? (
                <div className="neumorphic-card text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading stats...</p>
                </div>
              ) : (
                <StatsVisualization
                  stats={realStats}
                  weeklyData={weeklyData}
                  monthlyData={monthlyData}
                  pomodoroDailyStats={pomodoroDailyStats}
                  avgPomodoroMinutesWeek={avgPomodoroMinutesWeek}
                />
              )}
          </TabsContent>

            <TabsContent value="calendar" className="space-mobile">
              {isCalendarLoading && (
                <div className="neumorphic-card text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading calendar...</p>
                </div>
              )}
              <div className="flex justify-center items-start w-full">
                <div className="w-full max-w-4xl">
                  <UniversalCalendar 
                    calendarData={calendarData.eventsByDate || {}}
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pomodoro" className="space-mobile">
              <EnhancedPomodoro 
                habits={habits}
                onSessionComplete={(session) => {
                  console.log('Session completed:', session);
                  // Here you could integrate with your backend to track pomodoro sessions
                }}
              />
          </TabsContent>
        </Tabs>
        )}
      </main>

      <CreateHabitModal 
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateHabit={createHabit}
      />
    </div>
  );
}

// DailyStats component fetches and displays per-day stats
function DailyStats({ selectedDate, onUpdateHabit }: { selectedDate: Date; onUpdateHabit: (habitId: string, updatedHabit: Partial<Habit>) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const res = await fetch('/habits');
      if (!res.ok) throw new Error('Failed to fetch habits');
      return res.json();
    },
  });

  useEffect(() => {
    setLoading(true);
    fetch(`/calendar/date/${selectedDate.toISOString().split('T')[0]}`)
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [selectedDate]);

  // Check if selected date is today
  const isToday = () => {
    const today = new Date();
    const selected = new Date(selectedDate);
    return today.toDateString() === selected.toDateString();
  };

  if (loading) {
    return (
      <div className="neumorphic-card text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-3"></div>
        <p className="text-sm text-muted-foreground">Loading daily stats...</p>
      </div>
    );
  }

  return (
    <div className="neumorphic-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Daily Progress</h2>
        {isToday() && (
          <span className="text-xs bg-success/10 text-success px-2 py-1 rounded-full">
            Today
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">
            {habits.filter(h => h.checklist.filter(c => c.completed).length >= h.requiredItems).length}
          </div>
          <div className="text-sm text-muted-foreground">Completed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground">{habits.length}</div>
          <div className="text-sm text-muted-foreground">Total</div>
        </div>
      </div>
      
      {habits.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="text-foreground">
              {Math.round((habits.filter(h => h.checklist.filter(c => c.completed).length >= h.requiredItems).length / habits.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 neumorphic-inset">
            <div
              className="h-2 rounded-full bg-success transition-all duration-1000 ease-out"
              style={{ 
                width: `${(habits.filter(h => h.checklist.filter(c => c.completed).length >= h.requiredItems).length / habits.length) * 100}%` 
              }}
              />
          </div>
          </div>
        )}
      </div>
    );
}