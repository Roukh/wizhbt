import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();

// Get overall statistics
router.get("/", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { startDate, endDate, habitId } = req.query;

  let whereClause: any = {};
  
  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  if (habitId) {
    whereClause.habitId = Number(habitId);
  }

  // Get habits statistics
  const habits = await prisma.habit.findMany({
    where: habitId ? { id: Number(habitId) } : {},
    include: {
      pomodoros: true,
      events: true,
      statistics: true
    }
  });

  // Get pomodoro statistics
  const pomodoros = await prisma.pomodoroSession.findMany({
    where: whereClause,
    include: { habit: true }
  });

  // Get calendar events statistics
  const events = await prisma.calendarEvent.findMany({
    where: whereClause,
    include: { habit: true }
  });

  // Calculate overall statistics
  const totalHabits = habits.length;
  const totalPomodoros = pomodoros.length;
  const completedPomodoros = pomodoros.filter(p => p.status === "completed").length;
  const cancelledPomodoros = pomodoros.filter(p => p.status === "cancelled").length;
  const totalDuration = pomodoros.reduce((sum, p) => sum + (p.duration || 0), 0);
  const averageDuration = totalPomodoros > 0 ? totalDuration / totalPomodoros : 0;

  const totalEvents = events.length;
  const completedEvents = events.filter(e => e.completed).length;
  const failedEvents = events.filter(e => !e.completed).length;
  const completionRate = totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0;

  // Calculate daily statistics
  const dailyStats = await prisma.habitStatistics.findMany({
    where: whereClause,
    include: { habit: true },
    orderBy: { date: 'desc' }
  });

  const overallStats = {
    habits: {
      total: totalHabits,
      list: habits.map(habit => ({
        id: habit.id,
        name: habit.name,
        description: habit.description,
        totalPomodoros: habit.pomodoros.length,
        completedPomodoros: habit.pomodoros.filter(p => p.status === "completed").length,
        totalEvents: habit.events.length,
        completedEvents: habit.events.filter(e => e.completed).length,
        totalDuration: habit.pomodoros.reduce((sum, p) => sum + (p.duration || 0), 0)
      }))
    },
    pomodoros: {
      total: totalPomodoros,
      completed: completedPomodoros,
      cancelled: cancelledPomodoros,
      totalDuration,
      averageDuration,
      completionRate: totalPomodoros > 0 ? (completedPomodoros / totalPomodoros) * 100 : 0
    },
    events: {
      total: totalEvents,
      completed: completedEvents,
      failed: failedEvents,
      completionRate
    },
    dailyStats: dailyStats.map(stat => ({
      date: stat.date,
      habit: stat.habit,
      totalPomodoros: stat.totalPomodoros,
      totalDuration: stat.totalDuration,
      completedHabits: stat.completedHabits,
      failedHabits: stat.failedHabits
    }))
  };

  res.json(overallStats);
});

// Get statistics for a specific habit
router.get("/habit/:id", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const habitId = Number(req.params.id);
  const { startDate, endDate } = req.query;

  let whereClause: any = { habitId };
  
  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  // Get habit with all related data
  const habit = await prisma.habit.findUnique({
    where: { id: habitId },
    include: {
      pomodoros: {
        where: startDate && endDate ? {
          createdAt: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        } : {},
        orderBy: { createdAt: 'desc' }
      },
      events: {
        where: startDate && endDate ? {
          date: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        } : {},
        orderBy: { date: 'desc' }
      },
      statistics: {
        where: startDate && endDate ? {
          date: {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
          }
        } : {},
        orderBy: { date: 'desc' }
      }
    }
  });

  if (!habit) {
    return res.status(404).json({ error: "Habit not found" });
  }

  const totalPomodoros = habit.pomodoros.length;
  const completedPomodoros = habit.pomodoros.filter(p => p.status === "completed").length;
  const cancelledPomodoros = habit.pomodoros.filter(p => p.status === "cancelled").length;
  const totalDuration = habit.pomodoros.reduce((sum, p) => sum + (p.duration || 0), 0);
  const averageDuration = totalPomodoros > 0 ? totalDuration / totalPomodoros : 0;

  const totalEvents = habit.events.length;
  const completedEvents = habit.events.filter(e => e.completed).length;
  const failedEvents = habit.events.filter(e => !e.completed).length;

  const habitStats = {
    habit: {
      id: habit.id,
      name: habit.name,
      description: habit.description,
      createdAt: habit.createdAt
    },
    pomodoros: {
      total: totalPomodoros,
      completed: completedPomodoros,
      cancelled: cancelledPomodoros,
      totalDuration,
      averageDuration,
      completionRate: totalPomodoros > 0 ? (completedPomodoros / totalPomodoros) * 100 : 0,
      sessions: habit.pomodoros
    },
    events: {
      total: totalEvents,
      completed: completedEvents,
      failed: failedEvents,
      completionRate: totalEvents > 0 ? (completedEvents / totalEvents) * 100 : 0,
      list: habit.events
    },
    dailyStats: habit.statistics.map(stat => ({
      date: stat.date,
      totalPomodoros: stat.totalPomodoros,
      totalDuration: stat.totalDuration,
      completedHabits: stat.completedHabits,
      failedHabits: stat.failedHabits
    }))
  };

  res.json(habitStats);
});

