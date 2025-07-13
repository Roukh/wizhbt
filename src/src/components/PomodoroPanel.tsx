import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface PomodoroPanelProps {
  habits: any[];
}

const DURATIONS = [25, 15, 5]; // minutes: Pomodoro, Short Break, Long Break

export function PomodoroPanel({ habits }: PomodoroPanelProps) {
  const queryClient = useQueryClient();
  const [selectedHabit, setSelectedHabit] = useState<string | null>(habits[0]?.id || null);
  const [targetDuration, setTargetDuration] = useState<number>(25); // minutes
  const [timer, setTimer] = useState<number>(0); // seconds remaining
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active session
  const { data: activeSession, refetch: refetchActive } = useQuery({
    queryKey: ["pomodoro", "active"],
    queryFn: async () => {
      const res = await fetch("/pomodoro/active");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: isRunning ? 1000 : false,
  });

  // Fetch session history
  const { data: sessionHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["pomodoro", "history", selectedHabit],
    queryFn: async () => {
      const url = selectedHabit ? `/pomodoro?habitId=${selectedHabit}` : "/pomodoro";
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Start session
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/pomodoro/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: selectedHabit ? Number(selectedHabit) : undefined, targetDuration }),
      });
      if (!res.ok) throw new Error("Failed to start session");
      return res.json();
    },
    onSuccess: () => {
      refetchActive();
      refetchHistory();
    },
  });

  // Update session duration
  const updateMutation = useMutation({
    mutationFn: async ({ id, duration }: { id: number; duration: number }) => {
      const res = await fetch(`/pomodoro/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration }),
      });
      if (!res.ok) throw new Error("Failed to update session");
      return res.json();
    },
  });

  // Complete session
  const completeMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/pomodoro/complete/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete session");
      return res.json();
    },
    onSuccess: () => {
      refetchActive();
      refetchHistory();
      setIsRunning(false);
    },
  });

  // Cancel session
  const cancelMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/pomodoro/cancel/${id}`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to cancel session");
      return res.json();
    },
    onSuccess: () => {
      refetchActive();
      refetchHistory();
      setIsRunning(false);
    },
  });

  // Timer logic
  useEffect(() => {
    if (activeSession && activeSession.status === "active") {
      // If backend session is active, sync timer (countdown)
      const total = activeSession.targetDuration || targetDuration * 60;
      const elapsed = activeSession.duration || 0;
      setTimer(Math.max(total - elapsed, 0));
      setIsRunning(true);
    } else {
      setIsRunning(false);
      setTimer(targetDuration * 60);
    }
    // eslint-disable-next-line
  }, [activeSession?.id, activeSession?.status, targetDuration]);

  useEffect(() => {
    if (isRunning && activeSession) {
      timerRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            // Auto-complete when timer reaches 0
            completeMutation.mutate(activeSession.id);
            return 0;
          }
          const next = prev - 1;
          // Update backend every 10 seconds (count up)
          const total = (activeSession.targetDuration || targetDuration * 60);
          const elapsed = total - next;
          if (elapsed % 10 === 0) {
            updateMutation.mutate({ id: activeSession.id, duration: elapsed });
          }
          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line
  }, [isRunning, activeSession?.id, targetDuration]);

  // Format timer display
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  // UI
  return (
    <div className="p-6 bg-card rounded-lg shadow space-y-6">
      <h2 className="text-xl font-bold mb-4">Pomodoro Timer</h2>
      {/* Habit Selection */}
      {habits.length > 0 ? (
        <div className="mb-4">
          <label className="block mb-1 font-medium">Habit:</label>
          <select
            className="border rounded px-2 py-1"
            value={selectedHabit || habits[0].id}
            onChange={e => setSelectedHabit(e.target.value)}
            disabled={!!activeSession}
          >
            {habits.map(h => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      ) : null}
      {/* Duration Selection */}
      <div className="mb-4">
        <label className="block mb-1 font-medium">Duration: <span className="font-mono">{targetDuration} min</span></label>
        <Slider
          min={5}
          max={240}
          step={5}
          value={[targetDuration]}
          onValueChange={([val]) => setTargetDuration(val)}
          disabled={!!activeSession}
          className="w-full max-w-xs"
        />
      </div>
      {/* Timer Display & Controls */}
      <div className="flex flex-col items-center space-y-2">
        <div className="text-5xl font-mono mb-2">{formatTime(timer)}</div>
        {activeSession ? (
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate(activeSession.id)}
              disabled={cancelMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => completeMutation.mutate(activeSession.id)}
              disabled={completeMutation.isPending}
            >
              Complete
            </Button>
          </div>
        ) : (
          <Button
            variant="default"
            onClick={() => startMutation.mutate()}
            disabled={startMutation.isPending || !targetDuration}
          >
            Start Pomodoro
          </Button>
        )}
      </div>
      {/* Session History */}
      <div className="mt-8">
        <h3 className="font-semibold mb-2">Session History</h3>
        {sessionHistory && sessionHistory.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessionHistory.map((s: any) => (
              <div key={s.id} className="p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.habit?.name || "General"}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.status} | {s.duration ? Math.round(s.duration / 60) : 0} min | {new Date(s.start).toLocaleString()}
                  </div>
                </div>
                {s.status === "active" && <span className="text-primary font-bold">Active</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground">No sessions yet.</div>
        )}
      </div>
    </div>
  );
} 