import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Upload } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { FeaturedBadge, TalentAvatar, VerificationBadge } from "@/components/talent/TalentBadges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { fetchMyProfile } from "@/lib/live-data";
import {
  isFeatured,
  normalizeHandle,
  normalizeUrl,
  resolveAvatarUrls,
  saveMyTalentProfile,
  uploadAvatar,
  type VerificationStatus,
} from "@/lib/talent";

interface FormState {
  display_name: string;
  handle: string;
  avatar_url: string | null;
  bio: string;
  location: string;
  primary_discipline: string;
  skills: string;
  portfolio_url: string;
  website_url: string;
  instagram_url: string;
  youtube_url: string;
  is_public: boolean;
}

const EMPTY: FormState = {
  display_name: "",
  handle: "",
  avatar_url: null,
  bio: "",
  location: "",
  primary_discipline: "",
  skills: "",
  portfolio_url: "",
  website_url: "",
  instagram_url: "",
  youtube_url: "",
  is_public: true,
};

/** The signed-in creative edits their own permanent talent profile. */
export function TalentProfileEditor({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["my-profile", userId], queryFn: fetchMyProfile });
  const [form, setForm] = useState<FormState>(EMPTY);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const existingHandle = profile.data?.handle ?? null;

  useEffect(() => {
    const p = profile.data;
    if (!p) return;
    setForm({
      display_name: p.display_name ?? "",
      handle: p.handle ?? normalizeHandle(p.display_name ?? ""),
      avatar_url: p.avatar_url,
      bio: p.bio ?? "",
      location: p.location ?? "",
      primary_discipline: p.primary_discipline ?? "",
      skills: (p.secondary_skills ?? []).join(", "),
      portfolio_url: p.portfolio_url ?? "",
      website_url: p.website_url ?? "",
      instagram_url: p.instagram_url ?? "",
      youtube_url: p.youtube_url ?? "",
      is_public: p.is_public,
    });
  }, [profile.data]);

  useEffect(() => {
    let active = true;
    void resolveAvatarUrls([form.avatar_url]).then((m) => {
      if (active) setPreview(form.avatar_url ? (m.get(form.avatar_url) ?? null) : null);
    });
    return () => {
      active = false;
    };
  }, [form.avatar_url]);

  const save = useMutation({
    mutationFn: async () => {
      const handle = normalizeHandle(form.handle);
      if (!form.display_name.trim()) throw new Error("Add a display name.");
      if (handle.length < 3) throw new Error("Handles need at least 3 letters or numbers.");
      const urls = {
        portfolio_url: form.portfolio_url,
        website_url: form.website_url,
        instagram_url: form.instagram_url,
        youtube_url: form.youtube_url,
      };
      const normalized: Record<string, string | null> = {};
      for (const [key, value] of Object.entries(urls)) {
        const url = normalizeUrl(value);
        if (value.trim() && !url) throw new Error("One of your links is not a valid web address.");
        normalized[key] = url;
      }
      await saveMyTalentProfile({
        display_name: form.display_name.trim().slice(0, 80),
        handle,
        avatar_url: form.avatar_url,
        bio: form.bio.trim().slice(0, 1500),
        location: form.location.trim().slice(0, 120),
        primary_discipline: form.primary_discipline.trim().slice(0, 80),
        secondary_skills: Array.from(
          new Set(
            form.skills
              .split(",")
              .map((s) => s.trim().slice(0, 40))
              .filter(Boolean),
          ),
        ).slice(0, 12),
        portfolio_url: normalized["portfolio_url"] ?? null,
        website_url: normalized["website_url"] ?? null,
        instagram_url: normalized["instagram_url"] ?? null,
        youtube_url: normalized["youtube_url"] ?? null,
        is_public: form.is_public,
      });
    },
    onSuccess: () => {
      toast.success("Profile saved");
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      void queryClient.invalidateQueries({ queryKey: ["talent-directory"] });
      void queryClient.invalidateQueries({ queryKey: ["talent-profile"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your profile."),
  });

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const ref = await uploadAvatar(file);
      setForm((f) => ({ ...f, avatar_url: ref }));
      toast.success("Photo uploaded — save to publish it.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }

  if (profile.isLoading) return <p className="text-sm text-muted-foreground">Loading profile…</p>;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const verification = (profile.data?.verification_status ?? "UNVERIFIED") as VerificationStatus;

  return (
    <form onSubmit={submit} className="space-y-6 text-sm">
      <div className="flex flex-wrap items-center gap-4">
        <TalentAvatar
          src={preview}
          name={form.display_name || "You"}
          className="size-20 text-2xl"
        />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 font-semibold hover:bg-muted">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload photo
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void onPhoto(e.target.files?.[0])}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <VerificationBadge status={verification} />
          <FeaturedBadge featured={isFeatured(profile.data?.featured_until ?? null)} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Display name">
          <Input value={form.display_name} onChange={(e) => set("display_name", e.target.value)} />
        </Labelled>
        <Labelled
          label="Handle"
          hint={
            existingHandle ? "Changing it changes your profile link." : "Suggested from your name."
          }
        >
          <Input
            value={form.handle}
            onChange={(e) => set("handle", e.target.value)}
            onBlur={() => set("handle", normalizeHandle(form.handle))}
          />
        </Labelled>
        <Labelled label="Primary discipline">
          <Input
            value={form.primary_discipline}
            onChange={(e) => set("primary_discipline", e.target.value)}
            placeholder="e.g. Music Producer"
          />
        </Labelled>
        <Labelled label="Location">
          <Input value={form.location} onChange={(e) => set("location", e.target.value)} />
        </Labelled>
      </div>
      <Labelled label="Secondary skills" hint="Separate with commas — up to 12.">
        <Input
          value={form.skills}
          onChange={(e) => set("skills", e.target.value)}
          placeholder="Songwriting, Mixing, Sound design"
        />
      </Labelled>
      <Labelled label="Bio">
        <Textarea rows={4} value={form.bio} onChange={(e) => set("bio", e.target.value)} />
      </Labelled>
      <div className="grid gap-4 sm:grid-cols-2">
        <Labelled label="Portfolio link">
          <Input
            value={form.portfolio_url}
            onChange={(e) => set("portfolio_url", e.target.value)}
          />
        </Labelled>
        <Labelled label="Website">
          <Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} />
        </Labelled>
        <Labelled label="Instagram">
          <Input
            value={form.instagram_url}
            onChange={(e) => set("instagram_url", e.target.value)}
          />
        </Labelled>
        <Labelled label="YouTube">
          <Input value={form.youtube_url} onChange={(e) => set("youtube_url", e.target.value)} />
        </Labelled>
      </div>
      <label className="flex items-center justify-between gap-4 rounded-md border border-border/60 p-3">
        <span>
          <span className="font-semibold">Show in the Talent Directory</span>
          <span className="block text-xs text-muted-foreground">
            Your email, phone and date of birth are never shown.
          </span>
        </span>
        <Switch checked={form.is_public} onCheckedChange={(v) => set("is_public", v)} />
      </label>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          type="submit"
          disabled={save.isPending}
          className="bg-gold text-primary-foreground hover:opacity-90"
        >
          {save.isPending ? "Saving…" : "Save profile"}
        </Button>
        {existingHandle && form.is_public && (
          <Link
            to="/talent/$handle"
            params={{ handle: existingHandle }}
            className="font-bold text-primary hover:underline"
          >
            View public profile
          </Link>
        )}
      </div>
    </form>
  );
}

function Labelled({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
