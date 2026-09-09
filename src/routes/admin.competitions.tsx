import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMyRoles, useSession } from "@/hooks/useSession";
import { supabase } from "@/integrations/supabase/client";
import { fetchCompetition } from "@/lib/live-data";

export const Route = createFileRoute("/admin/competitions")({
  head: () => ({
    meta: [
      { title: "Competition details — Zik's Got Talent admin" },
      {
        name: "description",
        content:
          "Set the competition name, tagline, prize pool, entry window and season dates for Zik's Got Talent.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Competition details — Zik's Got Talent admin" },
      { property: "og:description", content: "Name, prize pool, entry window and season dates." },
    ],
  }),
  component: CompetitionDetails,
});

function toLocalInput(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string): string | null {
  return value ? new Date(value).toISOString() : null;
}

function CompetitionDetails() {
  const { user, ready } = useSession();
  const roles = useMyRoles();
  const queryClient = useQueryClient();
  const competition = useQuery({ queryKey: ["competition"], queryFn: () => fetchCompetition() });

  const [form, setForm] = useState({
    name: "",
    tagline: "",
    description: "",
    prize_pool: "",
    status: "OPEN_FOR_ENTRIES",
    registration_opens_at: "",
    registration_closes_at: "",
    starts_at: "",
    ends_at: "",
  });

  useEffect(() => {
    const c = competition.data;
    if (!c) return;
    setForm({
      name: c.name,
      tagline: c.tagline,
      description: c.description,
      prize_pool: c.prize_pool,
      status: c.status,
      registration_opens_at: toLocalInput(c.registration_opens_at),
      registration_closes_at: toLocalInput(c.registration_closes_at),
      starts_at: toLocalInput(c.starts_at),
      ends_at: toLocalInput(c.ends_at),
    });
  }, [competition.data]);

  const isAdmin = (roles.data ?? []).some((r) => ["SUPER_ADMIN", "ADMIN"].includes(r));

  const save = useMutation({
    mutationFn: async () => {
      const opens = toIso(form.registration_opens_at);
      const closes = toIso(form.registration_closes_at);
      if (opens && closes && new Date(closes) <= new Date(opens)) {
        throw new Error("Entries must close after they open.");
      }
      const { error } = await supabase
        .from("competitions")
        .update({
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          prize_pool: form.prize_pool,
          status: form.status,
          registration_opens_at: opens,
          registration_closes_at: closes,
          starts_at: toIso(form.starts_at),
          ends_at: toIso(form.ends_at),
          updated_at: new Date().toISOString(),
        })
        .eq("id", competition.data!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Competition details saved");
      void queryClient.invalidateQueries({ queryKey: ["competition"] });
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : "Only admins can change competition details.",
      ),
  });

  if (!ready || competition.isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow">Competition</p>
        <h1 className="mt-3 text-4xl">Competition details</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          These dates drive the public site: the entry window, the season timeline and whether the
          entry form is open.
        </p>
      </header>

      {!user && (
        <p className="card-stage p-6 text-sm text-warning">Sign in with an admin account to edit.</p>
      )}

      <section className="card-stage grid gap-5 p-6 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Competition name</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="tagline">Tagline</Label>
          <Input
            id="tagline"
            value={form.tagline}
            onChange={(e) => setForm({ ...form, tagline: e.target.value })}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prize">Prize pool</Label>
          <Input
            id="prize"
            value={form.prize_pool}
            onChange={(e) => setForm({ ...form, prize_pool: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="DRAFT">Draft (hidden)</option>
            <option value="ANNOUNCED">Announced</option>
            <option value="OPEN_FOR_ENTRIES">Open for entries</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="regopen">Entries open</Label>
          <Input
            id="regopen"
            type="datetime-local"
            value={form.registration_opens_at}
            onChange={(e) => setForm({ ...form, registration_opens_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="regclose">Entries close</Label>
          <Input
            id="regclose"
            type="datetime-local"
            value={form.registration_closes_at}
            onChange={(e) => setForm({ ...form, registration_closes_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="starts">Season starts</Label>
          <Input
            id="starts"
            type="datetime-local"
            value={form.starts_at}
            onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends">Grand finale</Label>
          <Input
            id="ends"
            type="datetime-local"
            value={form.ends_at}
            onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
          />
        </div>
        <div className="sm:col-span-2">
          <Button
            className="bg-gold text-primary-foreground hover:opacity-90"
            onClick={() => save.mutate()}
            disabled={!isAdmin || save.isPending}
          >
            {save.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
            Save competition details
          </Button>
          {!isAdmin && user && (
            <p className="mt-3 text-xs text-warning">
              Your account is not an admin, so saving is blocked by the server as well as here.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
