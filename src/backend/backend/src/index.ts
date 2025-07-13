import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import path from "path";
import type { Request, Response, NextFunction } from 'express';

import habitsRouter from "./routes/habits";
import pomodoroRouter from "./routes/pomodoro";
import calendarRouter from "./routes/calendar";
import statsRouter from "./routes/stats";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../../public')));

// Make prisma available to routers via req.app.locals
app.locals.prisma = prisma;

app.use("/habits", habitsRouter);
app.use("/pomodoro", pomodoroRouter);
app.use("/calendar", calendarRouter);
app.use("/stats", statsRouter);

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../../public/index.html'));
});

// Error logging middleware (add this before app.listen)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('UNCAUGHT ERROR:', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

