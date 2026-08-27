import { Check, Circle, Dot } from "lucide-react";

import type { ApplicationJourneyStep } from "@/domain/types";
import { cn } from "@/lib/utils";

export function JourneyTracker({ steps }: { steps: ApplicationJourneyStep[] }) {
  return (
    <ol className="space-y-1">
      {steps.map((step, index) => (
        <li key={step.key} className="flex items-start gap-3">
          <span className="flex flex-col items-center">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border",
                step.state === "DONE" && "border-success/50 bg-success/15 text-success",
                step.state === "CURRENT" && "border-primary/60 bg-primary/15 text-primary animate-pulse-spot",
                step.state === "UPCOMING" && "border-border text-muted-foreground",
              )}
            >
              {step.state === "DONE" ? (
                <Check className="size-4" />
              ) : step.state === "CURRENT" ? (
                <Dot className="size-5" />
              ) : (
                <Circle className="size-3" />
              )}
            </span>
            {index < steps.length - 1 && <span className="h-6 w-px bg-border" aria-hidden />}
          </span>
          <span className="pt-1">
            <span
              className={cn(
                "text-sm font-semibold",
                step.state === "UPCOMING" ? "text-muted-foreground" : "text-foreground",
              )}
            >
              {step.label}
            </span>
            {step.state === "CURRENT" && (
              <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                Now
              </span>
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}
