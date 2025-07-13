import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface CalendarDay {
  date: Date;
  status: 'complete' | 'incomplete' | 'pending' | 'skipped';
}

interface Habit {
  id: string;
  name: string;
  checklist: any[];
  requiredItems: number;
  streak: number;
}

interface HabitCalendarProps {
  habit: Habit;
  calendarData: CalendarDay[];
}

export function HabitCalendar({ habit, calendarData }: HabitCalendarProps) {
  const getDayClassName = (date: Date) => {
    const dayData = calendarData.find(day => 
      day.date.toDateString() === date.toDateString()
    );
    
    if (!dayData) return "";
    
    const statusClasses = {
      complete: 'bg-complete text-white hover:bg-complete/90',
      incomplete: 'bg-incomplete text-white hover:bg-incomplete/90',
      pending: 'bg-pending text-white hover:bg-pending/90',
      skipped: 'bg-skipped text-white hover:bg-skipped/90'
    };
    
    return statusClasses[dayData.status];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{habit.name}</CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-complete rounded-full"></div>
            <span>Complete</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-pending rounded-full"></div>
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-incomplete rounded-full"></div>
            <span>Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-skipped rounded-full"></div>
            <span>Skipped</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          className="rounded-md border pointer-events-auto"
          modifiers={{
            habit: calendarData.map(day => day.date)
          }}
          modifiersClassNames={{
            habit: ""
          }}
          components={{
            Day: ({ date, ...props }) => {
              const className = getDayClassName(date);
              return (
                <div 
                  {...props}
                  className={cn(
                    "h-9 w-9 p-0 font-normal rounded-md flex items-center justify-center text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    className
                  )}
                >
                  {date.getDate()}
                </div>
              );
            }
          }}
        />
      </CardContent>
    </Card>
  );
}