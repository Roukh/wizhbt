import React, { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DayStats } from "./DayStats";

interface UniversalCalendarProps {
  calendarData: { [date: string]: any[] };
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

export function UniversalCalendar({ calendarData }: UniversalCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [dayStats, setDayStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDayClick = (date: Date) => {
    if (isFuture(date)) return;
    setSelectedDate(date);
    setModalOpen(true);
  };

  // Refetch day stats every time the popup is opened for a selected date
  useEffect(() => {
    if (modalOpen && selectedDate) {
      setLoading(true);
      fetch(`/calendar/date/${selectedDate.toISOString().split('T')[0]}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch day stats');
          return res.json();
        })
        .then(data => setDayStats(data))
        .catch(() => setDayStats(null))
        .finally(() => setLoading(false));
    }
  }, [modalOpen, selectedDate]);

  // Custom day rendering
  const renderDay = (date: Date, props: any) => {
    const isLocked = isFuture(date);
    const { displayMonth, ...buttonProps } = props;
    return (
      <button
        {...buttonProps}
        onClick={() => handleDayClick(date)}
        disabled={isLocked}
        className={`relative h-9 w-9 flex flex-col items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${props.className || ''}`}
      >
        <span>{date.getDate()}</span>
      </button>
    );
  };

  return (
    <div>
      <Calendar
        mode="single"
        className="rounded-md border"
        modifiers={{
          hasEvent: Object.keys(calendarData).map(dateStr => new Date(dateStr)),
          locked: (date: Date) => isFuture(date),
        }}
        modifiersClassNames={{
          hasEvent: "bg-primary/20 border-primary",
          locked: "opacity-40 pointer-events-none",
        }}
        components={{
          Day: ({ date, ...props }) => renderDay(date, props),
        }}
      />
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Statistics for {selectedDate?.toLocaleDateString()}</DialogTitle>
          </DialogHeader>
          {loading ? (
            <div>Loading...</div>
          ) : dayStats ? (
            <DayStats habits={dayStats.habits} pomodoros={dayStats.pomodoros} />
          ) : (
            <div>No stats for this day.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 