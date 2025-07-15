import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateSelectorProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function DateSelector({ selectedDate, onDateSelect }: DateSelectorProps) {
  const today = new Date();
  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  
  // Get days for the current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(currentMonth - 1);
    onDateSelect(newDate);
  };
  
  const goToNextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(currentMonth + 1);
    onDateSelect(newDate);
  };
  
  const selectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    // Set hours to 0 to avoid timezone issues
    newDate.setHours(0, 0, 0, 0);
    onDateSelect(newDate);
  };
  
  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === currentMonth && 
           today.getFullYear() === currentYear;
  };
  
  const isSelected = (day: number) => {
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === currentMonth &&
           selectedDate.getFullYear() === currentYear;
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="neumorphic-card">
      <div className="flex items-center justify-between mb-4">
        {/* Remove previous/next month arrows */}
        <div className="flex items-center gap-2 ml-4">
          <h2 className="text-lg font-bold" style={{ color: '#fff', marginLeft: '2px' }}>
            {monthNames[currentMonth]} {currentYear}
          </h2>
        </div>
      </div>
      
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => selectDay(day)}
            className={cn(
              "min-w-[44px] h-12 rounded-xl font-medium transition-all touch-target flex items-center justify-center",
              isSelected(day) 
                ? "bg-primary text-primary-foreground shadow-pressed" 
                : isToday(day)
                ? "bg-warning/10 text-warning border-2 border-warning/20 shadow-soft"
                : "bg-muted/20 text-foreground hover:bg-muted/30 shadow-soft hover:shadow-hover"
            )}
          >
            {day}
          </button>
        ))}
      </div>
      
      {/* Quick navigation buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={() => {
            const todayMidnight = new Date();
            todayMidnight.setHours(0, 0, 0, 0);
            onDateSelect(todayMidnight);
          }}
          className="flex-1 neumorphic-button secondary text-sm touch-target"
        >
          Today
        </button>
        <button
          onClick={() => {
            const yesterday = new Date();
            yesterday.setHours(0, 0, 0, 0);
            yesterday.setDate(yesterday.getDate() - 1);
            onDateSelect(yesterday);
          }}
          className="flex-1 neumorphic-button secondary text-sm touch-target"
        >
          Yesterday
        </button>
      </div>
    </div>
  );
}