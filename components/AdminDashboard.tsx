"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { EventDialog } from "@/components/EventDialog";
import { Navbar } from "@/components/Navbar";
import { slugify } from "@/lib/slug";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Plus, Pencil, Trash2, Eye, Calendar } from "lucide-react";

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

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id?: number; name: string; email: string; role: string; clubCode?: string | null; club_code?: string | null } | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [regOpen, setRegOpen] = useState(false);
  const [regEvent, setRegEvent] = useState<Event | null>(null);
  const [regs, setRegs] = useState<Registration[]>([]);
  const [regsLoading, setRegsLoading] = useState(false);
  const [needsClubSetup, setNeedsClubSetup] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [clubChecking, setClubChecking] = useState(true);
  const [clubForm, setClubForm] = useState({ name: "", code: "", slogan: "", img: "" });
  const [clubSaving, setClubSaving] = useState(false);

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        checkClub(parsed);
      } else {
        setClubChecking(false);
      }
    };
    syncUser();
    fetchEvents();
    const onUserUpdated = () => syncUser();
    window.addEventListener("user-updated", onUserUpdated);
    return () => window.removeEventListener("user-updated", onUserUpdated);
  }, []);

  const checkClub = async (u: { clubCode?: string | null; club_code?: string | null; email?: string }) => {
    setClubChecking(true);
    const code = (u.clubCode ?? u.club_code ?? "") as string;
    if (!code) {
      setNeedsClubSetup(true);
      setClubChecking(false);
      return;
    }
    try {
      await axios.get(`/api/clubs?code=${encodeURIComponent(code)}`);
      setNeedsClubSetup(false);
    } catch {
      // 404 means club not found -> needs setup
      setNeedsClubSetup(true);
      // prefill code if admin already has a code that doesn't exist yet
      setClubForm((prev) => ({ ...prev, code }));
    } finally {
      setClubChecking(false);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubForm.name.trim() || !clubForm.code.trim()) {
      toast.add({ title: "Error", description: "Name and code are required" });
      return;
    }
    setClubSaving(true);
    try {
      const res = await axios.post("/api/clubs", {
        name: clubForm.name.trim(),
        code: clubForm.code.trim(),
        slogan: clubForm.slogan.trim() || null,
        img: clubForm.img.trim() || null,
        adminId: user?.id,
        adminEmail: user?.email,
      });
      toast.add({ title: "Club created!", description: `Club ${res.data.club.code} created` });
      // update local user
      if (user) {
        const updated = { ...user, clubCode: clubForm.code.trim(), club_code: clubForm.code.trim() };
        localStorage.setItem("user", JSON.stringify(updated));
        setUser(updated);
      }
      setNeedsClubSetup(false);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to create club";
      toast.add({ title: "Error", description: String(msg) });
    } finally {
      setClubSaving(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/events");
      setEvents(res.data.events);
    } catch {
      toast.add({ title: "Error", description: "Failed to load events" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: { title: string; description: string; event_date: string }) => {
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`/api/events/${editing.id}`, data);
        toast.add({ title: "Event updated" });
      } else {
        await axios.post("/api/events", data);
        toast.add({ title: "Event published!" });
      }
      setDialogOpen(false);
      setEditing(null);
      fetchEvents();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error : "Failed";
      toast.add({ title: "Error", description: String(msg) });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    try {
      await axios.delete(`/api/events/${id}`);
      toast.add({ title: "Event deleted" });
      setDeleteTarget(null);
      fetchEvents();
    } catch {
      toast.add({ title: "Error", description: "Delete failed" });
    } finally {
      setDeleting(false);
    }
  };

  const openRegs = async (ev: Event) => {
    setRegEvent(ev);
    setRegOpen(true);
    setRegsLoading(true);
    try {
      const res = await axios.get(`/api/registrations?event_id=${ev.id}`);
      setRegs(res.data.registrations);
    } catch {
      toast.add({ title: "Error", description: "Failed to load registrations" });
    } finally {
      setRegsLoading(false);
    }
  };

  const upcoming = events.filter((e) => new Date(e.event_date) >= new Date()).length;
  const totalRegs = events.reduce((acc, e) => acc + Number(e.registration_count || 0), 0);

  if (!user || clubChecking) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar role={user.role} name={user.name} email={user.email} />

      {/* Non-closeable dialog: admin must create club record if missing */}
      <Dialog open={needsClubSetup} onOpenChange={(open: boolean) => { if (!open && needsClubSetup) return; setNeedsClubSetup(open); }}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create your club</DialogTitle>
            <DialogDescription>
              No club record found for your account. You must create a club before managing events. Club code will be used by students to join.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateClub} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Club Name * <span className="text-muted-foreground font-normal">(max 20)</span></label>
              <Input required maxLength={20} placeholder="e.g. Coding Club" value={clubForm.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClubForm({ ...clubForm, name: e.target.value })} />
              <span className="text-[10px] text-muted-foreground text-right">{clubForm.name.length}/20</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Club Code * <span className="text-muted-foreground font-normal">(unique, max 10)</span></label>
              <Input required maxLength={10} placeholder="e.g. CODE01" value={clubForm.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClubForm({ ...clubForm, code: e.target.value.toUpperCase().replace(/\s/g, "") })} />
              <span className="text-[10px] text-muted-foreground">Students will use this code at signup.</span>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Slogan <span className="text-muted-foreground font-normal">(max 100)</span></label>
              <Input maxLength={100} placeholder="e.g. Code the future" value={clubForm.slogan} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClubForm({ ...clubForm, slogan: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium">Image URL <span className="text-muted-foreground font-normal">(max 500)</span></label>
              <Input maxLength={500} placeholder="https://..." value={clubForm.img} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClubForm({ ...clubForm, img: e.target.value })} />
            </div>
            <Button type="submit" disabled={clubSaving} className="mt-2">
              {clubSaving ? <><Spinner className="size-3" /> Creating...</> : "Create Club"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-medium">Manage Events</h1>
            <p className="text-xs text-muted-foreground">Create, publish and track registrations. All events are immediately visible to students.</p>
          </div>
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="size-4" /> Create Event
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Total Events</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><CalendarDays className="size-4" /> {events.length}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">All published events</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Upcoming</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><Calendar className="size-4" /> {upcoming}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">Events with future date</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Total Registrations</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><Users className="size-4" /> {totalRegs}</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground">Across all events</CardContent>
          </Card>
        </div>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : events.length === 0 ? (
              <Empty className="border py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                  <EmptyTitle>No events yet</EmptyTitle>
                  <EmptyDescription>Create your first event to get started.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => (
                  <Card
                    key={ev.id}
                    className="flex flex-col cursor-pointer hover:ring-1 hover:ring-ring transition"
                    onClick={() => router.push(`/${slugify(ev.title)}`)}
                  >
                    <CardHeader>
                      <CardTitle className="line-clamp-1 hover:underline">{ev.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1 text-xs">
                        <Calendar className="size-3" /> {new Date(ev.event_date).toLocaleDateString()} • {ev.registration_count ?? 0} registrations
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <p className="line-clamp-3 text-xs text-muted-foreground min-h-9">{ev.description || "No description"}</p>
                      <p className="mt-2 text-[10px] text-muted-foreground">Created {new Date(ev.createdAt).toLocaleDateString()}</p>
                    </CardContent>
                    <div className="flex gap-2 px-4 pb-4" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => openRegs(ev)}><Eye className="size-3.5" /> View</Button>
                      <Button variant="outline" size="sm" onClick={() => { setEditing(ev); setDialogOpen(true); }}><Pencil className="size-3.5" /> Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(ev)}><Trash2 className="size-3.5" /> Delete</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Registrations</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium max-w-40 truncate">
                          <button onClick={() => router.push(`/${slugify(ev.title)}`)} className="hover:underline text-left">
                            {ev.title}
                          </button>
                        </TableCell>
                        <TableCell>{new Date(ev.event_date).toLocaleDateString()}</TableCell>
                        <TableCell>{ev.registration_count ?? 0}</TableCell>
                        <TableCell>{new Date(ev.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="flex gap-1">
                          <Button variant="outline" size="xs" onClick={() => openRegs(ev)}>View</Button>
                          <Button variant="outline" size="xs" onClick={() => { setEditing(ev); setDialogOpen(true); }}>Edit</Button>
                          <Button variant="destructive" size="xs" onClick={() => setDeleteTarget(ev)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {events.length === 0 && !loading && <p className="py-6 text-center text-xs text-muted-foreground">No events</p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        initial={editing ? { title: editing.title, description: editing.description || "", event_date: editing.event_date ? new Date(editing.event_date).toISOString().split("T")[0] : "" } : null}
        onSubmit={handleCreate}
        loading={saving}
      />

      <Dialog open={regOpen} onOpenChange={setRegOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrations — {regEvent?.title}</DialogTitle>
            <DialogDescription>{regs.length} student(s) registered for this event on {regEvent ? new Date(regEvent.event_date).toLocaleDateString() : ""}</DialogDescription>
          </DialogHeader>
          {regsLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : regs.length === 0 ? (
            <Empty className="border py-6">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Users /></EmptyMedia>
                <EmptyTitle>No registrations yet</EmptyTitle>
                <EmptyDescription>Students have not registered for this event.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
                <TableBody>
                  {regs.map((r) => (
                    <TableRow key={r.id}><TableCell>{r.name}</TableCell><TableCell>{r.email}</TableCell></TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog - triggered via Dialog @components/ui/dialog.tsx */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.title}&quot;? This will permanently remove the event and all {deleteTarget?.registration_count ?? 0} registration(s). This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => deleteTarget && handleDelete(deleteTarget.id)} disabled={deleting}>
              {deleting ? <><Spinner className="size-3" /> Deleting...</> : <><Trash2 className="size-3.5" /> Delete Event</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
