import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();

// Get all pomodoro sessions
router.get("/", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const sessions = await prisma.pomodoroSession.findMany({
    include: { habit: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(sessions);
});

// Get active pomodoro session
router.get("/active", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const session = await prisma.pomodoroSession.findFirst({
    where: { status: "active" },
    include: { habit: true }
  });
  res.json(session);
});

// Start a pomodoro session
router.post("/start", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { habitId, targetDuration } = req.body as { 
    habitId?: number; 
    targetDuration: number; // in minutes
  };

  // Check if there's already an active session
  const activeSession = await prisma.pomodoroSession.findFirst({
    where: { status: "active" }
  });

  if (activeSession) {
    return res.status(400).json({ error: "There is already an active pomodoro session" });
  }

  // Validate target duration (5 minutes to 240 minutes)
  if (targetDuration < 5 || targetDuration > 240) {
    return res.status(400).json({ error: "Target duration must be between 5 and 240 minutes" });
  }

  const session = await prisma.pomodoroSession.create({ 
    data: { 
      habitId, 
      targetDuration: targetDuration * 60, // convert to seconds
      status: "active"
    },
    include: { habit: true }
  });

  res.status(201).json(session);
});

// Update pomodoro session (for real-time tracking)
router.patch("/:id", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = Number(req.params.id);
  const { duration } = req.body as { duration: number };

  const session = await prisma.pomodoroSession.update({
    where: { id },
    data: { duration },
    include: { habit: true }
  });

  res.json(session);
});

// Complete a pomodoro session
router.post("/complete/:id", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = Number(req.params.id);

  const existing = await prisma.pomodoroSession.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (existing.status !== "active") {
    return res.status(400).json({ error: "Session is not active" });
  }

  const endTime = new Date();
  const duration = Math.floor((endTime.getTime() - existing.start.getTime()) / 1000);

  // Update the session
  const session = await prisma.pomodoroSession.update({
    where: { id },
    data: { 
      end: endTime, 
      duration,
      status: "completed"
    },
    include: { habit: true }
  });

  // Create calendar event for this pomodoro
  if (existing.habitId) {
    await prisma.calendarEvent.create({
      data: {
        habitId: existing.habitId,
        title: `Pomodoro: ${existing.habitId ? 'Completed' : 'General'}`,
        date: endTime,
        completed: true,
        type: "pomodoro",
        duration: duration
      }
    });

    // Update or create statistics for this habit and date
    const dateKey = new Date(endTime);
    dateKey.setHours(0, 0, 0, 0);

    await prisma.habitStatistics.upsert({
      where: {
        habitId_date: {
          habitId: existing.habitId,
          date: dateKey
        }
      },
      update: {
        totalPomodoros: { increment: 1 },
        totalDuration: { increment: duration }
      },
      create: {
        habitId: existing.habitId,
        date: dateKey,
        totalPomodoros: 1,
        totalDuration: duration
      }
    });
  }

  res.json(session);
});

// Cancel a pomodoro session
router.post("/cancel/:id", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = Number(req.params.id);

  const existing = await prisma.pomodoroSession.findUnique({ where: { id } });
  if (!existing) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (existing.status !== "active") {
    return res.status(400).json({ error: "Session is not active" });
  }

  const session = await prisma.pomodoroSession.update({
    where: { id },
    data: { 
      status: "cancelled",
      end: new Date()
    },
    include: { habit: true }
  });

  res.json(session);
});

// Get pomodoro statistics
router.get("/stats", async (req, res) => {
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

  const sessions = await prisma.pomodoroSession.findMany({
    where: whereClause,
    include: { habit: true }
  });

  const stats = {
    totalSessions: sessions.length,
    completedSessions: sessions.filter(s => s.status === "completed").length,
    cancelledSessions: sessions.filter(s => s.status === "cancelled").length,
    totalDuration: sessions.reduce((sum, s) => sum + (s.duration || 0), 0),
    averageDuration: sessions.length > 0 
      ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length 
      : 0,
    sessions: sessions
  };

  res.json(stats);
});

export default router;
