import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface NewHabit {
  name: string;
  checklist: ChecklistItem[];
  requiredItems: number;
  streak: number;
}

interface CreateHabitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateHabit?: (habit: NewHabit) => void;
}

export function CreateHabitModal({ open, onOpenChange, onCreateHabit }: CreateHabitModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    name: "",
    checklist: [] as ChecklistItem[],
    requiredItems: 1,
    startDate: todayStr
  });

  const createHabitMutation = useMutation({
    mutationFn: async (newHabit: Omit<NewHabit, 'streak'> & { startDate: string }) => {
      const res = await fetch('/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newHabit),
      });
      if (!res.ok) throw new Error('Failed to create habit');
      return res.json();
    },
    onSuccess: () => {
      setFormData({ name: "", checklist: [], requiredItems: 1, startDate: todayStr });
      onOpenChange(false);
    },
  });

  const addChecklistItem = () => {
    const newItem: ChecklistItem = {
      id: Date.now().toString(),
      text: "",
      completed: false
    };
    setFormData({
      ...formData,
      checklist: [...formData.checklist, newItem]
    });
  };

  const updateChecklistItem = (id: string, text: string) => {
    setFormData({
      ...formData,
      checklist: formData.checklist.map(item =>
        item.id === id ? { ...item, text } : item
      )
    });
  };

  const removeChecklistItem = (id: string) => {
    const newChecklist = formData.checklist.filter(item => item.id !== id);
    setFormData({
      ...formData,
      checklist: newChecklist,
      requiredItems: Math.min(formData.requiredItems, newChecklist.length || 1)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.checklist.length === 0) return;
    createHabitMutation.mutate({
      name: formData.name,
      checklist: formData.checklist,
      requiredItems: formData.requiredItems,
      startDate: formData.startDate
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Habit</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Habit Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Habit Name</Label>
            <Input
              id="name"
              placeholder="e.g., Morning Routine, Study Session..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          {/* Checklist Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Checklist Items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChecklistItem}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>
            {formData.checklist.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Add checklist items to track your habit progress
              </p>
            )}
            <div className="space-y-2">
              {formData.checklist.map((item, index) => (
                <div key={item.id} className="flex items-center gap-2">
                  <Input
                    placeholder={`Item ${index + 1}`}
                    value={item.text}
                    onChange={(e) => updateChecklistItem(item.id, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeChecklistItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
          {/* Required Items */}
          {formData.checklist.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="required">Required Items to Complete</Label>
              <Input
                id="required"
                type="number"
                min="1"
                max={formData.checklist.length}
                value={formData.requiredItems}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  requiredItems: Math.min(parseInt(e.target.value) || 1, formData.checklist.length)
                })}
              />
              <p className="text-xs text-muted-foreground">
                How many items need to be completed to mark this habit as done
              </p>
            </div>
          )}
          {/* Preview */}
          {formData.name && formData.checklist.length > 0 && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <Card className="border-dashed">
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">{formData.name}</h3>
                  <div className="space-y-2">
                    {formData.checklist.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <Checkbox disabled />
                        <span>{item.text || `Item ${index + 1}`}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Complete {formData.requiredItems} of {formData.checklist.length} items to finish
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {/* Start Date Picker */}
          <div className="space-y-2">
            <Label htmlFor="start-date">Start Date</Label>
            <Input
              id="start-date"
              type="date"
              min={todayStr}
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Only present and future days are allowed
            </p>
          </div>
          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name.trim() || formData.checklist.length === 0 || createHabitMutation.status === 'pending'}
              className="flex-1"
            >
              {createHabitMutation.status === 'pending' ? 'Creating...' : 'Create Habit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}