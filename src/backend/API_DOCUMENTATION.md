# Backend API Documentation

## Overview
This backend provides a comprehensive API for habit tracking, pomodoro sessions, calendar management, and statistics. The API is built with Express.js and uses Prisma with SQLite for data persistence.

## Base URL
```
http://localhost:3000
```

## Endpoints

### Habits Management

#### GET /habits
Get all habits with their related pomodoros and events.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Exercise",
    "description": "Daily workout",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "pomodoros": [...],
    "events": [...],
    "statistics": [...]
  }
]
```

#### POST /habits
Create a new habit.

**Request Body:**
```json
{
  "name": "Exercise",
  "description": "Daily workout"
}
```

#### PATCH /habits/:id
Update an existing habit.

**Request Body:**
```json
{
  "name": "Updated Exercise",
  "description": "Updated description"
}
```

#### DELETE /habits/:id
Delete a habit.

### Pomodoro Management

#### GET /pomodoro
Get all pomodoro sessions.

**Response:**
```json
[
  {
    "id": 1,
    "habitId": 1,
    "start": "2024-01-01T10:00:00.000Z",
    "end": "2024-01-01T10:25:00.000Z",
    "duration": 1500,
    "targetDuration": 1500,
    "status": "completed",
    "createdAt": "2024-01-01T10:00:00.000Z",
    "habit": {...}
  }
]
```

#### GET /pomodoro/active
Get the currently active pomodoro session.

#### POST /pomodoro/start
Start a new pomodoro session.

**Request Body:**
```json
{
  "habitId": 1,
  "targetDuration": 25
}
```

**Validation:**
- `targetDuration` must be between 5 and 240 minutes
- Only one active session allowed at a time

#### PATCH /pomodoro/:id
Update pomodoro session duration (for real-time tracking).

**Request Body:**
```json
{
  "duration": 1200
}
```

#### POST /pomodoro/complete/:id
Complete a pomodoro session.

**Response:**
- Updates session status to "completed"
- Creates calendar event
- Updates habit statistics

#### POST /pomodoro/cancel/:id
Cancel a pomodoro session.

**Response:**
- Updates session status to "cancelled"

#### GET /pomodoro/stats
Get pomodoro statistics.

**Query Parameters:**
- `startDate`: Start date for filtering
- `endDate`: End date for filtering
- `habitId`: Filter by specific habit

**Response:**
```json
{
  "totalSessions": 10,
  "completedSessions": 8,
  "cancelledSessions": 2,
  "totalDuration": 12000,
  "averageDuration": 1200,
  "sessions": [...]
}
```

### Calendar Management

#### GET /calendar
Get calendar data for a specific month.

**Query Parameters:**
- `year`: Year (default: current year)
- `month`: Month (default: current month)

**Response:**
```json
{
  "year": 2024,
  "month": 1,
  "eventsByDate": {
    "2024-01-01": [...],
    "2024-01-02": [...]
  },
  "statsByDate": {
    "2024-01-01": [...],
    "2024-01-02": [...]
  }
}
```

#### GET /calendar/date/:date
Get detailed data for a specific date.

**Response:**
```json
{
  "date": "2024-01-01",
  "events": [...],
  "statistics": [...],
  "pomodoros": [...],
  "summary": {
    "totalEvents": 5,
    "completedEvents": 4,
    "failedEvents": 1,
    "totalPomodoros": 3,
    "completedPomodoros": 3,
    "totalDuration": 4500,
    "habits": [...]
  }
}
```

#### POST /calendar/complete
Mark a habit as completed for a specific date.

**Request Body:**
```json
{
  "habitId": 1,
  "date": "2024-01-01",
  "completed": true
}
```

#### GET /calendar/stats
Get calendar statistics for a date range.

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `habitId`: Filter by habit

### Statistics

#### GET /stats
Get overall statistics.

**Query Parameters:**
- `startDate`: Start date for filtering
- `endDate`: End date for filtering
- `habitId`: Filter by specific habit

**Response:**
```json
{
  "habits": {
    "total": 5,
    "list": [...]
  },
  "pomodoros": {
    "total": 20,
    "completed": 18,
    "cancelled": 2,
    "totalDuration": 18000,
    "averageDuration": 900,
    "completionRate": 90
  },
  "events": {
    "total": 50,
    "completed": 45,
    "failed": 5,
    "completionRate": 90
  },
  "dailyStats": [...]
}
```

#### GET /stats/habit/:id
Get statistics for a specific habit.

**Query Parameters:**
- `startDate`: Start date for filtering
- `endDate`: End date for filtering

#### GET /stats/daily
Get daily statistics.

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `habitId`: Filter by habit

#### GET /stats/pomodoro
Get pomodoro-specific statistics.

**Query Parameters:**
- `startDate`: Start date
- `endDate`: End date
- `habitId`: Filter by habit

## Database Schema

### Habit
- `id`: Primary key
- `name`: Habit name
- `description`: Optional description
- `createdAt`: Creation timestamp
- `updatedAt`: Last update timestamp

### PomodoroSession
- `id`: Primary key
- `habitId`: Foreign key to Habit
- `start`: Session start time
- `end`: Session end time
- `duration`: Duration in seconds
- `targetDuration`: Target duration in seconds
- `status`: "active", "completed", or "cancelled"
- `createdAt`: Creation timestamp

### CalendarEvent
- `id`: Primary key
- `habitId`: Foreign key to Habit
- `title`: Event title
- `date`: Event date
- `completed`: Completion status
- `type`: "habit" or "pomodoro"
- `duration`: Duration in seconds (for pomodoro events)
- `createdAt`: Creation timestamp

### HabitStatistics
- `id`: Primary key
- `habitId`: Foreign key to Habit
- `date`: Statistics date
- `totalPomodoros`: Total pomodoros for the day
- `totalDuration`: Total duration in seconds
- `completedHabits`: Completed habits count
- `failedHabits`: Failed habits count
- `createdAt`: Creation timestamp

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `404`: Not Found
- `500`: Internal Server Error

Error responses include an error message:
```json
{
  "error": "Error description"
}
```

## Running the Backend

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma generate
npx prisma db push
```

3. Start the development server:
```bash
npm run dev
```

The server will start on `http://localhost:3000` 