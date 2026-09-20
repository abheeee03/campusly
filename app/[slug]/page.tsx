"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { slugify } from "@/lib/slug";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { EventDialog } from "@/components/EventDialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { CalendarDays, Calendar, Users, ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Event = {
  id: number;
  title: string;
  description: string;
  event_date: string;
  createdAt: string;
  registration_count?: number;
};

type Registration = {
  id: number;
  student_id: number;
  name: string;
  email: string;
};

export default function EventPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || "";
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [user, setUser] = useState<{ role: string; name: string; email: string; id?: number } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        setIsAdmin(parsed.role === "admin");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!slug) return;
    const fetchEventBySlug = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await axios.get("/api/events");
        const events: Event[] = res.data.events;
        // find by slugify comparison - spec: replace spaces with '-'
        const matched = events.find((e) => slugify(e.title) === slug);
        if (!matched) {
          setNotFound(true);
          setEvent(null);
          return;
        }
        setEvent(matched);
        // fetch detailed registrations
        setRegsLoading(true);
        try {
          const regRes = await axios.get(`/api/registrations?event_id=${matched.id}`);
          setRegs(regRes.data.registrations);
        } catch {
          setRegs([]);
        } finally {
          setRegsLoading(false);
        }
        // also fetch fresh count via events/[id] if needed
        try {
          const detail = await axios.get(`/api/events/${matched.id}`);
          if (detail.data.event) {
            setEvent((prev) => (prev ? { ...prev, ...detail.data.event, registration_count: regs.length ?? prev.registration_count } : prev));
          }
        } catch {}
      } catch {
        toast.add({ title: "Error", description: "Failed to load event" });
      } finally {
        setLoading(false);
      }
    };
    fetchEventBySlug();
  }, [slug]);

  const handleEdit = async (data: { title: string; description: string; event_date: string }) => {
    if (!event) return;
    setSaving(true);
    try {
      const res = await axios.put(`/api/events/${event.id}`, data);
      const updated: Event = res.data.event;
      // if title changed, slug changes -> navigate to new slug
      const newSlug = slugify(updated.title);
      setEvent((prev) => (prev ? { ...prev, ...updated } : updated));
      toast.add({ title: "Event updated" });
      setEditOpen(false);
      if (newSlug !== slug) {
        router.replace(`/${newSlug}`);
      } else {
        // refresh regs count stays same
      }
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error : "Failed";
      toast.add({ title: "Error", description: String(msg) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/events/${event.id}`);
      toast.add({ title: "Event deleted" });
      setDeleteOpen(false);
      router.push(isAdmin ? "/admin/dashboard" : "/student/dashboard");
    } catch {
      toast.add({ title: "Error", description: "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/20">
        {user && <Navbar role={user.role} name={user.name} email={user.email} />}
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-muted/20">
        {user && <Navbar role={user.role} name={user.name} email={user.email} />}
        <div className="mx-auto max-w-3xl p-6">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-3.5" /> Back
          </Button>
          <Empty className="border mt-6 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarDays />
              </EmptyMedia>
              <EmptyTitle>Event not found</EmptyTitle>
              <EmptyDescription>No event matches slug &quot;{slug}&quot;. The title may have been changed or the link is invalid.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      </div>
    );
  }

  const totalRegs = regs.length;

  return (
    <div className="min-h-screen bg-muted/20">
      {user && <Navbar role={user.role} name={user.name} email={user.email} />}
      <div className="mx-auto max-w-4xl p-4 md:p-6 space-y-6">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-3.5" /> Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg leading-tight">{event.title}</CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3" /> {new Date(event.event_date).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" /> {totalRegs} registrations
                  </span>
                  <span>•</span>
                  <span>Created {new Date(event.createdAt).toLocaleDateString()}</span>
                </CardDescription>
              </div>
              {isAdmin && (
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium mb-1">Description</p>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap border bg-muted/20 p-3 rounded-none min-h-16">
                {event.description || "No description"}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3 text-xs">
              <div className="border p-3 bg-background">
                <p className="text-muted-foreground">Event Date</p>
                <p className="font-medium">{new Date(event.event_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
              <div className="border p-3 bg-background">
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
              <div className="border p-3 bg-background">
                <p className="text-muted-foreground">Total Registrations</p>
                <p className="font-medium flex items-center gap-1">
                  <Users className="size-3" /> {totalRegs} user(s)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registrations</CardTitle>
            <CardDescription>All users registered for this event — {totalRegs} total</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {regsLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : regs.length === 0 ? (
              <Empty className="border-0 py-8">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>No registrations yet</EmptyTitle>
                  <EmptyDescription>No one has registered for this event.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {regs.map((r, idx) => (
                      <TableRow key={r.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-[11px] text-muted-foreground text-center">
          URL: /{slugify(event.title)} — slug generated by replacing spaces with &apos;-&apos;
        </p>
      </div>

      {isAdmin && (
        <>
          <EventDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            initial={
              event
                ? {
                    title: event.title,
                    description: event.description || "",
                    event_date: event.event_date ? new Date(event.event_date).toISOString().split("T")[0] : "",
                  }
                : null
            }
            onSubmit={handleEdit}
            loading={saving}
          />
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Event</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &quot;{event.title}&quot;? This will permanently remove the event and all {totalRegs} registration(s). Cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <><Spinner className="size-3" /> Deleting...</> : <><Trash2 className="size-3.5" /> Delete Event</>}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