// Get daily statistics
router.get("/daily", async (req, res) => {
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

  const dailyStats = await prisma.habitStatistics.findMany({
    where: whereClause,
    include: { habit: true },
    orderBy: { date: 'desc' }
  });

  // Group by date
  const statsByDate: { [key: string]: any[] } = {};
  dailyStats.forEach(stat => {
    const dateKey = stat.date.toISOString().split('T')[0];
    if (!statsByDate[dateKey]) {
      statsByDate[dateKey] = [];
    }
    statsByDate[dateKey].push(stat);
  });

  // Calculate daily summaries
  const dailySummaries = Object.entries(statsByDate).map(([date, stats]) => ({
    date,
    totalPomodoros: stats.reduce((sum, stat) => sum + stat.totalPomodoros, 0),
    totalDuration: stats.reduce((sum, stat) => sum + stat.totalDuration, 0),
    completedHabits: stats.reduce((sum, stat) => sum + stat.completedHabits, 0),
    failedHabits: stats.reduce((sum, stat) => sum + stat.failedHabits, 0),
    habits: stats.map(stat => ({
      habit: stat.habit,
      totalPomodoros: stat.totalPomodoros,
      totalDuration: stat.totalDuration,
      completedHabits: stat.completedHabits,
      failedHabits: stat.failedHabits
    }))
  }));

  res.json({
    dailyStats: dailySummaries,
    totalDays: dailySummaries.length,
    totalPomodoros: dailySummaries.reduce((sum, day) => sum + day.totalPomodoros, 0),
    totalDuration: dailySummaries.reduce((sum, day) => sum + day.totalDuration, 0),
    totalCompletedHabits: dailySummaries.reduce((sum, day) => sum + day.completedHabits, 0),
    totalFailedHabits: dailySummaries.reduce((sum, day) => sum + day.failedHabits, 0)
  });
});

// Get pomodoro statistics
router.get("/pomodoro", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { startDate, endDate, habitId } = req.query;

  let whereClause: any = {};
  
  if (startDate && endDate) {
    whereClause.createdAt = {
      gte: new Date(startDate as string),
      lte: new Date(endDate as string)
    };
  }

  if (habitId) {
    whereClause.habitId = Number(habitId);
  }

  const pomodoros = await prisma.pomodoroSession.findMany({
    where: whereClause,
    include: { habit: true },
    orderBy: { createdAt: 'desc' }
  });

  const totalSessions = pomodoros.length;
  const completedSessions = pomodoros.filter(p => p.status === "completed").length;
  const cancelledSessions = pomodoros.filter(p => p.status === "cancelled").length;
  const activeSessions = pomodoros.filter(p => p.status === "active").length;
  const totalDuration = pomodoros.reduce((sum, p) => sum + (p.duration || 0), 0);
  const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;

  // Group by habit
  const pomodorosByHabit: { [key: string]: any[] } = {};
  pomodoros.forEach(pomodoro => {
    const habitName = pomodoro.habit?.name || 'General';
    if (!pomodorosByHabit[habitName]) {
      pomodorosByHabit[habitName] = [];
    }
    pomodorosByHabit[habitName].push(pomodoro);
  });

  const pomodoroStats = {
    totalSessions,
    completedSessions,
    cancelledSessions,
    activeSessions,
    totalDuration,
    averageDuration,
    completionRate: totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0,
    byHabit: Object.entries(pomodorosByHabit).map(([habitName, sessions]) => ({
      habitName,
      totalSessions: sessions.length,
      completedSessions: sessions.filter(s => s.status === "completed").length,
      totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      averageDuration: sessions.length > 0 
        ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length 
        : 0
    })),
    sessions: pomodoros
  };

  res.json(pomodoroStats);
});

export default router;

