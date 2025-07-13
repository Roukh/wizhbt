import { useState } from "react";
import { Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HabitCard } from "./HabitCard";
import { HabitCalendar } from "./HabitCalendar";
import { CreateHabitModal } from "./CreateHabitModal";
import { DateSelector } from "./DateSelector";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PomodoroPanel } from "./PomodoroPanel";
import { UniversalCalendar } from "./UniversalCalendar";
import { useEffect } from "react";
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
  type CalendarEvent = { habitId: string; completed: boolean; date: string };
  type CalendarData = { eventsByDate: { [date: string]: CalendarEvent[] } };
  const { data: calendarData = { eventsByDate: {} }, isLoading: isCalendarLoading } = useQuery<CalendarData>({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const res = await fetch(`/calendar?year=${year}&month=${month}`);
      if (!res.ok) throw new Error('Failed to fetch calendar');
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
    // eventsByDate: { [date: string]: CalendarEvent[] }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Header removed */}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading && <div>Loading habits...</div>}
        {isError && <div>Error loading habits.</div>}
        <Tabs defaultValue="today" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[450px]">
            <TabsTrigger value="today">Daily</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="pomodoro">Pomodoro</TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-6 relative">
            {/* Date Selector only in Daily tab */}
            <DateSelector 
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
            />
            <DailyStats selectedDate={selectedDate} onUpdateHabit={updateHabit} />
            {/* Floating Add Habit Button */}
            <button
              className="fixed bottom-8 right-8 z-50 bg-primary text-white rounded-full shadow-lg p-4 flex items-center justify-center hover:bg-primary/90 transition-colors"
              onClick={() => setIsCreateModalOpen(true)}
              aria-label="Add Habit"
            >
              <Plus className="h-6 w-6" />
            </button>
          </TabsContent>

          <TabsContent value="calendar" className="space-y-6">
            {isCalendarLoading && <div>Loading calendar...</div>}
            <div className="flex justify-center items-start w-full">
              <div className="w-full max-w-3xl">
                <UniversalCalendar calendarData={calendarData.eventsByDate || {}} />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="pomodoro" className="space-y-6">
            <PomodoroPanel habits={habits} />
          </TabsContent>
        </Tabs>
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

  if (loading) return <div>Loading...</div>;
  
  // For today, show interactive HabitCard components
  if (isToday()) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Today's Habits</h2>
        {habits.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No habits for today. Create your first habit to get started!
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {habits.map(habit => (
              <HabitCard 
                key={habit.id} 
                habit={habit} 
                onUpdateHabit={onUpdateHabit}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // For past/future days, show summary stats
  if (!data) return <div>No data for this day.</div>;
  return <DayStats habits={data.habits} pomodoros={data.pomodoros} />;
}