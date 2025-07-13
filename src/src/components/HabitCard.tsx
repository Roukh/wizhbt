import { useState } from "react";
import { Check, Flame, Calendar, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
}

export function HabitCard({ habit, onUpdateHabit }: HabitCardProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const queryClient = useQueryClient();

  const completedItems = habit.checklist.filter(item => item.completed).length;
  const isHabitCompleted = completedItems >= habit.requiredItems;
  const progressPercentage = (completedItems / habit.checklist.length) * 100;

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

  const toggleChecklistItem = (itemId: string) => {
    const updatedChecklist = habit.checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    const newCompletedCount = updatedChecklist.filter(item => item.completed).length;
    const wasCompleted = completedItems >= habit.requiredItems;
    const nowCompleted = newCompletedCount >= habit.requiredItems;

    // Trigger animation if habit just got completed
    if (!wasCompleted && nowCompleted) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }

    updateHabitMutation.mutate({ checklist: updatedChecklist });
    onUpdateHabit(habit.id, { checklist: updatedChecklist });

    // Create calendar event when habit completion status changes
    const today = new Date().toISOString().split('T')[0];
    fetch('/calendar/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId: habit.id,
        date: today,
        completed: nowCompleted
      })
    }).catch(error => {
      console.error('Failed to create calendar event:', error);
    });
  };

  const resetHabit = () => {
    const resetChecklist = habit.checklist.map(item => ({ ...item, completed: false }));
    updateHabitMutation.mutate({ checklist: resetChecklist });
    onUpdateHabit(habit.id, { checklist: resetChecklist });

    // Mark habit as not completed in calendar
    const today = new Date().toISOString().split('T')[0];
    fetch('/calendar/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        habitId: habit.id,
        date: today,
        completed: false
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

  return (
    <Card className={cn(
      "relative transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      isHabitCompleted && "ring-2 ring-complete/50 shadow-complete/20",
      isAnimating && "animate-habit-complete"
    )}>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-xl border-2",
                isHabitCompleted 
                  ? "bg-complete border-complete text-white" 
                  : "border-muted bg-muted/50"
              )}>
                {isHabitCompleted ? <Check className="h-6 w-6" /> : <Calendar className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-semibold text-lg">{habit.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {completedItems} / {habit.requiredItems} required items
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {habit.streak > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/10 text-secondary text-sm">
                  <Flame className="h-3 w-3" />
                  <span className="font-medium">{habit.streak}</span>
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={deleteHabit} title="Delete Habit">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-500",
                  isHabitCompleted ? "bg-complete" : "bg-secondary"
                )}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {habit.checklist.map((item) => (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleChecklistItem(item.id)}
                />
                <span className={cn(
                  "text-sm flex-1",
                  item.completed && "line-through text-muted-foreground"
                )}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>

          {/* Action Button */}
          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetHabit}
              disabled={completedItems === 0}
            >
              Reset
            </Button>
            
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-medium",
              isHabitCompleted 
                ? "bg-complete/10 text-complete" 
                : "bg-muted text-muted-foreground"
            )}>
              {isHabitCompleted ? "✓ Completed" : "In Progress"}
            </div>
          </div>

          {/* Completion Badge */}
          {isHabitCompleted && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-complete rounded-full flex items-center justify-center animate-bounce-in">
              <Check className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}