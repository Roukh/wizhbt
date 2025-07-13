# WizHBT - Habit Tracker

A modern habit tracking application built with React, TypeScript, and Node.js.

## Features

- ✅ Track daily habits
- ✅ Add and delete habits
- ✅ Pomodoro timer integration
- ✅ Calendar events
- ✅ Modern, responsive UI
- ✅ Real-time updates

## Quick Start

### Option 1: Automated Setup (Recommended)
1. Double-click `start-app.bat` or run `.\start-app.ps1`
2. The script will install dependencies and start both servers
3. Open http://localhost:8080 in your browser

### Option 2: Manual Setup

#### Prerequisites
- Node.js (v18 or higher)
- npm

#### Backend Setup
```bash
cd src/backend
npm install
npm run dev
```

#### Frontend Setup
```bash
cd src
npm install
npm run dev
```

## Development

- **Backend**: http://localhost:3000 (Express + Prisma + SQLite)
- **Frontend**: http://localhost:8080 (React + Vite + TypeScript)

## Project Structure

```
wizhbt/
├── src/
│   ├── backend/          # Node.js backend
│   │   ├── backend/src/  # Backend source code
│   │   └── prisma/       # Database schema
│   ├── public/           # Static HTML file
│   └── src/              # React frontend
├── start-app.bat         # Windows batch script
├── start-app.ps1         # PowerShell script
└── README.md
```

## Technologies Used

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Prisma, SQLite
- **Database**: SQLite (with Prisma ORM)

## License

MIT 