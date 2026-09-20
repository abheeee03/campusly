"use client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { LogOut, CalendarDays, User, Mail, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import axios from "axios";

export function Navbar({ role, name, email }: { role: string; name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(name);
  const [displayEmail, setDisplayEmail] = useState(email);
  const [displayRole, setDisplayRole] = useState(role);
  const [clubCode, setClubCode] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [form, setForm] = useState({ name, email });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(name);
    setDisplayEmail(email);
    setDisplayRole(role);
    setForm({ name, email });
  }, [name, email, role]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.id) setUserId(parsed.id);
        if (parsed.clubCode ?? parsed.club_code) setClubCode(parsed.clubCode ?? parsed.club_code);
        // in case props are stale, prefer parsed values for display if props empty
        if (parsed.name) setDisplayName(parsed.name);
        if (parsed.email) setDisplayEmail(parsed.email);
        if (parsed.role) setDisplayRole(parsed.role);
        setForm({ name: parsed.name ?? name, email: parsed.email ?? email });
        // if id missing, resolve via email lookup
        if (!parsed.id && parsed.email) {
          axios.get(`/api/users/by-email?email=${encodeURIComponent(parsed.email)}`)
            .then((res) => setUserId(res.data.user.id))
            .catch(() => {});
        }
      }
    } catch {}
  }, []);

  // when dialog opens, sync form with latest display values
  useEffect(() => {
    if (open) {
      setForm({ name: displayName, email: displayEmail });
    }
  }, [open, displayName, displayEmail]);

  const logout = () => {
    localStorage.removeItem("user");
    router.push("/");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.add({ title: "Error", description: "Name and email are required" });
      return;
    }
    // resolve id if not yet known
    let id = userId;
    if (!id) {
      try {
        const res = await axios.get(`/api/users/by-email?email=${encodeURIComponent(displayEmail)}`);
        id = res.data.user.id;
        setUserId(id);
      } catch {
        toast.add({ title: "Error", description: "Unable to resolve user id. Please re-login." });
        return;
      }
    }

    setSaving(true);
    try {
      const res = await axios.put("/api/users/profile", {
        id,
        name: form.name.trim(),
        email: form.email.trim(),
      });
      const updated = res.data.user;
      setDisplayName(updated.name);
      setDisplayEmail(updated.email);
      setDisplayRole(updated.role);
      setClubCode(updated.clubCode ?? updated.club_code ?? clubCode);

      // update localStorage
      try {
        const stored = localStorage.getItem("user");
        if (stored) {
          const parsed = JSON.parse(stored);
          const next = { ...parsed, ...updated };
          localStorage.setItem("user", JSON.stringify(next));
          // notify other components (StudentDashboard/AdminDashboard) to re-read user
          window.dispatchEvent(new Event("user-updated"));
        }
      } catch {}

      toast.add({ title: "Profile updated", description: "Your profile has been saved." });
      setOpen(false);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error : "Failed to update profile";
      toast.add({ title: "Error", description: String(msg) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center bg-primary text-primary-foreground">
            <CalendarDays className="size-4" />
          </div>
          <div>
            <p className="text-sm font-medium leading-none">Campusly</p>
            <p className="text-xs text-muted-foreground capitalize">{displayRole} Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Profile section - clicking triggers edit dialog */}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 rounded-none p-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            aria-label="Open profile settings"
          >
            <div className="hidden text-right md:block">
              <p className="text-xs font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>
            <Avatar className="ring-1 ring-border">
              <AvatarFallback>{displayName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
          </button>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="size-3.5" /> Logout
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Update your name and email. Role and club code are managed by your organization.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3 rounded-none border bg-muted/30 p-3">
            <Avatar className="size-10">
              <AvatarFallback className="text-sm">{displayName?.charAt(0)?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-xs font-medium">
                <User className="size-3" /> Name
              </label>
              <Input
                required
                maxLength={100}
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="flex items-center gap-1 text-xs font-medium">
                <Mail className="size-3" /> Email
              </label>
              <Input
                required
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Shield className="size-3" /> Role
                </label>
                <Input value={displayRole} disabled className="capitalize" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-foreground">Club Code</label>
                <Input value={clubCode || "—"} disabled />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Spinner className="size-3" /> Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
