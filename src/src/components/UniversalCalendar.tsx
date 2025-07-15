import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DayStats } from "./DayStats";
import { useQuery } from "@tanstack/react-query";

interface UniversalCalendarProps {
  calendarData: { [date: string]: any[] };
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

interface Habit {
  id: string;
  name: string;
}

function isFuture(date: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Only lock days strictly after today
  return date.setHours(0,0,0,0) > today.getTime();
}

function getDayStats(date: Date, calendarData: { [date: string]: any[] }) {
  const dateStr = date.toISOString().split('T')[0];
  const events = calendarData[dateStr] || [];
  let completed = 0, failed = 0, pomodoroMinutes = 0;
  for (const e of events) {
    if (e.type === 'habit') {
      if (e.completed) completed++;
      else failed++;
    }
    if (e.type === 'pomodoro') {
      pomodoroMinutes += e.duration ? Math.round(e.duration / 60) : 0;
    }
  }
  return { completed, failed, pomodoroMinutes };
}

export function UniversalCalendar({ calendarData, selectedDate, onDateSelect }: UniversalCalendarProps) {
  // Fetch all habits for calendar cards
  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ["habits"],
    queryFn: async () => {
      const res = await fetch("/habits");
      if (!res.ok) throw new Error("Failed to fetch habits");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      {habits.map((habit) => (
        <HabitWeekCalendarCard key={habit.id} habit={habit} />
      ))}
    </div>
  );
}

function HabitWeekCalendarCard({ habit }: { habit: { id: string; name: string } }) {
  const { data: habitWeek = { week: [] }, isLoading } = useQuery({
    queryKey: ["habit-week", habit.id],
    queryFn: async () => {
      const res = await fetch(`/calendar/habit/${habit.id}`);
      if (!res.ok) throw new Error("Failed to fetch habit week");
      return res.json();
    },
  });
  // Ensure the last day is always today
  const sortedWeek = [...habitWeek.week].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  // Mini analytics: streak and completion rate for the week
  const streak = (() => {
    let s = 0;
    for (let i = sortedWeek.length - 1; i >= 0; i--) {
      if (sortedWeek[i].status === "complete") s++;
      else break;
    }
    return s;
  })();
  const completedDays = sortedWeek.filter(d => d.status === "complete").length;
  const completionRate = sortedWeek.length > 0 ? Math.round((completedDays / sortedWeek.length) * 100) : 0;
  return (
    <div className="neumorphic-card p-4">
      <div className="font-semibold text-lg mb-2" style={{ color: '#fff', marginLeft: '4px' }}>{habit.name}</div>
      <div className="flex justify-between items-center gap-2">
        {sortedWeek.map((day: { date: string; status: string }, idx: number) => {
          const isToday = idx === sortedWeek.length - 1;
          let circleColor = "bg-muted-foreground/30 border border-white";
          if (day.status === "complete") circleColor = "bg-[#98FBCB] border border-white";
          else if (day.status === "incomplete") circleColor = "bg-destructive border border-white";
          else if (day.status === "none") circleColor = "bg-muted-foreground/30 border border-white";
          return (
            <div
              key={day.date}
              className={
                `flex flex-col items-center justify-center` // Remove ring for today
              }
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${circleColor} neumorphic-inset`}
                style={{ color: '#fff', backgroundImage: 'none' }} // Remove gradient
              >
                {new Date(day.date).getDate()}
              </div>
              <span className="text-xs mt-1" style={{ color: '#fff' }}>
                {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
              </span>
            </div>
          );
        })}
      </div>
      {/* Mini analytics */}
      <div className="flex justify-between items-center mt-4 text-sm" style={{ color: '#fff', marginLeft: '4px' }}>
        <div>Streak: <span className="font-bold text-warning">{streak}</span></div>
        <div>Week Completion: <span className="font-bold text-success">{completionRate}%</span></div>
      </div>
    </div>
  );
} 