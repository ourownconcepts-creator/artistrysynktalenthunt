import { cn } from "@/lib/utils";

const TONE: Record<string, string> = {
  DRAFT: "border-border text-muted-foreground",
  ANNOUNCED: "border-primary/50 bg-primary/15 text-primary",
  REGISTRATION_OPEN: "border-success/50 bg-success/15 text-success",
  OPEN_FOR_ENTRIES: "border-success/50 bg-success/15 text-success",
  REGISTRATION_CLOSED: "border-warning/50 bg-warning/15 text-warning",
  IN_PROGRESS: "border-primary/50 bg-primary/15 text-primary",
  VOTING_OPEN: "border-accent/50 bg-accent/15 text-accent",
  COMPLETED: "border-border bg-muted text-muted-foreground",
  ARCHIVED: "border-border text-muted-foreground",
};

const LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ANNOUNCED: "Announced",
  REGISTRATION_OPEN: "Entries open",
  OPEN_FOR_ENTRIES: "Entries open",
  REGISTRATION_CLOSED: "Entries closed",
  IN_PROGRESS: "In progress",
  VOTING_OPEN: "Voting open",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
};

/** Renders whatever status the database holds — statuses are data, not code. */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest",
        TONE[status] ?? "border-border text-muted-foreground",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {LABELS[status] ?? status.replace(/_/g, " ").toLowerCase()}
    </span>
  );
}
