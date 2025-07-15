// API Service for Habit Tracker Backend Integration

interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

interface Habit {
  id: string;
  name: string;
  description?: string;
  checklist: ChecklistItem[];
  requiredItems: number;
  streak: number;
  startDate: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface CalendarEvent {
  habitId: string;
  completed: boolean;
  date: string;
}

interface Stats {
  totalHabits: number;
  completedToday: number;
  currentStreak: number;
  longestStreak: number;
  weeklyProgress: number;
  monthlyProgress: number;
  totalCompletions: number;
  averageDaily: number;
}

interface PomodoroSession {
  id: string;
  habitId?: string;
  type: 'focus' | 'short-break' | 'long-break';
  duration: number;
  completed: boolean;
  startTime?: Date;
  endTime?: Date;
}

class ApiService {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, success: true };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      };
    }
  }

  private getCacheKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${endpoint}${paramString}`;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateCache(pattern?: string): void {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Habits API
  async getHabits(): Promise<ApiResponse<Habit[]>> {
    const cacheKey = this.getCacheKey('/habits');
    const cached = this.getCached<Habit[]>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<Habit[]>('/habits');
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  async createHabit(habit: Omit<Habit, 'id' | 'streak'> & { startDate: string }): Promise<ApiResponse<Habit>> {
    const result = await this.request<Habit>('/habits', {
      method: 'POST',
      body: JSON.stringify(habit),
    });
    
    if (result.success) {
      this.invalidateCache('/habits');
      this.invalidateCache('/stats');
    }
    
    return result;
  }

  async updateHabit(id: string, updates: Partial<Habit>): Promise<ApiResponse<Habit>> {
    const result = await this.request<Habit>(`/habits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    
    if (result.success) {
      this.invalidateCache('/habits');
      this.invalidateCache('/stats');
      this.invalidateCache('/calendar');
    }
    
    return result;
  }

  async deleteHabit(id: string): Promise<ApiResponse<void>> {
    const result = await this.request<void>(`/habits/${id}`, {
      method: 'DELETE',
    });
    
    if (result.success) {
      this.invalidateCache('/habits');
      this.invalidateCache('/stats');
      this.invalidateCache('/calendar');
    }
    
    return result;
  }

  // Calendar API
  async getCalendarData(year: number, month: number): Promise<ApiResponse<{ eventsByDate: Record<string, CalendarEvent[]> }>> {
    const cacheKey = this.getCacheKey('/calendar', { year, month });
    const cached = this.getCached<{ eventsByDate: Record<string, CalendarEvent[]> }>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<{ eventsByDate: Record<string, CalendarEvent[]> }>(`/calendar?year=${year}&month=${month}`);
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  async getDateData(date: string): Promise<ApiResponse<any>> {
    const cacheKey = this.getCacheKey(`/calendar/date/${date}`);
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<any>(`/calendar/date/${date}`);
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  async completeHabit(habitId: string, date: string, completed: boolean): Promise<ApiResponse<void>> {
    const result = await this.request<void>('/calendar/complete', {
      method: 'POST',
      body: JSON.stringify({ habitId, date, completed }),
    });
    
    if (result.success) {
      this.invalidateCache('/calendar');
      this.invalidateCache('/stats');
    }
    
    return result;
  }

  // Stats API
  async getStats(): Promise<ApiResponse<Stats>> {
    const cacheKey = this.getCacheKey('/stats');
    const cached = this.getCached<Stats>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<Stats>('/stats');
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  async getWeeklyProgress(): Promise<ApiResponse<Array<{ date: string; completed: number; total: number }>>> {
    const cacheKey = this.getCacheKey('/stats/weekly');
    const cached = this.getCached<Array<{ date: string; completed: number; total: number }>>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<Array<{ date: string; completed: number; total: number }>>('/stats/weekly');
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  async getMonthlyProgress(): Promise<ApiResponse<Array<{ date: string; completed: number; total: number }>>> {
    const cacheKey = this.getCacheKey('/stats/monthly');
    const cached = this.getCached<Array<{ date: string; completed: number; total: number }>>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<Array<{ date: string; completed: number; total: number }>>('/stats/monthly');
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  // Pomodoro API
  async savePomodoroSession(session: PomodoroSession): Promise<ApiResponse<PomodoroSession>> {
    const result = await this.request<PomodoroSession>('/pomodoro/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
    
    if (result.success) {
      this.invalidateCache('/stats');
    }
    
    return result;
  }

  async getPomodoroSessions(date?: string): Promise<ApiResponse<PomodoroSession[]>> {
    const endpoint = date ? `/pomodoro/sessions?date=${date}` : '/pomodoro/sessions';
    const cacheKey = this.getCacheKey(endpoint);
    const cached = this.getCached<PomodoroSession[]>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<PomodoroSession[]>(endpoint);
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  // Analytics API
  async getAnalytics(period: 'week' | 'month' | 'year' = 'week'): Promise<ApiResponse<any>> {
    const cacheKey = this.getCacheKey('/analytics', { period });
    const cached = this.getCached<any>(cacheKey);
    if (cached) {
      return { data: cached, success: true };
    }

    const result = await this.request<any>(`/analytics?period=${period}`);
    if (result.success && result.data) {
      this.setCache(cacheKey, result.data);
    }
    return result;
  }

  // Utility methods
  clearCache(): void {
    this.cache.clear();
  }

  setCacheTimeout(timeout: number): void {
    this.cacheTimeout = timeout;
  }

  // Batch operations for better performance
  async batchUpdateHabits(updates: Array<{ id: string; updates: Partial<Habit> }>): Promise<ApiResponse<Habit[]>> {
    const result = await this.request<Habit[]>('/habits/batch', {
      method: 'PATCH',
      body: JSON.stringify({ updates }),
    });
    
    if (result.success) {
      this.invalidateCache('/habits');
      this.invalidateCache('/stats');
      this.invalidateCache('/calendar');
    }
    
    return result;
  }

  // Real-time sync (WebSocket alternative)
  async syncData(): Promise<ApiResponse<{ habits: Habit[]; calendar: any; stats: Stats }>> {
    const result = await this.request<{ habits: Habit[]; calendar: any; stats: Stats }>('/sync');
    
    if (result.success && result.data) {
      // Update all caches
      this.setCache(this.getCacheKey('/habits'), result.data.habits);
      this.setCache(this.getCacheKey('/stats'), result.data.stats);
      // Calendar data would need to be cached per month
    }
    
    return result;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export types for use in components
export type {
  Habit,
  ChecklistItem,
  CalendarEvent,
  Stats,
  PomodoroSession,
  ApiResponse,
}; 