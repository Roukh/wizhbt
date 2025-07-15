import { useState, useEffect } from "react";
import { Check, Flame, Calendar, Trash2, Target, MoreVertical, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Habit {
  id: string;
  name: string;
  checklist: ChecklistItem[];
  requiredItems: number;
  streak: number;
}

interface HabitCardProps {
  habit: Habit;
  onUpdateHabit: (habitId: string, updatedHabit: Partial<Habit>) => void;
  selectedDate: Date;
  perDayChecklist?: ChecklistItem[] | null;
  perDayCompleted?: boolean;
}

export function HabitCard({ habit, onUpdateHabit, selectedDate, perDayChecklist, perDayCompleted }: HabitCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const queryClient = useQueryClient();
  const [skipped, setSkipped] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(true);

  // Use per-day checklist if available, otherwise use a copy of the habit's template for the day
  const [dayChecklist, setDayChecklist] = useState<ChecklistItem[]>(() => {
    if (perDayChecklist && Array.isArray(perDayChecklist)) return perDayChecklist;
    // Deep copy template
    return habit.checklist.map(item => ({ ...item, completed: false }));
  });
  useEffect(() => {
    if (perDayChecklist && Array.isArray(perDayChecklist)) {
      setDayChecklist(perDayChecklist);
    } else {
      setDayChecklist(habit.checklist.map(item => ({ ...item, completed: false })));
    }
  }, [perDayChecklist, habit.checklist]);

  const completedItems = dayChecklist.filter(item => item.completed).length;
  const isHabitCompleted = completedItems >= habit.requiredItems;
  const progressPercentage = (completedItems / dayChecklist.length) * 100;

  // Backend update mutation
  const updateHabitMutation = useMutation({
    mutationFn: async (updated: Partial<Habit>) => {
      const res = await fetch(`/habits/${habit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error('Failed to update habit');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  // Backend delete mutation
  const deleteHabitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/habits/${habit.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete habit');
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });

  // Toggle checklist item for the day
  const toggleChecklistItem = (itemId: string) => {
    const updatedChecklist = dayChecklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    setDayChecklist(updatedChecklist);

    const newCompletedCount = updatedChecklist.filter(item => item.completed).length;
    const wasCompleted = completedItems >= habit.requiredItems;
    const nowCompleted = newCompletedCount >= habit.requiredItems;

    // Trigger animation if habit just got completed
    if (!wasCompleted && nowCompleted) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }

    // Save per-day checklist to backend
    const dateStr = selectedDate.toISOString().split('T')[0];
    fetch('/calendar/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId: habit.id,
        date: dateStr,
        completed: nowCompleted,
        checklist: updatedChecklist
      })
    }).catch(error => {
      console.error('Failed to create calendar event:', error);
    });
  };

  // Reset per-day checklist
  const resetHabit = () => {
    const resetChecklist = dayChecklist.map(item => ({ ...item, completed: false }));
    setDayChecklist(resetChecklist);
    const dateStr = selectedDate.toISOString().split('T')[0];
    fetch('/calendar/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId: habit.id,
        date: dateStr,
        completed: false,
        checklist: resetChecklist
      })
    }).catch(error => {
      console.error('Failed to create calendar event:', error);
    });
  };

  const deleteHabit = () => {
    if (window.confirm('Are you sure you want to delete this habit?')) {
      deleteHabitMutation.mutate();
    }
  };

  // Determine if the selected date is in the future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isFutureDay = selectedDate > today;

  return (
    <div className={cn(
      "neumorphic-card relative transition-all duration-300 group",
      isHabitCompleted && "ring-2 ring-success/20 shadow-soft",
      isAnimating && "habit-complete",
      isFutureDay && "opacity-60"
    )}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all duration-300",
              isHabitCompleted 
                ? "bg-success/10 text-success shadow-soft" 
                : "bg-muted/20 text-muted-foreground neumorphic-inset"
            )}>
              {isHabitCompleted ? (
                <Check className="h-6 w-6" />
              ) : (
                <Target className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg" style={{ color: '#fff' }}>{habit.name}</h3>
              {!isFutureDay && (
                <p className="text-sm text-muted-foreground">
                  {completedItems} / {habit.requiredItems} required items
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {habit.streak > 0 && !isFutureDay && (
              <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-warning/10 text-warning text-sm neumorphic-inset">
                <Flame className="h-3 w-3" />
                <span className="font-medium">{habit.streak}</span>
              </div>
            )}
            {/* Collapse/Expand Arrow */}
            <button
              className="p-2 rounded-lg hover:bg-muted/20 transition-all touch-target"
              title={checklistOpen ? 'Hide Checklist' : 'Show Checklist'}
              onClick={() => setChecklistOpen((open) => !open)}
            >
              <ChevronDown className={cn("h-5 w-5 transition-transform", checklistOpen ? "rotate-180" : "rotate-0")} style={{ color: '#000' }} />
            </button>
            {/* Menu Button */}
            {!isFutureDay && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 rounded-lg hover:bg-muted/20 transition-all touch-target"
                    title="Habit Actions"
                  >
                    <MoreVertical className="h-5 w-5" style={{ color: '#000' }} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {/* TODO: open edit modal */}}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={resetHabit}>
                    Reset
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={deleteHabit} className="text-destructive">
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSkipped(s => !s)}>
                    {skipped ? "Unskip for the day" : "Skip for the day"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        {/* Progress Bar */}
        {!isFutureDay && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3 neumorphic-inset">
              <div 
                className={cn(
                  "h-3 rounded-full transition-all duration-700 ease-out",
                  skipped ? "bg-blue-500" : isHabitCompleted ? "bg-success" : "bg-primary"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Checklist */}
        {checklistOpen && !isFutureDay ? (
          <div className="space-y-2">
            {dayChecklist.map((item) => (
              <div 
                key={item.id} 
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30 transition-all touch-target cursor-pointer"
                onClick={() => toggleChecklistItem(item.id)}
              >
                <div className={cn(
                  "w-5 h-5 flex items-center justify-center border rounded-full",
                  item.completed ? "bg-success border-success text-white" : "bg-muted border-border text-muted-foreground"
                )}>
                  {item.completed && <Check className="h-4 w-4" />}
                </div>
                <span className={cn(
                  "flex-1 text-sm",
                  item.completed && "line-through text-muted-foreground"
                )}>{item.text}</span>
              </div>
            ))}
          </div>
        ) : null}

      </div>
    </div>
  );
}