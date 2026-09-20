"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

type EventForm = {
  title: string;
  description: string;
  event_date: string;
};

export function EventDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: EventForm | null;
  onSubmit: (data: EventForm) => Promise<void>;
  loading?: boolean;
}) {
  const [form, setForm] = useState<EventForm>({ title: "", description: "", event_date: "" });

  useEffect(() => {
    if (initial) setForm(initial);
    else setForm({ title: "", description: "", event_date: "" });
  }, [initial, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            {initial ? "Update event details. Title max 30 chars." : "Publish a new event for students to register."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit(form);
          }}
          className="flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Title *</label>
            <Input
              required
              maxLength={30}
              placeholder="e.g. Tech Fest 2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <span className="text-[10px] text-muted-foreground text-right">{form.title.length}/30</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Description</label>
            <textarea
              maxLength={2000}
              placeholder="Describe the event..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="min-h-24 w-full rounded-none border border-input bg-transparent px-2.5 py-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
            />
            <span className="text-[10px] text-muted-foreground text-right">{form.description.length}/2000</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium">Event Date *</label>
            <Input
              required
              type="date"
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : initial ? "Update" : "Publish Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
