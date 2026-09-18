import { useSponsors } from "@/hooks/useCompetition";
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
  const featuredSupporter = sponsors.find(
    (sponsor) => sponsor.name.toUpperCase() === "NEW FLAVA RESTAURANT",
  );
  const others = sponsors.filter(
    (sponsor) => sponsor.tier !== "MAJOR_SPONSOR" && sponsor.id !== featuredSupporter?.id,
  );

  return (
    <div className={cn("flex flex-col items-center gap-3 text-center", className)}>
      <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:items-start sm:gap-10">
        {majors.length > 0 && (
          <div className="flex flex-col items-center gap-2">
            <p className="eyebrow">Presented by</p>
            {majors.map((sponsor) => (
              <SponsorName key={sponsor.id} sponsor={sponsor} prominent />
            ))}
          </div>
        )}
        {featuredSupporter && (
          <div className="flex flex-col items-center gap-2">
            <p className="eyebrow">Proudly supported by</p>
            <SponsorName sponsor={featuredSupporter} prominent />
          </div>
        )}
      </div>
      {others.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
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
        <span className="rounded-sm bg-[var(--paper)] p-2">
          <img
            src={sponsor.logo_url}
            alt={`${sponsor.name} logo`}
            className={prominent ? "h-14 max-w-44 object-contain" : "h-9 max-w-28 object-contain"}
            loading="lazy"
          />
        </span>
      )}
      {sponsor.name}
    </>
  );

  const className = prominent
    ? "flex items-center gap-3 font-display text-xl font-bold transition-colors hover:text-primary sm:text-2xl"
    : "flex items-center gap-2 font-bold transition-colors hover:text-foreground";

  return sponsor.website ? (
    <a href={sponsor.website} target="_blank" rel="noreferrer noopener" className={className}>
      {content}
    </a>
  ) : (
    <span className={className}>{content}</span>
  );
}
