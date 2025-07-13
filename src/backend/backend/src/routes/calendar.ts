import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();

// Get calendar data for a specific month
router.get("/", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { year, month } = req.query;

  const currentYear = year ? Number(year) : new Date().getFullYear();
  const currentMonth = month ? Number(month) : new Date().getMonth() + 1;

  const startDate = new Date(currentYear, currentMonth - 1, 1);
  const endDate = new Date(currentYear, currentMonth, 0);

  // Get all events for the month
  const events = await prisma.calendarEvent.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: { habit: true },
    orderBy: { date: 'asc' }
  });

  // Get statistics for the month
  const statistics = await prisma.habitStatistics.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate
      }
    },
    include: { habit: true },
    orderBy: { date: 'asc' }
  });

  // Group events by date
  const eventsByDate: { [key: string]: any[] } = {};
  events.forEach(event => {
    const dateKey = event.date.toISOString().split('T')[0];
    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = [];
    }
    eventsByDate[dateKey].push(event);
  });

  // Group statistics by date
  const statsByDate: { [key: string]: any[] } = {};
  statistics.forEach(stat => {
    const dateKey = stat.date.toISOString().split('T')[0];
    if (!statsByDate[dateKey]) {
      statsByDate[dateKey] = [];
    }
    statsByDate[dateKey].push(stat);
  });

  res.json({
    year: currentYear,
    month: currentMonth,
    eventsByDate,
    statsByDate
  });
});

// Get detailed data for a specific date
router.get("/date/:date", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { date } = req.params;

  const targetDate = new Date(date);
  const startOfDay = new Date(targetDate);
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setUTCHours(23, 59, 59, 999);

  // Get all habits
  const habits = await prisma.habit.findMany();

  // Get all events for the specific date
  const events = await prisma.calendarEvent.findMany({
    where: {
      date: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: { habit: true },
    orderBy: { date: 'asc' }
  });

  // Get statistics for the specific date
  const statistics = await prisma.habitStatistics.findMany({
    where: {
      date: startOfDay
    },
    include: { habit: true }
  });

  // Get pomodoro sessions for the specific date
  const pomodoros = await prisma.pomodoroSession.findMany({
    where: {
      start: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: { habit: true },
    orderBy: { start: 'asc' }
  });

  console.log('--- /calendar/date/:date ---');
  console.log('Requested date:', date);
  console.log('Events for this day:', events);

  // For each habit, determine if it was completed on this day (match badge logic)
  const habitsForDay = habits.map(habit => {
    const habitEvents = events.filter(e => Number(e.habitId) === Number(habit.id) && e.type === 'habit');
    const completed = habitEvents.some(e => !!e.completed);
    return {
      id: habit.id,
      name: habit.name,
      completed,
    };
  });
  console.log('habitsForDay:', habitsForDay);

  // Calculate summary statistics
  const summary = {
    totalEvents: events.length,
    completedEvents: events.filter(e => e.completed).length,
    failedEvents: events.filter(e => !e.completed).length,
    totalPomodoros: pomodoros.length,
    completedPomodoros: pomodoros.filter(p => p.status === "completed").length,
    totalDuration: pomodoros.reduce((sum, p) => sum + (p.duration || 0), 0),
    habits: statistics.map(stat => ({
      habit: stat.habit,
      totalPomodoros: stat.totalPomodoros,
      totalDuration: stat.totalDuration,
      completedHabits: stat.completedHabits,
      failedHabits: stat.failedHabits
    }))
  };

  res.json({
    date: targetDate.toISOString().split('T')[0],
    habits: habitsForDay,
    events,
    statistics,
    pomodoros,
    summary
  });
});

// Mark a habit as completed for a specific date
router.post("/complete", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { habitId, date, completed } = req.body;

  const targetDate = new Date(date);
  targetDate.setUTCHours(0, 0, 0, 0); // Normalize to midnight UTC

  // Create calendar event
  console.log('Creating calendar event:', { habitId, date: targetDate, completed, type: "habit" });
  const event = await prisma.calendarEvent.create({
    data: {
      habitId: habitId ? Number(habitId) : null,
      title: `Habit: ${habitId ? 'Completed' : 'General'}`,
      date: targetDate,
      completed,
      type: "habit"
    }
  });

  // Update statistics
  await prisma.habitStatistics.upsert({
    where: {
      habitId_date: {
        habitId: Number(habitId),
        date: targetDate
      }
    },
    update: {
      completedHabits: completed ? { increment: 1 } : { increment: 0 },
      failedHabits: completed ? { increment: 0 } : { increment: 1 }
    },
    create: {
      habitId: Number(habitId),
      date: targetDate,
      completedHabits: completed ? 1 : 0,
      failedHabits: completed ? 0 : 1
    }
  });

  res.json(event);
});

// Get calendar statistics for a date range
router.get("/stats", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { startDate, endDate, habitId } = req.query;

  let whereClause: any = {};
  
  if (startDate && endDate) {
    whereClause.date = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  if (habitId) {
    whereClause.habitId = Number(habitId);
  }

  const events = await prisma.calendarEvent.findMany({
    where: whereClause,
    include: { habit: true }
  });

  const statistics = await prisma.habitStatistics.findMany({
    where: whereClause,
    include: { habit: true }
  });

  const stats = {
    totalEvents: events.length,
    completedEvents: events.filter(e => e.completed).length,
    failedEvents: events.filter(e => !e.completed).length,
    totalPomodoros: events.filter(e => e.type === "pomodoro").length,
    totalDuration: events.reduce((sum, e) => sum + (e.duration || 0), 0),
    averageCompletionRate: events.length > 0 
      ? (events.filter(e => e.completed).length / events.length) * 100 
      : 0,
    events,
    statistics
  };

  res.json(stats);
});

export default router;

