import { COMPETITION_STATUS_LABELS } from "@/domain/competition";
import type { CompetitionStatus } from "@/domain/types";
import { cn } from "@/lib/utils";

const TONE: Record<CompetitionStatus, string> = {
  DRAFT: "border-border text-muted-foreground",
  REGISTRATION_OPEN: "border-success/50 bg-success/15 text-success",
  REGISTRATION_CLOSED: "border-warning/50 bg-warning/15 text-warning",
  IN_PROGRESS: "border-primary/50 bg-primary/15 text-primary",
  VOTING_OPEN: "border-accent/50 bg-accent/15 text-accent",
  COMPLETED: "border-border bg-muted text-muted-foreground",
  ARCHIVED: "border-border text-muted-foreground",
};

export function StatusPill({
  status,
  className,
}: {
  status: CompetitionStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest",
        TONE[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {COMPETITION_STATUS_LABELS[status]}
    </span>
  );
}
