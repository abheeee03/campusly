"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { Navbar } from "@/components/Navbar";
import { slugify } from "@/lib/slug";
import { useRouter } from "next/navigation";
import { CalendarDays, Users, Calendar, CheckCircle, X } from "lucide-react";

type Event = {
  id: number;
  title: string;
  description: string;
  event_date: string;
  createdAt: string;
  registration_count?: number;
};

type MyReg = {
  id: number;
  event_id: number;
  title: string;
  description: string;
  event_date: string;
  createdAt: string;
};

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ id?: number; name: string; email: string; role: string } | null>(null);
  const [actualUserId, setActualUserId] = useState<number | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [myRegs, setMyRegs] = useState<MyReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [regsLoading, setRegsLoading] = useState(true);
  const [registering, setRegistering] = useState<number | null>(null);

  useEffect(() => {
    const syncUser = () => {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
        if (parsed.id) {
          setActualUserId(parsed.id);
          fetchMyRegs(parsed.id);
        } else {
          fetchUserId(parsed.email);
        }
      }
    };
    syncUser();
    fetchEvents();
    const onUserUpdated = () => syncUser();
    window.addEventListener("user-updated", onUserUpdated);
    return () => window.removeEventListener("user-updated", onUserUpdated);
  }, []);

  const fetchUserId = async (email: string) => {
    try {
      // we don't have an endpoint, try to use auth me or fetch via db? fallback: use email to query registrations via workaround
      // We'll fetch all events then try to get registrations; but we need student_id.
      // Add helper: call /api/auth/signin is not needed. We'll create a quick lookup via registration attempt? Instead fetch via API that returns user id.
      // For now, try to hit a new endpoint we will create: /api/users/by-email?email=
      const res = await axios.get(`/api/users/by-email?email=${email}`);
      setActualUserId(res.data.user.id);
      fetchMyRegs(res.data.user.id);
    } catch {
      // fallback: try to fetch without id - will show empty
      setRegsLoading(false);
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

  const fetchMyRegs = async (uid: number) => {
    setRegsLoading(true);
    try {
      const res = await axios.get(`/api/registrations?student_id=${uid}`);
      setMyRegs(res.data.registrations);
    } catch {
      toast.add({ title: "Error", description: "Failed to load registrations" });
    } finally {
      setRegsLoading(false);
    }
  };

  const isRegistered = (eventId: number) => myRegs.some((r) => r.event_id === eventId);

  const handleRegister = async (eventId: number) => {
    if (!actualUserId) {
      toast.add({ title: "Error", description: "User ID not found. Please re-login." });
      return;
    }
    setRegistering(eventId);
    try {
      await axios.post("/api/registrations", { student_id: actualUserId, event_id: eventId });
      toast.add({ title: "Registered!", description: "You have been registered for the event." });
      fetchMyRegs(actualUserId);
      fetchEvents();
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? e.response?.data?.error : "Failed";
      toast.add({ title: "Error", description: String(msg) });
    } finally {
      setRegistering(null);
    }
  };

  const handleCancel = async (eventId: number) => {
    if (!actualUserId) return;
    try {
      await axios.delete(`/api/registrations?student_id=${actualUserId}&event_id=${eventId}`);
      toast.add({ title: "Registration cancelled" });
      fetchMyRegs(actualUserId);
      fetchEvents();
    } catch {
      toast.add({ title: "Error", description: "Cancel failed" });
    }
  };

  const upcomingEvents = events.filter((e) => new Date(e.event_date) >= new Date());

  if (!user) return <div className="flex h-screen items-center justify-center"><Spinner /></div>;

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar role={user.role} name={user.name} email={user.email} />

      <div className="mx-auto max-w-6xl p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-lg font-medium">Discover Events</h1>
          <p className="text-xs text-muted-foreground">Browse and register for upcoming club events. Your registrations appear under “My Registrations”.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardDescription>Available Events</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><CalendarDays className="size-4" /> {events.length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{upcomingEvents.length} upcoming</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>My Registrations</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><CheckCircle className="size-4" /> {myRegs.length}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Events you joined</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Club</CardDescription><CardTitle className="text-2xl flex items-center gap-2"><Users className="size-4" /> Campusly</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Student portal</CardContent></Card>
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse Events</TabsTrigger>
            <TabsTrigger value="my">My Registrations</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : events.length === 0 ? (
              <Empty className="border py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                  <EmptyTitle>No events available</EmptyTitle>
                  <EmptyDescription>Check back later for new events.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {events.map((ev) => {
                  const registered = isRegistered(ev.id);
                  const past = new Date(ev.event_date) < new Date(new Date().setHours(0, 0, 0, 0));
                  return (
                    <Card
                      key={ev.id}
                      className="flex flex-col cursor-pointer hover:ring-1 hover:ring-ring transition"
                      onClick={() => router.push(`/${slugify(ev.title)}`)}
                    >
                      <CardHeader>
                        <CardTitle className="line-clamp-1 hover:underline">{ev.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Calendar className="size-3" /> {new Date(ev.event_date).toLocaleDateString()} {past && "• Past"} • {ev.registration_count ?? 0} joined
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <p className="line-clamp-3 text-xs text-muted-foreground min-h-9">{ev.description || "No description"}</p>
                      </CardContent>
                      <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
                        {registered ? (
                          <Button variant="outline" className="w-full" onClick={() => handleCancel(ev.id)}>
                            <X className="size-3.5" /> Cancel Registration
                          </Button>
                        ) : (
                          <Button className="w-full" disabled={past || registering === ev.id} onClick={() => handleRegister(ev.id)}>
                            {registering === ev.id ? <Spinner className="size-3" /> : null}
                            {past ? "Event ended" : "Register"}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my">
            <Card>
              <CardHeader>
                <CardTitle>My Registrations</CardTitle>
                <CardDescription>Events you have registered for. Cancel if you can’t attend.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {regsLoading ? (
                  <div className="flex justify-center py-6"><Spinner /></div>
                ) : myRegs.length === 0 ? (
                  <Empty className="border-0 py-8">
                    <EmptyHeader>
                      <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                      <EmptyTitle>No registrations yet</EmptyTitle>
                      <EmptyDescription>Browse events and register to see them here.</EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRegs.map((r) => (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => router.push(`/${slugify(r.title)}`)}
                        >
                          <TableCell>
                            <div className="font-medium hover:underline">{r.title}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-64">{r.description}</div>
                          </TableCell>
                          <TableCell>{new Date(r.event_date).toLocaleDateString()}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Button variant="outline" size="xs" onClick={() => handleCancel(r.event_id)}>
                              Cancel
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
