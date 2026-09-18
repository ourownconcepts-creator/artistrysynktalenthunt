import { cn } from "@/lib/utils";

export function Wordmark({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const scale = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";
  const sub = size === "sm" ? "text-[9px]" : size === "lg" ? "text-xs" : "text-[10px]";

  return (
    <span className={cn("inline-flex flex-col leading-none font-display", className)}>
      <span className={cn(scale, "text-gold tracking-tight")}>ARTISTRYSYNK</span>
      <span
        className={cn(
          sub,
          "mt-1 font-sans font-extrabold uppercase tracking-[0.3em] text-muted-foreground",
        )}
      >
        Creatives Talent Hunt
      </span>
    </span>
  );
}
