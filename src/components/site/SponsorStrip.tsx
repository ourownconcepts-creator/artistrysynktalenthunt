import { useSponsors } from "@/hooks/useCompetition";
import { SPONSOR_TIER_LABELS } from "@/lib/live-data";
import { cn } from "@/lib/utils";

/**
 * Sponsors are configuration, never hard-coded markup: this renders whatever
 * rows are active for the given placement, in admin-defined order.
 */
export function SponsorStrip({
  placement = "HERO",
  className,
  competitionId,
}: {
  placement?: string;
  className?: string;
  competitionId?: string | undefined;
}) {
  const query = useSponsors(placement, competitionId);
  const sponsors = query.data ?? [];
  if (sponsors.length === 0) return null;

  const majors = sponsors.filter((s) => s.tier === "MAJOR_SPONSOR");
  const others = sponsors.filter((s) => s.tier !== "MAJOR_SPONSOR");

  return (
    <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <p className="eyebrow">
        {majors.length > 1
          ? "Major sponsors"
          : (SPONSOR_TIER_LABELS[sponsors[0]!.tier] ?? "Sponsors")}
      </p>
      {majors.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          {majors.map((sponsor, index) => (
            <span key={sponsor.id} className="flex items-center gap-4">
              {index > 0 && <span className="font-display text-lg text-muted-foreground">×</span>}
              <SponsorName sponsor={sponsor} prominent />
            </span>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
          {others.map((sponsor) => (
            <SponsorName key={sponsor.id} sponsor={sponsor} />
          ))}
        </div>
      )}
    </div>
  );
}

function SponsorName({
  sponsor,
  prominent = false,
}: {
  sponsor: {
    name: string;
    website: string;
    logo_url: string | null;
  };
  prominent?: boolean;
}) {
  const content = (
    <>
      {sponsor.logo_url && (
        <span className={prominent ? "rounded-sm bg-[var(--paper)] p-1.5" : ""}>
                {sponsor.logo_url && (
            <img
              src={sponsor.logo_url}
              alt=""
              className={prominent ? "h-10 max-w-36 object-contain" : "h-7 max-w-24 object-contain"}
              loading="lazy"
            />
                )}
        </span>
      )}
      {sponsor.name}
    </>
  );

  const className = prominent
    ? "flex items-center gap-2 font-display text-xl tracking-wide transition-colors hover:text-primary sm:text-2xl"
    : "flex items-center gap-2 transition-colors hover:text-foreground";

  return sponsor.website ? (
    <a href={sponsor.website} target="_blank" rel="noreferrer noopener" className={className}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}
