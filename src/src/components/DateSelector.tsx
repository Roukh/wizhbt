import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
    <div className="bg-card border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <h2 className="text-lg font-semibold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          
          <Button variant="outline" size="sm" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex gap-1 overflow-x-auto pb-2">
          {days.map((day) => (
            <Button
              key={day}
              variant={isSelected(day) ? "default" : "outline"}
              size="sm"
              onClick={() => selectDay(day)}
              className={cn(
                "min-w-[40px] h-10 flex-shrink-0",
                isToday(day) && !isSelected(day) && "border-primary",
                isSelected(day) && "bg-primary text-primary-foreground"
              )}
            >
              {day}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}