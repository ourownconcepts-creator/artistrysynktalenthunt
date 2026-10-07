import { BadgeCheck, ShieldCheck, Sparkles } from "lucide-react";

import { VERIFICATION_LABELS, type VerificationStatus } from "@/lib/talent";

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === "UNVERIFIED") return null;
  const Icon = status === "TALENT_VERIFIED" ? BadgeCheck : ShieldCheck;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-secondary/50 bg-secondary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-secondary-foreground">
      <Icon className="size-3.5" aria-hidden />
      {VERIFICATION_LABELS[status]}
    </span>
  );
}

export function FeaturedBadge({ featured }: { featured: boolean }) {
  if (!featured) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/50 bg-accent/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
      <Sparkles className="size-3.5" aria-hidden />
      Featured
    </span>
  );
}

export function TalentAvatar({
  src,
  name,
  className = "size-16",
}: {
  src: string | null;
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
  return src ? (
    <img
      src={src}
      alt={name}
      loading="lazy"
      className={`${className} shrink-0 rounded-full border border-border object-cover`}
    />
  ) : (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-border bg-gold font-display text-primary-foreground`}
    >
      {initials || "?"}
    </span>
  );
}
