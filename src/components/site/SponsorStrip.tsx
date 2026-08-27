import type { Sponsor, SponsorPlacement } from "@/domain/types";
import { listSponsors } from "@/lib/competition-data";
import { cn } from "@/lib/utils";

const TIER_LABELS: Record<Sponsor["tier"], string> = {
  MAJOR_SPONSOR: "Major sponsor",
  SUPPORTING_SPONSOR: "Supporting sponsor",
  PARTNER: "Partner",
  MEDIA_PARTNER: "Media partner",
};

/**
 * Sponsors are configuration, never hard-coded markup: this renders whatever
 * rows are active for the given placement, in admin-defined order.
 */
export function SponsorStrip({
  placement = "HERO",
  className,
}: {
  placement?: SponsorPlacement;
  className?: string;
}) {
  const sponsors = listSponsors(placement);
  if (sponsors.length === 0) return null;

  const majors = sponsors.filter((s) => s.tier === "MAJOR_SPONSOR");
  const others = sponsors.filter((s) => s.tier !== "MAJOR_SPONSOR");

  return (
    <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <p className="eyebrow">
        {majors.length > 1 ? "Major sponsors" : TIER_LABELS[sponsors[0]!.tier]}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {majors.map((sponsor, index) => (
          <span key={sponsor.id} className="flex items-center gap-4">
            {index > 0 && <span className="font-display text-lg text-muted-foreground">×</span>}
            <a
              href={sponsor.website}
              target="_blank"
              rel="noreferrer noopener"
              className="font-display text-xl tracking-wide transition-colors hover:text-primary sm:text-2xl"
            >
              {sponsor.name}
            </a>
          </span>
        ))}
      </div>
      {others.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          {others.map((sponsor) => (
            <a
              key={sponsor.id}
              href={sponsor.website}
              target="_blank"
              rel="noreferrer noopener"
              className="transition-colors hover:text-foreground"
            >
              {sponsor.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
