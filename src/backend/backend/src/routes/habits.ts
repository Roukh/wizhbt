import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();

router.get("/", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const habits = await prisma.habit.findMany({ include: { pomodoros: true, events: true } });
  // Convert id to string for frontend compatibility
  const habitsWithStringId = habits.map(habit => ({
    ...habit,
    id: habit.id.toString(),
  }));
  res.json(habitsWithStringId);
});

router.post("/", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const { name, description, checklist, requiredItems, startDate } = req.body;
  const habit = await prisma.habit.create({ data: { name, description, checklist, requiredItems, startDate: new Date(startDate) } });
  res.status(201).json({ ...habit, id: habit.id.toString() });
});

router.patch("/:id", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = Number(req.params.id);
  const { name, description, checklist, requiredItems, startDate } = req.body;
  const habit = await prisma.habit.update({ where: { id }, data: { name, description, checklist, requiredItems, startDate: startDate ? new Date(startDate) : undefined } });
  res.json({ ...habit, id: habit.id.toString() });
});

router.delete("/:id", async (req, res) => {
  const prisma: PrismaClient = req.app.locals.prisma;
  const id = Number(req.params.id);
  await prisma.habit.delete({ where: { id } });
  res.sendStatus(204);
});

export default router;

